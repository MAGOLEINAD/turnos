-- =============================================================================
-- MIGRACION 00014: BLOQUEO DE SEDES POR USUARIO/CLIENTE PARA OTROS ADMINS
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.usuarios_control_acceso (
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  bloquear_sedes_otros_admins BOOLEAN NOT NULL DEFAULT false,
  updated_by_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, organizacion_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_control_acceso_org
ON public.usuarios_control_acceso (organizacion_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_control_acceso_updated_by
ON public.usuarios_control_acceso (updated_by_usuario_id);

COMMIT;

