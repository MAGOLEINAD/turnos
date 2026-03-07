'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  crearProfesor,
  actualizarProfesor,
  obtenerUsuariosDisponiblesPorSedes,
} from '@/lib/actions/profesores.actions'
import { profesorSchema, type ProfesorInput } from '@/lib/validations/profesor.schema'
import { TIPO_AUTORIZACION_PROFESOR, TIPO_AUTORIZACION_PROFESOR_LABELS } from '@/lib/constants/estados'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FormProfesorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesor?: any
  sedeId: string
  sedes: Array<{ id: string; nombre: string }>
  onSuccess?: () => void
}

export function FormProfesor({
  open,
  onOpenChange,
  profesor,
  sedeId,
  sedes,
  onSuccess,
}: FormProfesorProps) {
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  const [modoAsignacionSede, setModoAsignacionSede] = useState<'una' | 'todas'>('una')
  const [sedeAsignadaId, setSedeAsignadaId] = useState(profesor?.sede_id || sedeId)

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

  const sedesObjetivo = useMemo(
    () => (modoAsignacionSede === 'todas' ? sedes.map((sede) => sede.id) : [sedeAsignadaId]),
    [modoAsignacionSede, sedes, sedeAsignadaId]
  )

  const cargarUsuariosDisponibles = useCallback(async () => {
    if (isEdit) return

    const sedesValidas = sedesObjetivo.filter(Boolean)
    if (sedesValidas.length === 0) {
      setUsuarios([])
      setLoadingUsuarios(false)
      return
    }

    setLoadingUsuarios(true)
    try {
      const result = await obtenerUsuariosDisponiblesPorSedes(sedesValidas)
      if (result.data) {
        setUsuarios(result.data)
      }
    } catch (error) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsuarios(false)
    }
  }, [isEdit, sedesObjetivo])

  useEffect(() => {
    if (open && !isEdit) {
      cargarUsuariosDisponibles()
    }
  }, [open, isEdit, cargarUsuariosDisponibles])

  useEffect(() => {
    if (!isEdit) {
      setValue('sede_id', sedeAsignadaId)
    }
  }, [isEdit, sedeAsignadaId, setValue])

  useEffect(() => {
    if (!open) return

    if (isEdit) {
      setModoAsignacionSede('una')
      setSedeAsignadaId(profesor.sede_id)
      return
    }

    setModoAsignacionSede('una')
    setSedeAsignadaId(sedeId)
  }, [open, isEdit, profesor, sedeId])

  const onSubmit = async (data: ProfesorInput) => {
    setLoading(true)
    try {
      if (isEdit) {
        const result = await actualizarProfesor(profesor.id, data)
        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Profesor actualizado exitosamente')
        reset()
        onOpenChange(false)
        onSuccess?.()
        return
      }

      let creados = 0
      const errores: string[] = []

      for (const sedeDestino of sedesObjetivo.filter(Boolean)) {
        const result = await crearProfesor({
          ...data,
          sede_id: sedeDestino,
        })

        if (result.error) {
          errores.push(result.error)
        } else {
          creados += 1
        }
      }

      if (creados === 0) {
        toast.error(errores[0] || 'No se pudo crear el profesor')
        return
      }

      toast.success(
        creados === 1 ? 'Profesor creado exitosamente' : `Profesor creado en ${creados} sedes`
      )

      if (errores.length > 0) {
        toast.warning(`Se omitieron ${errores.length} sedes por conflicto o permisos.`)
      }

      reset()
      onOpenChange(false)
      onSuccess?.()
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
              ? 'Actualiza la configuracion y permisos del profesor.'
              : 'Completa los datos para registrar un nuevo profesor en la sede.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="usuario_id">Usuario *</Label>
              {loadingUsuarios ? (
                <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
              ) : usuarios.length === 0 ? (
                <p className="text-sm text-orange-600">
                  No hay usuarios con rol profesor disponibles para la asignacion seleccionada.
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo_autorizacion">Tipo de Clases *</Label>
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
                Determina que tipo de clases puede dar.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede_asignacion">Asignacion de Sede *</Label>
              <Select
                value={modoAsignacionSede === 'todas' ? 'all' : sedeAsignadaId}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setModoAsignacionSede('todas')
                    return
                  }
                  setModoAsignacionSede('una')
                  setSedeAsignadaId(value)
                }}
                disabled={isEdit}
              >
                <SelectTrigger id="sede_asignacion">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.length > 1 && <SelectItem value="all">Todas las sedes</SelectItem>}
                  {sedes.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'La sede se define al registrar profesor.'
                  : modoAsignacionSede === 'todas'
                    ? 'Se creara este profesor en todas las sedes disponibles.'
                    : 'Se creara este profesor solo en la sede seleccionada.'}
              </p>
            </div>
          </div>

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

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="biografia">Biografia</Label>
              <Textarea
                id="biografia"
                placeholder="Informacion sobre el profesor, experiencia, certificaciones..."
                rows={4}
                {...register('biografia')}
              />
              {errors.biografia && (
                <p className="text-sm text-destructive">{errors.biografia.message}</p>
              )}
            </div>
          )}

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
              Color que identificara las clases de este profesor en el calendario
            </p>
          </div>

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
              disabled={!isEdit && usuarios.length === 0}
              loadingText={isEdit ? 'Actualizando profesor...' : 'Creando profesor...'}
            >
              {isEdit ? 'Actualizar' : 'Crear Profesor'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
