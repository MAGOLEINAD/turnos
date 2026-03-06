import { z } from 'zod'

export const sedeSchema = z.object({
  organizacion_id: z.string().uuid(),
  nombre: z.string().min(2).max(255),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  activa: z.boolean().default(true),
})

export type SedeInput = z.infer<typeof sedeSchema>
