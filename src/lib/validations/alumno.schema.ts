import { z } from 'zod'

export const alumnoSchema = z.object({
  usuario_id: z.string().uuid(),
  sede_id: z.string().uuid(),
  fecha_nacimiento: z.string().optional(),
  contacto_emergencia: z.string().optional(),
  telefono_emergencia: z.string().optional(),
  notas_medicas: z.string().optional(),
  activo: z.boolean().default(true),
})

export type AlumnoInput = z.infer<typeof alumnoSchema>
