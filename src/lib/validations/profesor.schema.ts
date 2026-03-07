import { z } from 'zod'
import { TIPO_AUTORIZACION_PROFESOR } from '../constants/estados'

export const profesorSchema = z.object({
  usuario_id: z.string({ required_error: 'El usuario es requerido' }).uuid('ID de usuario inválido'),
  sede_id: z.string({ required_error: 'La sede es requerida' }).uuid('ID de sede inválido'),
  tipo_autorizacion: z.enum([
    TIPO_AUTORIZACION_PROFESOR.SOLO_INDIVIDUAL,
    TIPO_AUTORIZACION_PROFESOR.SOLO_GRUPAL,
    TIPO_AUTORIZACION_PROFESOR.AMBAS,
  ], { required_error: 'El tipo de clases es requerido' }),
  especialidad: z.string().optional(),
  biografia: z.string().optional(),
  color_calendario: z.string({ required_error: 'El color es requerido' }).regex(/^#[0-9A-F]{6}$/i, 'Formato de color inválido (ej: #3B82F6)').default('#3B82F6'),
  activo: z.boolean().default(true),
})

export type ProfesorInput = z.infer<typeof profesorSchema>
