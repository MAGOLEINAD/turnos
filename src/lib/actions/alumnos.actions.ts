'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { AlumnoInput } from '../validations/alumno.schema'

export async function crearAlumno(data: AlumnoInput) {
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

  // Verificar que no sea ya un alumno en esta sede
  const { data: alumnoExiste } = await supabase
    .from('alumnos')
    .select('id')
    .eq('usuario_id', data.usuario_id)
    .eq('sede_id', data.sede_id)
    .single()

  if (alumnoExiste) {
    return { error: 'Este usuario ya es un alumno de esta sede' }
  }

  // Crear alumno
  const { data: alumno, error } = await supabase
    .from('alumnos')
    .insert(data)
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
        nombre
      )
    `)
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/alumnos')
  revalidatePath('/super-admin/alumnos')
  return { data: alumno }
}

export async function obtenerAlumnos(sedeId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('alumnos')
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

export async function obtenerAlumno(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alumnos')
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

export async function actualizarAlumno(id: string, data: Partial<AlumnoInput>) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { data: alumno, error } = await supabase
    .from('alumnos')
    .update(data)
    .eq('id', id)
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
        nombre
      )
    `)
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/alumnos')
  revalidatePath('/super-admin/alumnos')
  revalidatePath('/alumno/perfil')
  return { data: alumno }
}

export async function desactivarAlumno(id: string) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('alumnos')
    .update({ activo: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/alumnos')
  revalidatePath('/super-admin/alumnos')
  return { success: true }
}

export async function activarAlumno(id: string) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('alumnos')
    .update({ activo: true })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/alumnos')
  revalidatePath('/super-admin/alumnos')
  return { success: true }
}

// Obtener usuarios disponibles para ser alumnos (no tienen rol de alumno en esta sede aún)
export async function obtenerUsuariosDisponiblesParaAlumnos(sedeId: string) {
  const supabase = await createClient()

  // Obtener usuarios que NO son alumnos de esta sede
  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('usuario_id')
    .eq('sede_id', sedeId)

  const usuariosAlumnos = alumnos?.map((a) => a.usuario_id) || []

  let query = supabase
    .from('usuarios')
    .select(`
      id,
      email,
      nombre,
      apellido,
      telefono
    `)

  if (usuariosAlumnos.length > 0) {
    query = query.not('id', 'in', `(${usuariosAlumnos.join(',')})`)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}

// Obtener créditos disponibles de un alumno
export async function obtenerCreditosAlumno(alumnoId: string, sedeId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('creditos_recupero')
    .select('*')
    .eq('alumno_id', alumnoId)
    .eq('utilizado', false)
    .gte('fecha_expiracion', new Date().toISOString())

  if (sedeId) {
    query = query.eq('sede_id', sedeId)
  }

  const { data, error } = await query.order('fecha_expiracion', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}
