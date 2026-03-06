/**
 * Server Actions para usuarios
 */

'use server'

import { createClient } from '../supabase/server'

export async function getUsuarios() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        membresias (
          rol,
          sede_id,
          organizacion_id,
          activa
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getUsuarios] Error:', error)
      return { data: [], error: error.message }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('[getUsuarios] Error inesperado:', error)
    return { data: [], error: 'Error al obtener usuarios' }
  }
}
