import { z } from 'zod'

export const bloqueoSchema = z.object({
  profesor_id: z.string().uuid(),
  fecha_inicio: z.string().or(z.date()),
  fecha_fin: z.string().or(z.date()),
  motivo: z.string().optional(),
  es_recurrente: z.boolean().default(false),
  fecha_fin_recurrencia: z.string().or(z.date()).optional(),
})

export type BloqueoInput = z.infer<typeof bloqueoSchema>
