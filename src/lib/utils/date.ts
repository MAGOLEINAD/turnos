/**
 * Utilidades para manejo de fechas con Day.js
 */

import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isBetween from 'dayjs/plugin/isBetween'
import duration from 'dayjs/plugin/duration'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import 'dayjs/locale/es'

import { TIMEZONE } from '../constants/config'

// Configurar plugins de dayjs
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(isBetween)
dayjs.extend(duration)
dayjs.extend(customParseFormat)
dayjs.locale('es')

// Establecer timezone por defecto
dayjs.tz.setDefault(TIMEZONE)

/**
 * Obtiene la fecha actual en timezone de Argentina
 */
export function ahora(): Dayjs {
  return dayjs().tz(TIMEZONE)
}

/**
 * Parsea una fecha en el timezone de Argentina
 */
export function parseDate(date: string | Date | Dayjs): Dayjs {
  return dayjs(date).tz(TIMEZONE)
}

/**
 * Formatea una fecha en formato corto (DD/MM/YYYY)
 */
export function formatDate(date: string | Date | Dayjs): string {
  return parseDate(date).format('DD/MM/YYYY')
}

/**
 * Formatea una fecha en formato largo (DD de MMMM de YYYY)
 */
export function formatDateLong(date: string | Date | Dayjs): string {
  return parseDate(date).format('DD [de] MMMM [de] YYYY')
}

/**
 * Formatea una hora (HH:mm)
 */
export function formatTime(date: string | Date | Dayjs): string {
  return parseDate(date).format('HH:mm')
}

/**
 * Formatea fecha y hora (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: string | Date | Dayjs): string {
  return parseDate(date).format('DD/MM/YYYY HH:mm')
}

/**
 * Formatea una hora desde string TIME de Postgres (HH:MM:SS)
 */
export function formatTimeFromPostgres(time: string): string {
  const [hours, minutes] = time.split(':')
  return `${hours}:${minutes}`
}

/**
 * Convierte TIME a Date en la fecha actual
 */
export function timeToDate(time: string, date?: Date | Dayjs): Date {
  const [hours, minutes] = time.split(':')
  const baseDate = date ? parseDate(date) : ahora()
  return baseDate.hour(parseInt(hours)).minute(parseInt(minutes)).second(0).toDate()
}

/**
 * Obtiene el día de la semana en español
 */
export function getDiaSemana(date: string | Date | Dayjs): string {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dias[parseDate(date).day()]
}

/**
 * Verifica si una fecha es hoy
 */
export function isHoy(date: string | Date | Dayjs): boolean {
  return parseDate(date).isSame(ahora(), 'day')
}

/**
 * Verifica si una fecha es mañana
 */
export function isManana(date: string | Date | Dayjs): boolean {
  return parseDate(date).isSame(ahora().add(1, 'day'), 'day')
}

/**
 * Verifica si una fecha está en el pasado
 */
export function isPasado(date: string | Date | Dayjs): boolean {
  return parseDate(date).isBefore(ahora())
}

/**
 * Verifica si una fecha está en el futuro
 */
export function isFuturo(date: string | Date | Dayjs): boolean {
  return parseDate(date).isAfter(ahora())
}

/**
 * Calcula la diferencia en minutos entre dos fechas
 */
export function diferenciaEnMinutos(
  date1: string | Date | Dayjs,
  date2: string | Date | Dayjs
): number {
  return parseDate(date1).diff(parseDate(date2), 'minute')
}

/**
 * Calcula la diferencia en horas entre dos fechas
 */
export function diferenciaEnHoras(
  date1: string | Date | Dayjs,
  date2: string | Date | Dayjs
): number {
  return parseDate(date1).diff(parseDate(date2), 'hour')
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function diferenciaEnDias(
  date1: string | Date | Dayjs,
  date2: string | Date | Dayjs
): number {
  return parseDate(date1).diff(parseDate(date2), 'day')
}

/**
 * Suma o resta minutos a una fecha
 */
export function sumarMinutos(
  date: string | Date | Dayjs,
  minutos: number
): Dayjs {
  return parseDate(date).add(minutos, 'minute')
}

/**
 * Suma o resta horas a una fecha
 */
export function sumarHoras(date: string | Date | Dayjs, horas: number): Dayjs {
  return parseDate(date).add(horas, 'hour')
}

/**
 * Suma o resta días a una fecha
 */
export function sumarDias(date: string | Date | Dayjs, dias: number): Dayjs {
  return parseDate(date).add(dias, 'day')
}

/**
 * Obtiene el inicio del día
 */
export function inicioDia(date: string | Date | Dayjs): Dayjs {
  return parseDate(date).startOf('day')
}

/**
 * Obtiene el fin del día
 */
export function finDia(date: string | Date | Dayjs): Dayjs {
  return parseDate(date).endOf('day')
}

/**
 * Obtiene el inicio de la semana (lunes)
 */
export function inicioSemana(date: string | Date | Dayjs): Dayjs {
  return parseDate(date).startOf('week').add(1, 'day') // Lunes
}

/**
 * Obtiene el fin de la semana (domingo)
 */
export function finSemana(date: string | Date | Dayjs): Dayjs {
  return parseDate(date).endOf('week').add(1, 'day') // Domingo
}

/**
 * Obtiene el inicio del mes
 */
export function inicioMes(date: string | Date | Dayjs): Dayjs {
  return parseDate(date).startOf('month')
}

/**
 * Obtiene el fin del mes
 */
export function finMes(date: string | Date | Dayjs): Dayjs {
  return parseDate(date).endOf('month')
}

/**
 * Formatea un rango de fechas
 */
export function formatDateRange(
  start: string | Date | Dayjs,
  end: string | Date | Dayjs
): string {
  const startDate = parseDate(start)
  const endDate = parseDate(end)

  if (startDate.isSame(endDate, 'day')) {
    return `${formatDate(startDate)} (${formatTime(startDate)} - ${formatTime(endDate)})`
  }

  return `${formatDateTime(startDate)} - ${formatDateTime(endDate)}`
}

/**
 * Verifica si dos rangos de tiempo se solapan
 */
export function rangosSeSolapan(
  start1: string | Date | Dayjs,
  end1: string | Date | Dayjs,
  start2: string | Date | Dayjs,
  end2: string | Date | Dayjs
): boolean {
  const s1 = parseDate(start1)
  const e1 = parseDate(end1)
  const s2 = parseDate(start2)
  const e2 = parseDate(end2)

  return s1.isBefore(e2) && e1.isAfter(s2)
}

/**
 * Genera un array de fechas entre dos fechas
 */
export function generarRangoFechas(
  start: string | Date | Dayjs,
  end: string | Date | Dayjs
): Dayjs[] {
  const fechas: Dayjs[] = []
  let current = parseDate(start)
  const endDate = parseDate(end)

  while (current.isSameOrBefore(endDate, 'day')) {
    fechas.push(current)
    current = current.add(1, 'day')
  }

  return fechas
}

// Exportar dayjs configurado para uso directo
export { dayjs }
