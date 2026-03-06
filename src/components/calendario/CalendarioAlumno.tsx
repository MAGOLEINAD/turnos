'use client'

import { useState, useEffect } from 'react'
import { CalendarioFullCalendar } from './CalendarioFullCalendar'
import { ModalInscripcionGrupal } from './ModalInscripcionGrupal'
import type { EventClickArg } from '@fullcalendar/core'
import { toast } from 'sonner'
import { obtenerReservas } from '@/lib/actions/reservas.actions'
import { reservaToEvent } from '@/lib/utils/calendario'

interface CalendarioAlumnoProps {
  usuarioId: string
  alumnoId: string
  sedeId: string
}

export function CalendarioAlumno({ usuarioId, alumnoId, sedeId }: CalendarioAlumnoProps) {
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para modal de inscripción
  const [modalInscripcionOpen, setModalInscripcionOpen] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)

  useEffect(() => {
    cargarEventos()
  }, [sedeId])

  const cargarEventos = async () => {
    setLoading(true)
    try {
      // Obtener todas las reservas de la sede (para ver disponibilidad)
      const result = await obtenerReservas(undefined, undefined, undefined)

      if (result.error) {
        toast.error(result.error)
        setEventos([])
      } else if (result.data) {
        // Filtrar por sede y convertir a eventos
        const reservasSede = result.data.filter((r: any) => r.sede_id === sedeId)
        const eventosConvertidos = reservasSede.map(reservaToEvent)
        setEventos(eventosConvertidos)
      }
    } catch (error) {
      toast.error('Error al cargar eventos')
      setEventos([])
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const reservaId = clickInfo.event.id

    // Buscar la reserva completa
    const result = await obtenerReservas()
    if (result.data) {
      const reserva = result.data.find((r: any) => r.id === reservaId)
      if (reserva && reserva.tipo === 'grupal') {
        setReservaSeleccionada(reserva)
        setModalInscripcionOpen(true)
      } else if (reserva && reserva.tipo === 'individual') {
        toast.info('Esta es una clase individual. Contacta al profesor para reservar.')
      }
    }
  }

  const handleInscripcionSuccess = () => {
    cargarEventos()
  }

  if (loading) {
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
