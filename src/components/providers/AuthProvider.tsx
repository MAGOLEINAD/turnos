/**
 * Provider de autenticación
 */

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { RolUsuario } from '@/lib/constants/roles'

interface AuthUser extends User {
  nombre?: string
  apellido?: string
  rol?: RolUsuario
  sede_id?: string
  organizacion_id?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await getUser()
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  }
  return context
}
