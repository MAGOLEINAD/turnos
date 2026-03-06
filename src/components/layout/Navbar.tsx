/**
 * Navbar superior del dashboard
 */

'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/lib/actions/auth.actions'
import { ROLES_LABELS } from '@/lib/constants/roles'

interface NavbarProps {
  usuario: any
}

export function Navbar({ usuario }: NavbarProps) {
  const rol = usuario?.membresias?.[0]?.rol

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {usuario?.nombre?.[0]}
                {usuario?.apellido?.[0]}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">
                  {usuario?.nombre} {usuario?.apellido}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rol ? ROLES_LABELS[rol] : 'Sin rol'}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
