import { z } from 'zod'
import { FRECUENCIA_HORARIO, DIA_SEMANA } from '../constants/estados'

export const horarioFijoSchema = z.object({
  sede_id: z.string().uuid(),
  profesor_id: z.string().uuid(),
  alumno_id: z.string().uuid(),
  frecuencia: z.enum([
    FRECUENCIA_HORARIO.SEMANAL_1,
    FRECUENCIA_HORARIO.SEMANAL_2,
    FRECUENCIA_HORARIO.SEMANAL_3,
  ]),
  dia_semana_1: z.enum([
    DIA_SEMANA.LUNES,
    DIA_SEMANA.MARTES,
    DIA_SEMANA.MIERCOLES,
    DIA_SEMANA.JUEVES,
    DIA_SEMANA.VIERNES,
    DIA_SEMANA.SABADO,
    DIA_SEMANA.DOMINGO,
  ]),
  dia_semana_2: z
    .enum([
      DIA_SEMANA.LUNES,
      DIA_SEMANA.MARTES,
      DIA_SEMANA.MIERCOLES,
      DIA_SEMANA.JUEVES,
      DIA_SEMANA.VIERNES,
      DIA_SEMANA.SABADO,
      DIA_SEMANA.DOMINGO,
    ])
    .optional(),
  dia_semana_3: z
    .enum([
      DIA_SEMANA.LUNES,
      DIA_SEMANA.MARTES,
      DIA_SEMANA.MIERCOLES,
      DIA_SEMANA.JUEVES,
      DIA_SEMANA.VIERNES,
      DIA_SEMANA.SABADO,
      DIA_SEMANA.DOMINGO,
    ])
    .optional(),
  hora_inicio: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Formato inválido. Usa HH:MM (ej: 09:00)',
  }),
  duracion_minutos: z.number().int().min(15).max(180),
  fecha_inicio_vigencia: z.string().or(z.date()),
  activo: z.boolean().default(true),
})

export type HorarioFijoInput = z.infer<typeof horarioFijoSchema>

export const bajaHorarioFijoSchema = z.object({
  horario_fijo_id: z.string().uuid(),
  modalidad: z.enum(['inmediata', 'fin_de_mes']).default('inmediata'),
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
})

export type BajaHorarioFijoInput = z.infer<typeof bajaHorarioFijoSchema>
