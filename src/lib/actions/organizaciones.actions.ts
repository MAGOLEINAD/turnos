'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '../supabase/server'
import type { OrganizacionInput } from '../validations/organizacion.schema'
import { getUser } from './auth.actions'
import { normalizeClientIcon } from '../utils/clientes'

async function getActorOrganizacionScope(usuario: any) {
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
  const serviceRole = createServiceRoleClient()

  const adminUsuarioId = data.admin_usuario_id || null

  if (adminUsuarioId) {
    const { data: adminMembership, error: adminMembershipError } = await serviceRole
      .from('membresias')
      .select('id')
      .eq('usuario_id', adminUsuarioId)
      .eq('rol', 'admin')
      .eq('activa', true)
      .limit(1)

    if (adminMembershipError) return { error: adminMembershipError.message }
    if (!adminMembership || adminMembership.length === 0) {
      return { error: 'El usuario seleccionado no tiene rol admin activo.' }
    }
  }

  const { data: org, error } = await supabase
    .from('organizaciones')
    .insert({
      ...data,
      icono: normalizeClientIcon(data.icono),
      admin_usuario_id: adminUsuarioId,
    })
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

  const scope = await getActorOrganizacionScope(usuario)

  if (!scope.esSuperAdmin && !scope.esAdmin) {
    return { error: 'No autorizado para ver organizaciones.' }
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('organizaciones')
    .select('id, nombre, descripcion, icono, admin_usuario_id, activa, motivo_desactivacion, created_at')
    .order('created_at', { ascending: false })

  if (!scope.esSuperAdmin) {
    if (scope.organizaciones.length === 0) {
      return { data: [] }
    }
    query = query.in('id', scope.organizaciones)
  }

  const { data, error } = await query

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
  const serviceRole = createServiceRoleClient()

  const adminUsuarioId =
    data.admin_usuario_id === undefined ? undefined : data.admin_usuario_id || null

  if (adminUsuarioId) {
    const { data: adminMembership, error: adminMembershipError } = await serviceRole
      .from('membresias')
      .select('id')
      .eq('usuario_id', adminUsuarioId)
      .eq('rol', 'admin')
      .eq('activa', true)
      .limit(1)

    if (adminMembershipError) return { error: adminMembershipError.message }
    if (!adminMembership || adminMembership.length === 0) {
      return { error: 'El usuario seleccionado no tiene rol admin activo.' }
    }
  }

  const { error } = await supabase
    .from('organizaciones')
    .update({
      ...data,
      ...(data.icono !== undefined ? { icono: normalizeClientIcon(data.icono) } : {}),
      ...(adminUsuarioId !== undefined ? { admin_usuario_id: adminUsuarioId } : {}),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/organizaciones')
  return { success: true }
}

export async function obtenerAdminsDisponibles() {
  const usuario = await getUser()

  if (!usuario) {
    return { data: [], error: 'No autenticado' }
  }

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  if (!esSuperAdmin) {
    return { data: [], error: 'No autorizado. Solo super admin puede ver admins.' }
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('membresias')
    .select('usuario_id, usuarios!inner(id, nombre, apellido, email, activo)')
    .eq('rol', 'admin')
    .eq('activa', true)

  if (error) return { data: [], error: error.message }

  const adminsMap = new Map<string, any>()
  for (const item of data || []) {
    const admin = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios
    if (!admin?.id || admin.activo === false) continue
    adminsMap.set(admin.id, {
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      email: admin.email,
    })
  }

  return {
    data: Array.from(adminsMap.values()).sort((a, b) =>
      `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es')
    ),
    error: null,
  }
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

  // Hardening: super_admin nunca debe quedar asociado a una organizacion concreta.
  // Si por datos historicos existe alguna fila asi, la limpiamos antes de borrar.
  const { error: cleanSuperAdminError } = await supabase
    .from('membresias')
    .update({ organizacion_id: null })
    .eq('rol', 'super_admin')
    .eq('organizacion_id', id)

  if (cleanSuperAdminError) return { error: cleanSuperAdminError.message }

  const { error } = await supabase
    .from('organizaciones')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/super-admin/organizaciones')
  revalidatePath('/super-admin/sedes')
  return { success: true }
}
