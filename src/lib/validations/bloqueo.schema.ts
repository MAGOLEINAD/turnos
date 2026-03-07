import { z } from 'zod'

const resolucionConflictoSchema = z.object({
  horario_fijo_id: z.string().uuid(),
  accion: z.enum(['reasignar_profesor', 'mover_horario_fijo', 'cancelar_bloqueo']),
  nuevo_profesor_id: z.string().uuid().optional(),
  nueva_hora_inicio: z.string().optional(),
  nueva_hora_fin: z.string().optional(),
})

export const bloqueoSchema = z.object({
  profesor_id: z.string().uuid(),
  fecha_inicio: z.string().or(z.date()),
  fecha_fin: z.string().or(z.date()),
  motivo: z.string().optional(),
  es_recurrente: z.boolean().default(false),
  fecha_fin_recurrencia: z.string().or(z.date()).optional(),
  resoluciones_conflicto: z.array(resolucionConflictoSchema).optional(),
})

export type BloqueoInput = z.infer<typeof bloqueoSchema>
