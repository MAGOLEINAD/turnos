'use client'

import { useState, useMemo, useEffect } from 'react'
import { CalendarioFullCalendar } from './CalendarioFullCalendar'
import type { EventClickArg } from '@fullcalendar/core'
import { toast } from 'sonner'
import { useReservas } from '@/hooks/useReservas'
import { reservaToEvent } from '@/lib/utils/calendario'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, User, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils/date'

interface CalendarioPublicoProps {
  sedeId: string
  sedeSlug: string
  sedeNombre: string
  mostrarProfesor: boolean
}

export function CalendarioPublico({
  sedeId,
  sedeSlug,
  sedeNombre,
  mostrarProfesor,
}: CalendarioPublicoProps) {
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)
  const router = useRouter()

  // React Query maneja loading, error y caching automáticamente
  const { data: reservas = [], isLoading, error } = useReservas(sedeId)

  // Convertir reservas a eventos (memoizado)
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
    if (reserva) setReservaSeleccionada(reserva)
  }

  const handleIniciarSesion = () => {
    router.push(`/login?publicSedeSlug=${encodeURIComponent(sedeSlug)}`)
  }

  const cupoDisponible = reservaSeleccionada
    ? (reservaSeleccionada.cupo_maximo || 1) - (reservaSeleccionada.cupo_actual || 0)
    : 0

  if (isLoading) return <div className="text-center py-12">Cargando calendario...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{sedeNombre}</h2>
              <p className="text-muted-foreground mt-1">Actividades disponibles</p>
            </div>
            <Button onClick={handleIniciarSesion}>
              <LogIn className="h-4 w-4 mr-2" />
              Iniciar sesión para reservar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Haz clic en una actividad para ver detalles. Debes iniciar sesión para reservar.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CalendarioFullCalendar
            eventos={eventos}
            onEventClick={handleEventClick}
            selectable={false}
            editable={false}
          />
        </CardContent>
      </Card>

      {reservaSeleccionada ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">Detalle de actividad</h3>
                <Badge variant={cupoDisponible > 0 ? 'default' : 'destructive'}>
                  {cupoDisponible > 0
                    ? `${cupoDisponible} ${cupoDisponible === 1 ? 'lugar disponible' : 'lugares disponibles'}`
                    : 'Completo'}
                </Badge>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cupo</p>
                    <p className="text-sm text-muted-foreground">
                      {reservaSeleccionada.cupo_actual || 0} / {reservaSeleccionada.cupo_maximo || 1}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Fecha y hora</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(new Date(reservaSeleccionada.fecha_inicio))}
                    </p>
                  </div>
                </div>

                {mostrarProfesor && reservaSeleccionada.profesores ? (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Profesor</p>
                      <p className="text-sm text-muted-foreground">
                        {reservaSeleccionada.profesores.usuarios.nombre}{' '}
                        {reservaSeleccionada.profesores.usuarios.apellido}
                      </p>
                    </div>
                  </div>
                ) : null}

                {reservaSeleccionada.notas ? (
                  <div>
                    <p className="text-sm font-medium mb-1">Información</p>
                    <p className="text-sm text-muted-foreground">{reservaSeleccionada.notas}</p>
                  </div>
                ) : null}
              </div>

              <Button className="w-full" onClick={handleIniciarSesion}>
                <LogIn className="h-4 w-4 mr-2" />
                Iniciar sesión para reservar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
