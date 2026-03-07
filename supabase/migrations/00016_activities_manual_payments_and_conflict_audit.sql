-- =============================================================================
-- MIGRACION 00016: ACTIVIDADES, PAGOS MANUALES Y AUDITORIA DE CONFLICTOS
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- ENUMS NUEVOS / EXTENSIONES
-- -----------------------------------------------------------------------------

ALTER TYPE public.estado_reserva ADD VALUE IF NOT EXISTS 'primera_clase';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'origen_pago_registro'
  ) THEN
    CREATE TYPE public.origen_pago_registro AS ENUM (
      'mercadopago',
      'transferencia',
      'efectivo',
      'manual_override'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'tipo_conflicto_bloqueo_fijo'
  ) THEN
    CREATE TYPE public.tipo_conflicto_bloqueo_fijo AS ENUM (
      'reasignar_profesor',
      'mover_horario_fijo',
      'cancelar_bloqueo'
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- ACTIVIDADES (MODELO NUEVO)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  color_calendario VARCHAR(7) NOT NULL DEFAULT '#F59E0B',
  es_recurrente_default BOOLEAN NOT NULL DEFAULT true,
  permite_prueba BOOLEAN NOT NULL DEFAULT true,
  precio_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
  senia_prueba DECIMAL(10, 2) NOT NULL DEFAULT 0,
  duracion_minutos_base INTEGER NOT NULL DEFAULT 60,
  cupo_maximo_base INTEGER NOT NULL DEFAULT 1,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT actividades_org_nombre_unique UNIQUE (organizacion_id, nombre),
  CONSTRAINT actividades_color_hex CHECK (color_calendario ~* '^#[0-9A-F]{6}$'),
  CONSTRAINT actividades_precio_base_non_negative CHECK (precio_base >= 0),
  CONSTRAINT actividades_senia_non_negative CHECK (senia_prueba >= 0),
  CONSTRAINT actividades_duracion_positive CHECK (duracion_minutos_base > 0),
  CONSTRAINT actividades_cupo_positive CHECK (cupo_maximo_base > 0)
);

CREATE INDEX IF NOT EXISTS idx_actividades_org ON public.actividades(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_actividades_activa ON public.actividades(activa);

COMMENT ON TABLE public.actividades IS 'Catalogo de actividades por organizacion. Reemplaza gradualmente tipo de reserva.';

CREATE TABLE IF NOT EXISTS public.actividades_sede_config (
  actividad_id UUID NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  precio_clase DECIMAL(10, 2),
  duracion_minutos INTEGER,
  cupo_maximo INTEGER,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actividad_id, sede_id),
  CONSTRAINT actividades_sede_precio_non_negative CHECK (precio_clase IS NULL OR precio_clase >= 0),
  CONSTRAINT actividades_sede_duracion_positive CHECK (duracion_minutos IS NULL OR duracion_minutos > 0),
  CONSTRAINT actividades_sede_cupo_positive CHECK (cupo_maximo IS NULL OR cupo_maximo > 0)
);

CREATE INDEX IF NOT EXISTS idx_actividades_sede_config_sede ON public.actividades_sede_config(sede_id);

COMMENT ON TABLE public.actividades_sede_config IS 'Overrides por sede para precio/duracion/cupo de actividad.';

CREATE TABLE IF NOT EXISTS public.profesor_actividades (
  profesor_id UUID NOT NULL REFERENCES public.profesores(id) ON DELETE CASCADE,
  actividad_id UUID NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profesor_id, actividad_id)
);

CREATE INDEX IF NOT EXISTS idx_profesor_actividades_actividad ON public.profesor_actividades(actividad_id);
CREATE INDEX IF NOT EXISTS idx_profesor_actividades_activo ON public.profesor_actividades(activo);

COMMENT ON TABLE public.profesor_actividades IS 'Relación de actividades que un profesor puede dictar.';

-- -----------------------------------------------------------------------------
-- RESERVAS / HORARIOS_FIJOS: ADOPCION DE ACTIVIDAD
-- -----------------------------------------------------------------------------

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS actividad_id UUID REFERENCES public.actividades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_clase_prueba BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requiere_regularizacion_pago BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_limite_regularizacion DATE;

CREATE INDEX IF NOT EXISTS idx_reservas_actividad ON public.reservas(actividad_id);
CREATE INDEX IF NOT EXISTS idx_reservas_regularizacion ON public.reservas(requiere_regularizacion_pago, fecha_limite_regularizacion);

ALTER TABLE public.horarios_fijos
  ADD COLUMN IF NOT EXISTS actividad_id UUID REFERENCES public.actividades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS baja_modalidad VARCHAR(20) DEFAULT 'inmediata',
  ADD COLUMN IF NOT EXISTS fecha_baja_efectiva DATE;

ALTER TABLE public.horarios_fijos
  DROP CONSTRAINT IF EXISTS horarios_fijos_baja_modalidad_check;

ALTER TABLE public.horarios_fijos
  ADD CONSTRAINT horarios_fijos_baja_modalidad_check
  CHECK (baja_modalidad IN ('inmediata', 'fin_de_mes'));

CREATE INDEX IF NOT EXISTS idx_horarios_fijos_actividad ON public.horarios_fijos(actividad_id);
CREATE INDEX IF NOT EXISTS idx_horarios_fijos_fecha_baja_efectiva ON public.horarios_fijos(fecha_baja_efectiva);

-- -----------------------------------------------------------------------------
-- TRAZABILIDAD DE PRIMERA CLASE (1 TOTAL POR ALUMNO)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.alumnos_primera_clase (
  alumno_id UUID PRIMARY KEY REFERENCES public.alumnos(id) ON DELETE CASCADE,
  reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  pago_id UUID REFERENCES public.pagos_mercadopago(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.alumnos_primera_clase IS 'Garantiza una sola clase de prueba total por alumno.';

-- -----------------------------------------------------------------------------
-- PAGOS: SOPORTE DIGITAL + MANUAL EN MISMA TABLA
-- -----------------------------------------------------------------------------

ALTER TABLE public.pagos_mercadopago
  ADD COLUMN IF NOT EXISTS origen_registro public.origen_pago_registro NOT NULL DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS registrado_por_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referencia_manual TEXT,
  ADD COLUMN IF NOT EXISTS observaciones_manual TEXT,
  ADD COLUMN IF NOT EXISTS es_senia BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afecta_cuota BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.pagos_mercadopago
  DROP CONSTRAINT IF EXISTS pagos_origen_manual_registrador_check;

ALTER TABLE public.pagos_mercadopago
  ADD CONSTRAINT pagos_origen_manual_registrador_check
  CHECK (
    (origen_registro = 'mercadopago' AND registrado_por_usuario_id IS NULL)
    OR
    (origen_registro <> 'mercadopago' AND registrado_por_usuario_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_pagos_origen_registro ON public.pagos_mercadopago(origen_registro);
CREATE INDEX IF NOT EXISTS idx_pagos_registrado_por ON public.pagos_mercadopago(registrado_por_usuario_id);

COMMENT ON COLUMN public.pagos_mercadopago.origen_registro IS 'Canal/origen del pago: mercadopago o carga manual.';

-- -----------------------------------------------------------------------------
-- AUDITORIA DE CONFLICTOS BLOQUEO VS HORARIO FIJO
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conflictos_bloqueo_horario_fijo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloqueo_id UUID REFERENCES public.bloqueos_disponibilidad(id) ON DELETE SET NULL,
  horario_fijo_id UUID NOT NULL REFERENCES public.horarios_fijos(id) ON DELETE CASCADE,
  accion public.tipo_conflicto_bloqueo_fijo NOT NULL,
  resuelto_por_usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  detalles JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conflictos_bloqueo_id ON public.conflictos_bloqueo_horario_fijo(bloqueo_id);
CREATE INDEX IF NOT EXISTS idx_conflictos_horario_id ON public.conflictos_bloqueo_horario_fijo(horario_fijo_id);
CREATE INDEX IF NOT EXISTS idx_conflictos_accion ON public.conflictos_bloqueo_horario_fijo(accion);

COMMENT ON TABLE public.conflictos_bloqueo_horario_fijo IS 'Auditoria de resolucion de conflictos entre bloqueos y horarios fijos.';

-- -----------------------------------------------------------------------------
-- TRIGGERS UPDATED_AT PARA TABLAS NUEVAS
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_actividades_updated_at ON public.actividades;
CREATE TRIGGER update_actividades_updated_at
BEFORE UPDATE ON public.actividades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_actividades_sede_config_updated_at ON public.actividades_sede_config;
CREATE TRIGGER update_actividades_sede_config_updated_at
BEFORE UPDATE ON public.actividades_sede_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profesor_actividades_updated_at ON public.profesor_actividades;
CREATE TRIGGER update_profesor_actividades_updated_at
BEFORE UPDATE ON public.profesor_actividades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- RLS: TABLAS NUEVAS
-- -----------------------------------------------------------------------------

ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_sede_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesor_actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos_primera_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflictos_bloqueo_horario_fijo ENABLE ROW LEVEL SECURITY;

-- Actividades
CREATE POLICY "super_admin_all_actividades" ON public.actividades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'super_admin'
        AND m.activa = true
    )
  );

CREATE POLICY "admin_all_actividades_org" ON public.actividades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      JOIN public.sedes s ON s.id = m.sede_id
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'admin'
        AND m.activa = true
        AND s.organizacion_id = actividades.organizacion_id
    )
  );

CREATE POLICY "profesor_alumno_read_actividades" ON public.actividades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      JOIN public.sedes s ON s.id = m.sede_id
      WHERE m.usuario_id = auth.uid()
        AND m.activa = true
        AND s.organizacion_id = actividades.organizacion_id
    )
  );

CREATE POLICY "public_read_actividades_activas" ON public.actividades
  FOR SELECT
  USING (activa = true);

-- Actividades por sede
CREATE POLICY "admin_all_actividades_sede_config" ON public.actividades_sede_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND (m.sede_id = actividades_sede_config.sede_id OR m.rol = 'super_admin')
        AND m.rol IN ('super_admin', 'admin')
        AND m.activa = true
    )
  );

CREATE POLICY "profesor_alumno_read_actividades_sede_config" ON public.actividades_sede_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.sede_id = actividades_sede_config.sede_id
        AND m.activa = true
    )
  );

-- Profesor actividades
CREATE POLICY "admin_all_profesor_actividades" ON public.profesor_actividades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      JOIN public.profesores p ON p.sede_id = m.sede_id
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'admin'
        AND m.activa = true
        AND p.id = profesor_actividades.profesor_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'super_admin'
        AND m.activa = true
    )
  );

CREATE POLICY "profesor_read_own_profesor_actividades" ON public.profesor_actividades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profesores p
      WHERE p.usuario_id = auth.uid()
        AND p.id = profesor_actividades.profesor_id
        AND p.activo = true
    )
  );

-- Primera clase alumno
CREATE POLICY "admin_read_alumnos_primera_clase" ON public.alumnos_primera_clase
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      JOIN public.alumnos a ON a.sede_id = m.sede_id
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'admin'
        AND m.activa = true
        AND a.id = alumnos_primera_clase.alumno_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'super_admin'
        AND m.activa = true
    )
  );

CREATE POLICY "alumno_read_own_primera_clase" ON public.alumnos_primera_clase
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.alumnos a
      WHERE a.usuario_id = auth.uid()
        AND a.id = alumnos_primera_clase.alumno_id
        AND a.activo = true
    )
  );

CREATE POLICY "admin_insert_alumnos_primera_clase" ON public.alumnos_primera_clase
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      JOIN public.alumnos a ON a.sede_id = m.sede_id
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'admin'
        AND m.activa = true
        AND a.id = alumnos_primera_clase.alumno_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'super_admin'
        AND m.activa = true
    )
  );

-- Conflictos bloqueo/horario fijo
CREATE POLICY "admin_profesor_all_conflictos_bloqueo_fijo" ON public.conflictos_bloqueo_horario_fijo
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.horarios_fijos hf
      LEFT JOIN public.profesores p ON p.id = hf.profesor_id
      LEFT JOIN public.membresias m ON m.sede_id = hf.sede_id
      WHERE hf.id = conflictos_bloqueo_horario_fijo.horario_fijo_id
        AND (
          (m.usuario_id = auth.uid() AND m.rol IN ('super_admin', 'admin') AND m.activa = true)
          OR (p.usuario_id = auth.uid() AND p.activo = true)
        )
    )
  );

-- Extender permisos de pagos para carga manual por admin/profesor
CREATE POLICY "admin_profesor_insert_pagos_manual" ON public.pagos_mercadopago
  FOR INSERT
  WITH CHECK (
    origen_registro <> 'mercadopago'
    AND EXISTS (
      SELECT 1
      FROM public.alumnos a
      LEFT JOIN public.membresias m ON m.sede_id = a.sede_id
      LEFT JOIN public.profesores p ON p.sede_id = a.sede_id
      WHERE a.id = pagos_mercadopago.alumno_id
        AND (
          (m.usuario_id = auth.uid() AND m.rol = 'admin' AND m.activa = true)
          OR (p.usuario_id = auth.uid() AND p.activo = true)
          OR EXISTS (
            SELECT 1
            FROM public.membresias m2
            WHERE m2.usuario_id = auth.uid()
              AND m2.rol = 'super_admin'
              AND m2.activa = true
          )
        )
    )
  );

-- Backfill defensivo: actividad_id nullable, sin cambios destructivos.

COMMIT;

