/**
 * Dashboard principal - Redirige según rol
 */

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { getDashboardRoute } from '@/lib/constants/navigation'

export default async function DashboardPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Obtener rol principal
  const rol = usuario.membresias?.[0]?.rol

  if (rol) {
    redirect(getDashboardRoute(rol))
  }

  // Usuario sin rol asignado
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Bienvenido</h1>
        <p className="text-muted-foreground">
          Tu cuenta aún no tiene un rol asignado. Por favor, contacta al administrador.
        </p>
      </div>
    </div>
  )
}
