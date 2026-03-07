-- =============================================================================
-- MIGRACION 00011: Indices de performance para secciones Admin
-- Fecha: 2026-03-07
-- =============================================================================

-- Lookup de cliente administrado por usuario admin
CREATE INDEX IF NOT EXISTS idx_organizaciones_admin_usuario_id
ON public.organizaciones (admin_usuario_id)
WHERE admin_usuario_id IS NOT NULL;

-- Sedes por cliente activo, ordenadas por nombre
CREATE INDEX IF NOT EXISTS idx_sedes_org_activa_nombre
ON public.sedes (organizacion_id, activa, nombre);

-- Consultas de reservas por sede/estado/rango de fecha
CREATE INDEX IF NOT EXISTS idx_reservas_sede_estado_fecha_inicio
ON public.reservas (sede_id, estado, fecha_inicio);

-- Consultas de reservas por sede y fecha (sin filtrar estado)
CREATE INDEX IF NOT EXISTS idx_reservas_sede_fecha_inicio
ON public.reservas (sede_id, fecha_inicio);

-- Listados y contadores de profesores/alumnos por sede y estado
CREATE INDEX IF NOT EXISTS idx_profesores_sede_activo
ON public.profesores (sede_id, activo);

CREATE INDEX IF NOT EXISTS idx_alumnos_sede_activo
ON public.alumnos (sede_id, activo);

-- Listados por fecha en profesores/alumnos
CREATE INDEX IF NOT EXISTS idx_profesores_sede_created_at_desc
ON public.profesores (sede_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alumnos_sede_created_at_desc
ON public.alumnos (sede_id, created_at DESC);

-- Creditos vigentes por alumno/sede
CREATE INDEX IF NOT EXISTS idx_creditos_alumno_sede_utilizado_exp
ON public.creditos_recupero (alumno_id, sede_id, utilizado, fecha_expiracion);
