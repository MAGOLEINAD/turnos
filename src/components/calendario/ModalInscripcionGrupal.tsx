'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { inscribirseReservaGrupal, desinscribirseReservaGrupal } from '@/lib/actions/reservas.actions'
import { formatDateTime } from '@/lib/utils/date'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Users, User, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Reserva {
  id: string
  tipo: string
  fecha_inicio: string
  fecha_fin: string
  cupo_maximo: number
  cupo_actual: number
  notas?: string
  profesores?: {
    id: string
    usuarios: {
      nombre: string
      apellido: string
    }
  }
  sedes?: {
    nombre: string
  }
  participantes_reserva?: Array<{
    id: string
    alumno_id: string
    alumnos?: {
      usuarios: {
        nombre: string
        apellido: string
      }
    }
  }>
}

interface ModalInscripcionGrupalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reserva: Reserva | null
  alumnoId: string
  onSuccess?: () => void
}

export function ModalInscripcionGrupal({
  open,
  onOpenChange,
  reserva,
  alumnoId,
  onSuccess,
}: ModalInscripcionGrupalProps) {
  const [loading, setLoading] = useState(false)

  if (!reserva) return null

  const cupoDisponible = reserva.cupo_maximo - reserva.cupo_actual
  const yaInscrito = reserva.participantes_reserva?.some(
    (p) => p.alumno_id === alumnoId
  )
  const participanteId = reserva.participantes_reserva?.find(
    (p) => p.alumno_id === alumnoId
  )?.id

  const handleInscribirse = async () => {
    setLoading(true)
    try {
      const result = await inscribirseReservaGrupal(reserva.id, alumnoId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Te has inscrito exitosamente a la clase grupal')
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al inscribirse')
    } finally {
      setLoading(false)
    }
  }

  const handleDesinscribirse = async () => {
    if (!participanteId) return

    setLoading(true)
    try {
      const result = await desinscribirseReservaGrupal(participanteId)

      if (result.error) {
        toast.error(result.error)
      } else {
        if (result.generoCredito) {
          toast.success('Te has desinscrito y se generó un crédito de recupero')
        } else {
          toast.info('Te has desinscrito de la clase')
        }
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al desinscribirse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clase Grupal
          </DialogTitle>
          <DialogDescription>
            Información de la clase e inscripción
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cupo */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Cupo</p>
                <p className="text-2xl font-bold">
                  {reserva.cupo_actual} / {reserva.cupo_maximo}
                </p>
              </div>
              <Badge variant={cupoDisponible > 0 ? 'default' : 'destructive'}>
                {cupoDisponible > 0
                  ? `${cupoDisponible} ${cupoDisponible === 1 ? 'lugar disponible' : 'lugares disponibles'}`
                  : 'Completo'}
              </Badge>
            </div>
          </div>

          {/* Fecha y hora */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Fecha y Hora</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(new Date(reserva.fecha_inicio))}
              </p>
            </div>
          </div>

          {/* Profesor */}
          {reserva.profesores && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Profesor</p>
                <p className="text-sm text-muted-foreground">
                  {reserva.profesores.usuarios.nombre} {reserva.profesores.usuarios.apellido}
                </p>
              </div>
            </div>
          )}

          {/* Sede */}
          {reserva.sedes && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Sede</p>
                <p className="text-sm text-muted-foreground">{reserva.sedes.nombre}</p>
              </div>
            </div>
          )}

          {/* Notas */}
          {reserva.notas && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{reserva.notas}</AlertDescription>
            </Alert>
          )}

          {/* Estado de inscripción */}
          {yaInscrito && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                Ya estás inscrito en esta clase
              </AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cerrar
            </Button>

            {yaInscrito ? (
              <Button
                variant="destructive"
                onClick={handleDesinscribirse}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Desinscribirme'}
              </Button>
            ) : (
              <Button
                onClick={handleInscribirse}
                disabled={loading || cupoDisponible === 0}
              >
                {loading ? 'Inscribiendo...' : 'Inscribirme'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
