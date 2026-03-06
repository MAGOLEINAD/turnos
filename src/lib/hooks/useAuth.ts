/**
 * Hook para gestión de autenticación
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../supabase/client'
import type { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  nombre?: string
  apellido?: string
  rol?: string
  sede_id?: string
  organizacion_id?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Obtener usuario actual
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Obtener datos completos del usuario
          const { data: userData } = await supabase
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

          if (userData) {
            setUser({
              ...user,
              nombre: userData.nombre,
              apellido: userData.apellido,
              rol: userData.membresias?.[0]?.rol,
              sede_id: userData.membresias?.[0]?.sede_id,
              organizacion_id: userData.membresias?.[0]?.organizacion_id,
            })
          } else {
            setUser(user as AuthUser)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Suscribirse a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await getUser()
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return {
    user,
    loading,
    isAuthenticated: !!user,
  }
}
