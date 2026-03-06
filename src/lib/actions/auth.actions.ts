/**
 * Server Actions para autenticación
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
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

  console.log('[Login] Login exitoso para:', authData.user.email)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function register(data: RegisterInput) {
  const supabase = await createClient()

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

  // 2. Crear registro en tabla usuarios
  const { error: userError } = await supabase.from('usuarios').insert({
    id: authData.user.id,
    email: data.email,
    nombre: data.nombre,
    apellido: data.apellido,
  })

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log('[getUser] No hay usuario autenticado')
    return null
  }

  console.log('[getUser] Usuario autenticado:', user.id, user.email)

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
    console.error('[getUser] Error al obtener usuario:', error)
    return null
  }

  console.log('[getUser] Usuario completo:', JSON.stringify(usuario, null, 2))
  return usuario
}
