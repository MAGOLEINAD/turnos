/**
 * Cliente Supabase para Server Components y Server Actions
 */

import { createServerClient } from '@supabase/ssr'
import type { CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch (error) {
        // Las cookies solo se pueden setear desde Server Actions o Route Handlers
        console.error('[Supabase] Error al setear cookies:', error)
      }
    },
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieMethods,
    }
  )
}

/**
 * Cliente Supabase con service role key (bypasses RLS)
 * SOLO usar para tareas administrativas seguras
 */
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurado')
  }

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return []
    },
    setAll() {
      // No hacer nada con cookies en service role client
    },
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: cookieMethods,
    }
  )
}
