'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import type { OrganizacionInput } from '../validations/organizacion.schema'
import { getUser } from './auth.actions'

export async function crearOrganizacion(data: OrganizacionInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  if (!esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede crear organizaciones.' }
  }

  const supabase = await createClient()

  const { data: org, error } = await supabase
    .from('organizaciones')
    .insert(data)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/super-admin/organizaciones')
  return { data: org }
}

export async function obtenerOrganizaciones() {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizaciones')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}

export async function actualizarOrganizacion(id: string, data: Partial<OrganizacionInput>) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  if (!esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede actualizar organizaciones.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('organizaciones')
    .update(data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/organizaciones')
  return { success: true }
}

export async function eliminarOrganizacion(id: string) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  if (!esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede eliminar organizaciones.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('organizaciones')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/organizaciones')
  revalidatePath('/super-admin/sedes')
  return { success: true }
}
