-- =============================================================================
-- MIGRACION 00012: FIX RLS ENUM CAST EN FLUJOS DE AUTH
-- =============================================================================
-- Problema:
-- En algunos entornos quedaron policies RLS comparando rol_usuario (ENUM)
-- contra text, causando:
--   operator does not exist: rol_usuario = text
--
-- Solucion:
-- Re-crear policies clave de auth con casteo explicito a rol_usuario.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- ORGANIZACIONES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_all_organizaciones" ON public.organizaciones;
DROP POLICY IF EXISTS "admin_read_organizaciones" ON public.organizaciones;
DROP POLICY IF EXISTS "profesor_alumno_read_organizaciones" ON public.organizaciones;

CREATE POLICY "super_admin_all_organizaciones" ON public.organizaciones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'::rol_usuario
        AND activa = true
    )
  );

CREATE POLICY "admin_read_organizaciones" ON public.organizaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias
      WHERE usuario_id = auth.uid()
        AND organizacion_id = organizaciones.id
        AND rol = 'admin'::rol_usuario
        AND activa = true
    )
  );

CREATE POLICY "profesor_alumno_read_organizaciones" ON public.organizaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias
      WHERE usuario_id = auth.uid()
        AND organizacion_id = organizaciones.id
        AND rol = ANY (ARRAY['profesor'::rol_usuario, 'alumno'::rol_usuario])
        AND activa = true
    )
  );

-- -----------------------------------------------------------------------------
-- SEDES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_all_sedes" ON public.sedes;
DROP POLICY IF EXISTS "admin_all_sedes" ON public.sedes;
DROP POLICY IF EXISTS "profesor_read_sede" ON public.sedes;
DROP POLICY IF EXISTS "alumno_read_sede" ON public.sedes;
DROP POLICY IF EXISTS "public_read_sedes_activas" ON public.sedes;

CREATE POLICY "super_admin_all_sedes" ON public.sedes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'::rol_usuario
        AND activa = true
    )
  );

CREATE POLICY "admin_all_sedes" ON public.sedes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = sedes.id
        AND rol = 'admin'::rol_usuario
        AND activa = true
    )
  );

CREATE POLICY "profesor_read_sede" ON public.sedes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profesores
      WHERE usuario_id = auth.uid()
        AND sede_id = sedes.id
        AND activo = true
    )
  );

CREATE POLICY "alumno_read_sede" ON public.sedes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.alumnos
      WHERE usuario_id = auth.uid()
        AND sede_id = sedes.id
        AND activo = true
    )
  );

CREATE POLICY "public_read_sedes_activas" ON public.sedes
  FOR SELECT
  USING (activa = true);

-- -----------------------------------------------------------------------------
-- MEMBRESIAS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_all_membresias" ON public.membresias;
DROP POLICY IF EXISTS "admin_all_membresias_sede" ON public.membresias;
DROP POLICY IF EXISTS "usuario_read_own_membresias" ON public.membresias;

CREATE POLICY "super_admin_all_membresias" ON public.membresias
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'::rol_usuario
        AND activa = true
    )
  );

CREATE POLICY "admin_all_membresias_sede" ON public.membresias
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.sede_id = membresias.sede_id
        AND m.rol = 'admin'::rol_usuario
        AND m.activa = true
    )
  );

CREATE POLICY "usuario_read_own_membresias" ON public.membresias
  FOR SELECT
  USING (usuario_id = auth.uid());

COMMIT;

