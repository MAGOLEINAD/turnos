/**
 * Sidebar móvil con Sheet (drawer)
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavForRole } from '@/lib/constants/navigation'
import { cn } from '@/lib/utils/cn'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface MobileSidebarProps {
  usuario: any
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ usuario, isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const rol = usuario?.membresia_activa?.rol || usuario?.membresias?.[0]?.rol
  const navItems = getNavForRole(rol)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-left">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestión de Turnos</h1>
              <p className="text-sm text-gray-500 mt-1 font-normal">
                {usuario?.nombre} {usuario?.apellido}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="px-4 space-y-1 pb-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={onClose}
                className={cn(
                  'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
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
      </SheetContent>
    </Sheet>
  )
}
