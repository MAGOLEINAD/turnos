-- =============================================================================
-- MIGRACIÓN 00002: POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =============================================================================
-- Descripción: Implementación completa de políticas de seguridad por rol
-- Autor: Sistema
-- Fecha: 2026-03-05
-- =============================================================================

-- =============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================================================

ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sede ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE membresias ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes_reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bajas_horarios_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditos_recupero ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_mercadopago ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLÍTICAS PARA ORGANIZACIONES
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_organizaciones" ON organizaciones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: solo lectura de su organización
CREATE POLICY "admin_read_organizaciones" ON organizaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND organizacion_id = organizaciones.id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor y Alumno: lectura de su organización
CREATE POLICY "profesor_alumno_read_organizaciones" ON organizaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND organizacion_id = organizaciones.id
        AND rol IN ('profesor', 'alumno')
        AND activa = true
    )
  );

-- =============================================================================
-- POLÍTICAS PARA SEDES
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_sedes" ON sedes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: acceso a sus sedes
CREATE POLICY "admin_all_sedes" ON sedes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = sedes.id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor: lectura de su sede
CREATE POLICY "profesor_read_sede" ON sedes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profesores
      WHERE usuario_id = auth.uid()
        AND sede_id = sedes.id
        AND activo = true
    )
  );

-- Alumno: lectura de su sede
CREATE POLICY "alumno_read_sede" ON sedes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND sede_id = sedes.id
        AND activo = true
    )
  );

-- Público: lectura de sedes activas (para calendario público)
CREATE POLICY "public_read_sedes_activas" ON sedes
  FOR SELECT
  USING (activa = true);

-- =============================================================================
-- POLÍTICAS PARA CONFIGURACION_SEDE
-- =============================================================================

-- Super Admin y Admin: acceso total
CREATE POLICY "admin_all_configuracion_sede" ON configuracion_sede
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias m
      JOIN sedes s ON (m.sede_id = s.id OR m.rol = 'super_admin')
      WHERE m.usuario_id = auth.uid()
        AND s.id = configuracion_sede.sede_id
        AND m.rol IN ('super_admin', 'admin')
        AND m.activa = true
    )
  );

-- Profesor y Alumno: solo lectura
CREATE POLICY "profesor_alumno_read_configuracion" ON configuracion_sede
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = configuracion_sede.sede_id
        AND activa = true
    )
  );

-- Público: lectura para calendario público
CREATE POLICY "public_read_configuracion" ON configuracion_sede
  FOR SELECT
  USING (true);

-- =============================================================================
-- POLÍTICAS PARA USUARIOS
-- =============================================================================

-- Propio usuario: acceso total
CREATE POLICY "usuario_own_profile" ON usuarios
  FOR ALL
  USING (id = auth.uid());

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_usuarios" ON usuarios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: lectura de usuarios de sus sedes
CREATE POLICY "admin_read_usuarios_sede" ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias m1
      JOIN membresias m2 ON m1.sede_id = m2.sede_id
      WHERE m1.usuario_id = auth.uid()
        AND m2.usuario_id = usuarios.id
        AND m1.rol = 'admin'
        AND m1.activa = true
    )
  );

-- Profesor: lectura de usuarios de su sede
CREATE POLICY "profesor_read_usuarios_sede" ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profesores p
      JOIN membresias m ON p.sede_id = m.sede_id
      WHERE p.usuario_id = auth.uid()
        AND m.usuario_id = usuarios.id
        AND p.activo = true
    )
  );

-- =============================================================================
-- POLÍTICAS PARA MEMBRESIAS
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_membresias" ON membresias
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: gestionar membresías de su sede
CREATE POLICY "admin_all_membresias_sede" ON membresias
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias m
      WHERE m.usuario_id = auth.uid()
        AND m.sede_id = membresias.sede_id
        AND m.rol = 'admin'
        AND m.activa = true
    )
  );

-- Usuario: ver sus propias membresías
CREATE POLICY "usuario_read_own_membresias" ON membresias
  FOR SELECT
  USING (usuario_id = auth.uid());

-- =============================================================================
-- POLÍTICAS PARA PROFESORES
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_profesores" ON profesores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: gestionar profesores de su sede
CREATE POLICY "admin_all_profesores_sede" ON profesores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = profesores.sede_id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor: ver su propio perfil y actualizarlo
CREATE POLICY "profesor_all_own" ON profesores
  FOR ALL
  USING (usuario_id = auth.uid());

-- Alumno: ver profesores de su sede
CREATE POLICY "alumno_read_profesores_sede" ON profesores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND sede_id = profesores.sede_id
        AND activo = true
    )
  );

-- Público: ver profesores activos (calendario público)
CREATE POLICY "public_read_profesores_activos" ON profesores
  FOR SELECT
  USING (activo = true);

-- =============================================================================
-- POLÍTICAS PARA ALUMNOS
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_alumnos" ON alumnos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: gestionar alumnos de su sede
CREATE POLICY "admin_all_alumnos_sede" ON alumnos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = alumnos.sede_id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor: ver alumnos de su sede
CREATE POLICY "profesor_read_alumnos_sede" ON alumnos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profesores
      WHERE usuario_id = auth.uid()
        AND sede_id = alumnos.sede_id
        AND activo = true
    )
  );

-- Alumno: gestionar su propio perfil
CREATE POLICY "alumno_all_own" ON alumnos
  FOR ALL
  USING (usuario_id = auth.uid());

-- =============================================================================
-- POLÍTICAS PARA RESERVAS
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_reservas" ON reservas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: gestionar reservas de su sede
CREATE POLICY "admin_all_reservas_sede" ON reservas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = reservas.sede_id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor: gestionar reservas donde es profesor
CREATE POLICY "profesor_all_reservas_propias" ON reservas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profesores
      WHERE usuario_id = auth.uid()
        AND id = reservas.profesor_id
        AND activo = true
    )
  );

-- Alumno: ver reservas donde participa
CREATE POLICY "alumno_read_reservas" ON reservas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alumnos a
      LEFT JOIN participantes_reserva pr ON pr.alumno_id = a.id
      WHERE a.usuario_id = auth.uid()
        AND pr.reserva_id = reservas.id
        AND a.activo = true
    )
  );

-- Alumno: crear reservas en su sede
CREATE POLICY "alumno_create_reservas" ON reservas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND sede_id = reservas.sede_id
        AND activo = true
    )
  );

-- Alumno: cancelar sus propias reservas
CREATE POLICY "alumno_update_cancelar_reservas" ON reservas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM alumnos a
      JOIN participantes_reserva pr ON pr.alumno_id = a.id
      WHERE a.usuario_id = auth.uid()
        AND pr.reserva_id = reservas.id
        AND a.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alumnos a
      JOIN participantes_reserva pr ON pr.alumno_id = a.id
      WHERE a.usuario_id = auth.uid()
        AND pr.reserva_id = reservas.id
        AND a.activo = true
    )
  );

-- Público: ver reservas confirmadas (calendario público)
CREATE POLICY "public_read_reservas_confirmadas" ON reservas
  FOR SELECT
  USING (estado = 'confirmada');

-- =============================================================================
-- POLÍTICAS PARA PARTICIPANTES_RESERVA
-- =============================================================================

-- Super Admin y Admin: acceso total
CREATE POLICY "admin_all_participantes" ON participantes_reserva
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias m
      JOIN reservas r ON (m.sede_id = r.sede_id OR m.rol = 'super_admin')
      WHERE m.usuario_id = auth.uid()
        AND r.id = participantes_reserva.reserva_id
        AND m.rol IN ('super_admin', 'admin')
        AND m.activa = true
    )
  );

-- Profesor: gestionar participantes de sus reservas
CREATE POLICY "profesor_all_participantes" ON participantes_reserva
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profesores p
      JOIN reservas r ON p.id = r.profesor_id
      WHERE p.usuario_id = auth.uid()
        AND r.id = participantes_reserva.reserva_id
        AND p.activo = true
    )
  );

-- Alumno: inscribirse y ver participantes
CREATE POLICY "alumno_all_participantes_own" ON participantes_reserva
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND id = participantes_reserva.alumno_id
        AND activo = true
    )
  );

-- Alumno: ver participantes de reservas donde está inscrito
CREATE POLICY "alumno_read_participantes_reserva" ON participantes_reserva
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alumnos a
      JOIN participantes_reserva pr ON pr.alumno_id = a.id
      WHERE a.usuario_id = auth.uid()
        AND pr.reserva_id = participantes_reserva.reserva_id
        AND a.activo = true
    )
  );

-- =============================================================================
-- POLÍTICAS PARA HORARIOS_FIJOS
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_horarios_fijos" ON horarios_fijos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: gestionar horarios fijos de su sede
CREATE POLICY "admin_all_horarios_fijos" ON horarios_fijos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = horarios_fijos.sede_id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor: ver horarios fijos donde es profesor y crear nuevos
CREATE POLICY "profesor_all_horarios_fijos" ON horarios_fijos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profesores
      WHERE usuario_id = auth.uid()
        AND id = horarios_fijos.profesor_id
        AND activo = true
    )
  );

-- Alumno: gestionar sus propios horarios fijos
CREATE POLICY "alumno_all_horarios_fijos" ON horarios_fijos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND id = horarios_fijos.alumno_id
        AND activo = true
    )
  );

-- =============================================================================
-- POLÍTICAS PARA BAJAS_HORARIOS_FIJOS
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_bajas" ON bajas_horarios_fijos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: ver bajas de su sede
CREATE POLICY "admin_read_bajas" ON bajas_horarios_fijos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias m
      JOIN horarios_fijos hf ON m.sede_id = hf.sede_id
      WHERE m.usuario_id = auth.uid()
        AND hf.id = bajas_horarios_fijos.horario_fijo_id
        AND m.rol = 'admin'
        AND m.activa = true
    )
  );

-- Profesor: ver bajas donde es profesor
CREATE POLICY "profesor_read_bajas" ON bajas_horarios_fijos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profesores p
      JOIN horarios_fijos hf ON p.id = hf.profesor_id
      WHERE p.usuario_id = auth.uid()
        AND hf.id = bajas_horarios_fijos.horario_fijo_id
        AND p.activo = true
    )
  );

-- Alumno: crear y ver sus propias bajas
CREATE POLICY "alumno_all_bajas" ON bajas_horarios_fijos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND id = bajas_horarios_fijos.alumno_id
        AND activo = true
    )
  );

-- =============================================================================
-- POLÍTICAS PARA BLOQUEOS_DISPONIBILIDAD
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_bloqueos" ON bloqueos_disponibilidad
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: gestionar bloqueos de su sede
CREATE POLICY "admin_all_bloqueos" ON bloqueos_disponibilidad
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = bloqueos_disponibilidad.sede_id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor: gestionar sus propios bloqueos
CREATE POLICY "profesor_all_bloqueos" ON bloqueos_disponibilidad
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profesores
      WHERE usuario_id = auth.uid()
        AND id = bloqueos_disponibilidad.profesor_id
        AND activo = true
    )
  );

-- Alumno: ver bloqueos de su sede
CREATE POLICY "alumno_read_bloqueos" ON bloqueos_disponibilidad
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND sede_id = bloqueos_disponibilidad.sede_id
        AND activo = true
    )
  );

-- Público: ver bloqueos activos (para calendario público)
CREATE POLICY "public_read_bloqueos_activos" ON bloqueos_disponibilidad
  FOR SELECT
  USING (activo = true);

-- =============================================================================
-- POLÍTICAS PARA CREDITOS_RECUPERO
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_creditos" ON creditos_recupero
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: ver créditos de su sede
CREATE POLICY "admin_read_creditos" ON creditos_recupero
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = creditos_recupero.sede_id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Profesor: crear créditos al confirmar cancelación
CREATE POLICY "profesor_create_creditos" ON creditos_recupero
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profesores p
      JOIN reservas r ON p.id = r.profesor_id
      WHERE p.usuario_id = auth.uid()
        AND r.id = creditos_recupero.reserva_cancelada_id
        AND p.activo = true
    )
  );

-- Alumno: gestionar sus propios créditos
CREATE POLICY "alumno_all_creditos" ON creditos_recupero
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND id = creditos_recupero.alumno_id
        AND activo = true
    )
  );

-- =============================================================================
-- POLÍTICAS PARA PAGOS_MERCADOPAGO
-- =============================================================================

-- Super Admin: acceso total
CREATE POLICY "super_admin_all_pagos" ON pagos_mercadopago
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- Admin: ver pagos de su sede
CREATE POLICY "admin_read_pagos" ON pagos_mercadopago
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND sede_id = pagos_mercadopago.sede_id
        AND rol = 'admin'
        AND activa = true
    )
  );

-- Alumno: gestionar sus propios pagos
CREATE POLICY "alumno_all_pagos" ON pagos_mercadopago
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM alumnos
      WHERE usuario_id = auth.uid()
        AND id = pagos_mercadopago.alumno_id
        AND activo = true
    )
  );

-- =============================================================================
-- FIN MIGRACIÓN 00002
-- =============================================================================
