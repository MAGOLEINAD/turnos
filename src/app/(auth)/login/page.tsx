import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginPageProps {
  searchParams?: {
    publicSedeSlug?: string
  }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const publicSedeSlug = searchParams?.publicSedeSlug
  const registroHref = publicSedeSlug
    ? `/registro?publicSedeSlug=${encodeURIComponent(publicSedeSlug)}`
    : '/registro'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">No tienes una cuenta? </span>
            <Link href={registroHref} className="text-primary hover:underline font-medium">
              Regístrate aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
