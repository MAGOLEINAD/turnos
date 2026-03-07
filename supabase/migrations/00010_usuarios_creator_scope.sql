-- =============================================================================
-- MIGRACION 00010: Trazabilidad de usuarios creados por admin/cliente
-- =============================================================================

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS created_by_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS created_by_organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_created_by_usuario
ON public.usuarios (created_by_usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_created_by_organizacion
ON public.usuarios (created_by_organizacion_id);
