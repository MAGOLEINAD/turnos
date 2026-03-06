import { z } from 'zod'

export const organizacionSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  descripcion: z.string().optional(),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
  activa: z.boolean().default(true),
})

export type OrganizacionInput = z.infer<typeof organizacionSchema>
