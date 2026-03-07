'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core'
import { toast } from 'sonner'
import { Ban } from 'lucide-react'
import { useAgendaProfesor, useInvalidarCalendarioProfesor } from '@/hooks/useCalendarioProfesor'
import { bloqueoToEvent, horarioFijoToEvent, reservaToEvent } from '@/lib/utils/calendario'
import { generarOcurrenciasMultiplesHorariosFijos } from '@/lib/utils/recurrencia'
import { CalendarioFullCalendar } from '@/components/calendario/CalendarioFullCalendar'
import { ModalNuevaReserva } from '@/components/calendario/ModalNuevaReserva'
import { ModalDetalleReserva } from '@/components/calendario/ModalDetalleReserva'
import { FormBloqueo } from '@/components/bloqueos/FormBloqueo'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PerfilProfesorAgenda {
  id: string
  sede_id: string
  sede_nombre: string
}

interface CalendarioProfesorAgendaProps {
  perfiles: PerfilProfesorAgenda[]
}

const SEDE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#7C3AED', '#DC2626', '#0891B2', '#4F46E5']

export function CalendarioProfesorAgenda({ perfiles }: CalendarioProfesorAgendaProps) {
  const [modalNuevaOpen, setModalNuevaOpen] = useState(false)
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false)
  const [modalBloqueoOpen, setModalBloqueoOpen] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<{ inicio: Date; fin: Date } | null>(null)

  const [perfilOperativoId, setPerfilOperativoId] = useState<string>(perfiles[0]?.id || '')

  // React Query maneja loading, error y caching automáticamente
  const profesorIds = useMemo(() => perfiles.map((p) => p.id), [perfiles])
  const { data, isLoading, error } = useAgendaProfesor(profesorIds)
  const invalidarCalendario = useInvalidarCalendarioProfesor()

  const perfilesById = useMemo(() => {
    const map = new Map<string, PerfilProfesorAgenda>()
    perfiles.forEach((perfil) => map.set(perfil.id, perfil))
    return map
  }, [perfiles])

  const perfilByProfesorId = useMemo(() => {
    const map = new Map<string, PerfilProfesorAgenda>()
    perfiles.forEach((perfil) => map.set(perfil.id, perfil))
    return map
  }, [perfiles])

  const colorBySede = useMemo(() => {
    const map = new Map<string, string>()
    perfiles.forEach((perfil, index) => {
      map.set(perfil.sede_id, SEDE_COLORS[index % SEDE_COLORS.length])
    })
    return map
  }, [perfiles])

  const perfilOperativo = perfilesById.get(perfilOperativoId) || perfiles[0]

  // Procesar eventos (memoizado)
  const { eventos, reservasById } = useMemo(() => {
    if (!data || perfiles.length === 0) return { eventos: [], reservasById: {} }

    const { reservas, horarios, bloqueos } = data
    const mergedEvents: any[] = []
    const nextReservasById: Record<string, any> = {}

    const hoy = new Date()
    const dentroTresMeses = new Date()
    dentroTresMeses.setMonth(dentroTresMeses.getMonth() + 3)

    // Procesar reservas
    for (const reserva of reservas) {
      nextReservasById[reserva.id] = reserva
      const perfil = perfilByProfesorId.get(reserva.profesor_id)
      const sedeColor = perfil ? colorBySede.get(perfil.sede_id) || '#2563EB' : '#2563EB'
      const sedeTag = perfil ? `[${perfil.sede_nombre}]` : '[Sede]'
      const evento = reservaToEvent(reserva)
      mergedEvents.push({
        ...evento,
        title: `${sedeTag} ${evento.title}`,
        backgroundColor: sedeColor,
        borderColor: sedeColor,
      })
    }

    // Procesar horarios fijos
    const horariosByProfesor = new Map<string, any[]>()
    for (const horario of horarios) {
      const lista = horariosByProfesor.get(horario.profesor_id) || []
      lista.push(horario)
      horariosByProfesor.set(horario.profesor_id, lista)
    }

      for (const [profesorId, horariosProfesor] of horariosByProfesor.entries()) {
      const perfil = perfilByProfesorId.get(profesorId)
      const sedeColor = perfil ? colorBySede.get(perfil.sede_id) || '#2563EB' : '#2563EB'
      const sedeTag = perfil ? `[${perfil.sede_nombre}]` : '[Sede]'

      const ocurrencias = generarOcurrenciasMultiplesHorariosFijos(horariosProfesor, hoy, dentroTresMeses)
      for (const ocurrencia of ocurrencias) {
        const horario = horariosProfesor.find((h: any) => h.id === ocurrencia.horarioFijoId)
        if (!horario) continue
          const evento = horarioFijoToEvent(
            horario,
            ocurrencia.fecha,
            (ocurrencia as any).estadoCuota
          )
          mergedEvents.push({
            ...evento,
            title: `${sedeTag} ${evento.title}`,
            backgroundColor:
              (ocurrencia as any).estadoCuota === 'pendiente' ? '#9CA3AF' : sedeColor,
            borderColor: (ocurrencia as any).estadoCuota === 'pendiente' ? '#6B7280' : sedeColor,
            start: evento.start instanceof Date ? evento.start.toISOString() : evento.start,
            end: evento.end instanceof Date ? evento.end.toISOString() : evento.end,
          })
        }
      }

    // Procesar bloqueos
    for (const bloqueo of bloqueos) {
      const perfil = perfilByProfesorId.get(bloqueo.profesor_id)
      const sedeColor = perfil ? colorBySede.get(perfil.sede_id) || '#2563EB' : '#2563EB'
      const sedeTag = perfil ? `[${perfil.sede_nombre}]` : '[Sede]'
      const evento = bloqueoToEvent(bloqueo)
      mergedEvents.push({
        ...evento,
        title: `${sedeTag} ${evento.title}`,
        backgroundColor: `${sedeColor}33`,
        borderColor: sedeColor,
      })
    }

    return { eventos: mergedEvents, reservasById: nextReservasById }
  }, [data, perfiles, perfilByProfesorId, colorBySede])

  // Mostrar error si existe
  useEffect(() => {
    if (error) {
      toast.error('No se pudo cargar la agenda unificada.')
    }
  }, [error])

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (!perfilOperativo) {
      toast.error('Selecciona una sede para crear la reserva.')
      return
    }

    setFechaSeleccionada({
      inicio: new Date(selectInfo.start),
      fin: new Date(selectInfo.end),
    })
    setModalNuevaOpen(true)
    selectInfo.view.calendar.unselect()
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const reservaId = clickInfo.event.extendedProps?.reserva?.id || clickInfo.event.id
    const reserva = reservasById[reservaId]
    if (!reserva) return
    setReservaSeleccionada(reserva)
    setModalDetalleOpen(true)
  }

  const handleSuccess = () => {
    // React Query invalida y refresca automáticamente
    invalidarCalendario()
  }

  if (isLoading) {
    return <div className="py-12 text-center">Cargando agenda...</div>
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <Label htmlFor="perfil-operativo">Crear reservas/bloqueos en sede</Label>
            <Select value={perfilOperativoId} onValueChange={setPerfilOperativoId}>
              <SelectTrigger id="perfil-operativo" className="mt-1">
                <SelectValue placeholder="Selecciona sede operativa" />
              </SelectTrigger>
              <SelectContent>
                {perfiles.map((perfil) => (
                  <SelectItem key={perfil.id} value={perfil.id}>
                    {perfil.sede_nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => setModalBloqueoOpen(true)} disabled={!perfilOperativo}>
            <Ban className="mr-2 h-4 w-4" />
            Bloquear disponibilidad
          </Button>
        </div>

        <CalendarioFullCalendar
          eventos={eventos}
          onDateSelect={handleDateSelect}
          onEventClick={handleEventClick}
          selectable
          editable={false}
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {perfiles.map((perfil) => (
            <div key={perfil.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: colorBySede.get(perfil.sede_id) || '#2563EB' }}
              />
              <span>{perfil.sede_nombre}</span>
            </div>
          ))}
        </div>
      </div>

      {fechaSeleccionada && perfilOperativo && (
        <ModalNuevaReserva
          open={modalNuevaOpen}
          onOpenChange={setModalNuevaOpen}
          fechaInicio={fechaSeleccionada.inicio}
          fechaFin={fechaSeleccionada.fin}
          profesorId={perfilOperativo.id}
          sedeId={perfilOperativo.sede_id}
          onSuccess={handleSuccess}
        />
      )}

      <ModalDetalleReserva
        open={modalDetalleOpen}
        onOpenChange={setModalDetalleOpen}
        reserva={reservaSeleccionada}
        onSuccess={handleSuccess}
      />

      {perfilOperativo && (
        <FormBloqueo
          open={modalBloqueoOpen}
          onOpenChange={setModalBloqueoOpen}
          profesorId={perfilOperativo.id}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
