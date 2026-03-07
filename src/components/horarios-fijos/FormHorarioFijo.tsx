'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearHorarioFijo } from '@/lib/actions/horarios-fijos.actions'
import { obtenerProfesores } from '@/lib/actions/profesores.actions'
import { obtenerAlumnos } from '@/lib/actions/alumnos.actions'
import { horarioFijoSchema, type HorarioFijoInput } from '@/lib/validations/horario-fijo.schema'
import { FRECUENCIA_HORARIO, FRECUENCIA_HORARIO_LABELS, DIA_SEMANA, DIA_SEMANA_LABELS } from '@/lib/constants/estados'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FormHorarioFijoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sedeId: string
  profesorId?: string
  alumnoId?: string
  onSuccess?: () => void
}

export function FormHorarioFijo({
  open,
  onOpenChange,
  sedeId,
  profesorId,
  alumnoId,
  onSuccess,
}: FormHorarioFijoProps) {
  const [loading, setLoading] = useState(false)
  const [profesores, setProfesores] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [frecuencia, setFrecuencia] = useState<string>(FRECUENCIA_HORARIO.SEMANAL_1)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<HorarioFijoInput>({
    resolver: zodResolver(horarioFijoSchema),
    defaultValues: {
      sede_id: sedeId,
      profesor_id: profesorId || '',
      alumno_id: alumnoId || '',
      frecuencia: FRECUENCIA_HORARIO.SEMANAL_1,
      duracion_minutos: 60,
      fecha_inicio_vigencia: new Date().toISOString().split('T')[0],
      activo: true,
    },
  })

  useEffect(() => {
    if (open) {
      cargarProfesoresYAlumnos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const cargarProfesoresYAlumnos = async () => {
    try {
      const [profResult, alumResult] = await Promise.all([
        obtenerProfesores(sedeId),
        obtenerAlumnos(sedeId),
      ])

      if (profResult.data) setProfesores(profResult.data)
      if (alumResult.data) setAlumnos(alumResult.data)
    } catch (error) {
      toast.error('Error al cargar datos')
    }
  }

  const onSubmit = async (data: HorarioFijoInput) => {
    setLoading(true)
    try {
      const result = await crearHorarioFijo(data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Horario fijo creado exitosamente')
        reset()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al crear el horario fijo')
    } finally {
      setLoading(false)
    }
  }

  const handleFrecuenciaChange = (value: string) => {
    setFrecuencia(value)
    setValue('frecuencia', value as any)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Horario Fijo</DialogTitle>
          <DialogDescription>
            Crea un horario recurrente para un alumno
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Profesor */}
          {!profesorId && (
            <div className="space-y-2">
              <Label htmlFor="profesor_id">Profesor *</Label>
              <Select
                onValueChange={(value) => setValue('profesor_id', value)}
                defaultValue={watch('profesor_id')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesores.map((profesor) => (
                    <SelectItem key={profesor.id} value={profesor.id}>
                      {profesor.usuarios.nombre} {profesor.usuarios.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.profesor_id && (
                <p className="text-sm text-destructive">{errors.profesor_id.message}</p>
              )}
            </div>
          )}

          {/* Alumno */}
          {!alumnoId && (
            <div className="space-y-2">
              <Label htmlFor="alumno_id">Alumno *</Label>
              <Select
                onValueChange={(value) => setValue('alumno_id', value)}
                defaultValue={watch('alumno_id')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un alumno" />
                </SelectTrigger>
                <SelectContent>
                  {alumnos.map((alumno) => (
                    <SelectItem key={alumno.id} value={alumno.id}>
                      {alumno.usuarios.nombre} {alumno.usuarios.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.alumno_id && (
                <p className="text-sm text-destructive">{errors.alumno_id.message}</p>
              )}
            </div>
          )}

          {/* Frecuencia */}
          <div className="space-y-2">
            <Label htmlFor="frecuencia">Frecuencia *</Label>
            <Select value={frecuencia} onValueChange={handleFrecuenciaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FRECUENCIA_HORARIO.SEMANAL_1}>
                  {FRECUENCIA_HORARIO_LABELS[FRECUENCIA_HORARIO.SEMANAL_1]}
                </SelectItem>
                <SelectItem value={FRECUENCIA_HORARIO.SEMANAL_2}>
                  {FRECUENCIA_HORARIO_LABELS[FRECUENCIA_HORARIO.SEMANAL_2]}
                </SelectItem>
                <SelectItem value={FRECUENCIA_HORARIO.SEMANAL_3}>
                  {FRECUENCIA_HORARIO_LABELS[FRECUENCIA_HORARIO.SEMANAL_3]}
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.frecuencia && (
              <p className="text-sm text-destructive">{errors.frecuencia.message}</p>
            )}
          </div>

          {/* Día 1 */}
          <div className="space-y-2">
            <Label htmlFor="dia_semana_1">Día de la Semana *</Label>
            <Select
              onValueChange={(value) => setValue('dia_semana_1', value as any)}
              defaultValue={watch('dia_semana_1')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el día" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DIA_SEMANA_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={DIA_SEMANA[key as keyof typeof DIA_SEMANA]}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dia_semana_1 && (
              <p className="text-sm text-destructive">{errors.dia_semana_1.message}</p>
            )}
          </div>

          {/* Día 2 (solo si frecuencia >= 2) */}
          {(frecuencia === FRECUENCIA_HORARIO.SEMANAL_2 || frecuencia === FRECUENCIA_HORARIO.SEMANAL_3) && (
            <div className="space-y-2">
              <Label htmlFor="dia_semana_2">Segundo Día de la Semana *</Label>
              <Select
                onValueChange={(value) => setValue('dia_semana_2', value as any)}
                defaultValue={watch('dia_semana_2')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el segundo día" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIA_SEMANA_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={DIA_SEMANA[key as keyof typeof DIA_SEMANA]}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dia_semana_2 && (
                <p className="text-sm text-destructive">{errors.dia_semana_2.message}</p>
              )}
            </div>
          )}

          {/* Día 3 (solo si frecuencia = 3) */}
          {frecuencia === FRECUENCIA_HORARIO.SEMANAL_3 && (
            <div className="space-y-2">
              <Label htmlFor="dia_semana_3">Tercer Día de la Semana *</Label>
              <Select
                onValueChange={(value) => setValue('dia_semana_3', value as any)}
                defaultValue={watch('dia_semana_3')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tercer día" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIA_SEMANA_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={DIA_SEMANA[key as keyof typeof DIA_SEMANA]}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dia_semana_3 && (
                <p className="text-sm text-destructive">{errors.dia_semana_3.message}</p>
              )}
            </div>
          )}

          {/* Hora de Inicio */}
          <div className="space-y-2">
            <Label htmlFor="hora_inicio">Hora de Inicio *</Label>
            <Input
              id="hora_inicio"
              type="time"
              {...register('hora_inicio')}
            />
            {errors.hora_inicio && (
              <p className="text-sm text-destructive">{errors.hora_inicio.message}</p>
            )}
          </div>

          {/* Duración */}
          <div className="space-y-2">
            <Label htmlFor="duracion_minutos">Duración (minutos) *</Label>
            <Input
              id="duracion_minutos"
              type="number"
              min={15}
              max={180}
              step={15}
              {...register('duracion_minutos', { valueAsNumber: true })}
            />
            {errors.duracion_minutos && (
              <p className="text-sm text-destructive">{errors.duracion_minutos.message}</p>
            )}
          </div>

          {/* Fecha de Inicio de Vigencia */}
          <div className="space-y-2">
            <Label htmlFor="fecha_inicio_vigencia">Inicio de Vigencia *</Label>
            <Input
              id="fecha_inicio_vigencia"
              type="date"
              {...register('fecha_inicio_vigencia')}
            />
            {errors.fecha_inicio_vigencia && (
              <p className="text-sm text-destructive">{errors.fecha_inicio_vigencia.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Desde qué fecha se aplica este horario fijo
            </p>
          </div>

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
              {loading ? 'Creando...' : 'Crear Horario Fijo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
