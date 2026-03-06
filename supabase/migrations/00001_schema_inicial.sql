-- =============================================================================
-- MIGRACIÓN 00001: ESQUEMA INICIAL - PLATAFORMA DE GESTIÓN DE TURNOS
-- =============================================================================
-- Descripción: Creación de todas las tablas, enums, constraints, índices y triggers
-- Autor: Sistema
-- Fecha: 2026-03-05
-- =============================================================================

-- =============================================================================
-- ENUMS Y TIPOS PERSONALIZADOS
-- =============================================================================

-- Enum para roles de usuario
CREATE TYPE rol_usuario AS ENUM (
  'super_admin',
  'admin',
  'profesor',
  'alumno'
);

-- Enum para tipos de reserva
CREATE TYPE tipo_reserva AS ENUM (
  'individual',
  'grupal'
);

-- Enum para estados de reserva
CREATE TYPE estado_reserva AS ENUM (
  'confirmada',
  'cancelada',
  'completada'
);

-- Enum para frecuencia de horarios fijos
CREATE TYPE frecuencia_horario AS ENUM (
  'semanal_1',  -- 1 vez por semana
  'semanal_2',  -- 2 veces por semana
  'semanal_3'   -- 3 veces por semana
);

-- Enum para días de la semana
CREATE TYPE dia_semana AS ENUM (
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo'
);

-- Enum para estados de pago
CREATE TYPE estado_pago AS ENUM (
  'pendiente',
  'aprobado',
  'rechazado',
  'cancelado',
  'reembolsado'
);

-- Enum para tipo de autorización de profesor
CREATE TYPE tipo_autorizacion_profesor AS ENUM (
  'solo_individual',
  'solo_grupal',
  'ambas'
);

-- =============================================================================
-- TABLAS PRINCIPALES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ORGANIZACIONES
-- -----------------------------------------------------------------------------
CREATE TABLE organizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  logo_url TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT organizaciones_nombre_unique UNIQUE (nombre)
);

CREATE INDEX idx_organizaciones_activa ON organizaciones(activa);

COMMENT ON TABLE organizaciones IS 'Organizaciones multi-tenant del sistema';

-- -----------------------------------------------------------------------------
-- 2. SEDES
-- -----------------------------------------------------------------------------
CREATE TABLE sedes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,  -- Para URL pública
  direccion TEXT,
  telefono VARCHAR(50),
  email VARCHAR(255),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sedes_slug_unique UNIQUE (slug),
  CONSTRAINT sedes_org_nombre_unique UNIQUE (organizacion_id, nombre)
);

CREATE INDEX idx_sedes_organizacion ON sedes(organizacion_id);
CREATE INDEX idx_sedes_slug ON sedes(slug);
CREATE INDEX idx_sedes_activa ON sedes(activa);

COMMENT ON TABLE sedes IS 'Sucursales/sedes por organización';
COMMENT ON COLUMN sedes.slug IS 'Slug para URL pública del calendario';

-- -----------------------------------------------------------------------------
-- 3. CONFIGURACION_SEDE
-- -----------------------------------------------------------------------------
CREATE TABLE configuracion_sede (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,

  -- Horarios laborales
  hora_apertura TIME NOT NULL DEFAULT '07:00',
  hora_cierre TIME NOT NULL DEFAULT '18:00',

  -- Duración de clases
  duracion_clase_minutos INTEGER NOT NULL DEFAULT 60,

  -- Cupo grupal
  cupo_maximo_grupal INTEGER NOT NULL DEFAULT 4,

  -- Configuración de reservas
  minutos_anticipacion_cancelacion INTEGER DEFAULT 1440, -- 24 horas en minutos
  meses_validez_creditos INTEGER DEFAULT 3, -- Validez de créditos en meses
  permitir_reservas_multiples BOOLEAN DEFAULT true,

  -- Calendario público
  mostrar_calendario_publico BOOLEAN DEFAULT true,
  mostrar_nombre_profesor_publico BOOLEAN DEFAULT true,

  -- Timezone
  timezone VARCHAR(100) DEFAULT 'America/Argentina/Buenos_Aires',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT configuracion_sede_unique UNIQUE (sede_id),
  CONSTRAINT hora_cierre_mayor CHECK (hora_cierre > hora_apertura),
  CONSTRAINT duracion_positiva CHECK (duracion_clase_minutos > 0),
  CONSTRAINT cupo_positivo CHECK (cupo_maximo_grupal > 0),
  CONSTRAINT meses_creditos_positivo CHECK (meses_validez_creditos > 0)
);

CREATE INDEX idx_configuracion_sede ON configuracion_sede(sede_id);

COMMENT ON TABLE configuracion_sede IS 'Configuración específica por sede';

-- -----------------------------------------------------------------------------
-- 4. USUARIOS (extiende auth.users de Supabase)
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  avatar_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT usuarios_email_unique UNIQUE (email)
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

COMMENT ON TABLE usuarios IS 'Extensión de auth.users con datos adicionales';

-- -----------------------------------------------------------------------------
-- 5. MEMBRESIAS (tabla de unión usuarios-roles-sedes)
-- -----------------------------------------------------------------------------
CREATE TABLE membresias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes(id) ON DELETE CASCADE,  -- NULL para super_admin
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  rol rol_usuario NOT NULL,
  activa BOOLEAN DEFAULT true,
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT membresia_usuario_sede_rol_unique UNIQUE (usuario_id, sede_id, rol),
  CONSTRAINT super_admin_sin_sede CHECK (
    (rol = 'super_admin' AND sede_id IS NULL) OR
    (rol != 'super_admin' AND sede_id IS NOT NULL)
  ),
  CONSTRAINT fecha_fin_mayor CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX idx_membresias_usuario ON membresias(usuario_id);
CREATE INDEX idx_membresias_sede ON membresias(sede_id);
CREATE INDEX idx_membresias_rol ON membresias(rol);
CREATE INDEX idx_membresias_activa ON membresias(activa);
CREATE INDEX idx_membresias_organizacion ON membresias(organizacion_id);

COMMENT ON TABLE membresias IS 'Roles y permisos de usuarios por sede/organización';

-- -----------------------------------------------------------------------------
-- 6. PROFESORES
-- -----------------------------------------------------------------------------
CREATE TABLE profesores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  tipo_autorizacion tipo_autorizacion_profesor NOT NULL DEFAULT 'ambas',
  especialidad VARCHAR(255),
  biografia TEXT,
  color_calendario VARCHAR(7) DEFAULT '#3B82F6',  -- Hex color para calendario
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT profesores_usuario_sede_unique UNIQUE (usuario_id, sede_id)
);

CREATE INDEX idx_profesores_usuario ON profesores(usuario_id);
CREATE INDEX idx_profesores_sede ON profesores(sede_id);
CREATE INDEX idx_profesores_activo ON profesores(activo);

COMMENT ON TABLE profesores IS 'Perfil de profesores con autorización de modalidades';
COMMENT ON COLUMN profesores.tipo_autorizacion IS 'Define si puede crear clases individuales, grupales o ambas';

-- -----------------------------------------------------------------------------
-- 7. ALUMNOS
-- -----------------------------------------------------------------------------
CREATE TABLE alumnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  fecha_nacimiento DATE,
  contacto_emergencia VARCHAR(255),
  telefono_emergencia VARCHAR(50),
  notas_medicas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT alumnos_usuario_sede_unique UNIQUE (usuario_id, sede_id)
);

CREATE INDEX idx_alumnos_usuario ON alumnos(usuario_id);
CREATE INDEX idx_alumnos_sede ON alumnos(sede_id);
CREATE INDEX idx_alumnos_activo ON alumnos(activo);

COMMENT ON TABLE alumnos IS 'Perfil de alumnos por sede';

-- -----------------------------------------------------------------------------
-- 8. RESERVAS
-- -----------------------------------------------------------------------------
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  tipo tipo_reserva NOT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  estado estado_reserva DEFAULT 'confirmada',
  cupo_maximo INTEGER,  -- Solo para grupales
  cupo_actual INTEGER DEFAULT 0,  -- Solo para grupales
  notas TEXT,
  creado_por UUID NOT NULL REFERENCES usuarios(id),
  cancelado_por UUID REFERENCES usuarios(id),
  fecha_cancelacion TIMESTAMPTZ,
  motivo_cancelacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fecha_fin_mayor_inicio CHECK (fecha_fin > fecha_inicio),
  CONSTRAINT cupo_actual_menor_maximo CHECK (
    tipo = 'individual' OR cupo_actual <= cupo_maximo
  ),
  CONSTRAINT cupo_maximo_grupal CHECK (
    tipo = 'individual' OR cupo_maximo > 0
  )
);

CREATE INDEX idx_reservas_sede ON reservas(sede_id);
CREATE INDEX idx_reservas_profesor ON reservas(profesor_id);
CREATE INDEX idx_reservas_fecha_inicio ON reservas(fecha_inicio);
CREATE INDEX idx_reservas_fecha_fin ON reservas(fecha_fin);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_tipo ON reservas(tipo);
CREATE INDEX idx_reservas_profesor_fecha ON reservas(profesor_id, fecha_inicio, fecha_fin);

COMMENT ON TABLE reservas IS 'Reservas de clases individuales y grupales';

-- -----------------------------------------------------------------------------
-- 9. PARTICIPANTES_RESERVA (solo para reservas grupales)
-- -----------------------------------------------------------------------------
CREATE TABLE participantes_reserva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  confirmado BOOLEAN DEFAULT true,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT participante_reserva_unique UNIQUE (reserva_id, alumno_id)
);

CREATE INDEX idx_participantes_reserva ON participantes_reserva(reserva_id);
CREATE INDEX idx_participantes_alumno ON participantes_reserva(alumno_id);

COMMENT ON TABLE participantes_reserva IS 'Alumnos inscritos en reservas grupales';

-- -----------------------------------------------------------------------------
-- 10. HORARIOS_FIJOS (recurrentes)
-- -----------------------------------------------------------------------------
CREATE TABLE horarios_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  tipo tipo_reserva NOT NULL DEFAULT 'individual',

  -- Configuración de recurrencia
  frecuencia frecuencia_horario NOT NULL,
  dias_semana dia_semana[] NOT NULL,  -- Array de días
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,

  -- Vigencia
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,  -- NULL = indefinido

  activo BOOLEAN DEFAULT true,
  fecha_baja DATE,  -- Cuando el alumno da de baja
  motivo_baja TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT hora_fin_mayor_inicio CHECK (hora_fin > hora_inicio),
  CONSTRAINT fecha_fin_mayor_inicio CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT dias_coherente_frecuencia CHECK (
    (frecuencia = 'semanal_1' AND array_length(dias_semana, 1) = 1) OR
    (frecuencia = 'semanal_2' AND array_length(dias_semana, 1) = 2) OR
    (frecuencia = 'semanal_3' AND array_length(dias_semana, 1) = 3)
  )
);

CREATE INDEX idx_horarios_fijos_alumno ON horarios_fijos(alumno_id);
CREATE INDEX idx_horarios_fijos_profesor ON horarios_fijos(profesor_id);
CREATE INDEX idx_horarios_fijos_sede ON horarios_fijos(sede_id);
CREATE INDEX idx_horarios_fijos_activo ON horarios_fijos(activo);
CREATE INDEX idx_horarios_fijos_fechas ON horarios_fijos(fecha_inicio, fecha_fin);

COMMENT ON TABLE horarios_fijos IS 'Horarios recurrentes semanales de alumnos';

-- -----------------------------------------------------------------------------
-- 11. BAJAS_HORARIOS_FIJOS (registro de bajas)
-- -----------------------------------------------------------------------------
CREATE TABLE bajas_horarios_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_fijo_id UUID NOT NULL REFERENCES horarios_fijos(id) ON DELETE CASCADE,
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha_baja DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT una_baja_por_horario UNIQUE (horario_fijo_id)
);

CREATE INDEX idx_bajas_horario_fijo ON bajas_horarios_fijos(horario_fijo_id);
CREATE INDEX idx_bajas_alumno ON bajas_horarios_fijos(alumno_id);

COMMENT ON TABLE bajas_horarios_fijos IS 'Registro de bajas de horarios fijos por alumnos';

-- -----------------------------------------------------------------------------
-- 12. BLOQUEOS_DISPONIBILIDAD (profesor bloquea horarios)
-- -----------------------------------------------------------------------------
CREATE TABLE bloqueos_disponibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,

  -- Bloqueo puntual o recurrente
  es_recurrente BOOLEAN DEFAULT false,

  -- Si es puntual
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,

  -- Si es recurrente
  dia_semana dia_semana,
  hora_inicio TIME,
  hora_fin TIME,
  fecha_vigencia_inicio DATE,
  fecha_vigencia_fin DATE,

  motivo TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT bloqueo_puntual_valido CHECK (
    (NOT es_recurrente AND fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_fin > fecha_inicio) OR
    es_recurrente
  ),
  CONSTRAINT bloqueo_recurrente_valido CHECK (
    (es_recurrente AND dia_semana IS NOT NULL AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio) OR
    NOT es_recurrente
  )
);

CREATE INDEX idx_bloqueos_profesor ON bloqueos_disponibilidad(profesor_id);
CREATE INDEX idx_bloqueos_sede ON bloqueos_disponibilidad(sede_id);
CREATE INDEX idx_bloqueos_activo ON bloqueos_disponibilidad(activo);
CREATE INDEX idx_bloqueos_fecha_inicio ON bloqueos_disponibilidad(fecha_inicio);
CREATE INDEX idx_bloqueos_recurrente ON bloqueos_disponibilidad(es_recurrente);

COMMENT ON TABLE bloqueos_disponibilidad IS 'Bloqueos puntuales y recurrentes de disponibilidad de profesores';

-- -----------------------------------------------------------------------------
-- 13. CREDITOS_RECUPERO (créditos por cancelaciones >=24h)
-- -----------------------------------------------------------------------------
CREATE TABLE creditos_recupero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  reserva_cancelada_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,

  -- Crédito
  cantidad INTEGER DEFAULT 1,
  utilizado BOOLEAN DEFAULT false,
  reserva_utilizado_id UUID REFERENCES reservas(id),  -- En qué reserva se usó
  fecha_utilizacion TIMESTAMPTZ,
  fecha_expiracion DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cantidad_positiva CHECK (cantidad > 0),
  CONSTRAINT credito_utilizado_coherente CHECK (
    (utilizado = true AND reserva_utilizado_id IS NOT NULL AND fecha_utilizacion IS NOT NULL) OR
    (utilizado = false AND reserva_utilizado_id IS NULL AND fecha_utilizacion IS NULL)
  )
);

CREATE INDEX idx_creditos_alumno ON creditos_recupero(alumno_id);
CREATE INDEX idx_creditos_utilizado ON creditos_recupero(utilizado);
CREATE INDEX idx_creditos_sede ON creditos_recupero(sede_id);
CREATE INDEX idx_creditos_expiracion ON creditos_recupero(fecha_expiracion);

COMMENT ON TABLE creditos_recupero IS 'Créditos recuperables por cancelaciones con anticipación';

-- -----------------------------------------------------------------------------
-- 14. PAGOS_MERCADOPAGO
-- -----------------------------------------------------------------------------
CREATE TABLE pagos_mercadopago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  reserva_id UUID REFERENCES reservas(id) ON DELETE SET NULL,

  -- IDs de Mercado Pago
  preference_id VARCHAR(255),
  payment_id VARCHAR(255),
  merchant_order_id VARCHAR(255),

  -- Detalles del pago
  monto DECIMAL(10, 2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'ARS',
  descripcion TEXT,
  estado estado_pago DEFAULT 'pendiente',

  -- Metadata
  metadata JSONB,  -- Para almacenar datos adicionales de MP

  -- Fechas
  fecha_pago TIMESTAMPTZ,
  fecha_aprobacion TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT monto_positivo CHECK (monto > 0)
);

CREATE INDEX idx_pagos_alumno ON pagos_mercadopago(alumno_id);
CREATE INDEX idx_pagos_sede ON pagos_mercadopago(sede_id);
CREATE INDEX idx_pagos_reserva ON pagos_mercadopago(reserva_id);
CREATE INDEX idx_pagos_estado ON pagos_mercadopago(estado);
CREATE INDEX idx_pagos_preference ON pagos_mercadopago(preference_id);
CREATE INDEX idx_pagos_payment ON pagos_mercadopago(payment_id);

COMMENT ON TABLE pagos_mercadopago IS 'Historial de pagos de Mercado Pago';

-- =============================================================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_organizaciones_updated_at BEFORE UPDATE ON organizaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sedes_updated_at BEFORE UPDATE ON sedes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracion_sede_updated_at BEFORE UPDATE ON configuracion_sede
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membresias_updated_at BEFORE UPDATE ON membresias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profesores_updated_at BEFORE UPDATE ON profesores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alumnos_updated_at BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_horarios_fijos_updated_at BEFORE UPDATE ON horarios_fijos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bloqueos_updated_at BEFORE UPDATE ON bloqueos_disponibilidad
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creditos_updated_at BEFORE UPDATE ON creditos_recupero
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON pagos_mercadopago
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGERS ADICIONALES
-- =============================================================================

-- Trigger para actualizar cupo_actual en reservas grupales
CREATE OR REPLACE FUNCTION actualizar_cupo_reserva()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reservas
    SET cupo_actual = cupo_actual + 1
    WHERE id = NEW.reserva_id AND tipo = 'grupal';
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reservas
    SET cupo_actual = cupo_actual - 1
    WHERE id = OLD.reserva_id AND tipo = 'grupal';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_cupo_reserva
AFTER INSERT OR DELETE ON participantes_reserva
FOR EACH ROW EXECUTE FUNCTION actualizar_cupo_reserva();

-- Trigger para crear configuración automática al crear sede
CREATE OR REPLACE FUNCTION crear_configuracion_sede_automatica()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO configuracion_sede (sede_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crear_configuracion_sede
AFTER INSERT ON sedes
FOR EACH ROW EXECUTE FUNCTION crear_configuracion_sede_automatica();

-- =============================================================================
-- FIN MIGRACIÓN 00001
-- =============================================================================
