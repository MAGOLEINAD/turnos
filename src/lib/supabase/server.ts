/**
 * Cliente Supabase para Server Components y Server Actions
 */

import { createServerClient } from '@supabase/ssr'
import type { CookieMethodsServer, SetAllCookies } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookiesToSet = Parameters<SetAllCookies>[0]

const createServerClientSafe: (
  ...args: Parameters<typeof createServerClient>
) => ReturnType<typeof createServerClient> = createServerClient

export async function createClient() {
  const cookieStore = await cookies()
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet: CookiesToSet) {
      try {
        cookiesToSet.forEach((cookie) => {
          cookieStore.set(cookie.name, cookie.value, cookie.options)
        })
      } catch (error) {
        // Las cookies solo se pueden setear desde Server Actions o Route Handlers
        console.error('[Supabase] Error al setear cookies:', error)
      }
    },
  }

  return createServerClientSafe(
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

  return createServerClientSafe(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: cookieMethods,
    }
  )
}
