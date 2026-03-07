'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SedeOption {
  id: string
  nombre: string
}

interface SedeContextSelectorProps {
  sedes: SedeOption[]
  sedeSeleccionada: string | null
  showAllOption?: boolean // Nueva prop para mostrar opción "Todas las sedes"
}

export function SedeContextSelector({ sedes, sedeSeleccionada, showAllOption = true }: SedeContextSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sedeId, setSedeId] = useState(sedeSeleccionada || 'all')

  const handleSedeChange = (nextSedeId: string) => {
    setSedeId(nextSedeId)
    if (!nextSedeId) return

    // Si selecciona "Todas", navegar sin parámetro sede
    if (nextSedeId === 'all') {
      router.push(pathname)
    } else {
      router.push(`${pathname}?sede=${nextSedeId}`)
    }
  }

  // Si solo hay una sede o no hay sedes, no mostrar nada
  if (sedes.length <= 1) {
    return null
  }

  return (
    <div className="w-full sm:max-w-sm">
      <Label htmlFor="sede-select">Filtrar por Sede</Label>
      <Select value={sedeId} onValueChange={handleSedeChange}>
        <SelectTrigger id="sede-select" className="mt-1">
          <SelectValue placeholder="Selecciona una sede" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">Todas las sedes</SelectItem>
          )}
          {sedes.map((sede) => (
            <SelectItem key={sede.id} value={sede.id}>
              {sede.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
