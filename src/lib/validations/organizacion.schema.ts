import { z } from 'zod'

export const organizacionSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  descripcion: z.string().optional(),
  icono: z.string().max(8, 'El icono no es valido').optional(),
  admin_usuario_id: z.string().uuid('Selecciona un usuario admin valido').optional().or(z.literal('')),
  motivo_desactivacion: z.string().optional().nullable(),
  activa: z.boolean().default(true),
})

export type OrganizacionInput = z.infer<typeof organizacionSchema>
