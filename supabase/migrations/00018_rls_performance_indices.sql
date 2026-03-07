-- =============================================================================
-- MIGRACION 00018: OPTIMIZACION RLS / AUTH / REPORTES (VERSION SEGURA)
-- =============================================================================
-- Criterios:
-- 1) Solo indices sobre columnas existentes.
-- 2) Evitar redundancia con PK e indices ya creados en 00009/00011/00016/00017.
-- 3) Priorizar patrones reales del codigo actual (auth + cuotas + pagos + horarios).

BEGIN;

-- ---------------------------------------------------------------------------
-- AUTH / RLS: membresias activas por usuario con filtro por sede u organizacion
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_membresias_uid_rol_sede_activa
ON public.membresias (usuario_id, rol, sede_id)
WHERE activa = true AND sede_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membresias_uid_rol_org_activa
ON public.membresias (usuario_id, rol, organizacion_id)
WHERE activa = true AND organizacion_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- REPORTES DE CUOTAS: listados y contadores por sede/estado/periodo
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cuotas_sede_estado_periodo
ON public.cuotas_mensuales (sede_id, estado, anio DESC, mes DESC);

-- ---------------------------------------------------------------------------
-- HISTORIAL DE PAGOS: panel alumno/admin por alumno+sede ordenado por fecha
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pagos_alumno_sede_created_at_desc
ON public.pagos_mercadopago (alumno_id, sede_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- HORARIOS FIJOS: calendario/agenda por profesor activo + fecha de baja efectiva
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_horarios_fijos_profesor_activo_baja
ON public.horarios_fijos (profesor_id, activo, fecha_baja_efectiva);

COMMIT;

