'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { ProfesorInput } from '../validations/profesor.schema'

type ActorScope = {
  usuarioId: string
  esSuperAdmin: boolean
  organizacionesAdmin: string[]
}

async function getActorScope(): Promise<{ scope: ActorScope | null; error?: string }> {
  const usuario = await getUser()
  if (!usuario) return { scope: null, error: 'No autenticado' }

  const supabase = createServiceRoleClient()
  const esSuperAdmin = (usuario.membresias || []).some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  const organizacionesAdminSet = new Set<string>(
    (usuario.membresias || [])
      .filter((m: any) => m.rol === 'admin' && m.activa && m.organizacion_id)
      .map((m: any) => m.organizacion_id as string)
  )

  const { data: orgsComoAdminUsuario } = await supabase
    .from('organizaciones')
    .select('id')
    .eq('admin_usuario_id', usuario.id)

  for (const org of orgsComoAdminUsuario || []) {
    if (org.id) organizacionesAdminSet.add(org.id)
  }

  return {
    scope: {
      usuarioId: usuario.id,
      esSuperAdmin,
      organizacionesAdmin: Array.from(organizacionesAdminSet),
    },
  }
}

function canManageProfesores(scope: ActorScope) {
  return scope.esSuperAdmin || scope.organizacionesAdmin.length > 0
}

async function canAccessSede(
  supabase: ReturnType<typeof createServiceRoleClient>,
  scope: ActorScope,
  sedeId: string
) {
  const { data: sede, error } = await supabase
    .from('sedes')
    .select('id, organizacion_id')
    .eq('id', sedeId)
    .single()

  if (error || !sede) {
    return { ok: false, error: 'Sede no valida.' }
  }

  if (!scope.esSuperAdmin && !scope.organizacionesAdmin.includes(sede.organizacion_id)) {
    return { ok: false, error: 'No autorizado para gestionar profesores en esta sede.' }
  }

  return { ok: true, sede }
}

export async function crearProfesor(data: ProfesorInput) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageProfesores(actor.scope)) {
    return { error: 'No autorizado para crear profesores.' }
  }

  const supabase = createServiceRoleClient()
  const sedeCheck = await canAccessSede(supabase, actor.scope, data.sede_id)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { data: usuarioExiste } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', data.usuario_id)
    .single()

  if (!usuarioExiste) {
    return { error: 'El usuario seleccionado no existe' }
  }

  const { data: profesorExiste } = await supabase
    .from('profesores')
    .select('id')
    .eq('usuario_id', data.usuario_id)
    .eq('sede_id', data.sede_id)
    .single()

  if (profesorExiste) {
    return { error: 'Este usuario ya es un profesor en esta sede' }
  }

  const { data: profesor, error } = await supabase
    .from('profesores')
    .insert(data)
    .select(
      `
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
    `
    )
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  return { data: profesor }
}

export async function obtenerProfesores(sedeId?: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageProfesores(actor.scope)) {
    return { error: 'No autorizado para ver profesores.' }
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('profesores')
    .select(
      `
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
    `
    )
    .order('created_at', { ascending: false })

  if (sedeId) {
    const sedeCheck = await canAccessSede(supabase, actor.scope, sedeId)
    if (!sedeCheck.ok) return { error: sedeCheck.error }
    query = query.eq('sede_id', sedeId)
  } else if (!actor.scope.esSuperAdmin) {
    const { data: sedes } = await supabase
      .from('sedes')
      .select('id')
      .in('organizacion_id', actor.scope.organizacionesAdmin)
      .eq('activa', true)

    const sedeIds = (sedes || []).map((s) => s.id)
    if (sedeIds.length === 0) return { data: [] }
    query = query.in('sede_id', sedeIds)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}

export async function obtenerProfesor(id: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageProfesores(actor.scope)) {
    return { error: 'No autorizado para ver profesores.' }
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('profesores')
    .select(
      `
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
    `
    )
    .eq('id', id)
    .single()

  if (error || !data) return { error: error?.message || 'Profesor no encontrado' }

  const sedeCheck = await canAccessSede(supabase, actor.scope, data.sede_id)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  return { data }
}

export async function actualizarProfesor(id: string, data: Partial<ProfesorInput>) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageProfesores(actor.scope)) {
    return { error: 'No autorizado para actualizar profesores.' }
  }

  const supabase = createServiceRoleClient()

  const { data: actual } = await supabase
    .from('profesores')
    .select('id, sede_id')
    .eq('id', id)
    .single()

  if (!actual) return { error: 'Profesor no encontrado.' }

  const sedeObjetivo = data.sede_id || actual.sede_id
  const sedeCheck = await canAccessSede(supabase, actor.scope, sedeObjetivo)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { data: profesor, error } = await supabase
    .from('profesores')
    .update(data)
    .eq('id', id)
    .select(
      `
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
    `
    )
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  revalidatePath('/profesor/calendario')
  return { data: profesor }
}

export async function desactivarProfesor(id: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageProfesores(actor.scope)) {
    return { error: 'No autorizado para desactivar profesores.' }
  }

  const supabase = createServiceRoleClient()

  const { data: actual } = await supabase
    .from('profesores')
    .select('id, sede_id')
    .eq('id', id)
    .single()

  if (!actual) return { error: 'Profesor no encontrado.' }

  const sedeCheck = await canAccessSede(supabase, actor.scope, actual.sede_id)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

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
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageProfesores(actor.scope)) {
    return { error: 'No autorizado para activar profesores.' }
  }

  const supabase = createServiceRoleClient()

  const { data: actual } = await supabase
    .from('profesores')
    .select('id, sede_id')
    .eq('id', id)
    .single()

  if (!actual) return { error: 'Profesor no encontrado.' }

  const sedeCheck = await canAccessSede(supabase, actor.scope, actual.sede_id)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { error } = await supabase
    .from('profesores')
    .update({ activo: true })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  return { success: true }
}

export async function obtenerUsuariosDisponibles(sedeId: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageProfesores(actor.scope)) {
    return { error: 'No autorizado para ver usuarios disponibles.' }
  }

  const supabase = createServiceRoleClient()
  const sedeCheck = await canAccessSede(supabase, actor.scope, sedeId)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { data: profesores } = await supabase
    .from('profesores')
    .select('usuario_id')
    .eq('sede_id', sedeId)

  const idsProfesor = (profesores || []).map((p) => p.usuario_id)

  let query = supabase.from('usuarios').select(
    `
      id,
      email,
      nombre,
      apellido,
      telefono
    `
  )

  if (idsProfesor.length > 0) {
    query = query.not('id', 'in', `(${idsProfesor.join(',')})`)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}
