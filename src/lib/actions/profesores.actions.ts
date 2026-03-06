'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { ProfesorInput } from '../validations/profesor.schema'

export async function crearProfesor(data: ProfesorInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Verificar que el usuario_id exista en la tabla usuarios
  const { data: usuarioExiste } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', data.usuario_id)
    .single()

  if (!usuarioExiste) {
    return { error: 'El usuario seleccionado no existe' }
  }

  // Verificar que no sea ya un profesor
  const { data: profesorExiste } = await supabase
    .from('profesores')
    .select('id')
    .eq('usuario_id', data.usuario_id)
    .single()

  if (profesorExiste) {
    return { error: 'Este usuario ya es un profesor' }
  }

  // Crear profesor
  const { data: profesor, error } = await supabase
    .from('profesores')
    .insert(data)
    .select(`
      *,
      usuarios (
        id,
        email,
        nombre,
        apellido,
        telefono
      ),
      sedes (
        id,
        nombre
      )
    `)
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  return { data: profesor }
}

export async function obtenerProfesores(sedeId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('profesores')
    .select(`
      *,
      usuarios (
        id,
        email,
        nombre,
        apellido,
        telefono,
        avatar_url
      ),
      sedes (
        id,
        nombre,
        organizacion_id
      )
    `)
    .order('created_at', { ascending: false })

  if (sedeId) {
    query = query.eq('sede_id', sedeId)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}

export async function obtenerProfesor(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profesores')
    .select(`
      *,
      usuarios (
        id,
        email,
        nombre,
        apellido,
        telefono,
        avatar_url
      ),
      sedes (
        id,
        nombre,
        slug,
        organizacion_id
      )
    `)
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function actualizarProfesor(id: string, data: Partial<ProfesorInput>) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { data: profesor, error } = await supabase
    .from('profesores')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      usuarios (
        id,
        email,
        nombre,
        apellido,
        telefono
      ),
      sedes (
        id,
        nombre
      )
    `)
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  revalidatePath('/profesor/calendario')
  return { data: profesor }
}

export async function desactivarProfesor(id: string) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('profesores')
    .update({ activo: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  return { success: true }
}

export async function activarProfesor(id: string) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('profesores')
    .update({ activo: true })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  return { success: true }
}

// Obtener usuarios disponibles para ser profesores (no tienen rol de profesor aún)
export async function obtenerUsuariosDisponibles(sedeId: string) {
  const supabase = await createClient()

  // Obtener todos los usuarios de esta sede que NO son profesores
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id,
      email,
      nombre,
      apellido,
      telefono
    `)
    .not('id', 'in', `(SELECT usuario_id FROM profesores)`)

  if (error) return { error: error.message }
  return { data }
}
