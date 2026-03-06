import { z } from 'zod'
import { TIPO_RESERVA, ESTADO_RESERVA } from '../constants/estados'

export const reservaSchema = z.object({
  sede_id: z.string().uuid(),
  profesor_id: z.string().uuid(),
  tipo: z.enum([TIPO_RESERVA.INDIVIDUAL, TIPO_RESERVA.GRUPAL]),
  fecha_inicio: z.string().or(z.date()),
  fecha_fin: z.string().or(z.date()),
  cupo_maximo: z.number().int().positive().optional(),
  notas: z.string().optional(),
  usar_credito: z.boolean().optional(),
  credito_id: z.string().uuid().optional(),
})

export type ReservaInput = z.infer<typeof reservaSchema>

export const cancelarReservaSchema = z.object({
  reserva_id: z.string().uuid(),
  motivo_cancelacion: z.string().optional(),
})

export type CancelarReservaInput = z.infer<typeof cancelarReservaSchema>
