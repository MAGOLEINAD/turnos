'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import type { SedeInput } from '../validations/sede.schema'

export async function crearSede(data: SedeInput) {
  const supabase = await createClient()

  const { data: sede, error } = await supabase
    .from('sedes')
    .insert(data)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/super-admin/sedes')
  return { data: sede }
}

export async function obtenerSedes(organizacionId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('sedes')
    .select('*, organizaciones(*)')
    .order('created_at', { ascending: false })

  if (organizacionId) {
    query = query.eq('organizacion_id', organizacionId)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}
