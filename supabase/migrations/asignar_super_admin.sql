-- =============================================================================
-- ASIGNAR ROL SUPER_ADMIN A USUARIO
-- =============================================================================
-- Este script asigna el rol de super_admin al usuario especificado
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- =============================================================================

-- OPCIÓN 1: Si conoces el email del usuario
-- Reemplaza 'leinadser@gmail.com' con el email del usuario

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Buscar el ID del usuario por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'leinadser@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado con email: leinadser@gmail.com';
  END IF;

  RAISE NOTICE 'Usuario encontrado: %', v_user_id;

  -- Buscar la primera organización (o crear una si no existe)
  SELECT id INTO v_org_id
  FROM organizaciones
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- Crear organización por defecto
    INSERT INTO organizaciones (nombre, descripcion)
    VALUES ('Organización Principal', 'Organización por defecto del sistema')
    RETURNING id INTO v_org_id;

    RAISE NOTICE 'Organización creada: %', v_org_id;
  ELSE
    RAISE NOTICE 'Organización encontrada: %', v_org_id;
  END IF;

  -- Verificar si ya tiene una membresía
  IF EXISTS (
    SELECT 1 FROM membresias
    WHERE usuario_id = v_user_id
    AND rol = 'super_admin'
    AND activa = true
  ) THEN
    RAISE NOTICE 'El usuario ya es super_admin';
  ELSE
    -- Crear membresía de super_admin
    INSERT INTO membresias (
      usuario_id,
      organizacion_id,
      sede_id,
      rol,
      activa
    ) VALUES (
      v_user_id,
      v_org_id,
      NULL,  -- super_admin no requiere sede específica
      'super_admin',
      true
    );

    RAISE NOTICE 'Membresía super_admin creada exitosamente';
  END IF;
END $$;

-- =============================================================================
-- OPCIÓN 2: Asignar super_admin manualmente si conoces el UUID del usuario
-- =============================================================================
-- Descomenta y ejecuta las siguientes líneas, reemplazando los valores:

/*
INSERT INTO membresias (
  usuario_id,
  organizacion_id,
  sede_id,
  rol,
  activa
) VALUES (
  'REEMPLAZA-CON-UUID-DEL-USUARIO',  -- UUID del usuario
  (SELECT id FROM organizaciones LIMIT 1),  -- Primera organización
  NULL,  -- super_admin no requiere sede
  'super_admin',
  true
)
ON CONFLICT (usuario_id, organizacion_id, sede_id)
DO UPDATE SET
  rol = 'super_admin',
  activa = true;
*/

-- =============================================================================
-- VERIFICAR QUE EL USUARIO ES SUPER_ADMIN
-- =============================================================================

SELECT
  u.email,
  m.rol,
  m.activa,
  o.nombre as organizacion
FROM auth.users u
JOIN usuarios us ON us.id = u.id
JOIN membresias m ON m.usuario_id = u.id
JOIN organizaciones o ON o.id = m.organizacion_id
WHERE u.email = 'leinadser@gmail.com';

-- =============================================================================
-- RESULTADO ESPERADO
-- =============================================================================
-- Deberías ver una fila con:
-- email: leinadser@gmail.com
-- rol: super_admin
-- activa: true
-- organizacion: [nombre de la organización]
-- =============================================================================
