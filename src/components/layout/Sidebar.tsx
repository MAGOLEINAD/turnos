/**
 * Sidebar con navegación por rol
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavForRole } from '@/lib/constants/navigation'
import { cn } from '@/lib/utils/cn'

interface SidebarProps {
  usuario: any
}

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname()
  const rol = usuario?.membresia_activa?.rol || usuario?.membresias?.[0]?.rol
  const navItems = getNavForRole(rol)

  return (
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Gestión de Turnos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {usuario?.nombre} {usuario?.apellido}
        </p>
      </div>

      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'block px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
