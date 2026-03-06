-- =============================================================================
-- MIGRACIÓN 00006: FIX RECURSIÓN INFINITA EN POLÍTICAS RLS
-- =============================================================================
-- Descripción: Corrige recursión infinita en políticas de usuarios
--              separando políticas ALL en SELECT/UPDATE/DELETE
-- Autor: Sistema
-- Fecha: 2026-03-05
-- =============================================================================

-- PROBLEMA:
-- Las políticas ALL consultaban la tabla membresias durante INSERT,
-- causando recursión infinita porque los usuarios nuevos no tienen membresía aún.

-- SOLUCIÓN:
-- Separar políticas ALL en SELECT/UPDATE/DELETE (sin INSERT)
-- La política INSERT solo usa auth.uid() sin consultar otras tablas

-- =============================================================================
-- 1. ELIMINAR POLÍTICAS CONFLICTIVAS
-- =============================================================================

DROP POLICY IF EXISTS "usuario_own_profile" ON usuarios;
DROP POLICY IF EXISTS "super_admin_all_usuarios" ON usuarios;

-- =============================================================================
-- 2. CREAR POLÍTICAS SEPARADAS PARA USUARIO PROPIO (SIN RECURSIÓN)
-- =============================================================================

-- SELECT: el usuario puede ver su propio perfil
CREATE POLICY "usuario_select_own_profile" ON usuarios
  FOR SELECT
  USING (id = auth.uid());

-- UPDATE: el usuario puede actualizar su propio perfil
CREATE POLICY "usuario_update_own_profile" ON usuarios
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: el usuario puede eliminar su propio perfil
CREATE POLICY "usuario_delete_own_profile" ON usuarios
  FOR DELETE
  USING (id = auth.uid());

-- =============================================================================
-- 3. CREAR POLÍTICAS SEPARADAS PARA SUPER ADMIN (SIN INSERT)
-- =============================================================================

-- SELECT
CREATE POLICY "super_admin_select_usuarios" ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- UPDATE
CREATE POLICY "super_admin_update_usuarios" ON usuarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- DELETE
CREATE POLICY "super_admin_delete_usuarios" ON usuarios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM membresias
      WHERE usuario_id = auth.uid()
        AND rol = 'super_admin'
        AND activa = true
    )
  );

-- =============================================================================
-- NOTA: La política INSERT ya existe desde migración 00005
-- =============================================================================
-- CREATE POLICY "usuario_insert_own_profile" ON usuarios
--   FOR INSERT
--   WITH CHECK (id = auth.uid());

COMMENT ON POLICY "usuario_select_own_profile" ON usuarios IS
  'Permite a usuarios ver su propio perfil sin consultar membresias';

COMMENT ON POLICY "super_admin_select_usuarios" ON usuarios IS
  'Super admin puede ver todos los usuarios (no aplica a INSERT para evitar recursión)';
