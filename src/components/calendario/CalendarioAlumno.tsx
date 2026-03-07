'use client'

import { useState, useMemo, useEffect } from 'react'
import { CalendarioFullCalendar } from './CalendarioFullCalendar'
import { ModalInscripcionGrupal } from './ModalInscripcionGrupal'
import type { EventClickArg } from '@fullcalendar/core'
import { toast } from 'sonner'
import { useReservas } from '@/hooks/useReservas'
import { reservaToEvent } from '@/lib/utils/calendario'

interface CalendarioAlumnoProps {
  usuarioId: string
  alumnoId: string
  sedeId: string
}

export function CalendarioAlumno({ usuarioId, alumnoId, sedeId }: CalendarioAlumnoProps) {
  // Estado para modal de inscripción
  const [modalInscripcionOpen, setModalInscripcionOpen] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)

  // React Query maneja loading, error y caching automáticamente
  const { data: reservas = [], isLoading, error } = useReservas(sedeId)

  // Convertir reservas a eventos (memoizado para no recalcular en cada render)
  const eventos = useMemo(() => {
    const reservasSede = reservas.filter((r: any) => r.sede_id === sedeId)
    return reservasSede.map(reservaToEvent)
  }, [reservas, sedeId])

  // Mostrar error si existe
  useEffect(() => {
    if (error) {
      toast.error('Error al cargar eventos')
    }
  }, [error])

  const handleEventClick = (clickInfo: EventClickArg) => {
    const reservaId = clickInfo.event.id

    // Los datos ya están en cache, no hace falta re-fetch
    const reserva = reservas.find((r: any) => r.id === reservaId)

    if (reserva?.tipo === 'grupal') {
      setReservaSeleccionada(reserva)
      setModalInscripcionOpen(true)
    } else if (reserva?.tipo === 'individual') {
      toast.info('Esta es una clase individual. Contacta al profesor para reservar.')
    }
  }

  const handleInscripcionSuccess = () => {
    // React Query automáticamente refresca la data después de la mutación
    setModalInscripcionOpen(false)
    toast.success('Inscripción exitosa')
  }

  if (isLoading) {
    return <div className="text-center py-12">Cargando calendario...</div>
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Tip:</strong> Haz clic en una clase grupal para inscribirte. Las clases
            individuales requieren contactar al profesor.
          </p>
        </div>

        <CalendarioFullCalendar
          eventos={eventos}
          onEventClick={handleEventClick}
          selectable={false}
          editable={false}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-sm">Individual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span className="text-sm">Grupal (clickeable)</span>
          </div>
        </div>
      </div>

      <ModalInscripcionGrupal
        open={modalInscripcionOpen}
        onOpenChange={setModalInscripcionOpen}
        reserva={reservaSeleccionada}
        alumnoId={alumnoId}
        onSuccess={handleInscripcionSuccess}
      />
    </>
  )
}
