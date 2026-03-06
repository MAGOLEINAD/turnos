import { z } from 'zod'

export const inscripcionGrupalSchema = z.object({
  reserva_id: z.string().uuid(),
  alumno_id: z.string().uuid(),
})

export type InscripcionGrupalInput = z.infer<typeof inscripcionGrupalSchema>

export const desinscripcionGrupalSchema = z.object({
  participante_id: z.string().uuid(),
  motivo: z.string().optional(),
})

export type DesinscripcionGrupalInput = z.infer<typeof desinscripcionGrupalSchema>
