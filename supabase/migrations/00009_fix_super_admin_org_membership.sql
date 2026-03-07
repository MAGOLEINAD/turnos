-- =============================================================================
-- MIGRACION 00009: Evitar que super_admin quede atado a una organizacion
-- Fecha: 2026-03-07
-- =============================================================================

-- 1) Limpiar datos historicos invalidos
UPDATE public.membresias
SET organizacion_id = NULL
WHERE rol = 'super_admin'
  AND organizacion_id IS NOT NULL;

-- 2) Reforzar constraint
ALTER TABLE public.membresias
DROP CONSTRAINT IF EXISTS super_admin_sin_sede;

ALTER TABLE public.membresias
ADD CONSTRAINT super_admin_sin_sede CHECK (
  (rol = 'super_admin' AND sede_id IS NULL AND organizacion_id IS NULL) OR
  (rol != 'super_admin' AND sede_id IS NOT NULL)
);
