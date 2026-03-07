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

interface QuitarRolInput {
  usuarioId: string
  rol: 'super_admin' | 'admin' | 'profesor' | 'alumno'
  sedeId?: string
}

interface CrearUsuarioInput {
  email: string
  password: string
  nombre: string
  apellido: string
  telefono?: string | null
  organizacionId?: string | null
}

type ActorPermisos = {
  usuarioId: string
  esSuperAdmin: boolean
  esAdmin: boolean
  organizacionesAdmin: string[]
  organizacionesOwner: string[]
  sedesAdmin: string[]
}

async function getActorPermisos(usuario: any): Promise<ActorPermisos> {
  const supabase = createServiceRoleClient()

  const esSuperAdmin = usuario.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )
  const membershipsAdmin = (usuario.membresias || [])
    .filter((m: any) => m.rol === 'admin' && m.activa && m.sede_id)
  const sedesAdminDirectas = membershipsAdmin.map((m: any) => m.sede_id as string)

  const organizacionesAdmin = new Set<string>(
    (usuario.membresias || [])
      .filter((m: any) => m.rol === 'admin' && m.activa && m.organizacion_id)
      .map((m: any) => m.organizacion_id as string)
  )

  const { data: orgsComoAdminUsuario } = await supabase
    .from('organizaciones')
    .select('id')
    .eq('admin_usuario_id', usuario.id)

  const organizacionesOwner = new Set<string>()
  for (const org of orgsComoAdminUsuario || []) {
    if (!org.id) continue
    organizacionesAdmin.add(org.id)
    organizacionesOwner.add(org.id)
  }

  const organizacionesAdminArray = Array.from(organizacionesAdmin)

  let sedesAdmin: string[] = Array.from(new Set(sedesAdminDirectas))

  if (organizacionesAdminArray.length > 0) {
    const { data: sedesPorOrg } = await supabase
      .from('sedes')
      .select('id')
      .in('organizacion_id', organizacionesAdminArray)
      .eq('activa', true)

    sedesAdmin = Array.from(
      new Set([
        ...sedesAdmin,
        ...(sedesPorOrg || []).map((s) => s.id).filter((id): id is string => !!id),
      ])
    )
  }

  return {
    usuarioId: usuario.id,
    esSuperAdmin,
    esAdmin: organizacionesAdminArray.length > 0 || sedesAdmin.length > 0,
    organizacionesAdmin: organizacionesAdminArray,
    organizacionesOwner: Array.from(organizacionesOwner),
    sedesAdmin,
  }
}

function esOwnerDeOrganizacion(permisos: ActorPermisos, organizacionId: string | null | undefined) {
  if (!organizacionId) return false
  if (permisos.esSuperAdmin) return true
  return permisos.organizacionesOwner.includes(organizacionId)
}

function getActorPrimaryOrganizacion(permisos: ActorPermisos): string | null {
  return permisos.organizacionesAdmin[0] || null
}

async function upsertUsuarioPerfil(
  supabase: ReturnType<typeof createServiceRoleClient>,
  payloadBase: {
    id: string
    email: string
    nombre: string
    apellido: string
    telefono?: string | null
    activo: boolean
  },
  actorUsuarioId: string,
  actorOrganizacionId: string | null
) {
  const payloadConScope = {
    ...payloadBase,
    created_by_usuario_id: actorUsuarioId,
    created_by_organizacion_id: actorOrganizacionId,
  }

  const scopedResult = await supabase.from('usuarios').upsert(payloadConScope)
  if (!scopedResult.error) return scopedResult

  const mensaje = scopedResult.error.message || ''
  const faltaColumna =
    scopedResult.error.code === '42703' ||
    mensaje.includes('created_by_usuario_id') ||
    mensaje.includes('created_by_organizacion_id')

  if (faltaColumna) {
    return supabase.from('usuarios').upsert(payloadBase)
  }

  return scopedResult
}

async function getSedesLock(
  supabase: ReturnType<typeof createServiceRoleClient>,
  usuarioId: string,
  organizacionId: string
) {
  const { data, error } = await supabase
    .from('usuarios_control_acceso')
    .select('bloquear_sedes_otros_admins')
    .eq('usuario_id', usuarioId)
    .eq('organizacion_id', organizacionId)
    .single()

  if (error) {
    // Tabla aun no migrada o fila inexistente.
    if (error.code === 'PGRST116' || error.code === '42P01') {
      return { bloqueado: false, error: null as string | null }
    }
    return { bloqueado: false, error: error.message }
  }

  return { bloqueado: !!data?.bloquear_sedes_otros_admins, error: null as string | null }
}

async function canModifySedeSetForTarget(
  supabase: ReturnType<typeof createServiceRoleClient>,
  permisos: ActorPermisos,
  input: {
    usuarioId: string
    organizacionId: string
    sedeId: string
    rol: 'admin' | 'profesor' | 'alumno'
    mode: 'assign' | 'remove'
  }
) {
  if (permisos.esSuperAdmin) return { ok: true, error: null as string | null }
  if (esOwnerDeOrganizacion(permisos, input.organizacionId)) {
    return { ok: true, error: null as string | null }
  }

  const lock = await getSedesLock(supabase, input.usuarioId, input.organizacionId)
  if (lock.error) return { ok: false, error: lock.error }
  if (!lock.bloqueado) return { ok: true, error: null as string | null }

  const { data: memberships, error: membershipsError } = await supabase
    .from('membresias')
    .select('rol')
    .eq('usuario_id', input.usuarioId)
    .eq('sede_id', input.sedeId)
    .eq('activa', true)

  if (membershipsError) return { ok: false, error: membershipsError.message }

  const rolesActivosSede = (memberships || []).map((m) => m.rol)

  if (input.mode === 'assign') {
    const yaTieneSede = rolesActivosSede.length > 0
    return yaTieneSede
      ? { ok: true, error: null as string | null }
      : {
          ok: false,
          error: 'No autorizado para agregar sedes en este usuario. Solo el admin dueño del cliente puede hacerlo.',
        }
  }

  const quedaAlgunRolEnSede = rolesActivosSede.some((rol) => rol !== input.rol)
  return quedaAlgunRolEnSede
    ? { ok: true, error: null as string | null }
    : {
        ok: false,
        error: 'No autorizado para quitar sedes de este usuario. Solo el admin dueño del cliente puede hacerlo.',
      }
}

export async function getUsuarios() {
  const usuario = await getUser()

  if (!usuario) {
    return { data: [], error: 'No autenticado' }
  }

  const { esSuperAdmin, esAdmin, organizacionesAdmin } = await getActorPermisos(usuario)

  if (!esSuperAdmin && !esAdmin) {
    return { data: [], error: 'No autorizado. Solo admin o super admin pueden ver usuarios.' }
  }

  const supabase = createServiceRoleClient()

  try {
    if (!esSuperAdmin) {
      if (organizacionesAdmin.length === 0) {
        return { data: [], error: null }
      }

      const { data: membershipsScope, error: membershipsScopeError } = await supabase
        .from('membresias')
        .select('usuario_id')
        .in('organizacion_id', organizacionesAdmin)
        .eq('activa', true)

      if (membershipsScopeError) {
        return { data: [], error: membershipsScopeError.message }
      }

      let createdByOrgIds: string[] = []
      const createdByOrgResult = await supabase
        .from('usuarios')
        .select('id')
        .in('created_by_organizacion_id', organizacionesAdmin)

      if (!createdByOrgResult.error) {
        createdByOrgIds = (createdByOrgResult.data || []).map((u) => u.id)
      }

      const userIds = Array.from(
        new Set([
          usuario.id,
          ...((membershipsScope || []).map((m) => m.usuario_id).filter(Boolean)),
          ...createdByOrgIds,
        ])
      )

      if (userIds.length === 0) {
        return { data: [], error: null }
      }

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
        .in('id', userIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[getUsuarios] Error:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    }

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

  const { esSuperAdmin, esAdmin, organizacionesAdmin } = await getActorPermisos(usuario)

  if (!esSuperAdmin && !esAdmin) {
    return { data: [], error: 'No autorizado. Solo admin o super admin pueden ver sedes.' }
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('sedes')
    .select('id, nombre, organizacion_id, organizaciones(nombre, icono)')
    .eq('activa', true)
    .order('nombre', { ascending: true })

  if (!esSuperAdmin) {
    if (organizacionesAdmin.length === 0) {
      return { data: [], error: null }
    }
    query = query.in('organizacion_id', organizacionesAdmin)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}

export async function obtenerConfigAccesoUsuario(input: { usuarioId: string; organizacionId: string }) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const permisos = await getActorPermisos(usuario)
  const puedeVer = permisos.esSuperAdmin || permisos.organizacionesAdmin.includes(input.organizacionId)
  if (!puedeVer) return { error: 'No autorizado para ver esta configuracion.' }

  const supabase = createServiceRoleClient()
  const lock = await getSedesLock(supabase, input.usuarioId, input.organizacionId)
  if (lock.error) return { error: lock.error }

  return {
    data: {
      bloquearSedesOtrosAdmins: lock.bloqueado,
      puedeEditarBloqueo: permisos.esSuperAdmin || esOwnerDeOrganizacion(permisos, input.organizacionId),
      puedeAsignarAdmin: permisos.esSuperAdmin || esOwnerDeOrganizacion(permisos, input.organizacionId),
      actorUsuarioId: permisos.usuarioId,
    },
  }
}

export async function actualizarBloqueoSedesUsuario(input: {
  usuarioId: string
  organizacionId: string
  bloquear: boolean
}) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const permisos = await getActorPermisos(usuario)
  const puedeEditar = permisos.esSuperAdmin || esOwnerDeOrganizacion(permisos, input.organizacionId)
  if (!puedeEditar) {
    return { error: 'No autorizado. Solo el admin dueño del cliente puede cambiar este bloqueo.' }
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('usuarios_control_acceso')
    .upsert(
      {
        usuario_id: input.usuarioId,
        organizacion_id: input.organizacionId,
        bloquear_sedes_otros_admins: input.bloquear,
        updated_by_usuario_id: permisos.usuarioId,
      },
      { onConflict: 'usuario_id,organizacion_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/admin/usuarios')
  revalidatePath('/super-admin/usuarios')
  return { success: true }
}

export async function asignarRolUsuario(input: AsignarRolInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const permisos = await getActorPermisos(usuario)
  const { esSuperAdmin, esAdmin, sedesAdmin } = permisos

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

  if (input.rol === 'admin' && !esOwnerDeOrganizacion(permisos, sede.organizacion_id)) {
    return { error: 'No autorizado. Solo el admin dueño del cliente puede asignar rol admin.' }
  }

  const sedeSetGuard = await canModifySedeSetForTarget(supabase, permisos, {
    usuarioId: input.usuarioId,
    organizacionId: sede.organizacion_id,
    sedeId: input.sedeId,
    rol: input.rol,
    mode: 'assign',
  })
  if (!sedeSetGuard.ok) {
    return { error: sedeSetGuard.error || 'No autorizado para modificar sedes de este usuario.' }
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

  if (input.rol === 'profesor') {
    const { error: profesorError } = await supabase
      .from('profesores')
      .upsert(
        {
          usuario_id: input.usuarioId,
          sede_id: input.sedeId,
          activo: true,
        },
        { onConflict: 'usuario_id,sede_id' }
      )

    if (profesorError) {
      return { error: profesorError.message }
    }
  }

  if (input.rol === 'alumno') {
    const { error: alumnoError } = await supabase
      .from('alumnos')
      .upsert(
        {
          usuario_id: input.usuarioId,
          sede_id: input.sedeId,
          activo: true,
        },
        { onConflict: 'usuario_id,sede_id' }
      )

    if (alumnoError) {
      return { error: alumnoError.message }
    }
  }

  revalidatePath('/super-admin/usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function quitarRolUsuario(input: QuitarRolInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const permisos = await getActorPermisos(usuario)
  const { esSuperAdmin, esAdmin, sedesAdmin } = permisos

  if (!esSuperAdmin && !esAdmin) {
    return { error: 'No autorizado. Solo admin o super admin pueden quitar roles.' }
  }

  if (input.rol === 'super_admin' && !esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede quitar ese rol.' }
  }

  const supabase = createServiceRoleClient()

  if (input.rol !== 'super_admin' && !input.sedeId) {
    return { error: 'Debes seleccionar una sede para quitar este rol.' }
  }

  if (input.rol !== 'super_admin' && !esSuperAdmin && !sedesAdmin.includes(input.sedeId!)) {
    return { error: 'No autorizado para quitar roles en esa sede.' }
  }

  if (input.rol !== 'super_admin' && input.sedeId) {
    const { data: sede, error: sedeError } = await supabase
      .from('sedes')
      .select('id, organizacion_id')
      .eq('id', input.sedeId)
      .single()

    if (sedeError || !sede) {
      return { error: 'Sede no valida.' }
    }

    if (input.rol === 'admin' && !esOwnerDeOrganizacion(permisos, sede.organizacion_id)) {
      return { error: 'No autorizado. Solo el admin dueño del cliente puede quitar rol admin.' }
    }

    const sedeSetGuard = await canModifySedeSetForTarget(supabase, permisos, {
      usuarioId: input.usuarioId,
      organizacionId: sede.organizacion_id,
      sedeId: input.sedeId,
      rol: input.rol,
      mode: 'remove',
    })
    if (!sedeSetGuard.ok) {
      return { error: sedeSetGuard.error || 'No autorizado para modificar sedes de este usuario.' }
    }
  }

  let query = supabase
    .from('membresias')
    .update({ activa: false, fecha_fin: new Date().toISOString().slice(0, 10) })
    .eq('usuario_id', input.usuarioId)
    .eq('rol', input.rol)
    .eq('activa', true)

  if (input.rol === 'super_admin') {
    query = query.is('sede_id', null)
  } else {
    query = query.eq('sede_id', input.sedeId!)
  }

  const { error } = await query

  if (error) {
    return { error: error.message }
  }

  if (input.rol === 'profesor' && input.sedeId) {
    const { error: profesorError } = await supabase
      .from('profesores')
      .update({ activo: false })
      .eq('usuario_id', input.usuarioId)
      .eq('sede_id', input.sedeId)
      .eq('activo', true)

    if (profesorError) {
      return { error: profesorError.message }
    }
  }

  if (input.rol === 'alumno' && input.sedeId) {
    const { error: alumnoError } = await supabase
      .from('alumnos')
      .update({ activo: false })
      .eq('usuario_id', input.usuarioId)
      .eq('sede_id', input.sedeId)
      .eq('activo', true)

    if (alumnoError) {
      return { error: alumnoError.message }
    }
  }

  revalidatePath('/super-admin/usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function actualizarEstadoUsuario(input: { usuarioId: string; activo: boolean }) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { esSuperAdmin, esAdmin, organizacionesAdmin } = await getActorPermisos(usuario)

  if (!esSuperAdmin && !esAdmin) {
    return { error: 'No autorizado para cambiar el estado de usuarios.' }
  }

  if (input.usuarioId === usuario.id && !input.activo) {
    return { error: 'No puedes desactivar tu propio usuario.' }
  }

  const supabase = createServiceRoleClient()

  const { data: objetivo, error: objetivoError } = await supabase
    .from('usuarios')
    .select(
      `
      id,
      membresias (
        rol,
        sede_id,
        organizacion_id
      )
    `
    )
    .eq('id', input.usuarioId)
    .single()

  if (objetivoError || !objetivo) {
    return { error: 'Usuario no valido.' }
  }

  const rolesObjetivo = objetivo.membresias || []

  if (!esSuperAdmin) {
    const targetEsSuperAdmin = rolesObjetivo.some((m: any) => m.rol === 'super_admin')
    if (targetEsSuperAdmin) {
      return { error: 'No autorizado para cambiar el estado de un super admin.' }
    }

    const comparteOrganizacionAdmin = rolesObjetivo.some(
      (m: any) => m.organizacion_id && organizacionesAdmin.includes(m.organizacion_id)
    )

    if (!comparteOrganizacionAdmin) {
      return { error: 'No autorizado para cambiar el estado de ese usuario.' }
    }
  }

  const { error } = await supabase
    .from('usuarios')
    .update({ activo: input.activo })
    .eq('id', input.usuarioId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/super-admin/usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function crearUsuario(input: CrearUsuarioInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const permisos = await getActorPermisos(usuario)
  const { esSuperAdmin, esAdmin } = permisos

  if (!esSuperAdmin && !esAdmin) {
    return { error: 'No autorizado. Solo admin o super admin pueden crear usuarios.' }
  }

  if (esSuperAdmin && !input.organizacionId) {
    return { error: 'Debes seleccionar un cliente para crear el usuario.' }
  }

  const supabase = createServiceRoleClient()

  if (input.organizacionId) {
    const { data: orgExiste, error: orgError } = await supabase
      .from('organizaciones')
      .select('id')
      .eq('id', input.organizacionId)
      .single()

    if (orgError || !orgExiste) {
      return { error: 'Cliente no valido.' }
    }
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return { error: createError?.message || 'No se pudo crear el usuario en autenticacion.' }
  }

  const actorOrganizacionId = esSuperAdmin
    ? (input.organizacionId || null)
    : getActorPrimaryOrganizacion(permisos)
  const { error: profileError } = await upsertUsuarioPerfil(
    supabase,
    {
      id: created.user.id,
      email: input.email,
      nombre: input.nombre,
      apellido: input.apellido,
      telefono: input.telefono || null,
      activo: true,
    },
    usuario.id,
    actorOrganizacionId
  )

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/super-admin/usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function eliminarUsuario(usuarioId: string) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { esSuperAdmin } = await getActorPermisos(usuario)

  if (!esSuperAdmin) {
    return { error: 'No autorizado. Solo super admin puede eliminar usuarios.' }
  }

  if (usuarioId === usuario.id) {
    return { error: 'No puedes eliminar tu propio usuario.' }
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase.auth.admin.deleteUser(usuarioId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/super-admin/usuarios')
  return { success: true }
}

export async function importarUsuarios(
  rows: Array<{ nombre?: string; apellido?: string; email?: string; telefono?: string }>,
  organizacionId?: string
) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado', created: 0, skipped: 0, errors: [] as string[] }
  }

  const permisos = await getActorPermisos(usuario)
  const { esSuperAdmin, esAdmin } = permisos

  if (!esSuperAdmin && !esAdmin) {
    return {
      error: 'No autorizado. Solo admin o super admin pueden importar usuarios.',
      created: 0,
      skipped: 0,
      errors: [] as string[],
    }
  }

  if (esSuperAdmin && !organizacionId) {
    return {
      error: 'Debes seleccionar un cliente para importar usuarios.',
      created: 0,
      skipped: 0,
      errors: [] as string[],
    }
  }

  if (!rows || rows.length === 0) {
    return { error: 'No hay filas para importar.', created: 0, skipped: 0, errors: [] as string[] }
  }

  const supabase = createServiceRoleClient()
  const actorOrganizacionId = esSuperAdmin
    ? (organizacionId || null)
    : getActorPrimaryOrganizacion(permisos)

  if (actorOrganizacionId) {
    const { data: orgExiste, error: orgError } = await supabase
      .from('organizaciones')
      .select('id')
      .eq('id', actorOrganizacionId)
      .single()

    if (orgError || !orgExiste) {
      return {
        error: 'Cliente no valido para importacion.',
        created: 0,
        skipped: 0,
        errors: [] as string[],
      }
    }
  }
  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const rawRow of rows) {
    const nombre = (rawRow.nombre || '').trim()
    const apellido = (rawRow.apellido || '').trim()
    const email = (rawRow.email || '').trim().toLowerCase()
    const telefono = (rawRow.telefono || '').trim()

    if (!nombre || !apellido || !email) {
      skipped++
      continue
    }

    try {
      let authUserId: string | null = null

      const inviteResult = await supabase.auth.admin.inviteUserByEmail(email)

      if (inviteResult.error) {
        const randomPassword = `Tmp#${Math.random().toString(36).slice(2, 10)}A1`
        const createResult = await supabase.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true,
        })

        if (createResult.error || !createResult.data.user) {
          skipped++
          errors.push(`${email}: ${createResult.error?.message || inviteResult.error.message}`)
          continue
        }

        authUserId = createResult.data.user.id
      } else {
        authUserId = inviteResult.data.user?.id || null
      }

      if (!authUserId) {
        skipped++
        errors.push(`${email}: no se pudo obtener ID del usuario.`)
        continue
      }

      const { error: profileError } = await upsertUsuarioPerfil(
        supabase,
        {
          id: authUserId,
          email,
          nombre,
          apellido,
          telefono: telefono || null,
          activo: true,
        },
        usuario.id,
        actorOrganizacionId
      )

      if (profileError) {
        skipped++
        errors.push(`${email}: ${profileError.message}`)
        continue
      }

      created++
    } catch (error: any) {
      skipped++
      errors.push(`${email || 'fila sin email'}: ${error?.message || 'error inesperado'}`)
    }
  }

  revalidatePath('/super-admin/usuarios')
  revalidatePath('/admin/usuarios')

  return {
    success: true,
    created,
    skipped,
    errors,
  }
}
