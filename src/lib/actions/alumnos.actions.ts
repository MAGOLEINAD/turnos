'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { AlumnoInput } from '../validations/alumno.schema'

type ActorScope = {
  usuarioId: string
  esSuperAdmin: boolean
  organizacionesAdmin: string[]
}

function safeRevalidate(...paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path)
    } catch (error) {
      console.warn('[alumnos.actions] No se pudo revalidar path:', path)
    }
  }
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

function canManageAlumnos(scope: ActorScope) {
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
    return { ok: false, error: 'No autorizado para gestionar alumnos en esta sede.' }
  }

  return { ok: true, sede }
}

export async function crearAlumno(data: AlumnoInput) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageAlumnos(actor.scope)) {
    return { error: 'No autorizado para crear alumnos.' }
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

  const { data: alumnoExiste } = await supabase
    .from('alumnos')
    .select('id')
    .eq('usuario_id', data.usuario_id)
    .eq('sede_id', data.sede_id)
    .single()

  if (alumnoExiste) {
    return { error: 'Este usuario ya es un alumno de esta sede' }
  }

  const { data: alumno, error } = await supabase
    .from('alumnos')
    .insert(data)
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
        nombre
      )
    `
    )
    .single()

  if (error) return { error: error.message }

  safeRevalidate('/admin/alumnos', '/super-admin/alumnos')
  return { data: alumno }
}

export async function obtenerAlumnos(sedeId?: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageAlumnos(actor.scope)) {
    return { error: 'No autorizado para ver alumnos.' }
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('alumnos')
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

export async function obtenerAlumno(id: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageAlumnos(actor.scope)) {
    return { error: 'No autorizado para ver alumnos.' }
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('alumnos')
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

  if (error || !data) return { error: error?.message || 'Alumno no encontrado' }

  const sedeCheck = await canAccessSede(supabase, actor.scope, data.sede_id)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  return { data }
}

export async function actualizarAlumno(id: string, data: Partial<AlumnoInput>) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageAlumnos(actor.scope)) {
    return { error: 'No autorizado para actualizar alumnos.' }
  }

  const supabase = createServiceRoleClient()

  const { data: actual } = await supabase
    .from('alumnos')
    .select('id, sede_id')
    .eq('id', id)
    .single()

  if (!actual) return { error: 'Alumno no encontrado.' }

  const sedeObjetivo = data.sede_id || actual.sede_id
  const sedeCheck = await canAccessSede(supabase, actor.scope, sedeObjetivo)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { data: alumno, error } = await supabase
    .from('alumnos')
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
        telefono,
        avatar_url
      ),
      sedes (
        id,
        nombre
      )
    `
    )
    .single()

  if (error) return { error: error.message }

  safeRevalidate('/admin/alumnos', '/super-admin/alumnos', '/alumno/perfil')
  return { data: alumno }
}

export async function desactivarAlumno(id: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageAlumnos(actor.scope)) {
    return { error: 'No autorizado para desactivar alumnos.' }
  }

  const supabase = createServiceRoleClient()

  const { data: actual } = await supabase
    .from('alumnos')
    .select('id, sede_id')
    .eq('id', id)
    .single()

  if (!actual) return { error: 'Alumno no encontrado.' }

  const sedeCheck = await canAccessSede(supabase, actor.scope, actual.sede_id)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { error } = await supabase
    .from('alumnos')
    .update({ activo: false })
    .eq('id', id)

  if (error) return { error: error.message }

  safeRevalidate('/admin/alumnos', '/super-admin/alumnos')
  return { success: true }
}

export async function activarAlumno(id: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageAlumnos(actor.scope)) {
    return { error: 'No autorizado para activar alumnos.' }
  }

  const supabase = createServiceRoleClient()

  const { data: actual } = await supabase
    .from('alumnos')
    .select('id, sede_id')
    .eq('id', id)
    .single()

  if (!actual) return { error: 'Alumno no encontrado.' }

  const sedeCheck = await canAccessSede(supabase, actor.scope, actual.sede_id)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { error } = await supabase
    .from('alumnos')
    .update({ activo: true })
    .eq('id', id)

  if (error) return { error: error.message }

  safeRevalidate('/admin/alumnos', '/super-admin/alumnos')
  return { success: true }
}

export async function obtenerUsuariosDisponiblesParaAlumnos(sedeId: string) {
  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  if (!canManageAlumnos(actor.scope)) {
    return { error: 'No autorizado para ver usuarios disponibles.' }
  }

  const supabase = createServiceRoleClient()
  const sedeCheck = await canAccessSede(supabase, actor.scope, sedeId)
  if (!sedeCheck.ok) return { error: sedeCheck.error }

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('usuario_id')
    .eq('sede_id', sedeId)

  const idsAlumnoEnSede = new Set((alumnos || []).map((a) => a.usuario_id).filter(Boolean))

  const { data: membresiasAlumno, error: membresiasError } = await supabase
    .from('membresias')
    .select('usuario_id')
    .eq('rol', 'alumno')
    .eq('activa', true)
    .eq('sede_id', sedeId)

  if (membresiasError) return { error: membresiasError.message }

  const idsConRolAlumno = Array.from(
    new Set((membresiasAlumno || []).map((m) => m.usuario_id).filter(Boolean))
  ) as string[]

  const idsDisponibles = idsConRolAlumno.filter((id) => !idsAlumnoEnSede.has(id))

  if (idsDisponibles.length === 0) {
    return { data: [] }
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select(
      `
      id,
      email,
      nombre,
      apellido,
      telefono
    `
    )
    .in('id', idsDisponibles)
    .order('nombre', { ascending: true })
    .order('apellido', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function obtenerCreditosAlumno(alumnoId: string, sedeId?: string) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const actor = await getActorScope()
  if (!actor.scope) return { error: actor.error || 'No autenticado' }

  const supabase = createServiceRoleClient()

  const { data: alumnoPerfil, error: alumnoError } = await supabase
    .from('alumnos')
    .select('id, usuario_id, sede_id')
    .eq('id', alumnoId)
    .single()

  if (alumnoError || !alumnoPerfil) {
    return { error: 'Alumno no encontrado.' }
  }

  const esPropioAlumno = alumnoPerfil.usuario_id === usuario.id
  const puedeGestionar = canManageAlumnos(actor.scope)

  if (!esPropioAlumno && !puedeGestionar) {
    return { error: 'No autorizado para ver creditos.' }
  }

  if (sedeId) {
    if (esPropioAlumno) {
      if (sedeId !== alumnoPerfil.sede_id) {
        return { error: 'No autorizado para ver creditos de otra sede.' }
      }
    } else {
      const sedeCheck = await canAccessSede(supabase, actor.scope, sedeId)
      if (!sedeCheck.ok) return { error: sedeCheck.error }
    }
  }

  let query = supabase
    .from('creditos_recupero')
    .select('*')
    .eq('alumno_id', alumnoId)
    .eq('utilizado', false)
    .gte('fecha_expiracion', new Date().toISOString())

  if (sedeId) {
    query = query.eq('sede_id', sedeId)
  } else if (esPropioAlumno) {
    query = query.eq('sede_id', alumnoPerfil.sede_id)
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

  const { data, error } = await query.order('fecha_expiracion', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}
