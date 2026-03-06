import { z } from 'zod'
import { TIPO_AUTORIZACION_PROFESOR } from '../constants/estados'

export const profesorSchema = z.object({
  usuario_id: z.string().uuid(),
  sede_id: z.string().uuid(),
  tipo_autorizacion: z.enum([
    TIPO_AUTORIZACION_PROFESOR.SOLO_INDIVIDUAL,
    TIPO_AUTORIZACION_PROFESOR.SOLO_GRUPAL,
    TIPO_AUTORIZACION_PROFESOR.AMBAS,
  ]),
  especialidad: z.string().optional(),
  biografia: z.string().optional(),
  color_calendario: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  activo: z.boolean().default(true),
})

export type ProfesorInput = z.infer<typeof profesorSchema>
