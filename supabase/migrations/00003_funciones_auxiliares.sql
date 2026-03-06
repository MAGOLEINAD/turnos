-- =============================================================================
-- MIGRACIÓN 00003: FUNCIONES AUXILIARES
-- =============================================================================
-- Descripción: Funciones helper para lógica de negocio
-- Autor: Sistema
-- Fecha: 2026-03-05
-- =============================================================================

-- =============================================================================
-- FUNCIÓN: Obtener rol de usuario en una sede
-- =============================================================================

CREATE OR REPLACE FUNCTION obtener_rol_usuario_sede(p_usuario_id UUID, p_sede_id UUID)
RETURNS rol_usuario AS $$
DECLARE
  v_rol rol_usuario;
BEGIN
  SELECT rol INTO v_rol
  FROM membresias
  WHERE usuario_id = p_usuario_id
    AND (sede_id = p_sede_id OR rol = 'super_admin')
    AND activa = true
  ORDER BY
    CASE rol
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'profesor' THEN 3
      WHEN 'alumno' THEN 4
    END
  LIMIT 1;

  RETURN v_rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_rol_usuario_sede IS 'Obtiene el rol principal de un usuario en una sede';

-- =============================================================================
-- FUNCIÓN: Verificar disponibilidad de profesor
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_disponibilidad_profesor(
  p_profesor_id UUID,
  p_fecha_inicio TIMESTAMPTZ,
  p_fecha_fin TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflictos INTEGER;
  v_dia_semana dia_semana;
  v_hora_inicio TIME;
  v_hora_fin TIME;
BEGIN
  -- Verificar reservas existentes confirmadas
  SELECT COUNT(*) INTO v_conflictos
  FROM reservas
  WHERE profesor_id = p_profesor_id
    AND estado = 'confirmada'
    AND (
      (fecha_inicio < p_fecha_fin AND fecha_fin > p_fecha_inicio)
    );

  IF v_conflictos > 0 THEN
    RETURN FALSE;
  END IF;

  -- Verificar bloqueos puntuales
  SELECT COUNT(*) INTO v_conflictos
  FROM bloqueos_disponibilidad
  WHERE profesor_id = p_profesor_id
    AND activo = true
    AND NOT es_recurrente
    AND (
      (fecha_inicio < p_fecha_fin AND fecha_fin > p_fecha_inicio)
    );

  IF v_conflictos > 0 THEN
    RETURN FALSE;
  END IF;

  -- Verificar bloqueos recurrentes
  -- Obtener día de la semana y hora del slot
  v_dia_semana := CASE EXTRACT(DOW FROM p_fecha_inicio)
    WHEN 0 THEN 'domingo'::dia_semana
    WHEN 1 THEN 'lunes'::dia_semana
    WHEN 2 THEN 'martes'::dia_semana
    WHEN 3 THEN 'miercoles'::dia_semana
    WHEN 4 THEN 'jueves'::dia_semana
    WHEN 5 THEN 'viernes'::dia_semana
    WHEN 6 THEN 'sabado'::dia_semana
  END;

  v_hora_inicio := p_fecha_inicio::TIME;
  v_hora_fin := p_fecha_fin::TIME;

  SELECT COUNT(*) INTO v_conflictos
  FROM bloqueos_disponibilidad
  WHERE profesor_id = p_profesor_id
    AND activo = true
    AND es_recurrente
    AND dia_semana = v_dia_semana
    AND (
      (hora_inicio < v_hora_fin AND hora_fin > v_hora_inicio)
    )
    AND (
      fecha_vigencia_inicio IS NULL OR p_fecha_inicio::DATE >= fecha_vigencia_inicio
    )
    AND (
      fecha_vigencia_fin IS NULL OR p_fecha_inicio::DATE <= fecha_vigencia_fin
    );

  IF v_conflictos > 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verificar_disponibilidad_profesor IS 'Verifica si un profesor está disponible en un horario específico';

-- =============================================================================
-- FUNCIÓN: Generar crédito de recupero
-- =============================================================================

CREATE OR REPLACE FUNCTION generar_credito_recupero(
  p_reserva_id UUID,
  p_alumno_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_credito_id UUID;
  v_sede_id UUID;
  v_meses_validez INTEGER;
BEGIN
  -- Obtener sede_id y meses de validez
  SELECT r.sede_id, COALESCE(cs.meses_validez_creditos, 3)
  INTO v_sede_id, v_meses_validez
  FROM reservas r
  JOIN configuracion_sede cs ON r.sede_id = cs.sede_id
  WHERE r.id = p_reserva_id;

  -- Insertar crédito
  INSERT INTO creditos_recupero (
    alumno_id,
    reserva_cancelada_id,
    sede_id,
    fecha_expiracion
  ) VALUES (
    p_alumno_id,
    p_reserva_id,
    v_sede_id,
    CURRENT_DATE + (v_meses_validez || ' months')::INTERVAL
  )
  RETURNING id INTO v_credito_id;

  RETURN v_credito_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generar_credito_recupero IS 'Genera un crédito recuperable por cancelación anticipada';

-- =============================================================================
-- FUNCIÓN: Verificar créditos disponibles de alumno
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_creditos_disponibles(
  p_alumno_id UUID,
  p_sede_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_creditos INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_creditos
  FROM creditos_recupero
  WHERE alumno_id = p_alumno_id
    AND sede_id = p_sede_id
    AND utilizado = false
    AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE);

  RETURN v_creditos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verificar_creditos_disponibles IS 'Cuenta los créditos disponibles de un alumno en una sede';

-- =============================================================================
-- FUNCIÓN: Utilizar crédito
-- =============================================================================

CREATE OR REPLACE FUNCTION utilizar_credito(
  p_credito_id UUID,
  p_reserva_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE creditos_recupero
  SET
    utilizado = true,
    reserva_utilizado_id = p_reserva_id,
    fecha_utilizacion = NOW()
  WHERE id = p_credito_id
    AND utilizado = false
    AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE);

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION utilizar_credito IS 'Marca un crédito como utilizado para una reserva';

-- =============================================================================
-- FUNCIÓN: Obtener slots disponibles para una sede y fecha
-- =============================================================================

CREATE OR REPLACE FUNCTION obtener_slots_disponibles(
  p_sede_id UUID,
  p_fecha DATE,
  p_tipo tipo_reserva DEFAULT NULL
)
RETURNS TABLE (
  profesor_id UUID,
  profesor_nombre VARCHAR,
  hora_inicio TIME,
  hora_fin TIME,
  tipo tipo_reserva,
  cupo_disponible INTEGER
) AS $$
BEGIN
  -- Esta función retorna slots teóricos disponibles
  -- La lógica completa se implementará en el backend para mejor performance
  RETURN QUERY
  SELECT
    p.id AS profesor_id,
    u.nombre || ' ' || u.apellido AS profesor_nombre,
    cs.hora_apertura AS hora_inicio,
    (cs.hora_apertura + (cs.duracion_clase_minutos || ' minutes')::INTERVAL)::TIME AS hora_fin,
    'individual'::tipo_reserva AS tipo,
    1 AS cupo_disponible
  FROM profesores p
  JOIN usuarios u ON p.usuario_id = u.id
  JOIN sedes s ON p.sede_id = s.id
  JOIN configuracion_sede cs ON s.id = cs.sede_id
  WHERE p.sede_id = p_sede_id
    AND p.activo = true
  LIMIT 10;  -- Simplificado, la lógica completa va en backend
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_slots_disponibles IS 'Obtiene slots teóricos disponibles (lógica completa en backend)';

-- =============================================================================
-- FUNCIÓN: Validar si alumno puede cancelar (tiempo de anticipación)
-- =============================================================================

CREATE OR REPLACE FUNCTION puede_cancelar_reserva(
  p_reserva_id UUID
)
RETURNS TABLE (
  puede_cancelar BOOLEAN,
  genera_credito BOOLEAN,
  minutos_anticipacion INTEGER,
  minutos_requeridos INTEGER
) AS $$
DECLARE
  v_fecha_inicio TIMESTAMPTZ;
  v_sede_id UUID;
  v_minutos_requeridos INTEGER;
  v_minutos_anticipacion INTEGER;
BEGIN
  -- Obtener datos de la reserva
  SELECT r.fecha_inicio, r.sede_id
  INTO v_fecha_inicio, v_sede_id
  FROM reservas r
  WHERE r.id = p_reserva_id;

  -- Obtener configuración de sede
  SELECT cs.minutos_anticipacion_cancelacion
  INTO v_minutos_requeridos
  FROM configuracion_sede cs
  WHERE cs.sede_id = v_sede_id;

  -- Calcular minutos de anticipación
  v_minutos_anticipacion := EXTRACT(EPOCH FROM (v_fecha_inicio - NOW())) / 60;

  RETURN QUERY SELECT
    true AS puede_cancelar,  -- Siempre se puede cancelar
    v_minutos_anticipacion >= v_minutos_requeridos AS genera_credito,
    v_minutos_anticipacion::INTEGER AS minutos_anticipacion,
    v_minutos_requeridos AS minutos_requeridos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION puede_cancelar_reserva IS 'Valida si una reserva puede ser cancelada y si genera crédito';

-- =============================================================================
-- FUNCIÓN: Obtener próximos horarios disponibles después de baja de horario fijo
-- =============================================================================

CREATE OR REPLACE FUNCTION obtener_proximos_slots_recomendados(
  p_alumno_id UUID,
  p_sede_id UUID,
  p_dia_semana dia_semana DEFAULT NULL,
  p_limite INTEGER DEFAULT 5
)
RETURNS TABLE (
  profesor_id UUID,
  profesor_nombre VARCHAR,
  fecha_slot DATE,
  hora_inicio TIME,
  hora_fin TIME,
  tipo tipo_reserva
) AS $$
BEGIN
  -- Simplificado: retornar slots teóricos
  -- Lógica completa de recomendación se implementa en backend
  RETURN QUERY
  SELECT
    p.id AS profesor_id,
    u.nombre || ' ' || u.apellido AS profesor_nombre,
    CURRENT_DATE + 7 AS fecha_slot,
    '10:00'::TIME AS hora_inicio,
    '11:00'::TIME AS hora_fin,
    'individual'::tipo_reserva AS tipo
  FROM profesores p
  JOIN usuarios u ON p.usuario_id = u.id
  WHERE p.sede_id = p_sede_id
    AND p.activo = true
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_proximos_slots_recomendados IS 'Recomienda próximos slots disponibles (lógica completa en backend)';

-- =============================================================================
-- FUNCIÓN: Dar de baja horario fijo
-- =============================================================================

CREATE OR REPLACE FUNCTION dar_baja_horario_fijo(
  p_horario_fijo_id UUID,
  p_alumno_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_es_propietario BOOLEAN;
BEGIN
  -- Verificar que el alumno sea el propietario
  SELECT EXISTS(
    SELECT 1 FROM horarios_fijos
    WHERE id = p_horario_fijo_id
      AND alumno_id = p_alumno_id
      AND activo = true
  ) INTO v_es_propietario;

  IF NOT v_es_propietario THEN
    RETURN FALSE;
  END IF;

  -- Marcar horario fijo como inactivo
  UPDATE horarios_fijos
  SET
    activo = false,
    fecha_baja = CURRENT_DATE,
    motivo_baja = p_motivo
  WHERE id = p_horario_fijo_id;

  -- Registrar la baja
  INSERT INTO bajas_horarios_fijos (
    horario_fijo_id,
    alumno_id,
    fecha_baja,
    motivo
  ) VALUES (
    p_horario_fijo_id,
    p_alumno_id,
    CURRENT_DATE,
    p_motivo
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION dar_baja_horario_fijo IS 'Permite al alumno dar de baja su horario fijo';

-- =============================================================================
-- FIN MIGRACIÓN 00003
-- =============================================================================
