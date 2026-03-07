-- =============================================================================
-- MIGRACION 00017: CUOTAS MENSUALES Y PRORROGAS ADMIN
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_cuota_mensual') THEN
    CREATE TYPE public.estado_cuota_mensual AS ENUM (
      'pendiente',
      'pagada',
      'vencida'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.cuotas_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_fijo_id UUID NOT NULL REFERENCES public.horarios_fijos(id) ON DELETE CASCADE,
  alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  actividad_id UUID REFERENCES public.actividades(id) ON DELETE SET NULL,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estado public.estado_cuota_mensual NOT NULL DEFAULT 'pendiente',
  fecha_vencimiento DATE NOT NULL,
  fecha_limite_final DATE NOT NULL,
  fecha_pago TIMESTAMPTZ,
  pago_id UUID REFERENCES public.pagos_mercadopago(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cuotas_mensuales_unique UNIQUE (horario_fijo_id, anio, mes),
  CONSTRAINT cuotas_mensuales_anio_check CHECK (anio >= 2020 AND anio <= 2100),
  CONSTRAINT cuotas_mensuales_mes_check CHECK (mes >= 1 AND mes <= 12),
  CONSTRAINT cuotas_mensuales_monto_check CHECK (monto >= 0),
  CONSTRAINT cuotas_mensuales_limite_check CHECK (fecha_limite_final >= fecha_vencimiento)
);

CREATE INDEX IF NOT EXISTS idx_cuotas_mensuales_horario ON public.cuotas_mensuales(horario_fijo_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_mensuales_alumno ON public.cuotas_mensuales(alumno_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_mensuales_sede ON public.cuotas_mensuales(sede_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_mensuales_estado ON public.cuotas_mensuales(estado);
CREATE INDEX IF NOT EXISTS idx_cuotas_mensuales_periodo ON public.cuotas_mensuales(anio, mes);

COMMENT ON TABLE public.cuotas_mensuales IS 'Control de cuota mensual por horario fijo con vencimiento dia 10.';

CREATE TABLE IF NOT EXISTS public.prorrogas_cuota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuota_id UUID NOT NULL REFERENCES public.cuotas_mensuales(id) ON DELETE CASCADE,
  admin_usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  dias_otorgados INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  fecha_limite_anterior DATE NOT NULL,
  fecha_limite_nueva DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prorrogas_cuota_unique UNIQUE (cuota_id),
  CONSTRAINT prorrogas_cuota_dias_check CHECK (dias_otorgados > 0 AND dias_otorgados <= 10),
  CONSTRAINT prorrogas_cuota_fecha_check CHECK (fecha_limite_nueva > fecha_limite_anterior)
);

CREATE INDEX IF NOT EXISTS idx_prorrogas_cuota_cuota ON public.prorrogas_cuota(cuota_id);
CREATE INDEX IF NOT EXISTS idx_prorrogas_cuota_admin ON public.prorrogas_cuota(admin_usuario_id);

COMMENT ON TABLE public.prorrogas_cuota IS 'Prorrogas excepcionales de cuotas, solo por admin.';

DROP TRIGGER IF EXISTS update_cuotas_mensuales_updated_at ON public.cuotas_mensuales;
CREATE TRIGGER update_cuotas_mensuales_updated_at
BEFORE UPDATE ON public.cuotas_mensuales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cuotas_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prorrogas_cuota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_cuotas_mensuales" ON public.cuotas_mensuales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'super_admin'
        AND m.activa = true
    )
  );

CREATE POLICY "admin_all_cuotas_mensuales_sede" ON public.cuotas_mensuales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.sede_id = cuotas_mensuales.sede_id
        AND m.rol = 'admin'
        AND m.activa = true
    )
  );

CREATE POLICY "profesor_read_cuotas_mensuales_sede" ON public.cuotas_mensuales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profesores p
      WHERE p.usuario_id = auth.uid()
        AND p.sede_id = cuotas_mensuales.sede_id
        AND p.activo = true
    )
  );

CREATE POLICY "alumno_read_cuotas_mensuales_own" ON public.cuotas_mensuales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.alumnos a
      WHERE a.usuario_id = auth.uid()
        AND a.id = cuotas_mensuales.alumno_id
        AND a.activo = true
    )
  );

CREATE POLICY "alumno_update_cuotas_mensuales_own" ON public.cuotas_mensuales
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.alumnos a
      WHERE a.usuario_id = auth.uid()
        AND a.id = cuotas_mensuales.alumno_id
        AND a.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.alumnos a
      WHERE a.usuario_id = auth.uid()
        AND a.id = cuotas_mensuales.alumno_id
        AND a.activo = true
    )
  );

CREATE POLICY "super_admin_all_prorrogas_cuota" ON public.prorrogas_cuota
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.rol = 'super_admin'
        AND m.activa = true
    )
  );

CREATE POLICY "admin_all_prorrogas_cuota" ON public.prorrogas_cuota
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.cuotas_mensuales c
      JOIN public.membresias m ON m.sede_id = c.sede_id
      WHERE c.id = prorrogas_cuota.cuota_id
        AND m.usuario_id = auth.uid()
        AND m.rol = 'admin'
        AND m.activa = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cuotas_mensuales c
      JOIN public.membresias m ON m.sede_id = c.sede_id
      WHERE c.id = prorrogas_cuota.cuota_id
        AND m.usuario_id = auth.uid()
        AND m.rol = 'admin'
        AND m.activa = true
    )
  );

CREATE POLICY "alumno_read_prorrogas_cuota_own" ON public.prorrogas_cuota
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.cuotas_mensuales c
      JOIN public.alumnos a ON a.id = c.alumno_id
      WHERE c.id = prorrogas_cuota.cuota_id
        AND a.usuario_id = auth.uid()
        AND a.activo = true
    )
  );

COMMIT;
