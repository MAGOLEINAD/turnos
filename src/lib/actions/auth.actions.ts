/**
 * Server Actions para autenticación
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '../supabase/server'
import type { LoginInput, RegisterInput } from '../validations/auth.schema'
import { translateAuthError } from '../utils/error-messages'

export async function login(data: LoginInput) {
  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    console.error('[Login] Error de autenticación:', error)
    return { error: translateAuthError(error.message) }
  }

  if (!authData.session) {
    console.error('[Login] Login exitoso pero no hay sesión')
    return { error: 'Error al establecer la sesión' }
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
    console.warn('[register] SUPABASE_SERVICE_ROLE_KEY no configurada, usando cliente estándar')
  }

  // 1. Crear usuario en Supabase Auth
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

  // 2. Crear/actualizar registro en tabla usuarios con service role
  // signUp puede devolver user sin session (confirmación por email), lo que rompe RLS.
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

export async function getUser() {
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

    // Obtener datos completos del usuario con rol y sede
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        membresias (
          rol,
          sede_id,
          organizacion_id,
          activa
        )
      `)
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

    return usuario
  } catch (error) {
    console.error('[getUser] Error inesperado:', error)
    return null
  }
}
