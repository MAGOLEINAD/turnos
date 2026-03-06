'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import type { OrganizacionInput } from '../validations/organizacion.schema'

export async function crearOrganizacion(data: OrganizacionInput) {
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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizaciones')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}

export async function actualizarOrganizacion(id: string, data: Partial<OrganizacionInput>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organizaciones')
    .update(data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/organizaciones')
  return { success: true }
}
