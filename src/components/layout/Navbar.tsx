/**
 * Navbar superior del dashboard
 */

'use client'

import Link from 'next/link'
import { useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Menu, MapPin, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { logout, seleccionarSedeActivaAlumno } from '@/lib/actions/auth.actions'
import { ROLES_ICONS, ROLES_LABELS, type RolUsuario } from '@/lib/constants/roles'

interface NavbarProps {
  usuario: any
  sedes?: Array<{ id: string; nombre: string }>
  sedeActivaId?: string | null
  onMenuClick?: () => void
}

export function Navbar({ usuario, sedes = [], sedeActivaId = null, onMenuClick }: NavbarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const rol = (usuario?.membresia_activa?.rol || usuario?.membresias?.[0]?.rol) as RolUsuario | undefined
  const rolLabel = rol ? `${ROLES_ICONS[rol]} ${ROLES_LABELS[rol]}` : 'Sin rol'

  const sedeActiva = sedes.find((sede) => sede.id === sedeActivaId)
  const sedePrincipal = sedeActiva?.nombre || sedes[0]?.nombre || 'Dashboard'
  const sedesAlumno = useMemo(() => {
    if (rol !== 'alumno') return []

    const byId = new Map(sedes.map((s) => [s.id, s.nombre]))
    const ids = new Set<string>()
    for (const m of usuario?.membresias || []) {
      if (m?.rol !== 'alumno' || !m?.activa || !m?.sede_id) continue
      ids.add(m.sede_id)
    }

    return Array.from(ids).map((id) => ({
      id,
      nombre: byId.get(id) || 'Sede',
    }))
  }, [rol, sedes, usuario?.membresias])

  const onChangeSedeAlumno = (value: string) => {
    if (!value || value === sedeActivaId) return
    startTransition(async () => {
      const result = await seleccionarSedeActivaAlumno(value)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          {sedes.length > 0 && <MapPin className="h-4 w-4 text-muted-foreground" />}
          {rol === 'alumno' && sedesAlumno.length > 1 ? (
            <Select value={sedeActivaId || sedesAlumno[0]?.id} onValueChange={onChangeSedeAlumno} disabled={isPending}>
              <SelectTrigger className="h-9 w-[240px]">
                <SelectValue placeholder="Seleccionar sede" />
              </SelectTrigger>
              <SelectContent>
                {sedesAlumno.map((sede) => (
                  <SelectItem key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h2 className="text-lg font-semibold">{sedePrincipal}</h2>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                {usuario?.nombre?.[0]}
                {usuario?.apellido?.[0]}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium">
                  {usuario?.nombre} {usuario?.apellido}
                </div>
                <div className="text-xs text-muted-foreground">{rolLabel}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {usuario?.tiene_multiples_perfiles ? (
              <DropdownMenuItem asChild>
                <Link href="/dashboard/seleccionar-perfil" className="flex items-center">
                  <Repeat className="mr-2 h-4 w-4" />
                  Cambiar perfil
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
