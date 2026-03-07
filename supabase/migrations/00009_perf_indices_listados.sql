-- =============================================================================
-- MIGRACION 00009: Indices de performance para listados y permisos
-- =============================================================================

-- Listados ordenados por fecha de alta
CREATE INDEX IF NOT EXISTS idx_organizaciones_created_at_desc
ON public.organizaciones (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sedes_created_at_desc
ON public.sedes (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_created_at_desc
ON public.usuarios (created_at DESC);

-- Consultas frecuentes de membresias (roles activos por usuario/rol)
CREATE INDEX IF NOT EXISTS idx_membresias_rol_activa_usuario
ON public.membresias (rol, activa, usuario_id);

CREATE INDEX IF NOT EXISTS idx_membresias_usuario_activa_rol
ON public.membresias (usuario_id, activa, rol);
