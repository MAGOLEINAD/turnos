'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearReserva } from '@/lib/actions/reservas.actions'
import { obtenerCreditosAlumno } from '@/lib/actions/alumnos.actions'
import {
  obtenerActividadesDisponiblesProfesor,
  type ActividadDisponibleProfesor,
} from '@/lib/actions/actividades.actions'
import { reservaSchema, type ReservaInput } from '@/lib/validations/reserva.schema'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  const [creditos, setCreditos] = useState<any[]>([])
  const [usarCredito, setUsarCredito] = useState(false)
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<string>('')
  const [actividades, setActividades] = useState<ActividadDisponibleProfesor[]>([])
  const [actividadSeleccionada, setActividadSeleccionada] = useState<string>('')
  const [esClasePrueba, setEsClasePrueba] = useState(false)
  const [pagoRegistrado, setPagoRegistrado] = useState(!alumnoId)
  const [origenPagoManual, setOrigenPagoManual] = useState<
    'transferencia' | 'efectivo' | 'manual_override'
  >('manual_override')
  const [montoPagoManual, setMontoPagoManual] = useState<number>(0)
  const [referenciaPagoManual, setReferenciaPagoManual] = useState('')

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
      alumno_id: alumnoId,
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
      pago_registrado: !alumnoId,
    },
  })

  const actividadActual = actividades.find((a) => a.id === actividadSeleccionada)

  const cargarActividades = useCallback(async () => {
    const result = await obtenerActividadesDisponiblesProfesor(profesorId, sedeId)
    if (result.error) {
      toast.error(result.error)
      setActividades([])
      return
    }
    const data = result.data || []
    setActividades(data)
    if (data.length > 0) {
      setActividadSeleccionada(data[0].id)
      setValue('actividad_id', data[0].id)
      setMontoPagoManual(data[0].precio_clase)
    }
  }, [profesorId, sedeId, setValue])

  const cargarCreditos = useCallback(async () => {
    if (!alumnoId) return
    const result = await obtenerCreditosAlumno(alumnoId, sedeId)
    if (result.data) {
      setCreditos(result.data)
      if (result.data.length > 0) setCreditoSeleccionado(result.data[0].id)
    }
  }, [alumnoId, sedeId])

  useEffect(() => {
    if (!open) return
    cargarActividades()
    if (alumnoId) cargarCreditos()
  }, [open, alumnoId, cargarActividades, cargarCreditos])

  useEffect(() => {
    if (!actividadActual) return
    setMontoPagoManual(actividadActual.precio_clase)
    setValue('cupo_maximo', actividadActual.cupo_maximo)
  }, [actividadActual, setValue])

  const onSubmit = async (form: ReservaInput) => {
    setLoading(true)
    try {
      const result = await crearReserva({
        ...form,
        sede_id: sedeId,
        profesor_id: profesorId,
        alumno_id: alumnoId,
        actividad_id: actividadSeleccionada,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        es_clase_prueba: esClasePrueba,
        pago_registrado: pagoRegistrado || !alumnoId,
        usar_credito: usarCredito,
        credito_id: usarCredito ? creditoSeleccionado : undefined,
        origen_pago_manual: pagoRegistrado ? origenPagoManual : undefined,
        monto_pago_manual: pagoRegistrado ? montoPagoManual : undefined,
        referencia_pago_manual: pagoRegistrado ? referenciaPagoManual : undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(usarCredito ? 'Reserva creada con crédito' : 'Reserva creada exitosamente')
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error('Error al crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nueva Reserva</DialogTitle>
          <DialogDescription>Selecciona actividad y confirma el pago para reservar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm font-medium">Horario seleccionado</p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(fechaInicio)} - {formatDateTime(fechaFin).split(' ')[1]}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Actividad *</Label>
            <Select
              value={actividadSeleccionada}
              onValueChange={(value) => {
                setActividadSeleccionada(value)
                setValue('actividad_id', value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona actividad" />
              </SelectTrigger>
              <SelectContent>
                {actividades.map((actividad) => (
                  <SelectItem key={actividad.id} value={actividad.id}>
                    {actividad.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.actividad_id && (
              <p className="text-sm text-destructive">{errors.actividad_id.message}</p>
            )}
          </div>

          {actividadActual ? (
            <div className="grid grid-cols-3 gap-3 rounded-md border p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Duración</p>
                <p className="font-medium">{actividadActual.duracion_minutos} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cupo</p>
                <p className="font-medium">{actividadActual.cupo_maximo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Precio</p>
                <p className="font-medium">${actividadActual.precio_clase}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Información adicional..."
              rows={3}
              {...register('notas')}
            />
            {errors.notas && <p className="text-sm text-destructive">{errors.notas.message}</p>}
          </div>

          {alumnoId && actividadActual?.permite_prueba ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="es_clase_prueba" className="text-base">
                  Primera clase (seña)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Marca esta reserva como prueba paga.
                </p>
              </div>
              <Switch id="es_clase_prueba" checked={esClasePrueba} onCheckedChange={setEsClasePrueba} />
            </div>
          ) : null}

          {alumnoId && creditos.length > 0 ? (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="usar_credito" className="text-base">
                    Usar crédito de recupero
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Tienes {creditos.length} créditos disponibles
                  </p>
                </div>
                <Switch id="usar_credito" checked={usarCredito} onCheckedChange={setUsarCredito} />
              </div>

              {usarCredito ? (
                <div className="space-y-2">
                  <Label>Selecciona un crédito</Label>
                  <Select value={creditoSeleccionado} onValueChange={setCreditoSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un crédito" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditos.map((credito) => (
                        <SelectItem key={credito.id} value={credito.id}>
                          Crédito del {formatDate(new Date(credito.fecha_generacion))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Esta reserva quedará cubierta con crédito.</AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </div>
          ) : null}

          {alumnoId && !usarCredito ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pago_registrado">Pago registrado</Label>
                  <p className="text-sm text-muted-foreground">
                    La reserva se confirma solo con pago registrado.
                  </p>
                </div>
                <Switch id="pago_registrado" checked={pagoRegistrado} onCheckedChange={setPagoRegistrado} />
              </div>

              {pagoRegistrado ? (
                <>
                  <div className="space-y-2">
                    <Label>Medio de pago</Label>
                    <Select
                      value={origenPagoManual}
                      onValueChange={(value) =>
                        setOrigenPagoManual(value as 'transferencia' | 'efectivo' | 'manual_override')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="manual_override">Override manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monto_pago">Monto</Label>
                    <Input
                      id="monto_pago"
                      type="number"
                      min={0}
                      step={0.01}
                      value={montoPagoManual}
                      onChange={(e) => setMontoPagoManual(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referencia_pago">Referencia/comprobante</Label>
                    <Input
                      id="referencia_pago"
                      value={referenciaPagoManual}
                      onChange={(e) => setReferenciaPagoManual(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sin pago registrado no se podrá confirmar esta reserva.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton type="submit" loading={loading} loadingText="Guardando reserva...">
              Confirmar reserva
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
