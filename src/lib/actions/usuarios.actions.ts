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

interface CrearUsuarioInput {
  email: string
  password: string
  nombre: string
  apellido: string
  telefono?: string | null
}

async function getActorPermisos(usuario: any) {
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

  for (const org of orgsComoAdminUsuario || []) {
    if (org.id) organizacionesAdmin.add(org.id)
  }

  const organizacionesAdminArray = Array.from(organizacionesAdmin)

  let sedesAdmin = Array.from(new Set(sedesAdminDirectas))

  if (organizacionesAdminArray.length > 0) {
    const { data: sedesPorOrg } = await supabase
      .from('sedes')
      .select('id')
      .in('organizacion_id', organizacionesAdminArray)
      .eq('activa', true)

    sedesAdmin = Array.from(
      new Set([
        ...sedesAdmin,
        ...(sedesPorOrg || []).map((s) => s.id),
      ])
    )
  }

  return {
    esSuperAdmin,
    esAdmin: organizacionesAdminArray.length > 0 || sedesAdmin.length > 0,
    organizacionesAdmin: organizacionesAdminArray,
    sedesAdmin,
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

      const userIds = Array.from(
        new Set([usuario.id, ...((membershipsScope || []).map((m) => m.usuario_id).filter(Boolean))])
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

export async function asignarRolUsuario(input: AsignarRolInput) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  const { esSuperAdmin, esAdmin, sedesAdmin } = await getActorPermisos(usuario)

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

  const { esSuperAdmin, esAdmin } = await getActorPermisos(usuario)

  if (!esSuperAdmin && !esAdmin) {
    return { error: 'No autorizado. Solo admin o super admin pueden crear usuarios.' }
  }

  const supabase = createServiceRoleClient()

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return { error: createError?.message || 'No se pudo crear el usuario en autenticacion.' }
  }

  const { error: profileError } = await supabase.from('usuarios').upsert({
    id: created.user.id,
    email: input.email,
    nombre: input.nombre,
    apellido: input.apellido,
    telefono: input.telefono || null,
    activo: true,
  })

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
  rows: Array<{ nombre?: string; apellido?: string; email?: string; telefono?: string }>
) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado', created: 0, skipped: 0, errors: [] as string[] }
  }

  const { esSuperAdmin } = await getActorPermisos(usuario)

  if (!esSuperAdmin) {
    return {
      error: 'No autorizado. Solo super admin puede importar usuarios.',
      created: 0,
      skipped: 0,
      errors: [] as string[],
    }
  }

  if (!rows || rows.length === 0) {
    return { error: 'No hay filas para importar.', created: 0, skipped: 0, errors: [] as string[] }
  }

  const supabase = createServiceRoleClient()
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

      const { error: profileError } = await supabase.from('usuarios').upsert({
        id: authUserId,
        email,
        nombre,
        apellido,
        telefono: telefono || null,
        activo: true,
      })

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

  return {
    success: true,
    created,
    skipped,
    errors,
  }
}
