'use client'

import { useState, useEffect } from 'react'
import { CalendarioFullCalendar } from './CalendarioFullCalendar'
import type { EventClickArg } from '@fullcalendar/core'
import { toast } from 'sonner'
import { obtenerReservas } from '@/lib/actions/reservas.actions'
import { reservaToEvent } from '@/lib/utils/calendario'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, User, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils/date'

interface CalendarioPublicoProps {
  sedeId: string
  sedeNombre: string
  mostrarProfesor: boolean
}

export function CalendarioPublico({
  sedeId,
  sedeNombre,
  mostrarProfesor,
}: CalendarioPublicoProps) {
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    cargarEventos()
  }, [sedeId])

  const cargarEventos = async () => {
    setLoading(true)
    try {
      const result = await obtenerReservas(undefined, undefined, undefined)

      if (result.error) {
        toast.error(result.error)
        setEventos([])
      } else if (result.data) {
        // Filtrar solo reservas de esta sede y grupales (públicas)
        const reservasSede = result.data.filter(
          (r: any) => r.sede_id === sedeId && r.tipo === 'grupal'
        )
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
      if (reserva) {
        setReservaSeleccionada(reserva)
      }
    }
  }

  const handleIniciarSesion = () => {
    router.push('/login')
  }

  const cupoDisponible = reservaSeleccionada
    ? reservaSeleccionada.cupo_maximo - reservaSeleccionada.cupo_actual
    : 0

  if (loading) {
    return <div className="text-center py-12">Cargando calendario...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{sedeNombre}</h2>
              <p className="text-muted-foreground mt-1">Clases grupales disponibles</p>
            </div>
            <Button onClick={handleIniciarSesion}>
              <LogIn className="h-4 w-4 mr-2" />
              Iniciar Sesión para Reservar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>Consejo:</strong> Haz clic en una clase para ver los detalles. Debes
          iniciar sesión para reservar.
        </p>
      </div>

      {/* Calendario */}
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

      {/* Detalle de reserva seleccionada */}
      {reservaSeleccionada && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">Detalles de la Clase</h3>
                <Badge variant={cupoDisponible > 0 ? 'default' : 'destructive'}>
                  {cupoDisponible > 0
                    ? `${cupoDisponible} ${cupoDisponible === 1 ? 'lugar' : 'lugares'} disponible${cupoDisponible === 1 ? '' : 's'}`
                    : 'Completo'}
                </Badge>
              </div>

              <div className="grid gap-3">
                {/* Cupo */}
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cupo</p>
                    <p className="text-sm text-muted-foreground">
                      {reservaSeleccionada.cupo_actual} / {reservaSeleccionada.cupo_maximo}{' '}
                      alumnos
                    </p>
                  </div>
                </div>

                {/* Fecha */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Fecha y Hora</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(new Date(reservaSeleccionada.fecha_inicio))}
                    </p>
                  </div>
                </div>

                {/* Profesor (si está configurado para mostrar) */}
                {mostrarProfesor && reservaSeleccionada.profesores && (
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
                )}

                {/* Notas */}
                {reservaSeleccionada.notas && (
                  <div>
                    <p className="text-sm font-medium mb-1">Información</p>
                    <p className="text-sm text-muted-foreground">
                      {reservaSeleccionada.notas}
                    </p>
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleIniciarSesion}>
                <LogIn className="h-4 w-4 mr-2" />
                Iniciar Sesión para Inscribirte
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leyenda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span className="text-sm">Clase Grupal</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
