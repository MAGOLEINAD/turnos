/**
 * Constantes de roles del sistema
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PROFESOR: 'profesor',
  ALUMNO: 'alumno',
} as const

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES]

export const ROLES_LABELS: Record<RolUsuario, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.PROFESOR]: 'Profesor',
  [ROLES.ALUMNO]: 'Alumno',
}

export const ROLES_ICONS: Record<RolUsuario, string> = {
  [ROLES.SUPER_ADMIN]: '🛡️',
  [ROLES.ADMIN]: '⚙️',
  [ROLES.PROFESOR]: '🎓',
  [ROLES.ALUMNO]: '📘',
}

export const ROLES_HIERARCHY: Record<RolUsuario, number> = {
  [ROLES.SUPER_ADMIN]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.PROFESOR]: 3,
  [ROLES.ALUMNO]: 4,
}

export function isRoleSuperior(rol1: RolUsuario, rol2: RolUsuario): boolean {
  return ROLES_HIERARCHY[rol1] < ROLES_HIERARCHY[rol2]
}

export function puedeAccederARol(rolUsuario: RolUsuario, rolRequerido: RolUsuario): boolean {
  return ROLES_HIERARCHY[rolUsuario] <= ROLES_HIERARCHY[rolRequerido]
}
