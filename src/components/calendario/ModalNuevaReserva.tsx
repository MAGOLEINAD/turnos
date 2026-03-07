'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearReserva } from '@/lib/actions/reservas.actions'
import { crearCheckoutProReserva } from '@/lib/actions/pagos.actions'
import { crearHorarioFijo } from '@/lib/actions/horarios-fijos.actions'
import { useActividadesProfesor } from '@/hooks/useActividades'
import { useCreditosAlumno } from '@/hooks/useAlumnos'
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
import { DIA_SEMANA, FRECUENCIA_HORARIO } from '@/lib/constants/estados'

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

type ModoPrimeraClase = 'descontar_senia' | 'cuota_completa'

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
  const [usarCredito, setUsarCredito] = useState(false)
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<string>('')
  const [actividadSeleccionada, setActividadSeleccionada] = useState<string>('')
  const [esClasePrueba, setEsClasePrueba] = useState(false)
  const [modoPrimeraClase, setModoPrimeraClase] = useState<ModoPrimeraClase>('descontar_senia')
  const [pagoRegistrado, setPagoRegistrado] = useState(!alumnoId)
  const [origenPagoManual, setOrigenPagoManual] = useState<
    'transferencia' | 'efectivo' | 'manual_override'
  >('manual_override')
  const [montoPagoManual, setMontoPagoManual] = useState<number>(0)
  const [referenciaPagoManual, setReferenciaPagoManual] = useState('')
  const [creandoCheckout, setCreandoCheckout] = useState(false)
  const [crearComoRecurrente, setCrearComoRecurrente] = useState(false)

  const actividadesQuery = useActividadesProfesor(profesorId, sedeId)
  const creditosQuery = useCreditosAlumno(alumnoId || '', sedeId)
  const actividades = useMemo(
    () => (actividadesQuery.data ? actividadesQuery.data : []),
    [actividadesQuery.data]
  )
  const creditos = useMemo(
    () => (creditosQuery.data ? creditosQuery.data : []),
    [creditosQuery.data]
  )

  const actividadActual = useMemo(
    () => actividades.find((a: any) => a.id === actividadSeleccionada) || actividades[0],
    [actividades, actividadSeleccionada]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
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

  const cupoPorDefecto = actividadActual?.cupo_maximo || 1
  const actividadIdFinal = actividadSeleccionada || actividadActual?.id

  const onSubmit = async (form: ReservaInput) => {
    setLoading(true)
    try {
      if (!actividadIdFinal || !actividadActual) {
        toast.error('Selecciona una actividad.')
        return
      }

      if (crearComoRecurrente) {
        if (!alumnoId) {
          toast.error('La recurrencia requiere alumno.')
          return
        }

        const diaMap = [
          DIA_SEMANA.DOMINGO,
          DIA_SEMANA.LUNES,
          DIA_SEMANA.MARTES,
          DIA_SEMANA.MIERCOLES,
          DIA_SEMANA.JUEVES,
          DIA_SEMANA.VIERNES,
          DIA_SEMANA.SABADO,
        ] as const

        const diaSemana = diaMap[fechaInicio.getDay()]
        const horaInicio = `${String(fechaInicio.getHours()).padStart(2, '0')}:${String(
          fechaInicio.getMinutes()
        ).padStart(2, '0')}`

        const horarioResult = await crearHorarioFijo({
          sede_id: sedeId,
          profesor_id: profesorId,
          alumno_id: alumnoId,
          frecuencia: FRECUENCIA_HORARIO.SEMANAL_1,
          dia_semana_1: diaSemana,
          hora_inicio: horaInicio,
          duracion_minutos: actividadActual.duracion_minutos,
          fecha_inicio_vigencia: fechaInicio.toISOString().slice(0, 10),
          activo: true,
        })

        if ((horarioResult as any).error) {
          toast.error((horarioResult as any).error)
          return
        }

        toast.success('Horario recurrente creado')
        reset()
        onOpenChange(false)
        onSuccess?.()
        return
      }

      const result = await crearReserva({
        ...form,
        sede_id: sedeId,
        profesor_id: profesorId,
        alumno_id: alumnoId,
        actividad_id: actividadIdFinal,
        tipo: cupoPorDefecto > 1 ? 'grupal' : 'individual',
        cupo_maximo: cupoPorDefecto,
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

      toast.success(usarCredito ? 'Reserva creada con crédito' : 'Reserva creada')
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error('Error al crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerarCheckout = async () => {
    if (!alumnoId || !actividadActual || !actividadIdFinal) {
      toast.error('Selecciona una actividad válida.')
      return
    }

    setCreandoCheckout(true)
    try {
      const montoPrimera =
        modoPrimeraClase === 'cuota_completa' ? actividadActual.precio_clase : actividadActual.senia_prueba
      const monto = esClasePrueba ? montoPrimera : actividadActual.precio_clase
      const fechaLimiteRegularizacion = esClasePrueba
        ? new Date(
            Date.UTC(fechaInicio.getUTCFullYear(), fechaInicio.getUTCMonth(), fechaInicio.getUTCDate() - 1)
          )
            .toISOString()
            .slice(0, 10)
        : null

      const result = await crearCheckoutProReserva({
        alumnoId,
        sedeId,
        titulo: esClasePrueba
          ? `Primera clase - ${actividadActual.nombre}`
          : `Reserva actividad - ${actividadActual.nombre}`,
        descripcion: `${formatDateTime(fechaInicio)} - ${formatDateTime(fechaFin)}`,
        monto,
        esSenia: esClasePrueba,
        metadata: {
          tipo_pago: 'reserva_clase',
          profesor_id: profesorId,
          actividad_id: actividadIdFinal,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          es_senia: esClasePrueba,
          cupo_maximo: cupoPorDefecto,
          fecha_limite_regularizacion: fechaLimiteRegularizacion,
          modo_regularizacion_primera_clase: modoPrimeraClase,
        },
      })

      if (result.error || !result.data?.initPoint) {
        toast.error(result.error || 'No se pudo iniciar Checkout Pro')
        return
      }

      window.open(result.data.initPoint, '_blank', 'noopener,noreferrer')
      toast.success('Checkout generado. Completa el pago para confirmar.')
    } catch {
      toast.error('No se pudo generar checkout')
    } finally {
      setCreandoCheckout(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nueva Reserva</DialogTitle>
          <DialogDescription>Selecciona actividad y confirma pago.</DialogDescription>
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
            <Select value={actividadIdFinal || ''} onValueChange={setActividadSeleccionada}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona actividad" />
              </SelectTrigger>
              <SelectContent>
                {actividades.map((actividad: any) => (
                  <SelectItem key={actividad.id} value={actividad.id}>
                    {actividad.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {alumnoId ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="crear_como_recurrente" className="text-base">
                  Crear como recurrente semanal
                </Label>
                <p className="text-sm text-muted-foreground">
                  Si activas esto se genera horario fijo (sin clase extra).
                </p>
              </div>
              <Switch
                id="crear_como_recurrente"
                checked={crearComoRecurrente}
                onCheckedChange={setCrearComoRecurrente}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea id="notas" rows={3} {...register('notas')} />
            {errors.notas ? <p className="text-sm text-destructive">{errors.notas.message}</p> : null}
          </div>

          {alumnoId && actividadActual?.permite_prueba ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="es_clase_prueba" className="text-base">
                    Primera clase
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Seña: ${actividadActual.senia_prueba}
                  </p>
                </div>
                <Switch id="es_clase_prueba" checked={esClasePrueba} onCheckedChange={setEsClasePrueba} />
              </div>

              {esClasePrueba ? (
                <div className="space-y-2">
                  <Label>Después de la primera clase</Label>
                  <Select
                    value={modoPrimeraClase}
                    onValueChange={(v) => setModoPrimeraClase(v as ModoPrimeraClase)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="descontar_senia">Descontar seña de la cuota</SelectItem>
                      <SelectItem value="cuota_completa">Pagar cuota completa ahora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
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
                  <Label>Selecciona crédito</Label>
                  <Select value={creditoSeleccionado} onValueChange={setCreditoSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un crédito" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditos.map((credito: any) => (
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

          {alumnoId && !usarCredito && !crearComoRecurrente ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pago_registrado">Pago manual registrado</Label>
                  <p className="text-sm text-muted-foreground">
                    También puedes pagar online con Mercado Pago.
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
                    Sin pago registrado no se podrá confirmar manualmente.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>

            {alumnoId && !usarCredito && !crearComoRecurrente ? (
              <LoadingButton
                type="button"
                variant="outline"
                loading={creandoCheckout}
                loadingText="Generando checkout..."
                onClick={handleGenerarCheckout}
              >
                Pagar online (MP)
              </LoadingButton>
            ) : null}

            <LoadingButton type="submit" loading={loading} loadingText="Guardando...">
              {crearComoRecurrente ? 'Crear recurrente' : 'Confirmar clase extra'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
