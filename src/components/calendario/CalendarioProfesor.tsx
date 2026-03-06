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
import { obtenerReservas } from '@/lib/actions/reservas.actions'
import { obtenerHorariosFijos } from '@/lib/actions/horarios-fijos.actions'
import { obtenerBloqueos } from '@/lib/actions/bloqueos.actions'
import { reservaToEvent, horarioFijoToEvent, bloqueoToEvent } from '@/lib/utils/calendario'
import { generarOcurrenciasMultiplesHorariosFijos } from '@/lib/utils/recurrencia'

interface CalendarioProfesorProps {
  usuarioId: string
  profesorId: string
  sedeId: string
}

export function CalendarioProfesor({ usuarioId, profesorId, sedeId }: CalendarioProfesorProps) {
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para modal de nueva reserva
  const [modalNuevaOpen, setModalNuevaOpen] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<{
    inicio: Date
    fin: Date
  } | null>(null)

  // Estado para modal de detalles
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)

  // Estado para modal de bloqueo
  const [modalBloqueoOpen, setModalBloqueoOpen] = useState(false)

  useEffect(() => {
    cargarEventos()
  }, [profesorId])

  const cargarEventos = async () => {
    setLoading(true)
    try {
      // Cargar reservas, horarios fijos y bloqueos en paralelo
      const [reservasResult, horariosResult, bloqueosResult] = await Promise.all([
        obtenerReservas(profesorId),
        obtenerHorariosFijos(profesorId),
        obtenerBloqueos(profesorId),
      ])

      const todosEventos: any[] = []

      // Agregar reservas
      if (reservasResult.data) {
        const eventosReservas = reservasResult.data.map(reservaToEvent)
        todosEventos.push(...eventosReservas)
      }

      // Agregar horarios fijos
      if (horariosResult.data && horariosResult.data.length > 0) {
        // Generar ocurrencias para los próximos 3 meses
        const hoy = new Date()
        const dentroTresMeses = new Date()
        dentroTresMeses.setMonth(dentroTresMeses.getMonth() + 3)

        const ocurrencias = generarOcurrenciasMultiplesHorariosFijos(
          horariosResult.data,
          hoy,
          dentroTresMeses
        )

        // Convertir ocurrencias a eventos
        for (const ocurrencia of ocurrencias) {
          const horarioFijo = horariosResult.data.find(
            (h: any) => h.id === ocurrencia.horarioFijoId
          )
          if (horarioFijo) {
            const evento = horarioFijoToEvent(horarioFijo, ocurrencia.fecha)
            todosEventos.push(evento)
          }
        }
      }

      // Agregar bloqueos
      if (bloqueosResult.data) {
        const eventosBloqueos = bloqueosResult.data.map(bloqueoToEvent)
        todosEventos.push(...eventosBloqueos)
      }

      setEventos(todosEventos)
    } catch (error) {
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

    // Deseleccionar en el calendario
    selectInfo.view.calendar.unselect()
  }

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const reservaId = clickInfo.event.id

    // Buscar la reserva completa
    const result = await obtenerReservas(profesorId)
    if (result.data) {
      const reserva = result.data.find((r: any) => r.id === reservaId)
      if (reserva) {
        setReservaSeleccionada(reserva)
        setModalDetalleOpen(true)
      }
    }
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
          <Button
            variant="outline"
            onClick={() => setModalBloqueoOpen(true)}
          >
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

      {/* Modales */}
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
