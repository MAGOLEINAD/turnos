-- =============================================================================
-- SCRIPT MANUAL: ASIGNAR ROL SUPER_ADMIN A USUARIO
-- =============================================================================
-- Uso:
-- - Ejecutar manualmente en SQL Editor de Supabase.
-- - No forma parte de migraciones automáticas.
-- =============================================================================

-- OPCION 1: por email
-- Reemplazar 'leinadser@gmail.com' por el email objetivo.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE email = 'leinadser@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado con email: leinadser@gmail.com';
  END IF;

  INSERT INTO public.membresias (
    usuario_id,
    organizacion_id,
    sede_id,
    rol,
    activa
  ) VALUES (
    v_user_id,
    NULL, -- super_admin es global
    NULL, -- super_admin no tiene sede
    'super_admin'::rol_usuario,
    true
  )
  ON CONFLICT (usuario_id, sede_id, rol)
  DO UPDATE SET
    activa = true,
    updated_at = NOW();

  RAISE NOTICE 'Membresia super_admin asignada para %', v_user_id;
END $$;

-- OPCION 2: por UUID directo
/*
INSERT INTO public.membresias (
  usuario_id,
  organizacion_id,
  sede_id,
  rol,
  activa
) VALUES (
  'REEMPLAZA-CON-UUID-DEL-USUARIO',
  NULL,
  NULL,
  'super_admin'::rol_usuario,
  true
)
ON CONFLICT (usuario_id, sede_id, rol)
DO UPDATE SET
  activa = true,
  updated_at = NOW();
*/

-- Verificacion
SELECT
  u.email,
  m.rol,
  m.activa,
  m.organizacion_id,
  m.sede_id
FROM auth.users u
JOIN public.membresias m ON m.usuario_id = u.id
WHERE u.email = 'leinadser@gmail.com'
  AND m.rol = 'super_admin'::rol_usuario;

