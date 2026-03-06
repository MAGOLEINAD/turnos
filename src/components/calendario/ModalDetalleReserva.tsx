'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cancelarReserva } from '@/lib/actions/reservas.actions'
import { ESTADO_RESERVA, TIPO_RESERVA, ESTADO_RESERVA_LABELS, TIPO_RESERVA_LABELS } from '@/lib/constants/estados'
import { formatDateTime, diferenciaEnHoras } from '@/lib/utils/date'
import { CANCELACION_MIN_HORAS } from '@/lib/constants/config'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Users, FileText, AlertCircle } from 'lucide-react'

interface Reserva {
  id: string
  tipo: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  cupo_maximo?: number
  cupo_actual?: number
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
}

interface ModalDetalleReservaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reserva: Reserva | null
  onSuccess?: () => void
}

export function ModalDetalleReserva({
  open,
  onOpenChange,
  reserva,
  onSuccess,
}: ModalDetalleReservaProps) {
  const [loading, setLoading] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')

  if (!reserva) return null

  const horasAnticipacion = diferenciaEnHoras(new Date(reserva.fecha_inicio), new Date())
  const generaraCredito = horasAnticipacion >= CANCELACION_MIN_HORAS
  const puedeCancelar = reserva.estado === ESTADO_RESERVA.CONFIRMADA

  const handleCancelar = async () => {
    setLoading(true)
    try {
      const result = await cancelarReserva({
        reserva_id: reserva.id,
        motivo_cancelacion: motivoCancelacion || undefined,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        if (result.generoCredito) {
          toast.success('Reserva cancelada. Se generó un crédito de recupero.')
        } else {
          toast.info('Reserva cancelada sin crédito (menos de 24hs de anticipación)')
        }
        setShowCancelForm(false)
        setMotivoCancelacion('')
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al cancelar la reserva')
    } finally {
      setLoading(false)
    }
  }

  const getBadgeColor = (estado: string) => {
    switch (estado) {
      case ESTADO_RESERVA.CONFIRMADA:
        return 'bg-green-500/10 text-green-700 hover:bg-green-500/20'
      case ESTADO_RESERVA.CANCELADA:
        return 'bg-red-500/10 text-red-700 hover:bg-red-500/20'
      case ESTADO_RESERVA.COMPLETADA:
        return 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Detalles de la Reserva
            <Badge className={getBadgeColor(reserva.estado)}>
              {ESTADO_RESERVA_LABELS[reserva.estado as keyof typeof ESTADO_RESERVA_LABELS]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Información completa de la reserva
          </DialogDescription>
        </DialogHeader>

        {!showCancelForm ? (
          <div className="space-y-4">
            {/* Tipo de reserva */}
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Tipo</p>
                <p className="text-sm text-muted-foreground">
                  {TIPO_RESERVA_LABELS[reserva.tipo as keyof typeof TIPO_RESERVA_LABELS]}
                  {reserva.tipo === TIPO_RESERVA.GRUPAL &&
                    ` (${reserva.cupo_actual || 0}/${reserva.cupo_maximo} alumnos)`}
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(new Date(reserva.fecha_fin)).split(' ')[1]} (fin)
                </p>
              </div>
            </div>

            {/* Profesor */}
            {reserva.profesores && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
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
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Notas</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {reserva.notas}
                  </p>
                </div>
              </div>
            )}

            {/* Alerta de cancelación */}
            {puedeCancelar && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {generaraCredito ? (
                    <span>
                      Si cancelas esta reserva con{' '}
                      <strong>≥{CANCELACION_MIN_HORAS}hs de anticipación</strong>, se generará
                      un crédito recuperable.
                    </span>
                  ) : (
                    <span className="text-orange-600">
                      Al cancelar con <strong>&lt;{CANCELACION_MIN_HORAS}hs</strong> de
                      anticipación no se generará crédito.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              {puedeCancelar && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelForm(true)}
                >
                  Cancelar Reserva
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Formulario de cancelación */
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ¿Estás seguro de que deseas cancelar esta reserva?
                {generaraCredito
                  ? ' Se generará un crédito que podrás usar en una futura reserva.'
                  : ' Esta acción no se puede deshacer y no se generará crédito.'}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo de Cancelación (opcional)</Label>
              <Textarea
                id="motivo"
                placeholder="Escribe el motivo de la cancelación..."
                rows={3}
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCancelForm(false)}
                disabled={loading}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelar}
                disabled={loading}
              >
                {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
