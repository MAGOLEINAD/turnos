/**
 * Middleware de autenticación con Supabase
 *
 * Este middleware:
 * 1. Refresca el token de sesión de Supabase automáticamente
 * 2. Protege rutas privadas requiriendo autenticación
 * 3. Redirige usuarios según su estado de autenticación
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión si es necesario
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[Middleware]', request.nextUrl.pathname, '- Usuario:', user ? user.email : 'no autenticado')

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
    console.log('[Middleware] Redirigiendo a /login - usuario no autenticado')
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
    console.log('[Middleware] Redirigiendo a /dashboard - usuario ya autenticado')
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
