'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SedeOption {
  id: string
  nombre: string
}

interface ProfesorOption {
  id: string
  nombre: string
}

interface AdminCalendarioFiltersProps {
  sedes: SedeOption[]
  sedeSeleccionada: string
  profesores: ProfesorOption[]
  profesorSeleccionado: string
}

export function AdminCalendarioFilters({
  sedes,
  sedeSeleccionada,
  profesores,
  profesorSeleccionado,
}: AdminCalendarioFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParams = (nextSede: string, nextProfesor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sede', nextSede)
    params.set('profesor', nextProfesor)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleSedeChange = (nextSede: string) => {
    // Al cambiar sede, volvemos a "todos" para evitar profesor invalido entre sedes.
    updateParams(nextSede, 'todos')
  }

  const handleProfesorChange = (nextProfesor: string) => {
    updateParams(sedeSeleccionada, nextProfesor)
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="sede-select-admin-cal">Sede</Label>
        <Select value={sedeSeleccionada} onValueChange={handleSedeChange} disabled={sedes.length <= 1}>
          <SelectTrigger id="sede-select-admin-cal">
            <SelectValue placeholder="Selecciona sede" />
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

      <div className="space-y-1">
        <Label htmlFor="profesor-select-admin-cal">Profesor</Label>
        <Select value={profesorSeleccionado} onValueChange={handleProfesorChange}>
          <SelectTrigger id="profesor-select-admin-cal">
            <SelectValue placeholder="Selecciona profesor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los profesores</SelectItem>
            {profesores.map((profesor) => (
              <SelectItem key={profesor.id} value={profesor.id}>
                {profesor.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

