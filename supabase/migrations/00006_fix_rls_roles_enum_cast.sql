-- =============================================================================
-- MIGRACION 00006: FIX RLS ENUM rol_usuario
-- =============================================================================
-- Problema:
-- En algunos entornos quedaron politicas RLS con comparaciones incompatibles
-- entre rol_usuario (ENUM) y text, generando:
--   operator does not exist: rol_usuario = text
--
-- Solucion:
-- 1) Limpiar politicas existentes en organizaciones y sedes
-- 2) Recrear politicas con casteo explicito a rol_usuario
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- ORGANIZACIONES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizaciones'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizaciones', p.policyname);
  END LOOP;
END $$;

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
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sedes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sedes', p.policyname);
  END LOOP;
END $$;

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

COMMIT;

