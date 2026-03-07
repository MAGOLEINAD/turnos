import { parseDate, sumarDias } from './date'
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
  dias_semana?: string[] | null
  dia_semana_1?: string
  dia_semana_2?: string | null
  dia_semana_3?: string | null
  hora_inicio: string
  hora_fin?: string | null
  duracion_minutos?: number
  fecha_inicio?: string
  fecha_inicio_vigencia?: string
  fecha_baja_efectiva?: string | null
  activo: boolean
  cuotas_mensuales?: Array<{
    anio: number
    mes: number
    estado: 'pendiente' | 'pagada' | 'vencida'
    fecha_limite_final: string
  }>
}

interface OcurrenciaHorarioFijo {
  horarioFijoId: string
  fecha: Date
  horaInicio: string
  duracionMinutos: number
  estadoCuota: 'pagada' | 'pendiente' | 'vencida'
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
  const vigenciaInicio = parseDate(
    horarioFijo.fecha_inicio || horarioFijo.fecha_inicio_vigencia || new Date().toISOString()
  )

  // Obtener días de la semana del horario fijo
  const diasRaw = Array.isArray(horarioFijo.dias_semana) && horarioFijo.dias_semana.length > 0
    ? horarioFijo.dias_semana
    : [horarioFijo.dia_semana_1, horarioFijo.dia_semana_2, horarioFijo.dia_semana_3].filter(Boolean)
  const diasSemana: number[] = diasRaw
    .filter((dia): dia is string => typeof dia === 'string')
    .map((dia) => DIA_A_NUMERO[dia])
    .filter((d): d is number => d !== undefined)

  const getDuracionMinutos = () => {
    if (typeof horarioFijo.duracion_minutos === 'number') return horarioFijo.duracion_minutos
    if (horarioFijo.hora_inicio && horarioFijo.hora_fin) {
      const [hIni, mIni] = horarioFijo.hora_inicio.split(':').map(Number)
      const [hFin, mFin] = horarioFijo.hora_fin.split(':').map(Number)
      return Math.max(0, hFin * 60 + mFin - (hIni * 60 + mIni))
    }
    return 0
  }

  const getEstadoCuotaEnFecha = (fecha: Dayjs): 'pagada' | 'pendiente' | 'vencida' => {
    const anio = fecha.year()
    const mes = fecha.month() + 1
    const cuota = (horarioFijo.cuotas_mensuales || []).find(
      (c) => c.anio === anio && c.mes === mes
    )

    if (!cuota) {
      return 'pendiente'
    }

    if (cuota.estado === 'pagada') {
      return 'pagada'
    }

    const ahora = new Date()
    const limite = new Date(`${cuota.fecha_limite_final}T23:59:59.999Z`)
    return ahora <= limite ? 'pendiente' : 'vencida'
  }

  // Iterar desde la fecha de inicio del rango (o desde vigencia si es posterior)
  let fechaActual = inicio.isAfter(vigenciaInicio) ? inicio : vigenciaInicio

  // Iterar hasta la fecha fin del rango
  while (fechaActual.isBefore(fin) || fechaActual.isSame(fin, 'day')) {
    const diaSemana = fechaActual.day()

    // Si este día de la semana está en el horario fijo
    if (diasSemana.includes(diaSemana)) {
      if (
        horarioFijo.fecha_baja_efectiva &&
        fechaActual.isAfter(parseDate(horarioFijo.fecha_baja_efectiva), 'day')
      ) {
        fechaActual = sumarDias(fechaActual, 1)
        continue
      }

      const estadoCuota = getEstadoCuotaEnFecha(fechaActual)
      if (estadoCuota === 'vencida') {
        fechaActual = sumarDias(fechaActual, 1)
        continue
      }

      ocurrencias.push({
        horarioFijoId: horarioFijo.id,
        fecha: fechaActual.toDate(),
        horaInicio: horarioFijo.hora_inicio,
        duracionMinutos: getDuracionMinutos(),
        estadoCuota,
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
  const vigenciaInicio = parseDate(
    horarioFijo.fecha_inicio || horarioFijo.fecha_inicio_vigencia || new Date().toISOString()
  )

  // Verificar que la fecha sea después de la vigencia
  if (fechaParsed.isBefore(vigenciaInicio, 'day')) {
    return false
  }

  if (
    horarioFijo.fecha_baja_efectiva &&
    fechaParsed.isAfter(parseDate(horarioFijo.fecha_baja_efectiva), 'day')
  ) {
    return false
  }

  const diaSemana = fechaParsed.day()

  // Verificar si el día de la semana coincide
  const diasRaw = Array.isArray(horarioFijo.dias_semana) && horarioFijo.dias_semana.length > 0
    ? horarioFijo.dias_semana
    : [horarioFijo.dia_semana_1, horarioFijo.dia_semana_2, horarioFijo.dia_semana_3].filter(Boolean)
  const diasSemana: number[] = diasRaw
    .filter((dia): dia is string => typeof dia === 'string')
    .map((dia) => DIA_A_NUMERO[dia])
    .filter((d): d is number => d !== undefined)

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
  const vigenciaInicio = parseDate(
    horarioFijo.fecha_inicio || horarioFijo.fecha_inicio_vigencia || new Date().toISOString()
  )

  // Empezar desde la fecha mayor (desde o vigencia)
  let fechaActual = desde.isAfter(vigenciaInicio) ? desde : vigenciaInicio

  const diasRaw = Array.isArray(horarioFijo.dias_semana) && horarioFijo.dias_semana.length > 0
    ? horarioFijo.dias_semana
    : [horarioFijo.dia_semana_1, horarioFijo.dia_semana_2, horarioFijo.dia_semana_3].filter(Boolean)
  const diasSemana: number[] = diasRaw
    .filter((dia): dia is string => typeof dia === 'string')
    .map((dia) => DIA_A_NUMERO[dia])
    .filter((d): d is number => d !== undefined)

  const getDuracionMinutos = () => {
    if (typeof horarioFijo.duracion_minutos === 'number') return horarioFijo.duracion_minutos
    if (horarioFijo.hora_inicio && horarioFijo.hora_fin) {
      const [hIni, mIni] = horarioFijo.hora_inicio.split(':').map(Number)
      const [hFin, mFin] = horarioFijo.hora_fin.split(':').map(Number)
      return Math.max(0, hFin * 60 + mFin - (hIni * 60 + mIni))
    }
    return 0
  }

  const getEstadoCuotaEnFecha = (fecha: Dayjs): 'pagada' | 'pendiente' | 'vencida' => {
    const anio = fecha.year()
    const mes = fecha.month() + 1
    const cuota = (horarioFijo.cuotas_mensuales || []).find(
      (c) => c.anio === anio && c.mes === mes
    )
    if (!cuota) return 'pendiente'
    if (cuota.estado === 'pagada') return 'pagada'
    const ahora = new Date()
    const limite = new Date(`${cuota.fecha_limite_final}T23:59:59.999Z`)
    return ahora <= limite ? 'pendiente' : 'vencida'
  }

  // Buscar la próxima ocurrencia en los próximos 14 días
  for (let i = 0; i < 14; i++) {
    const diaSemana = fechaActual.day()

    if (diasSemana.includes(diaSemana)) {
      if (
        horarioFijo.fecha_baja_efectiva &&
        fechaActual.isAfter(parseDate(horarioFijo.fecha_baja_efectiva), 'day')
      ) {
        fechaActual = sumarDias(fechaActual, 1)
        continue
      }

      const estadoCuota = getEstadoCuotaEnFecha(fechaActual)
      if (estadoCuota === 'vencida') {
        fechaActual = sumarDias(fechaActual, 1)
        continue
      }

      return {
        horarioFijoId: horarioFijo.id,
        fecha: fechaActual.toDate(),
        horaInicio: horarioFijo.hora_inicio,
        duracionMinutos: getDuracionMinutos(),
        estadoCuota,
      }
    }

    fechaActual = sumarDias(fechaActual, 1)
  }

  return null
}
