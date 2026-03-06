/**
 * Server Actions para usuarios
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '../supabase/server'
import { getUser } from './auth.actions'

interface AsignarRolInput {
  usuarioId: string
  rol: 'super_admin' | 'admin' | 'profesor' | 'alumno'
  sedeId?: string
}

function getActorPermisos(usuario: any) {
  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )
  const sedesAdmin = (usuario.membresias || [])
    .filter((m: any) => m.rol === 'admin' && m.activa && m.sede_id)
    .map((m: any) => m.sede_id as string)

  return {
    esSuperAdmin,
    esAdmin: sedesAdmin.length > 0,
    sedesAdmin,
  }
}

export async function getUsuarios() {
  const usuario = await getUser()

  if (!usuario) {
    return { data: [], error: 'No autenticado' }
  }

  const { esSuperAdmin, esAdmin } = getActorPermisos(usuario)

  if (!esSuperAdmin && !esAdmin) {
    return { data: [], error: 'No autorizado. Solo admin o super admin pueden ver usuarios.' }
  }

  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        membresias (
          id,
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

export async function getSedesParaAsignacion() {
  const usuario = await getUser()

  if (!usuario) {
    return { data: [], error: 'No autenticado' }
  }

  const { esSuperAdmin, esAdmin, sedesAdmin } = getActorPermisos(usuario)

  if (!esSuperAdmin && !esAdmin) {
    return { data: [], error: 'No autorizado. Solo admin o super admin pueden ver sedes.' }
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('sedes')
    .select('id, nombre, organizacion_id, organizaciones(nombre)')
    .eq('activa', true)
    .order('nombre', { ascending: true })

  if (!esSuperAdmin) {
    query = query.in('id', sedesAdmin)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}

export async function asignarRolUsuario(input: AsignarRolInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { esSuperAdmin, esAdmin, sedesAdmin } = getActorPermisos(usuario)

  if (!esSuperAdmin && !esAdmin) {
    return { error: 'No autorizado. Solo admin o super admin pueden asignar roles.' }
  }

  if (input.rol === 'super_admin' && !esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede asignar ese rol.' }
  }

  const supabase = createServiceRoleClient()

  const { data: usuarioObjetivo, error: usuarioObjetivoError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', input.usuarioId)
    .single()

  if (usuarioObjetivoError || !usuarioObjetivo) {
    return { error: 'Usuario no valido.' }
  }

  if (input.rol === 'super_admin') {
    const { data: membresiasSuperAdmin, error: membresiasError } = await supabase
      .from('membresias')
      .select('id')
      .eq('usuario_id', input.usuarioId)
      .eq('rol', 'super_admin')
      .is('sede_id', null)

    if (membresiasError) {
      return { error: membresiasError.message }
    }

    if (membresiasSuperAdmin && membresiasSuperAdmin.length > 0) {
      const { error: activarError } = await supabase
        .from('membresias')
        .update({
          activa: true,
          sede_id: null,
          organizacion_id: null,
          fecha_fin: null,
        })
        .in('id', membresiasSuperAdmin.map((m) => m.id))

      if (activarError) {
        return { error: activarError.message }
      }
    } else {
      const { error: insertError } = await supabase.from('membresias').insert({
        usuario_id: input.usuarioId,
        sede_id: null,
        organizacion_id: null,
        rol: 'super_admin',
        activa: true,
      })

      if (insertError) {
        return { error: insertError.message }
      }
    }

    revalidatePath('/super-admin/usuarios')
    revalidatePath('/admin/usuarios')
    return { success: true }
  }

  if (!input.sedeId) {
    return { error: 'Debes seleccionar una sede para este rol.' }
  }

  if (!esSuperAdmin && !sedesAdmin.includes(input.sedeId)) {
    return { error: 'No autorizado para asignar roles en esa sede.' }
  }

  const { data: sede, error: sedeError } = await supabase
    .from('sedes')
    .select('id, organizacion_id')
    .eq('id', input.sedeId)
    .single()

  if (sedeError || !sede) {
    return { error: 'Sede no valida.' }
  }

  const { error } = await supabase
    .from('membresias')
    .upsert(
      {
        usuario_id: input.usuarioId,
        sede_id: sede.id,
        organizacion_id: sede.organizacion_id,
        rol: input.rol,
        activa: true,
        fecha_fin: null,
      },
      { onConflict: 'usuario_id,sede_id,rol' }
    )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/super-admin/usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true }
}
