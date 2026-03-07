'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '../supabase/server'
import type { SedeInput } from '../validations/sede.schema'
import { getUser } from './auth.actions'

async function getActorSedeScope(usuario: any) {
  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  const adminMemberships = (usuario.membresias || []).filter(
    (m: any) => m.rol === 'admin' && m.activa
  )

  const organizaciones = new Set<string>()
  const sedes = new Set<string>()

  for (const m of adminMemberships) {
    if (m.organizacion_id) organizaciones.add(m.organizacion_id)
    if (m.sede_id) sedes.add(m.sede_id)
  }

  if (!esSuperAdmin && sedes.size > 0) {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('sedes')
      .select('id, organizacion_id')
      .in('id', Array.from(sedes))

    for (const sede of data || []) {
      if (sede.organizacion_id) organizaciones.add(sede.organizacion_id)
    }
  }

  return {
    esSuperAdmin,
    esAdmin: adminMemberships.length > 0,
    organizaciones: Array.from(organizaciones),
  }
}

export async function crearSede(data: SedeInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const scope = await getActorSedeScope(usuario)

  if (!scope.esSuperAdmin && !scope.esAdmin) {
    return { error: 'No autorizado. Solo admin o super admin pueden crear sedes.' }
  }

  let organizacionIdFinal = data.organizacion_id

  if (scope.esSuperAdmin) {
    if (!organizacionIdFinal) {
      return { error: 'Debes seleccionar un cliente para crear la sede.' }
    }
  } else {
    if (scope.organizaciones.length === 0) {
      return { error: 'No tienes un cliente asociado para crear sedes.' }
    }
    organizacionIdFinal = scope.organizaciones[0]
  }

  const supabase = createServiceRoleClient()

  const { data: sede, error } = await supabase
    .from('sedes')
    .insert({
      ...data,
      organizacion_id: organizacionIdFinal,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/super-admin/sedes')
  revalidatePath('/admin/sedes')
  return { data: sede }
}

export async function obtenerSedes(organizacionId?: string) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const scope = await getActorSedeScope(usuario)

  if (!scope.esSuperAdmin && !scope.esAdmin) {
    return { error: 'No autorizado para ver sedes.' }
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('sedes')
    .select('id, organizacion_id, nombre, slug, direccion, telefono, email, activa, created_at, organizaciones(id, nombre, icono)')
    .order('created_at', { ascending: false })

  if (scope.esSuperAdmin) {
    if (organizacionId) {
      query = query.eq('organizacion_id', organizacionId)
    }
  } else {
    if (scope.organizaciones.length === 0) {
      return { data: [] }
    }

    query = query.in('organizacion_id', scope.organizaciones)

    if (organizacionId) {
      query = query.eq('organizacion_id', organizacionId)
    }
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

  const scope = await getActorSedeScope(usuario)

  if (!scope.esSuperAdmin && !scope.esAdmin) {
    return { error: 'No autorizado. Solo admin o super admin pueden actualizar sedes.' }
  }

  const supabase = createServiceRoleClient()

  const { data: sedeActual, error: sedeActualError } = await supabase
    .from('sedes')
    .select('id, organizacion_id')
    .eq('id', id)
    .single()

  if (sedeActualError || !sedeActual) {
    return { error: 'Sede no encontrada.' }
  }

  if (!scope.esSuperAdmin && !scope.organizaciones.includes(sedeActual.organizacion_id)) {
    return { error: 'No autorizado para actualizar esta sede.' }
  }

  const payload: Partial<SedeInput> = { ...data }
  if (!scope.esSuperAdmin) {
    delete payload.organizacion_id
  }

  const { error } = await supabase
    .from('sedes')
    .update(payload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/sedes')
  revalidatePath('/admin/sedes')
  return { success: true }
}

export async function eliminarSede(id: string) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const scope = await getActorSedeScope(usuario)

  if (!scope.esSuperAdmin && !scope.esAdmin) {
    return { error: 'No autorizado. Solo admin o super admin pueden eliminar sedes.' }
  }

  const supabase = createServiceRoleClient()

  const { data: sedeActual, error: sedeActualError } = await supabase
    .from('sedes')
    .select('id, organizacion_id')
    .eq('id', id)
    .single()

  if (sedeActualError || !sedeActual) {
    return { error: 'Sede no encontrada.' }
  }

  if (!scope.esSuperAdmin && !scope.organizaciones.includes(sedeActual.organizacion_id)) {
    return { error: 'No autorizado para eliminar esta sede.' }
  }

  const { error } = await supabase
    .from('sedes')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/sedes')
  revalidatePath('/admin/sedes')
  return { success: true }
}
