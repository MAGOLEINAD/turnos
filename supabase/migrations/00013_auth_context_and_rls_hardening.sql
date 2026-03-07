-- =============================================================================
-- MIGRACION 00013: AUTH CONTEXT + RLS HARDENING
-- =============================================================================
-- Objetivos:
-- 1) Endurecer membresias para evitar estados ambiguos.
-- 2) Agregar contexto activo de perfil por usuario.
-- 3) Normalizar policies criticas usando funciones SECURITY DEFINER.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- FUNCIONES DE AUTORIZACION (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membresias m
    WHERE m.usuario_id = COALESCE(p_user_id, auth.uid())
      AND m.activa = true
      AND m.rol = 'super_admin'::rol_usuario
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_organizacion(
  p_organizacion_id UUID,
  p_roles rol_usuario[],
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membresias m
    WHERE m.usuario_id = COALESCE(p_user_id, auth.uid())
      AND m.organizacion_id = p_organizacion_id
      AND m.activa = true
      AND m.rol = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_sede(
  p_sede_id UUID,
  p_roles rol_usuario[],
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membresias m
    WHERE m.usuario_id = COALESCE(p_user_id, auth.uid())
      AND m.sede_id = p_sede_id
      AND m.activa = true
      AND m.rol = ANY (p_roles)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_organizacion(UUID, rol_usuario[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_sede(UUID, rol_usuario[], UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- HARDENING DE MEMBRESIAS
-- -----------------------------------------------------------------------------
UPDATE public.membresias m
SET organizacion_id = s.organizacion_id
FROM public.sedes s
WHERE m.rol <> 'super_admin'::rol_usuario
  AND m.sede_id = s.id
  AND m.organizacion_id IS DISTINCT FROM s.organizacion_id;

UPDATE public.membresias
SET sede_id = NULL,
    organizacion_id = NULL
WHERE rol = 'super_admin'::rol_usuario;

ALTER TABLE public.membresias
  DROP CONSTRAINT IF EXISTS super_admin_sin_sede;

ALTER TABLE public.membresias
  ADD CONSTRAINT membresias_scope_por_rol_chk
  CHECK (
    (rol = 'super_admin'::rol_usuario AND sede_id IS NULL AND organizacion_id IS NULL)
    OR
    (rol <> 'super_admin'::rol_usuario AND sede_id IS NOT NULL AND organizacion_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_membresias_super_admin_usuario
ON public.membresias (usuario_id)
WHERE rol = 'super_admin'::rol_usuario
  AND activa = true;

CREATE OR REPLACE FUNCTION public.sync_membresia_organizacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rol = 'super_admin'::rol_usuario THEN
    NEW.sede_id := NULL;
    NEW.organizacion_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.sede_id IS NULL THEN
    RAISE EXCEPTION 'sede_id es obligatorio para rol %', NEW.rol;
  END IF;

  SELECT s.organizacion_id INTO NEW.organizacion_id
  FROM public.sedes s
  WHERE s.id = NEW.sede_id;

  IF NEW.organizacion_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo resolver organizacion_id para la sede %', NEW.sede_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_membresia_organizacion ON public.membresias;
CREATE TRIGGER trg_sync_membresia_organizacion
BEFORE INSERT OR UPDATE OF rol, sede_id, organizacion_id
ON public.membresias
FOR EACH ROW
EXECUTE FUNCTION public.sync_membresia_organizacion();

-- -----------------------------------------------------------------------------
-- CONTEXTO ACTIVO DE PERFIL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuario_contexto_activo (
  usuario_id UUID PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  membresia_id UUID REFERENCES public.membresias(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_contexto_activo_membresia
ON public.usuario_contexto_activo(membresia_id);

ALTER TABLE public.usuario_contexto_activo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_contexto_select_own" ON public.usuario_contexto_activo;
DROP POLICY IF EXISTS "usuario_contexto_upsert_own" ON public.usuario_contexto_activo;
DROP POLICY IF EXISTS "usuario_contexto_update_own" ON public.usuario_contexto_activo;

CREATE POLICY "usuario_contexto_select_own" ON public.usuario_contexto_activo
FOR SELECT
USING (usuario_id = auth.uid());

CREATE POLICY "usuario_contexto_upsert_own" ON public.usuario_contexto_activo
FOR INSERT
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "usuario_contexto_update_own" ON public.usuario_contexto_activo
FOR UPDATE
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_usuario_contexto_activo(p_membresia_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membresia public.membresias%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT *
  INTO v_membresia
  FROM public.membresias
  WHERE id = p_membresia_id
    AND usuario_id = auth.uid()
    AND activa = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membresia no valida para el usuario autenticado';
  END IF;

  INSERT INTO public.usuario_contexto_activo (usuario_id, membresia_id, updated_at)
  VALUES (auth.uid(), p_membresia_id, NOW())
  ON CONFLICT (usuario_id)
  DO UPDATE SET
    membresia_id = EXCLUDED.membresia_id,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_usuario_contexto_activo(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- POLICIES CRITICAS REDEFINIDAS CON FUNCIONES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_all_organizaciones" ON public.organizaciones;
DROP POLICY IF EXISTS "admin_read_organizaciones" ON public.organizaciones;
DROP POLICY IF EXISTS "profesor_alumno_read_organizaciones" ON public.organizaciones;

CREATE POLICY "super_admin_all_organizaciones" ON public.organizaciones
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "admin_read_organizaciones" ON public.organizaciones
FOR SELECT
USING (
  public.has_role_in_organizacion(
    organizaciones.id,
    ARRAY['admin'::rol_usuario]
  )
);

CREATE POLICY "profesor_alumno_read_organizaciones" ON public.organizaciones
FOR SELECT
USING (
  public.has_role_in_organizacion(
    organizaciones.id,
    ARRAY['profesor'::rol_usuario, 'alumno'::rol_usuario]
  )
);

DROP POLICY IF EXISTS "super_admin_all_sedes" ON public.sedes;
DROP POLICY IF EXISTS "admin_all_sedes" ON public.sedes;
DROP POLICY IF EXISTS "profesor_read_sede" ON public.sedes;
DROP POLICY IF EXISTS "alumno_read_sede" ON public.sedes;
DROP POLICY IF EXISTS "public_read_sedes_activas" ON public.sedes;

CREATE POLICY "super_admin_all_sedes" ON public.sedes
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "admin_all_sedes" ON public.sedes
FOR ALL
USING (
  public.has_role_in_sede(
    sedes.id,
    ARRAY['admin'::rol_usuario]
  )
);

CREATE POLICY "profesor_read_sede" ON public.sedes
FOR SELECT
USING (
  public.has_role_in_sede(
    sedes.id,
    ARRAY['profesor'::rol_usuario]
  )
);

CREATE POLICY "alumno_read_sede" ON public.sedes
FOR SELECT
USING (
  public.has_role_in_sede(
    sedes.id,
    ARRAY['alumno'::rol_usuario]
  )
);

CREATE POLICY "public_read_sedes_activas" ON public.sedes
FOR SELECT
USING (activa = true);

DROP POLICY IF EXISTS "super_admin_all_membresias" ON public.membresias;
DROP POLICY IF EXISTS "admin_all_membresias_sede" ON public.membresias;
DROP POLICY IF EXISTS "usuario_read_own_membresias" ON public.membresias;

CREATE POLICY "super_admin_all_membresias" ON public.membresias
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "admin_all_membresias_sede" ON public.membresias
FOR ALL
USING (
  public.has_role_in_sede(
    membresias.sede_id,
    ARRAY['admin'::rol_usuario]
  )
);

CREATE POLICY "usuario_read_own_membresias" ON public.membresias
FOR SELECT
USING (usuario_id = auth.uid());

COMMIT;
