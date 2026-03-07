/**
 * Middleware de autenticación con Supabase
 *
 * Este middleware:
 * 1. Refresca el token de sesión de Supabase automáticamente
 * 2. Protege rutas privadas requiriendo autenticación
 * 3. Redirige usuarios según su estado de autenticación
 */

import { createServerClient } from '@supabase/ssr'
import type { CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value)
      )
      supabaseResponse = NextResponse.next({
        request,
      })
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options)
      )
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieMethods,
    }
  )

  // Refrescar sesión si es necesario
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas protegidas que requieren autenticación
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/registro')
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/super-admin') ||
                          request.nextUrl.pathname.startsWith('/admin') ||
                          request.nextUrl.pathname.startsWith('/profesor') ||
                          request.nextUrl.pathname.startsWith('/alumno')

  // Si el usuario no está autenticado y trata de acceder a ruta protegida
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)

    // Si venía de dashboard, probablemente hubo un error de sesión
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      redirectUrl.searchParams.set('error', 'session_error')
    }

    return NextResponse.redirect(redirectUrl)
  }

  // Si el usuario está autenticado y trata de acceder a login/registro
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/login',
    '/registro',
    '/dashboard/:path*',
    '/super-admin/:path*',
    '/admin/:path*',
    '/profesor/:path*',
    '/alumno/:path*',
  ],
}
