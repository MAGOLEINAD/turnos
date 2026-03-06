/**
 * Utilidades para gestión de permisos por rol
 */

import { ROLES, type RolUsuario } from '../constants/roles'

export interface Usuario {
  id: string
  email: string
  rol?: RolUsuario | null
  sede_id?: string | null
  organizacion_id?: string | null
}

/**
 * Verifica si el usuario es Super Admin
 */
export function isSuperAdmin(usuario: Usuario | null): boolean {
  return usuario?.rol === ROLES.SUPER_ADMIN
}

/**
 * Verifica si el usuario es Admin
 */
export function isAdmin(usuario: Usuario | null): boolean {
  return usuario?.rol === ROLES.ADMIN
}

/**
 * Verifica si el usuario es Profesor
 */
export function isProfesor(usuario: Usuario | null): boolean {
  return usuario?.rol === ROLES.PROFESOR
}

/**
 * Verifica si el usuario es Alumno
 */
export function isAlumno(usuario: Usuario | null): boolean {
  return usuario?.rol === ROLES.ALUMNO
}

/**
 * Verifica si el usuario es Admin o SuperAdmin
 */
export function isAdminOSuperior(usuario: Usuario | null): boolean {
  return isSuperAdmin(usuario) || isAdmin(usuario)
}

/**
 * Verifica si el usuario puede gestionar una sede específica
 */
export function puedeGestionarSede(
  usuario: Usuario | null,
  sedeId: string
): boolean {
  if (!usuario) return false
  if (isSuperAdmin(usuario)) return true
  if (isAdmin(usuario) && usuario.sede_id === sedeId) return true
  return false
}

/**
 * Verifica si el usuario puede ver una sede específica
 */
export function puedeVerSede(usuario: Usuario | null, sedeId: string): boolean {
  if (!usuario) return false
  if (isSuperAdmin(usuario)) return true
  if (usuario.sede_id === sedeId) return true
  return false
}

/**
 * Verifica si el usuario puede crear organizaciones
 */
export function puedeCrearOrganizaciones(usuario: Usuario | null): boolean {
  return isSuperAdmin(usuario)
}

/**
 * Verifica si el usuario puede crear sedes
 */
export function puedeCrearSedes(usuario: Usuario | null): boolean {
  return isSuperAdmin(usuario)
}

/**
 * Verifica si el usuario puede crear profesores
 */
export function puedeCrearProfesores(usuario: Usuario | null): boolean {
  return isAdminOSuperior(usuario)
}

/**
 * Verifica si el usuario puede crear alumnos
 */
export function puedeCrearAlumnos(usuario: Usuario | null): boolean {
  return isAdminOSuperior(usuario) || isProfesor(usuario)
}

/**
 * Verifica si el usuario puede crear reservas
 */
export function puedeCrearReservas(usuario: Usuario | null): boolean {
  // Todos los roles pueden crear reservas
  return !!usuario?.rol
}

/**
 * Verifica si el usuario puede cancelar una reserva
 */
export function puedeCancelarReserva(
  usuario: Usuario | null,
  reserva: { creado_por: string } | null
): boolean {
  if (!usuario || !reserva) return false
  if (isAdminOSuperior(usuario)) return true
  // El usuario que creó la reserva puede cancelarla
  return usuario.id === reserva.creado_por
}

/**
 * Verifica si el usuario puede ver créditos
 */
export function puedeVerCreditos(usuario: Usuario | null): boolean {
  return isAdminOSuperior(usuario) || isAlumno(usuario)
}

/**
 * Verifica si el usuario puede gestionar horarios fijos
 */
export function puedeGestionarHorariosFijos(usuario: Usuario | null): boolean {
  return isAdminOSuperior(usuario) || isProfesor(usuario) || isAlumno(usuario)
}

/**
 * Verifica si el usuario puede crear bloqueos
 */
export function puedeCrearBloqueos(usuario: Usuario | null): boolean {
  return isAdminOSuperior(usuario) || isProfesor(usuario)
}

/**
 * Verifica si el usuario puede ver reportes
 */
export function puedeVerReportes(usuario: Usuario | null): boolean {
  return isAdminOSuperior(usuario)
}

/**
 * Verifica si el usuario puede configurar una sede
 */
export function puedeConfigurarSede(
  usuario: Usuario | null,
  sedeId: string
): boolean {
  return puedeGestionarSede(usuario, sedeId)
}

/**
 * Verifica si el usuario puede ver el calendario público
 */
export function puedeVerCalendarioPublico(): boolean {
  // Calendario público es visible para todos
  return true
}

/**
 * Verifica si el usuario puede gestionar pagos
 */
export function puedeGestionarPagos(usuario: Usuario | null): boolean {
  return isAdminOSuperior(usuario) || isAlumno(usuario)
}

/**
 * Obtiene los permisos del usuario como objeto
 */
export function getPermisosUsuario(usuario: Usuario | null) {
  return {
    isSuperAdmin: isSuperAdmin(usuario),
    isAdmin: isAdmin(usuario),
    isProfesor: isProfesor(usuario),
    isAlumno: isAlumno(usuario),
    puedeCrearOrganizaciones: puedeCrearOrganizaciones(usuario),
    puedeCrearSedes: puedeCrearSedes(usuario),
    puedeCrearProfesores: puedeCrearProfesores(usuario),
    puedeCrearAlumnos: puedeCrearAlumnos(usuario),
    puedeCrearReservas: puedeCrearReservas(usuario),
    puedeVerCreditos: puedeVerCreditos(usuario),
    puedeGestionarHorariosFijos: puedeGestionarHorariosFijos(usuario),
    puedeCrearBloqueos: puedeCrearBloqueos(usuario),
    puedeVerReportes: puedeVerReportes(usuario),
    puedeGestionarPagos: puedeGestionarPagos(usuario),
  }
}
