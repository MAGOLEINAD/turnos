/**
 * Callback de OAuth (Google)
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Verificar si el usuario ya existe en la tabla usuarios
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // Si no existe, crear el registro
      if (!existingUser) {
        const nombre = data.user.user_metadata?.full_name?.split(' ')[0] || 'Usuario'
        const apellido = data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''

        await supabase.from('usuarios').insert({
          id: data.user.id,
          email: data.user.email!,
          nombre,
          apellido,
          avatar_url: data.user.user_metadata?.avatar_url,
        })
      }
    }
  }

  // Redirigir al dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
