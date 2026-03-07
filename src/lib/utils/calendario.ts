/**
 * Utilidades para FullCalendar
 */

import type { EventInput } from '@fullcalendar/core'
import { parseDate, formatTime } from './date'

// Colores para diferentes tipos de eventos
export const CALENDAR_COLORS = {
  // Por creador
  SUPER_ADMIN: '#8B5CF6', // Violeta
  ADMIN: '#3B82F6',       // Azul
  PROFESOR: '#10B981',    // Verde

  // Por tipo
  RESERVA_INDIVIDUAL: '#3B82F6', // Azul
  RESERVA_GRUPAL: '#F59E0B',     // Amarillo/Naranja
  HORARIO_FIJO: '#6366F1',       // Indigo
  BLOQUEO: '#EF4444',            // Rojo
  RECUPERATORIO: '#8B5CF6',      // Violeta
} as const

// Configuración de FullCalendar para timezone Argentina
export const FULLCALENDAR_CONFIG = {
  timeZone: 'America/Argentina/Buenos_Aires',
  locale: 'es',
  firstDay: 1, // Lunes
  slotMinTime: '07:00:00',
  slotMaxTime: '23:00:00',
  slotDuration: '00:30:00', // Slots de 30 minutos
  slotLabelInterval: '01:00', // Labels cada hora
  allDaySlot: false,
  nowIndicator: true,
  navLinks: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  editable: false, // Por defecto, se controla por permisos
  height: 'auto',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  buttonText: {
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
  },
}

/**
 * Convierte una reserva a evento de FullCalendar
 */
export function reservaToEvent(reserva: any): EventInput {
  return {
    id: reserva.id,
    title: obtenerTituloEvento(reserva),
    start: reserva.fecha_inicio,
    end: reserva.fecha_fin,
    backgroundColor: obtenerColorEvento(reserva),
    borderColor: obtenerColorEvento(reserva),
    extendedProps: {
      tipo: 'reserva',
      reserva,
    },
  }
}

/**
 * Convierte un horario fijo a evento de FullCalendar
 */
export function horarioFijoToEvent(horarioFijo: any, fecha: Date): EventInput {
  const [hora, minuto] = horarioFijo.hora_inicio.split(':').map(Number)
  const duracionMinutos =
    typeof horarioFijo.duracion_minutos === 'number'
      ? horarioFijo.duracion_minutos
      : (() => {
          if (!horarioFijo.hora_fin) return 0
          const [hFin, mFin] = String(horarioFijo.hora_fin).split(':').map(Number)
          return Math.max(0, hFin * 60 + mFin - (hora * 60 + minuto))
        })()

  const start = parseDate(fecha)
    .hour(hora)
    .minute(minuto)
    .toDate()

  const end = parseDate(fecha)
    .hour(hora)
    .minute(minuto)
    .add(duracionMinutos, 'minute')
    .toDate()

  // Obtener nombre del alumno si está disponible
  const alumnoNombre = horarioFijo.alumnos
    ? `${horarioFijo.alumnos.usuarios?.nombre || ''} ${horarioFijo.alumnos.usuarios?.apellido || ''}`.trim()
    : 'Horario Fijo'

  return {
    id: `horario-fijo-${horarioFijo.id}-${fecha.toISOString()}`,
    title: alumnoNombre,
    start,
    end,
    backgroundColor: CALENDAR_COLORS.HORARIO_FIJO,
    borderColor: CALENDAR_COLORS.HORARIO_FIJO,
    extendedProps: {
      tipo: 'horario_fijo',
      horarioFijo,
    },
  }
}

/**
 * Convierte un bloqueo a evento de FullCalendar
 */
export function bloqueoToEvent(bloqueo: any): EventInput {
  return {
    id: bloqueo.id,
    title: bloqueo.motivo || 'Bloqueado',
    start: bloqueo.fecha_inicio,
    end: bloqueo.fecha_fin,
    backgroundColor: CALENDAR_COLORS.BLOQUEO,
    borderColor: CALENDAR_COLORS.BLOQUEO,
    display: 'background',
    extendedProps: {
      tipo: 'bloqueo',
      bloqueo,
    },
  }
}

/**
 * Obtiene el título del evento según el tipo y datos
 */
function obtenerTituloEvento(reserva: any): string {
  if (reserva.tipo === 'grupal') {
    return `Grupal (${reserva.cupo_actual}/${reserva.cupo_maximo})`
  }
  return 'Individual'
}

/**
 * Obtiene el color del evento según el tipo
 */
function obtenerColorEvento(reserva: any): string {
  if (reserva.tipo === 'grupal') {
    return CALENDAR_COLORS.RESERVA_GRUPAL
  }
  return CALENDAR_COLORS.RESERVA_INDIVIDUAL
}

/**
 * Verifica si un slot está disponible
 */
export function isSlotDisponible(
  start: Date,
  end: Date,
  eventos: EventInput[]
): boolean {
  return !eventos.some((evento) => {
    const eventoStart = new Date(evento.start as string)
    const eventoEnd = new Date(evento.end as string)

    return (
      (start < eventoEnd && end > eventoStart) ||
      (start === eventoStart && end === eventoEnd)
    )
  })
}
