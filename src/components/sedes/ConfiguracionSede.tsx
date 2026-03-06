'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { actualizarConfiguracionSede } from '@/lib/actions/configuracion-sede.actions'
import { configuracionSedeSchema, type ConfiguracionSedeInput } from '@/lib/validations/configuracion-sede.schema'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Clock, Users, Eye, Globe } from 'lucide-react'

interface ConfiguracionSedeProps {
  sedeId: string
  configuracion: any
}

export function ConfiguracionSede({ sedeId, configuracion }: ConfiguracionSedeProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ConfiguracionSedeInput>({
    resolver: zodResolver(configuracionSedeSchema),
    defaultValues: {
      horario_inicio: configuracion.horario_inicio || '08:00',
      horario_fin: configuracion.horario_fin || '18:00',
      duracion_clase: configuracion.duracion_clase || 60,
      cupo_grupal_maximo: configuracion.cupo_grupal_maximo || 4,
      mostrar_profesor_publico: configuracion.mostrar_profesor_publico ?? true,
      permitir_reservas_online: configuracion.permitir_reservas_online ?? true,
    },
  })

  const onSubmit = async (data: ConfiguracionSedeInput) => {
    setLoading(true)
    try {
      const result = await actualizarConfiguracionSede(sedeId, data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Configuración actualizada exitosamente')
      }
    } catch (error) {
      toast.error('Error al actualizar la configuración')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de la Sede</CardTitle>
        <CardDescription>
          Ajusta los parámetros de funcionamiento de tu sede
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Horarios */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-medium">Horario Laboral</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horario_inicio">Hora de Inicio</Label>
                <Input
                  id="horario_inicio"
                  type="time"
                  {...register('horario_inicio')}
                />
                {errors.horario_inicio && (
                  <p className="text-sm text-destructive">{errors.horario_inicio.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="horario_fin">Hora de Fin</Label>
                <Input
                  id="horario_fin"
                  type="time"
                  {...register('horario_fin')}
                />
                {errors.horario_fin && (
                  <p className="text-sm text-destructive">{errors.horario_fin.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracion_clase">Duración de Clases (minutos)</Label>
              <Input
                id="duracion_clase"
                type="number"
                min={15}
                max={180}
                step={15}
                {...register('duracion_clase', { valueAsNumber: true })}
              />
              {errors.duracion_clase && (
                <p className="text-sm text-destructive">{errors.duracion_clase.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Define la duración estándar de las clases (15, 30, 45, 60, 90, 120 minutos)
              </p>
            </div>
          </div>

          {/* Capacidad */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-medium">Capacidad</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cupo_grupal_maximo">Cupo Máximo para Clases Grupales</Label>
              <Input
                id="cupo_grupal_maximo"
                type="number"
                min={2}
                max={50}
                {...register('cupo_grupal_maximo', { valueAsNumber: true })}
              />
              {errors.cupo_grupal_maximo && (
                <p className="text-sm text-destructive">{errors.cupo_grupal_maximo.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Número máximo de alumnos por clase grupal
              </p>
            </div>
          </div>

          {/* Configuración Pública */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-medium">Calendario Público</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mostrar_profesor_publico" className="text-base">
                    Mostrar Nombre del Profesor
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Los usuarios verán el nombre del profesor en el calendario público
                  </p>
                </div>
                <Switch
                  id="mostrar_profesor_publico"
                  checked={watch('mostrar_profesor_publico')}
                  onCheckedChange={(checked) => setValue('mostrar_profesor_publico', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="permitir_reservas_online" className="text-base">
                    Permitir Reservas Online
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Los alumnos pueden reservar clases desde el calendario público
                  </p>
                </div>
                <Switch
                  id="permitir_reservas_online"
                  checked={watch('permitir_reservas_online')}
                  onCheckedChange={(checked) => setValue('permitir_reservas_online', checked)}
                />
              </div>
            </div>
          </div>

          {/* Botón de guardar */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
