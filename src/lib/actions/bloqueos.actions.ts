'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { BloqueoInput } from '../validations/bloqueo.schema'

export async function crearBloqueo(data: BloqueoInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Crear bloqueo
  const { data: bloqueo, error } = await supabase
    .from('bloqueos_disponibilidad')
    .insert({
      profesor_id: data.profesor_id,
      fecha_inicio:
        typeof data.fecha_inicio === 'string'
          ? data.fecha_inicio
          : data.fecha_inicio.toISOString(),
      fecha_fin:
        typeof data.fecha_fin === 'string' ? data.fecha_fin : data.fecha_fin.toISOString(),
      motivo: data.motivo,
      es_recurrente: data.es_recurrente || false,
      fecha_fin_recurrencia: data.fecha_fin_recurrencia
        ? typeof data.fecha_fin_recurrencia === 'string'
          ? data.fecha_fin_recurrencia
          : data.fecha_fin_recurrencia.toISOString()
        : null,
    })
    .select(`
      *,
      profesores (
        id,
        usuarios (nombre, apellido)
      )
    `)
    .single()

  if (error) return { error: error.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/admin/bloqueos')
  return { data: bloqueo }
}

export async function obtenerBloqueos(profesorId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('bloqueos_disponibilidad')
    .select(`
      *,
      profesores (
        id,
        usuarios (nombre, apellido)
      )
    `)
    .order('fecha_inicio', { ascending: false })

  if (profesorId) {
    query = query.eq('profesor_id', profesorId)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}

export async function eliminarBloqueo(bloqueoId: string) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('bloqueos_disponibilidad')
    .delete()
    .eq('id', bloqueoId)

  if (error) return { error: error.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/admin/bloqueos')
  return { success: true }
}
