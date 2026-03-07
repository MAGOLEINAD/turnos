'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { HorarioFijoInput, BajaHorarioFijoInput } from '../validations/horario-fijo.schema'
import { asegurarCuotasInicialesHorarioFijo } from './cuotas.actions'

function sumarMinutosAHora(horaInicio: string, duracionMinutos: number) {
  const [h, m] = horaInicio.split(':').map(Number)
  const base = h * 60 + m + duracionMinutos
  const hh = Math.floor(base / 60) % 24
  const mm = base % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
}

function obtenerUltimoDiaMesUTC(fecha: Date) {
  const anio = fecha.getUTCFullYear()
  const mes = fecha.getUTCMonth()
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0))
  return ultimo.toISOString().slice(0, 10)
}

export async function crearHorarioFijo(data: HorarioFijoInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Verificar disponibilidad del profesor en los días seleccionados
  // TODO: Implementar validación de conflictos con otros horarios fijos y reservas

  const diasSemana = [data.dia_semana_1, data.dia_semana_2, data.dia_semana_3].filter(Boolean)

  const horaFin = sumarMinutosAHora(data.hora_inicio, data.duracion_minutos)

  // Crear horario fijo (normalizado al esquema actual de DB)
  const { data: horarioFijo, error } = await supabase
    .from('horarios_fijos')
    .insert({
      sede_id: data.sede_id,
      profesor_id: data.profesor_id,
      alumno_id: data.alumno_id,
      frecuencia: data.frecuencia,
      dias_semana: diasSemana,
      hora_inicio: data.hora_inicio,
      hora_fin: horaFin,
      fecha_inicio:
        typeof data.fecha_inicio_vigencia === 'string'
          ? data.fecha_inicio_vigencia
          : data.fecha_inicio_vigencia.toISOString().slice(0, 10),
      activo: data.activo,
    })
    .select(`
      *,
      profesores (
        id,
        usuarios (nombre, apellido)
      ),
      alumnos (
        id,
        usuarios (nombre, apellido)
      ),
      sedes (nombre)
    `)
    .single()

  if (error) return { error: error.message }

  await asegurarCuotasInicialesHorarioFijo(horarioFijo.id)

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
  revalidatePath('/alumno/horarios')
  revalidatePath('/admin/horarios-fijos')
  return { data: horarioFijo }
}

export async function obtenerHorariosFijos(
  profesorId?: string,
  alumnoId?: string,
  sedeId?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('horarios_fijos')
    .select(`
      *,
      profesores (
        id,
        usuarios (nombre, apellido)
      ),
      alumnos (
        id,
        usuarios (nombre, apellido)
      ),
      sedes (nombre)
    `)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (profesorId) {
    query = query.eq('profesor_id', profesorId)
  }

  if (alumnoId) {
    query = query.eq('alumno_id', alumnoId)
  }

  if (sedeId) {
    query = query.eq('sede_id', sedeId)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  const hoyISO = new Date().toISOString().slice(0, 10)
  const vigentes = (data || []).filter((h: any) => !h.fecha_baja_efectiva || h.fecha_baja_efectiva >= hoyISO)
  return { data: vigentes }
}

export async function darDeBajaHorarioFijo(input: BajaHorarioFijoInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Obtener horario fijo
  const { data: horarioFijo, error: fetchError } = await supabase
    .from('horarios_fijos')
    .select('*')
    .eq('id', input.horario_fijo_id)
    .single()

  if (fetchError) return { error: 'Horario fijo no encontrado' }

  const hoy = new Date()
  const fechaBajaEfectiva =
    input.modalidad === 'fin_de_mes'
      ? obtenerUltimoDiaMesUTC(hoy)
      : hoy.toISOString().slice(0, 10)

  const payloadUpdate =
    input.modalidad === 'fin_de_mes'
      ? {
          baja_modalidad: 'fin_de_mes',
          fecha_baja_efectiva: fechaBajaEfectiva,
        }
      : {
          activo: false,
          baja_modalidad: 'inmediata',
          fecha_baja_efectiva: fechaBajaEfectiva,
        }

  const { error: updateError } = await supabase
    .from('horarios_fijos')
    .update(payloadUpdate)
    .eq('id', input.horario_fijo_id)

  if (updateError) return { error: updateError.message }

  // Registrar baja
  const { error: insertError } = await supabase.from('bajas_horarios_fijos').insert({
    horario_fijo_id: input.horario_fijo_id,
    alumno_id: horarioFijo.alumno_id,
    fecha_baja: fechaBajaEfectiva,
    motivo: input.motivo,
  })

  if (insertError) return { error: insertError.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
  revalidatePath('/alumno/horarios')
  revalidatePath('/admin/horarios-fijos')

  return { success: true }
}

// Obtener horarios fijos de un alumno específico
export async function obtenerHorariosFijosAlumno(alumnoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('horarios_fijos')
    .select(`
      *,
      profesores (
        id,
        usuarios (nombre, apellido),
        color_calendario
      ),
      sedes (nombre)
    `)
    .eq('alumno_id', alumnoId)
    .eq('activo', true)
    .order('hora_inicio', { ascending: true })

  if (error) return { error: error.message }
  const hoyISO = new Date().toISOString().slice(0, 10)
  const vigentes = (data || []).filter((h: any) => !h.fecha_baja_efectiva || h.fecha_baja_efectiva >= hoyISO)
  return { data: vigentes }
}
