/**
 * Utilidades específicas para manejo de timezone Argentina
 */

import { dayjs, parseDate, ahora } from './date'
import { TIMEZONE } from '../constants/config'

/**
 * Convierte una fecha UTC a timezone de Argentina
 */
export function utcToArgentina(date: string | Date): Date {
  return dayjs.utc(date).tz(TIMEZONE).toDate()
}

/**
 * Convierte una fecha de Argentina a UTC
 */
export function argentinaToUtc(date: string | Date): Date {
  return parseDate(date).utc().toDate()
}

/**
 * Obtiene el offset actual de Argentina respecto a UTC
 */
export function getArgentinaOffset(): number {
  return ahora().utcOffset()
}

/**
 * Formatea una fecha UTC para mostrar en hora de Argentina
 */
export function formatUTCToArgentina(date: string | Date): string {
  return dayjs.utc(date).tz(TIMEZONE).format('DD/MM/YYYY HH:mm')
}

/**
 * Crea una fecha en hora de Argentina desde componentes
 */
export function crearFechaArgentina(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0
): Date {
  return dayjs.tz(
    { year, month, date: day, hour, minute },
    TIMEZONE
  ).toDate()
}

/**
 * Obtiene la hora actual en Argentina como string
 */
export function getHoraActualArgentina(): string {
  return ahora().format('HH:mm')
}

/**
 * Verifica si actualmente es horario de verano en Argentina (aunque ya no se usa)
 */
export function isHorarioVerano(): boolean {
  // Argentina dejó de usar horario de verano desde 2009
  // Esta función está por compatibilidad pero siempre retorna false
  return false
}

/**
 * Convierte una hora TIME de Postgres a Date en timezone de Argentina
 */
export function timePostgresToArgentina(time: string, date?: Date | string): Date {
  const [hours, minutes, seconds] = time.split(':').map(Number)
  const baseDate = date ? parseDate(date) : ahora()

  return baseDate
    .hour(hours)
    .minute(minutes)
    .second(seconds || 0)
    .millisecond(0)
    .toDate()
}

/**
 * Convierte un Date a TIME de Postgres
 */
export function dateToPostgresTime(date: Date | string): string {
  return parseDate(date).format('HH:mm:ss')
}

/**
 * Combina una fecha y una hora TIME en un timestamp completo
 */
export function combinarFechaHora(fecha: Date | string, hora: string): Date {
  const [hours, minutes] = hora.split(':').map(Number)
  return parseDate(fecha)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .toDate()
}

/**
 * Extrae solo la hora TIME de un timestamp
 */
export function extraerHora(timestamp: Date | string): string {
  return parseDate(timestamp).format('HH:mm:ss')
}

/**
 * Convierte minutos desde medianoche a TIME
 */
export function minutosATime(minutos: number): string {
  const hours = Math.floor(minutos / 60)
  const mins = minutos % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
}

/**
 * Convierte TIME a minutos desde medianoche
 */
export function timeAMinutos(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export { TIMEZONE }
