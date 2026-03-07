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
  sedeSeleccionada: string
}

export function SedeContextSelector({ sedes, sedeSeleccionada }: SedeContextSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sedeId, setSedeId] = useState(sedeSeleccionada)

  const handleSedeChange = (nextSedeId: string) => {
    setSedeId(nextSedeId)
    if (!nextSedeId) return
    router.push(`${pathname}?sede=${nextSedeId}`)
  }

  if (sedes.length <= 1) {
    return null
  }

  return (
    <div className="w-full sm:max-w-sm">
      <Label htmlFor="sede-select">Sede</Label>
      <Select value={sedeId} onValueChange={handleSedeChange}>
        <SelectTrigger id="sede-select" className="mt-1">
          <SelectValue placeholder="Selecciona una sede" />
        </SelectTrigger>
        <SelectContent>
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
