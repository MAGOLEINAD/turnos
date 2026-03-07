import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'

interface RegistroPageProps {
  searchParams?: {
    publicSedeSlug?: string
  }
}

export default function RegistroPage({ searchParams }: RegistroPageProps) {
  const publicSedeSlug = searchParams?.publicSedeSlug
  const loginHref = publicSedeSlug
    ? `/login?publicSedeSlug=${encodeURIComponent(publicSedeSlug)}`
    : '/login'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <RegisterForm publicSedeSlug={publicSedeSlug} />
        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">Ya tienes cuenta? </span>
          <Link href={loginHref} className="font-medium text-primary hover:underline">
            Iniciar sesion
          </Link>
        </div>
      </div>
    </div>
  )
}
