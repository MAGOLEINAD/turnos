'use client'

import { useState, useEffect } from 'react'
import { CalendarioFullCalendar } from './CalendarioFullCalendar'
import { ModalNuevaReserva } from './ModalNuevaReserva'
import { ModalDetalleReserva } from './ModalDetalleReserva'
import { FormBloqueo } from '../bloqueos/FormBloqueo'
import { Button } from '../ui/button'
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core'
import { toast } from 'sonner'
import { Ban } from 'lucide-react'
import { obtenerDatosCalendarioProfesor } from '@/lib/actions/calendario-profesor.actions'
import { reservaToEvent, horarioFijoToEvent, bloqueoToEvent } from '@/lib/utils/calendario'
import { generarOcurrenciasMultiplesHorariosFijos } from '@/lib/utils/recurrencia'

interface CalendarioProfesorProps {
  usuarioId: string
  profesorId: string
  sedeId: string
}

export function CalendarioProfesor({ usuarioId, profesorId, sedeId }: CalendarioProfesorProps) {
  const [eventos, setEventos] = useState<any[]>([])
  const [reservasById, setReservasById] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const [modalNuevaOpen, setModalNuevaOpen] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<{
    inicio: Date
    fin: Date
  } | null>(null)

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)

  const [modalBloqueoOpen, setModalBloqueoOpen] = useState(false)

  useEffect(() => {
    cargarEventos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesorId])

  const cargarEventos = async () => {
    setLoading(true)
    try {
      const result = await obtenerDatosCalendarioProfesor(profesorId)
      if (result.error || !result.data) {
        toast.error(result.error || 'Error al cargar eventos')
        setEventos([])
        return
      }

      const { reservas, horarios, bloqueos } = result.data
      const todosEventos: any[] = []
      const nextReservasById: Record<string, any> = {}

      for (const reserva of reservas) {
        nextReservasById[reserva.id] = reserva
      }
      todosEventos.push(...reservas.map(reservaToEvent))

      if (horarios.length > 0) {
        const hoy = new Date()
        const dentroTresMeses = new Date()
        dentroTresMeses.setMonth(dentroTresMeses.getMonth() + 3)

        const ocurrencias = generarOcurrenciasMultiplesHorariosFijos(horarios, hoy, dentroTresMeses)

        for (const ocurrencia of ocurrencias) {
          const horarioFijo = horarios.find((h: any) => h.id === ocurrencia.horarioFijoId)
          if (!horarioFijo) continue
          todosEventos.push(horarioFijoToEvent(horarioFijo, ocurrencia.fecha))
        }
      }

      todosEventos.push(...bloqueos.map(bloqueoToEvent))

      setReservasById(nextReservasById)
      setEventos(todosEventos)
    } catch {
      toast.error('Error al cargar eventos')
      setEventos([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const inicio = new Date(selectInfo.start)
    const fin = new Date(selectInfo.end)

    setFechaSeleccionada({ inicio, fin })
    setModalNuevaOpen(true)
    selectInfo.view.calendar.unselect()
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const reservaId = clickInfo.event.id
    const reserva = reservasById[reservaId]
    if (!reserva) return
    setReservaSeleccionada(reserva)
    setModalDetalleOpen(true)
  }

  const handleReservaSuccess = () => {
    cargarEventos()
  }

  if (loading) {
    return <div className="text-center py-12">Cargando calendario...</div>
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalBloqueoOpen(true)}>
            <Ban className="h-4 w-4 mr-2" />
            Bloquear Disponibilidad
          </Button>
        </div>

        <CalendarioFullCalendar
          eventos={eventos}
          onDateSelect={handleDateSelect}
          onEventClick={handleEventClick}
          selectable
          editable={false}
        />

        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-sm">Individual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span className="text-sm">Grupal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-indigo-500" />
            <span className="text-sm">Horario Fijo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-sm">Bloqueado</span>
          </div>
        </div>
      </div>

      {fechaSeleccionada && (
        <ModalNuevaReserva
          open={modalNuevaOpen}
          onOpenChange={setModalNuevaOpen}
          fechaInicio={fechaSeleccionada.inicio}
          fechaFin={fechaSeleccionada.fin}
          profesorId={profesorId}
          sedeId={sedeId}
          onSuccess={handleReservaSuccess}
        />
      )}

      <ModalDetalleReserva
        open={modalDetalleOpen}
        onOpenChange={setModalDetalleOpen}
        reserva={reservaSeleccionada}
        onSuccess={handleReservaSuccess}
      />

      <FormBloqueo
        open={modalBloqueoOpen}
        onOpenChange={setModalBloqueoOpen}
        profesorId={profesorId}
        onSuccess={handleReservaSuccess}
      />
    </>
  )
}

