/**
 * Configuraciones generales del sistema
 */

// Configuración de timezone
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Argentina/Buenos_Aires'

// Configuración de cancelaciones
export const CANCELACION_MIN_HORAS = 24
export const MAX_MESES_RECUPERO = 3

// Configuración de sede (defaults)
export const DEFAULT_HORA_APERTURA = '08:00'
export const DEFAULT_HORA_CIERRE = '22:00'
export const DEFAULT_DURACION_CLASE = 60 // minutos
export const DEFAULT_CUPO_GRUPAL = 4

// Opciones de duración de clases
export const DURACIONES_CLASE = [45, 60] // minutos

// Configuración de la aplicación
export const APP_NAME = 'Gestión de Turnos'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Límites de paginación
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Configuración de Mercado Pago
export const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ''
export const MP_MONEDA = 'ARS'
