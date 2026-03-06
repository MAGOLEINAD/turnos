-- =============================================================================
-- MIGRACIÓN 00005: FIX REGISTRO DE USUARIOS
-- =============================================================================
-- Descripción: Permite que usuarios recién registrados puedan crear su perfil
-- Autor: Sistema
-- Fecha: 2026-03-05
-- =============================================================================

-- Agregar política para permitir INSERT durante el registro
-- Un usuario puede insertar su propio registro si el ID coincide con su auth.uid()
CREATE POLICY "usuario_insert_own_profile" ON usuarios
  FOR INSERT
  WITH CHECK (id = auth.uid());

COMMENT ON POLICY "usuario_insert_own_profile" ON usuarios IS
  'Permite a usuarios recién registrados crear su perfil inicial';
