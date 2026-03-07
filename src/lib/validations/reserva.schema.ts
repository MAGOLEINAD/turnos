import { z } from 'zod'
import { TIPO_RESERVA, ESTADO_RESERVA } from '../constants/estados'

export const reservaSchema = z.object({
  sede_id: z.string().uuid(),
  profesor_id: z.string().uuid(),
  alumno_id: z.string().uuid().optional(),
  tipo: z.enum([TIPO_RESERVA.INDIVIDUAL, TIPO_RESERVA.GRUPAL]).optional(),
  actividad_id: z.string().uuid().optional(),
  fecha_inicio: z.string().or(z.date()),
  fecha_fin: z.string().or(z.date()),
  cupo_maximo: z.number().int().positive().optional(),
  notas: z.string().optional(),
  pago_registrado: z.boolean().optional(),
  es_clase_prueba: z.boolean().optional(),
  fecha_limite_regularizacion: z.string().or(z.date()).optional(),
  origen_pago_manual: z.enum(['transferencia', 'efectivo', 'manual_override']).optional(),
  monto_pago_manual: z.number().positive().optional(),
  referencia_pago_manual: z.string().optional(),
  observaciones_pago_manual: z.string().optional(),
  usar_credito: z.boolean().optional(),
  credito_id: z.string().uuid().optional(),
})

export type ReservaInput = z.infer<typeof reservaSchema>

export const cancelarReservaSchema = z.object({
  reserva_id: z.string().uuid(),
  motivo_cancelacion: z.string().optional(),
})

export type CancelarReservaInput = z.infer<typeof cancelarReservaSchema>
