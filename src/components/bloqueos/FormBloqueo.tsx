'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearBloqueo } from '@/lib/actions/bloqueos.actions'
import { bloqueoSchema, type BloqueoInput } from '@/lib/validations/bloqueo.schema'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface FormBloqueoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesorId: string
  fechaInicio?: Date
  fechaFin?: Date
  onSuccess?: () => void
}

export function FormBloqueo({
  open,
  onOpenChange,
  profesorId,
  fechaInicio,
  fechaFin,
  onSuccess,
}: FormBloqueoProps) {
  const [loading, setLoading] = useState(false)
  const [esRecurrente, setEsRecurrente] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BloqueoInput>({
    resolver: zodResolver(bloqueoSchema),
    defaultValues: {
      profesor_id: profesorId,
      fecha_inicio: fechaInicio
        ? fechaInicio.toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      fecha_fin: fechaFin
        ? fechaFin.toISOString().slice(0, 16)
        : new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      es_recurrente: false,
    },
  })

  const onSubmit = async (data: BloqueoInput) => {
    setLoading(true)
    try {
      const result = await crearBloqueo(data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Bloqueo creado exitosamente')
        reset()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al crear el bloqueo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bloquear Disponibilidad</DialogTitle>
          <DialogDescription>
            Marca períodos en los que no estarás disponible para clases
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Fecha y Hora de Inicio */}
          <div className="space-y-2">
            <Label htmlFor="fecha_inicio">Fecha y Hora de Inicio *</Label>
            <Input
              id="fecha_inicio"
              type="datetime-local"
              {...register('fecha_inicio')}
            />
            {errors.fecha_inicio && (
              <p className="text-sm text-destructive">{errors.fecha_inicio.message}</p>
            )}
          </div>

          {/* Fecha y Hora de Fin */}
          <div className="space-y-2">
            <Label htmlFor="fecha_fin">Fecha y Hora de Fin *</Label>
            <Input id="fecha_fin" type="datetime-local" {...register('fecha_fin')} />
            {errors.fecha_fin && (
              <p className="text-sm text-destructive">{errors.fecha_fin.message}</p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              placeholder="Ej: Vacaciones, Enfermedad, Evento personal..."
              rows={3}
              {...register('motivo')}
            />
            {errors.motivo && (
              <p className="text-sm text-destructive">{errors.motivo.message}</p>
            )}
          </div>

          {/* Recurrente */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="es_recurrente" className="text-base">
                Bloqueo Recurrente
              </Label>
              <p className="text-sm text-muted-foreground">
                Se repetirá semanalmente hasta una fecha específica
              </p>
            </div>
            <Switch
              id="es_recurrente"
              checked={esRecurrente}
              onCheckedChange={(checked) => {
                setEsRecurrente(checked)
                setValue('es_recurrente', checked)
              }}
            />
          </div>

          {/* Fecha Fin de Recurrencia */}
          {esRecurrente && (
            <div className="space-y-2">
              <Label htmlFor="fecha_fin_recurrencia">Repetir Hasta *</Label>
              <Input
                id="fecha_fin_recurrencia"
                type="date"
                {...register('fecha_fin_recurrencia')}
              />
              {errors.fecha_fin_recurrencia && (
                <p className="text-sm text-destructive">
                  {errors.fecha_fin_recurrencia.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Este bloqueo se repetirá cada semana en el mismo día y horario hasta esta fecha
              </p>
            </div>
          )}

          {/* Alerta */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Durante este período no podrás recibir reservas. Las reservas existentes no se
              verán afectadas.
            </AlertDescription>
          </Alert>

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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Bloqueo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
