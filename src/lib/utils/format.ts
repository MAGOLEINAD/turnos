/**
 * Utilidades para formateo de datos
 */

/**
 * Formatea un número como moneda argentina
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-AR').format(num)
}

/**
 * Capitaliza la primera letra de un string
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Capitaliza cada palabra de un string
 */
export function capitalizeWords(str: string): string {
  if (!str) return ''
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Trunca un texto a un número máximo de caracteres
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * Formatea un número de teléfono argentino
 */
export function formatPhone(phone: string): string {
  // Eliminar caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '')

  // Formatear según longitud
  if (cleaned.length === 10) {
    // Formato: (11) 1234-5678
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11) {
    // Formato: +54 11 1234-5678
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`
  }

  return phone
}

/**
 * Genera un slug desde un string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios por guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones por uno
    .trim()
}

/**
 * Formatea un nombre completo desde nombre y apellido
 */
export function formatFullName(nombre: string, apellido: string): string {
  return `${capitalizeWords(nombre)} ${capitalizeWords(apellido)}`.trim()
}

/**
 * Obtiene las iniciales de un nombre
 */
export function getInitials(nombre: string, apellido?: string): string {
  if (!apellido) {
    return nombre.charAt(0).toUpperCase()
  }
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
}

/**
 * Formatea un porcentaje
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Formatea bytes a tamaño legible
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Formatea una duración en minutos a string legible
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) {
    return `${hours}h`
  }

  return `${hours}h ${mins}min`
}

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida un teléfono argentino
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  // Debe tener entre 10 y 13 dígitos (con o sin código de país)
  return cleaned.length >= 10 && cleaned.length <= 13
}

/**
 * Extrae el color de un string hexadecimal
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

/**
 * Genera un color aleatorio en hexadecimal
 */
export function randomHexColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}
