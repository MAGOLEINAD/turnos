/**
 * Formulario de login
 */

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { login, loginWithGoogle } from '@/lib/actions/auth.actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const publicSedeSlug = searchParams.get('publicSedeSlug') || undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'session_error') {
      toast.error('Error al establecer la sesión. Por favor, intenta nuevamente.')
    } else if (error === 'auth_error') {
      toast.error('Error de autenticación. Por favor, verifica tus credenciales.')
    }
  }, [searchParams])

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      const result = await login({
        ...data,
        publicSedeSlug,
      })

      if (result?.error) {
        toast.error(result.error)
        setLoading(false)
      }
      // Si no hay error, se redirige automáticamente.
    } catch (error) {
      // En server actions, redirect() puede llegar aquí como NEXT_REDIRECT.
      // No debe mostrarse como error al usuario.
      if (
        typeof error === 'object' &&
        error !== null &&
        'digest' in error &&
        typeof (error as { digest?: unknown }).digest === 'string' &&
        (error as { digest: string }).digest.includes('NEXT_REDIRECT')
      ) {
        return
      }
      console.error('[LoginForm] Error inesperado:', error)
      toast.error('Error inesperado al iniciar sesión. Por favor, intenta nuevamente.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (error) {
      toast.error('Error al iniciar sesión con Google')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            {...register('email')}
            disabled={loading}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pr-10"
              {...register('password')}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              disabled={loading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <LoadingButton type="submit" className="w-full" loading={loading} loadingText="Iniciando sesión...">
          Iniciar Sesión
        </LoadingButton>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">O continuar con</span>
        </div>
      </div>

      <LoadingButton
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        loading={loading}
        loadingText="Redirigiendo..."
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </LoadingButton>
    </div>
  )
}
