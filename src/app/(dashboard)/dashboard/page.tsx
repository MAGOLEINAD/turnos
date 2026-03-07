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

  if (usuario.requiere_seleccion_perfil) {
    redirect('/dashboard/seleccionar-perfil')
  }

  if (!usuario.membresias || usuario.membresias.length === 0) {
    redirect('/sin-acceso')
  }

  const rol = usuario.membresia_activa?.rol || usuario.membresias?.[0]?.rol

  if (rol) {
    redirect(getDashboardRoute(rol))
  }

  // Usuario sin rol asignado
  return (
    <div className="flex h-full justify-center pt-16">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-2xl font-bold">Bienvenido</h1>
        <p className="text-muted-foreground">
          Tu cuenta aún no tiene un rol asignado. Por favor, contacta al administrador.
        </p>
      </div>
    </div>
  )
}
