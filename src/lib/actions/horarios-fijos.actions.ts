'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { HorarioFijoInput, BajaHorarioFijoInput } from '../validations/horario-fijo.schema'

export async function crearHorarioFijo(data: HorarioFijoInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Verificar disponibilidad del profesor en los días seleccionados
  // TODO: Implementar validación de conflictos con otros horarios fijos y reservas

  // Crear horario fijo
  const { data: horarioFijo, error } = await supabase
    .from('horarios_fijos')
    .insert({
      ...data,
      fecha_inicio_vigencia:
        typeof data.fecha_inicio_vigencia === 'string'
          ? data.fecha_inicio_vigencia
          : data.fecha_inicio_vigencia.toISOString(),
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
  return { data }
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

  // Desactivar horario fijo
  const { error: updateError } = await supabase
    .from('horarios_fijos')
    .update({ activo: false })
    .eq('id', input.horario_fijo_id)

  if (updateError) return { error: updateError.message }

  // Registrar baja
  const { error: insertError } = await supabase.from('bajas_horarios_fijos').insert({
    horario_fijo_id: input.horario_fijo_id,
    alumno_id: horarioFijo.alumno_id,
    fecha_baja: new Date().toISOString(),
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
    .order('dia_semana_1', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}
