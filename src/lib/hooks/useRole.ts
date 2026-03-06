/**
 * Hook para gestión de roles y permisos
 */

'use client'

import { useAuth } from './useAuth'
import { type RolUsuario } from '../constants/roles'
import { getPermisosUsuario } from '../utils/permissions'

export function useRole() {
  const { user, loading } = useAuth()

  const rol = user?.rol as RolUsuario | null

  const permisos = getPermisosUsuario(
    user
      ? {
          id: user.id,
          email: user.email!,
          rol: rol,
          sede_id: user.sede_id,
          organizacion_id: user.organizacion_id,
        }
      : null
  )

  return {
    rol,
    loading,
    ...permisos,
  }
}
