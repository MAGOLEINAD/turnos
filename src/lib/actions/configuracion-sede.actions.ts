'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { ConfiguracionSedeInput } from '../validations/configuracion-sede.schema'

export async function obtenerConfiguracionSede(sedeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('configuracion_sede')
    .select('*')
    .eq('sede_id', sedeId)
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function actualizarConfiguracionSede(
  sedeId: string,
  data: ConfiguracionSedeInput
) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Actualizar configuración
  const { data: config, error } = await supabase
    .from('configuracion_sede')
    .update(data)
    .eq('sede_id', sedeId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  revalidatePath('/super-admin/sedes')
  return { data: config }
}
