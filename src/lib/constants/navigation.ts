/**
 * Configuración de navegación por rol
 */

import { ROLES, type RolUsuario } from './roles'

export interface NavItem {
  title: string
  href: string
  icon?: string
  badge?: string
  children?: NavItem[]
}

// Navegación para Super Admin
export const NAV_SUPER_ADMIN: NavItem[] = [
  {
    title: 'Clientes',
    href: '/super-admin/organizaciones',
  },
  {
    title: 'Sedes',
    href: '/super-admin/sedes',
  },
  {
    title: 'Usuarios',
    href: '/super-admin/usuarios',
  },
  {
    title: 'Vista Global',
    href: '/super-admin/vista-global',
  },
]

// Navegación para Admin
export const NAV_ADMIN: NavItem[] = [
  {
    title: 'Mis Sedes',
    href: '/admin/sedes',
  },
  {
    title: 'Profesores',
    href: '/admin/profesores',
  },
  {
    title: 'Alumnos',
    href: '/admin/alumnos',
  },
  {
    title: 'Usuarios',
    href: '/admin/usuarios',
  },
  {
    title: 'Calendario',
    href: '/admin/calendario',
  },
  {
    title: 'Reportes',
    href: '/admin/reportes',
  },
]

// Navegación para Profesor
export const NAV_PROFESOR: NavItem[] = [
  {
    title: 'Mi Agenda',
    href: '/profesor/agenda',
  },
  {
    title: 'Calendario Sede',
    href: '/profesor/calendario',
  },
]

// Navegación para Alumno
export const NAV_ALUMNO: NavItem[] = [
  {
    title: 'Calendario',
    href: '/alumno/calendario',
  },
  {
    title: 'Mis Reservas',
    href: '/alumno/mis-reservas',
  },
  {
    title: 'Horarios Fijos',
    href: '/alumno/horarios-fijos',
  },
  {
    title: 'Créditos',
    href: '/alumno/creditos',
  },
  {
    title: 'Pagos',
    href: '/alumno/pagos',
  },
]

// Función para obtener navegación según rol
export function getNavForRole(rol: RolUsuario | null): NavItem[] {
  if (!rol) return []

  switch (rol) {
    case ROLES.SUPER_ADMIN:
      return NAV_SUPER_ADMIN
    case ROLES.ADMIN:
      return NAV_ADMIN
    case ROLES.PROFESOR:
      return NAV_PROFESOR
    case ROLES.ALUMNO:
      return NAV_ALUMNO
    default:
      return []
  }
}

// Rutas protegidas por rol
export const PROTECTED_ROUTES: Record<RolUsuario, string[]> = {
  [ROLES.SUPER_ADMIN]: ['/super-admin', '/admin', '/profesor', '/alumno'],
  [ROLES.ADMIN]: ['/admin'],
  [ROLES.PROFESOR]: ['/profesor'],
  [ROLES.ALUMNO]: ['/alumno'],
}

// Verificar si un usuario con cierto rol puede acceder a una ruta
export function canAccessRoute(rol: RolUsuario | null, pathname: string): boolean {
  if (!rol) return false

  const allowedRoutes = PROTECTED_ROUTES[rol]
  return allowedRoutes.some(route => pathname.startsWith(route))
}

// Obtener ruta de dashboard por rol
export function getDashboardRoute(rol: RolUsuario): string {
  switch (rol) {
    case ROLES.SUPER_ADMIN:
      return '/super-admin/organizaciones'
    case ROLES.ADMIN:
      return '/admin/sedes'
    case ROLES.PROFESOR:
      return '/profesor/agenda'
    case ROLES.ALUMNO:
      return '/alumno/calendario'
    default:
      return '/dashboard'
  }
}
