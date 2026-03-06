/**
 * Layout del dashboard con sidebar y navbar
 */

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar usuario={usuario} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar usuario={usuario} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  )
}
