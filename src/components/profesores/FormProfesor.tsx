'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearProfesor, actualizarProfesor, obtenerUsuariosDisponibles } from '@/lib/actions/profesores.actions'
import { profesorSchema, type ProfesorInput } from '@/lib/validations/profesor.schema'
import { TIPO_AUTORIZACION_PROFESOR, TIPO_AUTORIZACION_PROFESOR_LABELS } from '@/lib/constants/estados'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FormProfesorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesor?: any
  sedeId: string
  onSuccess?: () => void
}

export function FormProfesor({
  open,
  onOpenChange,
  profesor,
  sedeId,
  onSuccess,
}: FormProfesorProps) {
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)

  const isEdit = !!profesor

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProfesorInput>({
    resolver: zodResolver(profesorSchema),
    defaultValues: profesor
      ? {
          usuario_id: profesor.usuario_id,
          sede_id: profesor.sede_id,
          tipo_autorizacion: profesor.tipo_autorizacion,
          especialidad: profesor.especialidad || '',
          biografia: profesor.biografia || '',
          color_calendario: profesor.color_calendario || '#3B82F6',
          activo: profesor.activo ?? true,
        }
      : {
          sede_id: sedeId,
          tipo_autorizacion: TIPO_AUTORIZACION_PROFESOR.AMBAS,
          color_calendario: '#3B82F6',
          activo: true,
        },
  })

  useEffect(() => {
    if (open && !isEdit) {
      cargarUsuariosDisponibles()
    }
  }, [open, isEdit])

  const cargarUsuariosDisponibles = async () => {
    setLoadingUsuarios(true)
    try {
      const result = await obtenerUsuariosDisponibles(sedeId)
      if (result.data) {
        setUsuarios(result.data)
      }
    } catch (error) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const onSubmit = async (data: ProfesorInput) => {
    setLoading(true)
    try {
      let result

      if (isEdit) {
        result = await actualizarProfesor(profesor.id, data)
      } else {
        result = await crearProfesor(data)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Profesor actualizado exitosamente' : 'Profesor creado exitosamente')
        reset()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al guardar el profesor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Profesor' : 'Nuevo Profesor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la configuración y permisos del profesor.'
              : 'Completa los datos para registrar un nuevo profesor en la sede.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Selector de usuario (solo en creación) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="usuario_id">Usuario *</Label>
              {loadingUsuarios ? (
                <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
              ) : usuarios.length === 0 ? (
                <p className="text-sm text-orange-600">
                  No hay usuarios disponibles. Todos los usuarios ya son profesores.
                </p>
              ) : (
                <Select
                  onValueChange={(value) => setValue('usuario_id', value)}
                  defaultValue={watch('usuario_id')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nombre} {usuario.apellido} ({usuario.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.usuario_id && (
                <p className="text-sm text-destructive">{errors.usuario_id.message}</p>
              )}
            </div>
          )}

          {/* Tipo de Autorización */}
          <div className="space-y-2">
            <Label htmlFor="tipo_autorizacion">Tipo de Autorización *</Label>
            <Select
              onValueChange={(value) => setValue('tipo_autorizacion', value as any)}
              defaultValue={watch('tipo_autorizacion')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPO_AUTORIZACION_PROFESOR.SOLO_INDIVIDUAL}>
                  {TIPO_AUTORIZACION_PROFESOR_LABELS[TIPO_AUTORIZACION_PROFESOR.SOLO_INDIVIDUAL]}
                </SelectItem>
                <SelectItem value={TIPO_AUTORIZACION_PROFESOR.SOLO_GRUPAL}>
                  {TIPO_AUTORIZACION_PROFESOR_LABELS[TIPO_AUTORIZACION_PROFESOR.SOLO_GRUPAL]}
                </SelectItem>
                <SelectItem value={TIPO_AUTORIZACION_PROFESOR.AMBAS}>
                  {TIPO_AUTORIZACION_PROFESOR_LABELS[TIPO_AUTORIZACION_PROFESOR.AMBAS]}
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo_autorizacion && (
              <p className="text-sm text-destructive">{errors.tipo_autorizacion.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Determina qué tipo de clases puede dar este profesor
            </p>
          </div>

          {/* Especialidad */}
          <div className="space-y-2">
            <Label htmlFor="especialidad">Especialidad</Label>
            <Input
              id="especialidad"
              placeholder="Ej: Tenis, Pilates, Yoga..."
              {...register('especialidad')}
            />
            {errors.especialidad && (
              <p className="text-sm text-destructive">{errors.especialidad.message}</p>
            )}
          </div>

          {/* Biografía */}
          <div className="space-y-2">
            <Label htmlFor="biografia">Biografía</Label>
            <Textarea
              id="biografia"
              placeholder="Información sobre el profesor, experiencia, certificaciones..."
              rows={4}
              {...register('biografia')}
            />
            {errors.biografia && (
              <p className="text-sm text-destructive">{errors.biografia.message}</p>
            )}
          </div>

          {/* Color de Calendario */}
          <div className="space-y-2">
            <Label htmlFor="color_calendario">Color en Calendario</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="color_calendario"
                type="color"
                className="w-20 h-10"
                {...register('color_calendario')}
              />
              <Input
                type="text"
                placeholder="#3B82F6"
                {...register('color_calendario')}
                className="flex-1"
              />
            </div>
            {errors.color_calendario && (
              <p className="text-sm text-destructive">{errors.color_calendario.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Color que identificará las clases de este profesor en el calendario
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
            <Button type="submit" disabled={loading || (!isEdit && usuarios.length === 0)}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Profesor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
