/**
 * Constantes de estados del sistema
 */

// Estados de reserva
export const ESTADO_RESERVA = {
  CONFIRMADA: 'confirmada',
  CANCELADA: 'cancelada',
  COMPLETADA: 'completada',
  PRIMERA_CLASE: 'primera_clase',
} as const

export type EstadoReserva = (typeof ESTADO_RESERVA)[keyof typeof ESTADO_RESERVA]

export const ESTADO_RESERVA_LABELS: Record<EstadoReserva, string> = {
  [ESTADO_RESERVA.CONFIRMADA]: 'Confirmada',
  [ESTADO_RESERVA.CANCELADA]: 'Cancelada',
  [ESTADO_RESERVA.COMPLETADA]: 'Completada',
  [ESTADO_RESERVA.PRIMERA_CLASE]: 'Primera clase',
}

// Estados de pago
export const ESTADO_PAGO = {
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  CANCELADO: 'cancelado',
  REEMBOLSADO: 'reembolsado',
} as const

export type EstadoPago = (typeof ESTADO_PAGO)[keyof typeof ESTADO_PAGO]

export const ESTADO_PAGO_LABELS: Record<EstadoPago, string> = {
  [ESTADO_PAGO.PENDIENTE]: 'Pendiente',
  [ESTADO_PAGO.APROBADO]: 'Aprobado',
  [ESTADO_PAGO.RECHAZADO]: 'Rechazado',
  [ESTADO_PAGO.CANCELADO]: 'Cancelado',
  [ESTADO_PAGO.REEMBOLSADO]: 'Reembolsado',
}

// Tipos de reserva
export const TIPO_RESERVA = {
  INDIVIDUAL: 'individual',
  GRUPAL: 'grupal',
} as const

export type TipoReserva = (typeof TIPO_RESERVA)[keyof typeof TIPO_RESERVA]

export const TIPO_RESERVA_LABELS: Record<TipoReserva, string> = {
  [TIPO_RESERVA.INDIVIDUAL]: 'Individual',
  [TIPO_RESERVA.GRUPAL]: 'Grupal',
}

// Tipo de autorización de profesor
export const TIPO_AUTORIZACION_PROFESOR = {
  SOLO_INDIVIDUAL: 'solo_individual',
  SOLO_GRUPAL: 'solo_grupal',
  AMBAS: 'ambas',
} as const

export type TipoAutorizacionProfesor = (typeof TIPO_AUTORIZACION_PROFESOR)[keyof typeof TIPO_AUTORIZACION_PROFESOR]

export const TIPO_AUTORIZACION_PROFESOR_LABELS: Record<TipoAutorizacionProfesor, string> = {
  [TIPO_AUTORIZACION_PROFESOR.SOLO_INDIVIDUAL]: 'Solo Individual',
  [TIPO_AUTORIZACION_PROFESOR.SOLO_GRUPAL]: 'Solo Grupal',
  [TIPO_AUTORIZACION_PROFESOR.AMBAS]: 'Ambas',
}

// Frecuencia de horarios fijos
export const FRECUENCIA_HORARIO = {
  SEMANAL_1: 'semanal_1',
  SEMANAL_2: 'semanal_2',
  SEMANAL_3: 'semanal_3',
} as const

export type FrecuenciaHorario = (typeof FRECUENCIA_HORARIO)[keyof typeof FRECUENCIA_HORARIO]

export const FRECUENCIA_HORARIO_LABELS: Record<FrecuenciaHorario, string> = {
  [FRECUENCIA_HORARIO.SEMANAL_1]: '1 vez por semana',
  [FRECUENCIA_HORARIO.SEMANAL_2]: '2 veces por semana',
  [FRECUENCIA_HORARIO.SEMANAL_3]: '3 veces por semana',
}

// Días de la semana
export const DIA_SEMANA = {
  LUNES: 'lunes',
  MARTES: 'martes',
  MIERCOLES: 'miercoles',
  JUEVES: 'jueves',
  VIERNES: 'viernes',
  SABADO: 'sabado',
  DOMINGO: 'domingo',
} as const

export type DiaSemana = (typeof DIA_SEMANA)[keyof typeof DIA_SEMANA]

export const DIA_SEMANA_LABELS: Record<DiaSemana, string> = {
  [DIA_SEMANA.LUNES]: 'Lunes',
  [DIA_SEMANA.MARTES]: 'Martes',
  [DIA_SEMANA.MIERCOLES]: 'Miércoles',
  [DIA_SEMANA.JUEVES]: 'Jueves',
  [DIA_SEMANA.VIERNES]: 'Viernes',
  [DIA_SEMANA.SABADO]: 'Sábado',
  [DIA_SEMANA.DOMINGO]: 'Domingo',
}
