/**
 * Layout del dashboard con sidebar y navbar
 */

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Verificar si la organización está desactivada
  if (usuario.organizacion_desactivada) {
    redirect('/cuenta-desactivada')
  }

  return <DashboardLayoutClient usuario={usuario}>{children}</DashboardLayoutClient>
}
