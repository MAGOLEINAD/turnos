-- =============================================================================
-- MIGRACION 00008: Asociar cliente/organizacion a usuario admin
-- Fecha: 2026-03-06
-- =============================================================================

ALTER TABLE public.organizaciones
ADD COLUMN IF NOT EXISTS admin_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizaciones_admin_usuario
ON public.organizaciones(admin_usuario_id);

COMMENT ON COLUMN public.organizaciones.admin_usuario_id IS
'Usuario admin responsable del cliente/organizacion';
