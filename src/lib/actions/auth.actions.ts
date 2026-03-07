/**
 * Server Actions para autenticacion
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient, createServiceRoleClient } from '../supabase/server'
import type { LoginInput, RegisterInput } from '../validations/auth.schema'
import { translateAuthError } from '../utils/error-messages'

function isMembresiaHabilitada(membresia: any) {
  if (!membresia?.activa) return false
  if (membresia?.rol === 'super_admin') return true

  const org = Array.isArray(membresia?.organizaciones)
    ? membresia.organizaciones[0]
    : membresia?.organizaciones

  if (!org) return true
  return org.activa !== false
}

async function getMembresiasConEstadoOrganizacion(supabase: any, usuarioId: string) {
  const { data: membresias, error } = await supabase
    .from('membresias')
    .select('rol, activa, sede_id, organizacion_id, organizaciones(activa, motivo_desactivacion), sedes(nombre)')
    .eq('usuario_id', usuarioId)

  if (!error) {
    return { data: membresias || [], error: null }
  }

  // Fallback defensivo: si falla el join con organizaciones (RLS/datos),
  // no bloquear el acceso por completo.
  const { data: membresiasBase, error: baseError } = await supabase
    .from('membresias')
    .select('rol, activa, sede_id, organizacion_id')
    .eq('usuario_id', usuarioId)

  if (baseError) {
    return { data: null, error: baseError }
  }

  const sanitized = (membresiasBase || []).map((m: any) => ({
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

  if (tieneMembresias && !tieneAccesoHabilitado) {
    await supabase.auth.signOut()
    return { error: 'El cliente asociado a tu cuenta esta desactivado.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
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

    usuario.membresias = membresias || []

    const tieneMembresias = membresias.length > 0
    const tieneAccesoHabilitado = membresias.some(isMembresiaHabilitada)

    if (tieneMembresias && !tieneAccesoHabilitado) {
      return null
    }

    return usuario
  } catch (error) {
    console.error('[getUser] Error inesperado:', error)
    return null
  }
})

export async function getUser() {
  return getUserCached()
}
