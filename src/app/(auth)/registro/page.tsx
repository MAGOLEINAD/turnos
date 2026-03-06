import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <RegisterForm />
        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
