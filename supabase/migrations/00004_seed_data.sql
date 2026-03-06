-- =============================================================================
-- MIGRACIÓN 00004: DATOS DE EJEMPLO (SEED DATA)
-- =============================================================================
-- Descripción: Datos iniciales para testing y desarrollo
-- Autor: Sistema
-- Fecha: 2026-03-05
-- =============================================================================

-- IMPORTANTE: Este archivo contiene datos de ejemplo.
-- NO ejecutar en producción sin modificar las contraseñas y datos sensibles.

-- =============================================================================
-- 1. ORGANIZACIONES
-- =============================================================================

INSERT INTO organizaciones (id, nombre, descripcion, activa) VALUES
('11111111-1111-1111-1111-111111111111', 'Club Deportivo Central', 'Club deportivo multi-disciplinario con sedes en toda la ciudad', true),
('22222222-2222-2222-2222-222222222222', 'Estudio Wellness', 'Estudio de yoga y pilates', true);

-- =============================================================================
-- 2. SEDES
-- =============================================================================

INSERT INTO sedes (id, organizacion_id, nombre, slug, direccion, telefono, email, activa) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Sede Centro', 'club-central-centro', 'Av. Corrientes 1234, CABA', '+54 11 1234-5678', 'centro@clubcentral.com', true),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Sede Norte', 'club-central-norte', 'Av. Cabildo 5678, CABA', '+54 11 8765-4321', 'norte@clubcentral.com', true),
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Estudio Palermo', 'wellness-palermo', 'Av. Santa Fe 2000, CABA', '+54 11 5555-5555', 'palermo@wellness.com', true);

-- =============================================================================
-- 3. CONFIGURACIÓN DE SEDES
-- =============================================================================
-- Nota: Las configuraciones se crean automáticamente por trigger
-- Aquí las actualizamos con valores específicos

UPDATE configuracion_sede
SET
  hora_apertura = '08:00',
  hora_cierre = '22:00',
  duracion_clase_minutos = 60,
  cupo_maximo_grupal = 6,
  minutos_anticipacion_cancelacion = 1440, -- 24 horas
  meses_validez_creditos = 3,
  permitir_reservas_multiples = true,
  mostrar_calendario_publico = true,
  mostrar_nombre_profesor_publico = true
WHERE sede_id = '33333333-3333-3333-3333-333333333333';

UPDATE configuracion_sede
SET
  hora_apertura = '07:00',
  hora_cierre = '21:00',
  duracion_clase_minutos = 45,
  cupo_maximo_grupal = 4,
  minutos_anticipacion_cancelacion = 1440,
  meses_validez_creditos = 3,
  permitir_reservas_multiples = true,
  mostrar_calendario_publico = true,
  mostrar_nombre_profesor_publico = false
WHERE sede_id = '44444444-4444-4444-4444-444444444444';

UPDATE configuracion_sede
SET
  hora_apertura = '09:00',
  hora_cierre = '20:00',
  duracion_clase_minutos = 60,
  cupo_maximo_grupal = 10,
  minutos_anticipacion_cancelacion = 720, -- 12 horas
  meses_validez_creditos = 2,
  permitir_reservas_multiples = true,
  mostrar_calendario_publico = true,
  mostrar_nombre_profesor_publico = true
WHERE sede_id = '55555555-5555-5555-5555-555555555555';

-- =============================================================================
-- 4. USUARIOS DE EJEMPLO
-- =============================================================================
-- Nota: Estos UUIDs deben corresponder con usuarios creados en Supabase Auth
-- En desarrollo, crear estos usuarios manualmente o mediante script

-- IMPORTANTE: Los siguientes inserts son ejemplos.
-- En producción, los usuarios se crearán mediante Supabase Auth y estos
-- registros se insertarán automáticamente via trigger o server action.

-- Ejemplo de estructura (no ejecutar tal cual):
-- INSERT INTO usuarios (id, email, nombre, apellido, telefono, activo) VALUES
-- ('user-uuid-from-auth', 'super@admin.com', 'Super', 'Admin', '+54 11 1111-1111', true);

-- Para desarrollo, comentar los inserts de usuarios y crearlos manualmente
-- mediante el flujo de registro de la aplicación.

-- =============================================================================
-- 5. MEMBRESÍAS DE EJEMPLO
-- =============================================================================
-- Las membresías se asignarán cuando se creen usuarios reales

-- Ejemplo de estructura:
-- INSERT INTO membresias (usuario_id, sede_id, organizacion_id, rol, activa) VALUES
-- ('super-admin-uuid', NULL, NULL, 'super_admin', true);
-- ('admin-uuid', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'admin', true);

-- =============================================================================
-- 6. PROFESORES Y ALUMNOS DE EJEMPLO
-- =============================================================================
-- Se crearán mediante la aplicación una vez que existan usuarios

-- =============================================================================
-- 7. RESERVAS DE EJEMPLO
-- =============================================================================
-- Se crearán mediante la aplicación para testing

-- =============================================================================
-- COMENTARIOS PARA DESARROLLO
-- =============================================================================

COMMENT ON TABLE organizaciones IS 'Se han creado 2 organizaciones de ejemplo';
COMMENT ON TABLE sedes IS 'Se han creado 3 sedes de ejemplo con diferentes configuraciones';

-- =============================================================================
-- FIN MIGRACIÓN 00004
-- =============================================================================
