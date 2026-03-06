'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import type { SedeInput } from '../validations/sede.schema'
import { getUser } from './auth.actions'

export async function crearSede(data: SedeInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  if (!esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede crear sedes.' }
  }

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
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

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

export async function actualizarSede(id: string, data: Partial<SedeInput>) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  if (!esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede actualizar sedes.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('sedes')
    .update(data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/sedes')
  return { success: true }
}

export async function eliminarSede(id: string) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  if (!esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede eliminar sedes.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('sedes')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/sedes')
  return { success: true }
}
