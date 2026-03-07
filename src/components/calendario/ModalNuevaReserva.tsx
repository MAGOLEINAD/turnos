'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearReserva } from '@/lib/actions/reservas.actions'
import { obtenerCreditosAlumno } from '@/lib/actions/alumnos.actions'
import { reservaSchema, type ReservaInput } from '@/lib/validations/reserva.schema'
import { TIPO_RESERVA } from '@/lib/constants/estados'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatDate } from '@/lib/utils/date'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface ModalNuevaReservaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fechaInicio: Date
  fechaFin: Date
  profesorId: string
  sedeId: string
  alumnoId?: string
  onSuccess?: () => void
}

export function ModalNuevaReserva({
  open,
  onOpenChange,
  fechaInicio,
  fechaFin,
  profesorId,
  sedeId,
  alumnoId,
  onSuccess,
}: ModalNuevaReservaProps) {
  const [loading, setLoading] = useState(false)
  const [tipoReserva, setTipoReserva] = useState<string>(TIPO_RESERVA.INDIVIDUAL)
  const [creditos, setCreditos] = useState<any[]>([])
  const [usarCredito, setUsarCredito] = useState(false)
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ReservaInput>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      sede_id: sedeId,
      profesor_id: profesorId,
      tipo: TIPO_RESERVA.INDIVIDUAL,
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
    },
  })

  const cargarCreditos = useCallback(async () => {
    if (!alumnoId) return

    try {
      const result = await obtenerCreditosAlumno(alumnoId, sedeId)
      if (result.data) {
        setCreditos(result.data)
        if (result.data.length > 0) {
          setCreditoSeleccionado(result.data[0].id)
        }
      }
    } catch (error) {
      console.error('Error al cargar créditos:', error)
    }
  }, [alumnoId, sedeId])

  useEffect(() => {
    if (open && alumnoId) {
      cargarCreditos()
    }
  }, [open, alumnoId, cargarCreditos])

  const onSubmit = async (data: ReservaInput) => {
    setLoading(true)
    try {
      const result = await crearReserva({
        ...data,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        usar_credito: usarCredito,
        credito_id: usarCredito ? creditoSeleccionado : undefined,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        const mensaje = result.creditoUsado
          ? 'Reserva creada exitosamente usando crédito'
          : 'Reserva creada exitosamente'
        toast.success(mensaje)
        reset()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  const handleTipoChange = (value: string) => {
    setTipoReserva(value)
    setValue('tipo', value as any)
    if (value === TIPO_RESERVA.INDIVIDUAL) {
      setValue('cupo_maximo', undefined)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva Reserva</DialogTitle>
          <DialogDescription>
            Configura los datos de la reserva para el horario seleccionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Información de fecha/hora */}
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm font-medium">Horario seleccionado</p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(fechaInicio)} - {formatDateTime(fechaFin).split(' ')[1]}
            </p>
          </div>

          {/* Tipo de reserva */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Reserva</Label>
            <Select value={tipoReserva} onValueChange={handleTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPO_RESERVA.INDIVIDUAL}>Individual</SelectItem>
                <SelectItem value={TIPO_RESERVA.GRUPAL}>Grupal</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-destructive">{errors.tipo.message}</p>
            )}
          </div>

          {/* Cupo máximo (solo para grupales) */}
          {tipoReserva === TIPO_RESERVA.GRUPAL && (
            <div className="space-y-2">
              <Label htmlFor="cupo_maximo">Cupo Máximo de Alumnos</Label>
              <Input
                id="cupo_maximo"
                type="number"
                min={2}
                max={20}
                defaultValue={4}
                {...register('cupo_maximo', { valueAsNumber: true })}
              />
              {errors.cupo_maximo && (
                <p className="text-sm text-destructive">{errors.cupo_maximo.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Los alumnos podrán inscribirse a esta clase grupal
              </p>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Información adicional sobre la reserva..."
              rows={3}
              {...register('notas')}
            />
            {errors.notas && (
              <p className="text-sm text-destructive">{errors.notas.message}</p>
            )}
          </div>

          {/* Créditos Disponibles (solo si es alumno) */}
          {alumnoId && creditos.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="usar_credito" className="text-base">
                    Usar Crédito de Recupero
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Tienes {creditos.length} {creditos.length === 1 ? 'crédito disponible' : 'créditos disponibles'}
                  </p>
                </div>
                <Switch
                  id="usar_credito"
                  checked={usarCredito}
                  onCheckedChange={setUsarCredito}
                />
              </div>

              {usarCredito && (
                <div className="space-y-2">
                  <Label htmlFor="credito_seleccionado">Selecciona un Crédito</Label>
                  <Select value={creditoSeleccionado} onValueChange={setCreditoSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un crédito" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditos.map((credito) => (
                        <SelectItem key={credito.id} value={credito.id}>
                          Crédito del {formatDate(new Date(credito.fecha_generacion))} -
                          Expira {formatDate(new Date(credito.fecha_expiracion))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-300">
                      Esta reserva será gratis usando tu crédito de recupero
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          {/* Mensaje si no hay créditos */}
          {alumnoId && creditos.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No tienes créditos disponibles. Los créditos se generan al cancelar con anticipación.
              </AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={usarCredito ? 'Reservando con credito...' : 'Creando reserva...'}
            >
              {usarCredito ? 'Reservar con credito' : 'Crear reserva'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

