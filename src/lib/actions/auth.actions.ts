/**
 * Server Actions para autenticacion
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient, createServiceRoleClient } from '../supabase/server'
import { getDashboardRoute } from '../constants/navigation'
import type { RolUsuario } from '../constants/roles'
import type { LoginInput, RegisterInput } from '../validations/auth.schema'
import { translateAuthError } from '../utils/error-messages'

type MembresiaAuth = {
  id: string
  rol: RolUsuario
  activa: boolean
  sede_id: string | null
  organizacion_id: string | null
  organizaciones?: {
    id?: string
    nombre?: string
    activa?: boolean
    motivo_desactivacion?: string | null
  } | null
  sedes?: {
    id?: string
    nombre?: string
  } | null
}

function isMembresiaHabilitada(membresia: any) {
  if (!membresia?.activa) return false
  if (membresia?.rol === 'super_admin') return true

  const org = Array.isArray(membresia?.organizaciones)
    ? membresia.organizaciones[0]
    : membresia?.organizaciones

  if (!org) return true
  return org.activa !== false
}

function orderMembresiasByActive(membresias: MembresiaAuth[], activa: MembresiaAuth | null) {
  if (!activa) return membresias
  return [activa, ...membresias.filter((m) => m.id !== activa.id)]
}

function normalizeRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function sanitizeMembresias(base: any[]): MembresiaAuth[] {
  return (base || []).map((m: any) => ({
    id: m.id,
    rol: m.rol,
    activa: m.activa,
    sede_id: m.sede_id || null,
    organizacion_id: m.organizacion_id || null,
    organizaciones: normalizeRel(m.organizaciones),
    sedes: normalizeRel(m.sedes),
  }))
}

function getRolesActivosUnicos(membresias: MembresiaAuth[]) {
  return Array.from(new Set((membresias || []).map((m) => m.rol)))
}

async function getServiceRoleClientSafe() {
  try {
    return createServiceRoleClient()
  } catch {
    return null
  }
}

async function getContextoActivo(usuarioId: string) {
  const service = await getServiceRoleClientSafe()
  if (!service) return null

  const { data, error } = await service
    .from('usuario_contexto_activo')
    .select('membresia_id')
    .eq('usuario_id', usuarioId)
    .single()

  if (error || !data?.membresia_id) return null
  return data.membresia_id as string
}

async function setContextoActivo(usuarioId: string, membresiaId: string) {
  const service = await getServiceRoleClientSafe()
  if (!service) return

  await service
    .from('usuario_contexto_activo')
    .upsert(
      {
        usuario_id: usuarioId,
        membresia_id: membresiaId,
      },
      { onConflict: 'usuario_id' }
    )
}

async function ensurePerfilPorRol(usuarioId: string, membresia: MembresiaAuth) {
  const service = await getServiceRoleClientSafe()
  if (!service) return
  if (!membresia.sede_id) return

  if (membresia.rol === 'profesor') {
    await service
      .from('profesores')
      .upsert(
        {
          usuario_id: usuarioId,
          sede_id: membresia.sede_id,
          activo: true,
        },
        { onConflict: 'usuario_id,sede_id' }
      )
  }

  if (membresia.rol === 'alumno') {
    await service
      .from('alumnos')
      .upsert(
        {
          usuario_id: usuarioId,
          sede_id: membresia.sede_id,
          activo: true,
        },
        { onConflict: 'usuario_id,sede_id' }
      )
  }
}

async function ensureAlumnoMembershipBySedeSlug(usuarioId: string, sedeSlug?: string | null) {
  if (!sedeSlug) return
  const service = await getServiceRoleClientSafe()
  if (!service) return

  const { data: sede } = await service
    .from('sedes')
    .select('id, organizacion_id, activa')
    .eq('slug', sedeSlug)
    .maybeSingle()

  if (!sede?.id || sede.activa === false) return

  const { data: membresiaExistente } = await service
    .from('membresias')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('sede_id', sede.id)
    .eq('rol', 'alumno')
    .maybeSingle()

  if (!membresiaExistente) {
    await service.from('membresias').insert({
      usuario_id: usuarioId,
      sede_id: sede.id,
      organizacion_id: sede.organizacion_id,
      rol: 'alumno',
      activa: true,
    })
  } else {
    await service.from('membresias').update({ activa: true }).eq('id', membresiaExistente.id)
  }
}

async function getMembresiasConEstadoOrganizacion(supabase: any, usuarioId: string) {
  const { data: membresias, error } = await supabase
    .from('membresias')
    .select('id, rol, activa, sede_id, organizacion_id, organizaciones(id, nombre, activa, motivo_desactivacion), sedes(id, nombre)')
    .eq('usuario_id', usuarioId)

  if (!error) {
    return { data: sanitizeMembresias(membresias || []), error: null }
  }

  // Fallback 1: service role para evitar bloquear auth por RLS.
  const serviceRoleSupabase = await getServiceRoleClientSafe()
  if (serviceRoleSupabase) {
    const { data: serviceData, error: serviceError } = await serviceRoleSupabase
      .from('membresias')
      .select('id, rol, activa, sede_id, organizacion_id, organizaciones(id, nombre, activa, motivo_desactivacion), sedes(id, nombre)')
      .eq('usuario_id', usuarioId)

    if (!serviceError) {
      console.warn('[auth] Fallback service role en membresias.', {
        code: error.code,
        message: error.message,
      })
      return { data: sanitizeMembresias(serviceData || []), error: null }
    }
  }

  // Fallback defensivo: si falla el join con organizaciones (RLS/datos),
  // no bloquear el acceso por completo.
  const { data: membresiasBase, error: baseError } = await supabase
    .from('membresias')
    .select('id, rol, activa, sede_id, organizacion_id')
    .eq('usuario_id', usuarioId)

  if (baseError) {
    if (serviceRoleSupabase) {
      const { data: serviceBase, error: serviceBaseError } = await serviceRoleSupabase
        .from('membresias')
        .select('id, rol, activa, sede_id, organizacion_id')
        .eq('usuario_id', usuarioId)

      if (!serviceBaseError) {
        return {
          data: sanitizeMembresias(serviceBase || []).map((m) => ({
            ...m,
            organizaciones: null,
            sedes: null,
          })),
          error: null,
        }
      }
    }

    return { data: null, error: baseError }
  }

  const sanitized = sanitizeMembresias(membresiasBase || []).map((m: any) => ({
    ...m,
    organizaciones: null,
    sedes: null,
  }))

  console.warn('[auth] Fallback sin join a organizaciones en membresias.', {
    code: error.code,
    message: error.message,
  })

  return { data: sanitized, error: null }
}

export async function login(data: LoginInput) {
  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    console.error('[Login] Error de autenticacion:', error)
    return { error: translateAuthError(error.message) }
  }

  if (!authData.session || !authData.user) {
    console.error('[Login] Login exitoso pero no hay sesion')
    return { error: 'Error al establecer la sesion' }
  }

  const { data: usuarioSistema, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, activo')
    .eq('id', authData.user.id)
    .single()

  if (usuarioError || !usuarioSistema) {
    await supabase.auth.signOut()
    return { error: 'No se pudo validar el usuario en el sistema.' }
  }

  if (!usuarioSistema.activo) {
    await supabase.auth.signOut()
    return { error: 'Tu usuario esta inactivo. Contacta al administrador.' }
  }

  if (data.publicSedeSlug) {
    await ensureAlumnoMembershipBySedeSlug(authData.user.id, data.publicSedeSlug)
  }

  const {
    data: membresias,
    error: membresiasError,
  } = await getMembresiasConEstadoOrganizacion(supabase, authData.user.id)

  if (membresiasError) {
    console.error('[Login] Error al validar membresias:', {
      code: membresiasError.code,
      message: membresiasError.message,
      details: membresiasError.details,
      hint: membresiasError.hint,
    })
    await supabase.auth.signOut()
    return { error: 'No se pudieron validar los accesos del usuario.' }
  }

  const tieneMembresias = (membresias || []).length > 0
  const tieneAccesoHabilitado = (membresias || []).some(isMembresiaHabilitada)
  const membresiasHabilitadas = (membresias || []).filter(isMembresiaHabilitada)
  const rolesActivosUnicos = getRolesActivosUnicos(membresiasHabilitadas)

  if (data.publicSedeSlug) {
    const serviceRole = await getServiceRoleClientSafe()
    const { data: sedePublica } = serviceRole
      ? await serviceRole
          .from('sedes')
          .select('id')
          .eq('slug', data.publicSedeSlug)
          .maybeSingle()
      : ({ data: null } as any)

    if (sedePublica?.id) {
      const membresiaAlumnoSede = membresiasHabilitadas.find(
        (m) => m.rol === 'alumno' && m.sede_id === sedePublica.id
      )

      if (membresiaAlumnoSede) {
        await ensurePerfilPorRol(authData.user.id, membresiaAlumnoSede)
        await setContextoActivo(authData.user.id, membresiaAlumnoSede.id)
        revalidatePath('/', 'layout')
        redirect('/alumno/calendario')
      }
    }
  }

  if (tieneMembresias && !tieneAccesoHabilitado) {
    await supabase.auth.signOut()
    return { error: 'El cliente asociado a tu cuenta esta desactivado.' }
  }

  if (!tieneMembresias || membresiasHabilitadas.length === 0) {
    revalidatePath('/', 'layout')
    redirect('/sin-acceso')
  }

  if (rolesActivosUnicos.length === 1 && membresiasHabilitadas.length > 0) {
    const contextoActivoId = await getContextoActivo(authData.user.id)
    const membresiaDestino =
      membresiasHabilitadas.find((m) => m.id === contextoActivoId) || membresiasHabilitadas[0]

    await ensurePerfilPorRol(authData.user.id, membresiaDestino)
    await setContextoActivo(authData.user.id, membresiaDestino.id)
    revalidatePath('/', 'layout')
    redirect(getDashboardRoute(membresiaDestino.rol))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard/seleccionar-perfil')
}

export async function register(data: RegisterInput) {
  const supabase = await createClient()
  let serviceRoleSupabase: ReturnType<typeof createServiceRoleClient> | null = null
  try {
    serviceRoleSupabase = createServiceRoleClient()
  } catch (error) {
    console.warn('[register] SUPABASE_SERVICE_ROLE_KEY no configurada, usando cliente estandar')
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    return { error: translateAuthError(authError.message) }
  }

  if (!authData.user) {
    return { error: 'Error al crear usuario' }
  }

  const userPayload = {
    id: authData.user.id,
    email: data.email,
    nombre: data.nombre,
    apellido: data.apellido,
    activo: true,
  }
  const userQuery = serviceRoleSupabase
    ? serviceRoleSupabase.from('usuarios').upsert(userPayload)
    : supabase.from('usuarios').insert(userPayload)

  const { error: userError } = await userQuery

  if (userError) {
    console.error('Error creando usuario:', userError)
    return { error: translateAuthError(userError.message) }
  }

  if (data.publicSedeSlug) {
    await ensureAlumnoMembershipBySedeSlug(authData.user.id, data.publicSedeSlug)
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function loginWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    return { error: translateAuthError(error.message) }
  }

  if (data.url) {
    redirect(data.url)
  }
}

const getUserCached = cache(async () => {
  const supabase = await createClient()

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getUser] Error en auth.getUser():', authError)
      return null
    }

    if (!user) {
      return null
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('[getUser] Error al obtener usuario:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return null
    }

    if (!usuario.activo) {
      return null
    }

    const {
      data: membresias,
      error: membresiasError,
    } = await getMembresiasConEstadoOrganizacion(supabase, user.id)

    if (membresiasError) {
      console.error('[getUser] Error al validar membresias:', {
        code: membresiasError.code,
        message: membresiasError.message,
        details: membresiasError.details,
        hint: membresiasError.hint,
      })
      return null
    }

    const membresiasUsuario = (membresias || []) as MembresiaAuth[]
    const tieneMembresias = membresiasUsuario.length > 0
    const membresiasHabilitadas = membresiasUsuario.filter(isMembresiaHabilitada)
    const tieneAccesoHabilitado = membresiasHabilitadas.length > 0
    const rolesActivosUnicos = getRolesActivosUnicos(membresiasHabilitadas)

    if (tieneMembresias && !tieneAccesoHabilitado) {
      return null
    }

    const contextoActivoId = await getContextoActivo(user.id)
    let membresiaActiva =
      membresiasHabilitadas.find((m) => m.id === contextoActivoId) || null

    if (!membresiaActiva && rolesActivosUnicos.length === 1 && membresiasHabilitadas.length > 0) {
      membresiaActiva = membresiasHabilitadas[0]
      await setContextoActivo(user.id, membresiaActiva.id)
    }

    usuario.membresias = orderMembresiasByActive(membresiasUsuario, membresiaActiva)
    usuario.membresia_activa = membresiaActiva
    usuario.requiere_seleccion_perfil = rolesActivosUnicos.length > 1 && !membresiaActiva
    usuario.tiene_multiples_perfiles = rolesActivosUnicos.length > 1

    return usuario
  } catch (error) {
    console.error('[getUser] Error inesperado:', error)
    return null
  }
})

export async function getUser() {
  return getUserCached()
}

export async function seleccionarPerfilActivo(membresiaId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membresias, error } = await getMembresiasConEstadoOrganizacion(supabase, user.id)

  if (error || !membresias) {
    return { error: 'No se pudieron validar los perfiles disponibles.' }
  }

  const membresiasHabilitadas = membresias.filter(isMembresiaHabilitada)
  const membresiaSeleccionada = membresiasHabilitadas.find((m) => m.id === membresiaId)

  if (!membresiaSeleccionada) {
    return { error: 'El perfil seleccionado no es valido o no esta activo.' }
  }

  await ensurePerfilPorRol(user.id, membresiaSeleccionada)
  await setContextoActivo(user.id, membresiaSeleccionada.id)
  revalidatePath('/', 'layout')
  redirect(getDashboardRoute(membresiaSeleccionada.rol))
}

export async function seleccionarSedeActivaAlumno(sedeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const { data: membresias, error } = await getMembresiasConEstadoOrganizacion(supabase, user.id)

  if (error || !membresias) {
    return { error: 'No se pudieron validar las sedes del alumno.' }
  }

  const membresiaAlumno = membresias
    .filter(isMembresiaHabilitada)
    .find((m) => m.rol === 'alumno' && m.sede_id === sedeId)

  if (!membresiaAlumno) {
    return { error: 'No tienes acceso de alumno a esa sede.' }
  }

  await ensurePerfilPorRol(user.id, membresiaAlumno)
  await setContextoActivo(user.id, membresiaAlumno.id)
  revalidatePath('/', 'layout')

  return { success: true }
}
