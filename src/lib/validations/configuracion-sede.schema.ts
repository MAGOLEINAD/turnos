import { z } from 'zod'

export const configuracionSedeSchema = z.object({
  horario_inicio: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Formato inválido. Usa HH:MM (ej: 08:00)',
  }),
  horario_fin: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Formato inválido. Usa HH:MM (ej: 18:00)',
  }),
  duracion_clase: z.number().int().min(15).max(180),
  cupo_grupal_maximo: z.number().int().min(2).max(50),
  mostrar_profesor_publico: z.boolean(),
  permitir_reservas_online: z.boolean(),
})

export type ConfiguracionSedeInput = z.infer<typeof configuracionSedeSchema>
