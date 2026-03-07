'use client'

import { useMemo } from 'react'
import { CalendarioFullCalendar } from './CalendarioFullCalendar'
import { reservaToEvent } from '@/lib/utils/calendario'

interface ReservaAgendaAlumno {
  id: string
  tipo: 'individual' | 'grupal'
  sede_id: string
  fecha_inicio: string
  fecha_fin: string
  profesores?: {
    usuarios?: {
      nombre?: string | null
      apellido?: string | null
    } | null
  } | null
  sedes?: {
    nombre?: string | null
  } | null
}

interface SedeOption {
  id: string
  nombre: string
}

interface CalendarioAlumnoAgendaProps {
  reservas: ReservaAgendaAlumno[]
  sedes: SedeOption[]
}

const SEDE_COLORS = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#0D9488', '#BE123C']

export function CalendarioAlumnoAgenda({ reservas, sedes }: CalendarioAlumnoAgendaProps) {
  const colorBySede = useMemo(() => {
    const map = new Map<string, string>()
    sedes.forEach((sede, idx) => {
      map.set(sede.id, SEDE_COLORS[idx % SEDE_COLORS.length])
    })
    return map
  }, [sedes])

  const eventos = useMemo(() => {
    return reservas.map((reserva) => {
      const evento = reservaToEvent(reserva as any)
      const color = colorBySede.get(reserva.sede_id) || '#2563EB'
      const sedeNombre = reserva.sedes?.nombre || 'Sede'
      const profesorNombre = [
        reserva.profesores?.usuarios?.nombre || '',
        reserva.profesores?.usuarios?.apellido || '',
      ]
        .join(' ')
        .trim()

      return {
        ...evento,
        title: `[${sedeNombre}] ${reserva.tipo === 'grupal' ? 'Grupal' : 'Individual'}${profesorNombre ? ` - ${profesorNombre}` : ''}`,
        backgroundColor: color,
        borderColor: color,
      }
    })
  }, [reservas, colorBySede])

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Esta vista muestra solo tus reservas confirmadas. No incluye disponibilidad general para reservar.
        </p>
      </div>

      <CalendarioFullCalendar eventos={eventos} selectable={false} editable={false} />

      {sedes.length > 1 ? (
        <div className="flex flex-wrap gap-3">
          {sedes.map((sede) => (
            <div key={sede.id} className="flex items-center gap-2 rounded border px-2 py-1 text-sm bg-white">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorBySede.get(sede.id) || '#2563EB' }}
              />
              <span>{sede.nombre}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

