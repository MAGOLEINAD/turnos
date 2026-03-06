import { parseDate, sumarDias, esMismoDia } from './date'
import { DIA_SEMANA } from '../constants/estados'
import type { Dayjs } from 'dayjs'

/**
 * Mapeo de día de la semana a número (0 = domingo, 6 = sábado)
 */
const DIA_A_NUMERO: Record<string, number> = {
  [DIA_SEMANA.DOMINGO]: 0,
  [DIA_SEMANA.LUNES]: 1,
  [DIA_SEMANA.MARTES]: 2,
  [DIA_SEMANA.MIERCOLES]: 3,
  [DIA_SEMANA.JUEVES]: 4,
  [DIA_SEMANA.VIERNES]: 5,
  [DIA_SEMANA.SABADO]: 6,
}

interface HorarioFijo {
  id: string
  dia_semana_1: string
  dia_semana_2?: string | null
  dia_semana_3?: string | null
  hora_inicio: string
  duracion_minutos: number
  fecha_inicio_vigencia: string
  activo: boolean
}

interface OcurrenciaHorarioFijo {
  horarioFijoId: string
  fecha: Date
  horaInicio: string
  duracionMinutos: number
}

/**
 * Genera las ocurrencias de un horario fijo en un rango de fechas
 */
export function generarOcurrenciasHorarioFijo(
  horarioFijo: HorarioFijo,
  fechaInicio: Date,
  fechaFin: Date
): OcurrenciaHorarioFijo[] {
  if (!horarioFijo.activo) return []

  const ocurrencias: OcurrenciaHorarioFijo[] = []
  const inicio = parseDate(fechaInicio)
  const fin = parseDate(fechaFin)
  const vigenciaInicio = parseDate(horarioFijo.fecha_inicio_vigencia)

  // Obtener días de la semana del horario fijo
  const diasSemana: number[] = []
  if (horarioFijo.dia_semana_1) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_1])
  }
  if (horarioFijo.dia_semana_2) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_2])
  }
  if (horarioFijo.dia_semana_3) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_3])
  }

  // Iterar desde la fecha de inicio del rango (o desde vigencia si es posterior)
  let fechaActual = inicio.isAfter(vigenciaInicio) ? inicio : vigenciaInicio

  // Iterar hasta la fecha fin del rango
  while (fechaActual.isBefore(fin) || fechaActual.isSame(fin, 'day')) {
    const diaSemana = fechaActual.day()

    // Si este día de la semana está en el horario fijo
    if (diasSemana.includes(diaSemana)) {
      ocurrencias.push({
        horarioFijoId: horarioFijo.id,
        fecha: fechaActual.toDate(),
        horaInicio: horarioFijo.hora_inicio,
        duracionMinutos: horarioFijo.duracion_minutos,
      })
    }

    // Avanzar al siguiente día
    fechaActual = sumarDias(fechaActual, 1)
  }

  return ocurrencias
}

/**
 * Genera todas las ocurrencias de múltiples horarios fijos
 */
export function generarOcurrenciasMultiplesHorariosFijos(
  horariosFijos: HorarioFijo[],
  fechaInicio: Date,
  fechaFin: Date
): OcurrenciaHorarioFijo[] {
  const todasOcurrencias: OcurrenciaHorarioFijo[] = []

  for (const horarioFijo of horariosFijos) {
    const ocurrencias = generarOcurrenciasHorarioFijo(
      horarioFijo,
      fechaInicio,
      fechaFin
    )
    todasOcurrencias.push(...ocurrencias)
  }

  return todasOcurrencias
}

/**
 * Verifica si una fecha específica tiene ocurrencia de horario fijo
 */
export function tieneOcurrenciaEnFecha(
  horarioFijo: HorarioFijo,
  fecha: Date
): boolean {
  if (!horarioFijo.activo) return false

  const fechaParsed = parseDate(fecha)
  const vigenciaInicio = parseDate(horarioFijo.fecha_inicio_vigencia)

  // Verificar que la fecha sea después de la vigencia
  if (fechaParsed.isBefore(vigenciaInicio, 'day')) {
    return false
  }

  const diaSemana = fechaParsed.day()

  // Verificar si el día de la semana coincide
  const diasSemana: number[] = []
  if (horarioFijo.dia_semana_1) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_1])
  }
  if (horarioFijo.dia_semana_2) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_2])
  }
  if (horarioFijo.dia_semana_3) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_3])
  }

  return diasSemana.includes(diaSemana)
}

/**
 * Obtiene la próxima ocurrencia de un horario fijo
 */
export function proximaOcurrenciaHorarioFijo(
  horarioFijo: HorarioFijo,
  desdeFecha?: Date
): OcurrenciaHorarioFijo | null {
  if (!horarioFijo.activo) return null

  const desde = parseDate(desdeFecha || new Date())
  const vigenciaInicio = parseDate(horarioFijo.fecha_inicio_vigencia)

  // Empezar desde la fecha mayor (desde o vigencia)
  let fechaActual = desde.isAfter(vigenciaInicio) ? desde : vigenciaInicio

  const diasSemana: number[] = []
  if (horarioFijo.dia_semana_1) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_1])
  }
  if (horarioFijo.dia_semana_2) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_2])
  }
  if (horarioFijo.dia_semana_3) {
    diasSemana.push(DIA_A_NUMERO[horarioFijo.dia_semana_3])
  }

  // Buscar la próxima ocurrencia en los próximos 14 días
  for (let i = 0; i < 14; i++) {
    const diaSemana = fechaActual.day()

    if (diasSemana.includes(diaSemana)) {
      return {
        horarioFijoId: horarioFijo.id,
        fecha: fechaActual.toDate(),
        horaInicio: horarioFijo.hora_inicio,
        duracionMinutos: horarioFijo.duracion_minutos,
      }
    }

    fechaActual = sumarDias(fechaActual, 1)
  }

  return null
}
