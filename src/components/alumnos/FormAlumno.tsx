'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { crearAlumno, actualizarAlumno, obtenerUsuariosDisponiblesParaAlumnos } from '@/lib/actions/alumnos.actions'
import { obtenerHistorialPagosAlumno } from '@/lib/actions/pagos.actions'
import { alumnoSchema, type AlumnoInput } from '@/lib/validations/alumno.schema'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusAlert } from '@/components/ui/status-alert'
import { HistorialPagosPanel } from './HistorialPagosPanel'

interface FormAlumnoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumno?: any
  sedeId: string
  onSuccess?: () => void
}

export function FormAlumno({
  open,
  onOpenChange,
  alumno,
  sedeId,
  onSuccess,
}: FormAlumnoProps) {
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  const [pagosHistorial, setPagosHistorial] = useState<any[]>([])
  const [loadingPagosHistorial, setLoadingPagosHistorial] = useState(false)

  const isEdit = !!alumno

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AlumnoInput>({
    resolver: zodResolver(alumnoSchema),
    defaultValues: alumno
      ? {
          usuario_id: alumno.usuario_id,
          sede_id: alumno.sede_id,
          fecha_nacimiento: alumno.fecha_nacimiento || '',
          contacto_emergencia: alumno.contacto_emergencia || '',
          telefono_emergencia: alumno.telefono_emergencia || '',
          notas_medicas: alumno.notas_medicas || '',
          activo: alumno.activo ?? true,
        }
      : {
          sede_id: sedeId,
          activo: true,
        },
  })

  const cargarUsuariosDisponibles = useCallback(async () => {
    setLoadingUsuarios(true)
    try {
      const result = await obtenerUsuariosDisponiblesParaAlumnos(sedeId)
      if (result.error) {
        toast.error(result.error)
        setUsuarios([])
        return
      }
      if (result.data) {
        setUsuarios(result.data)
      }
    } catch (error) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsuarios(false)
    }
  }, [sedeId])

  useEffect(() => {
    if (open && !isEdit) {
      cargarUsuariosDisponibles()
    }
  }, [open, isEdit, cargarUsuariosDisponibles])

  useEffect(() => {
    if (!open || !isEdit || !alumno?.id || !alumno?.sede_id) return

    const cargarPagos = async () => {
      setLoadingPagosHistorial(true)
      const result = await obtenerHistorialPagosAlumno(alumno.id, alumno.sede_id)
      if (result.error) {
        toast.error(result.error)
        setPagosHistorial([])
      } else {
        setPagosHistorial(result.data || [])
      }
      setLoadingPagosHistorial(false)
    }

    cargarPagos()
  }, [open, isEdit, alumno])

  const onSubmit = async (data: AlumnoInput) => {
    setLoading(true)
    try {
      let result

      if (isEdit) {
        result = await actualizarAlumno(alumno.id, data)
      } else {
        result = await crearAlumno(data)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Alumno actualizado exitosamente' : 'Alumno creado exitosamente')
        reset()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error('Error al guardar el alumno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Alumno' : 'Nuevo Alumno'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica la información del alumno y guarda los cambios.'
              : 'Completa los datos para registrar un nuevo alumno en la sede.'}
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
                <StatusAlert
                  variant="warning"
                  title="Sin usuarios disponibles"
                  description="No hay usuarios con rol alumno disponibles en esta sede. Asigna primero el rol alumno desde la sección de Usuarios."
                  action={{
                    label: 'Ir a Usuarios',
                    href: '/super-admin/usuarios'
                  }}
                />
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

          {/* Fecha de Nacimiento */}
          <div className="space-y-2">
            <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
            <Input
              id="fecha_nacimiento"
              type="date"
              {...register('fecha_nacimiento')}
            />
            {errors.fecha_nacimiento && (
              <p className="text-sm text-destructive">{errors.fecha_nacimiento.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Telefono de Emergencia */}
            <div className="space-y-2">
              <Label htmlFor="telefono_emergencia">Telefono</Label>
              <Input
                id="telefono_emergencia"
                type="tel"
                placeholder="+54 9 11 xxxx-xxxx"
                {...register('telefono_emergencia')}
              />
              {errors.telefono_emergencia && (
                <p className="text-sm text-destructive">{errors.telefono_emergencia.message}</p>
              )}
            </div>

            {/* Contacto de Emergencia */}
            <div className="space-y-2">
              <Label htmlFor="contacto_emergencia">Contacto de Emergencia</Label>
              <Input
                id="contacto_emergencia"
                placeholder="Nombre del contacto de emergencia"
                {...register('contacto_emergencia')}
              />
              {errors.contacto_emergencia && (
                <p className="text-sm text-destructive">{errors.contacto_emergencia.message}</p>
              )}
            </div>
          </div>

          {/* Notas Médicas */}
          <div className="space-y-2">
            <Label htmlFor="notas_medicas">Notas Médicas</Label>
            <Textarea
              id="notas_medicas"
              placeholder="Información médica relevante, alergias, condiciones, medicamentos..."
              rows={4}
              {...register('notas_medicas')}
            />
            {errors.notas_medicas && (
              <p className="text-sm text-destructive">{errors.notas_medicas.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Esta información es confidencial y solo visible para administradores y profesores
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
            <LoadingButton
              type="submit"
              loading={loading}
              disabled={!isEdit && usuarios.length === 0}
              loadingText={isEdit ? 'Actualizando alumno...' : 'Creando alumno...'}
            >
              {isEdit ? 'Actualizar' : 'Crear Alumno'}
            </LoadingButton>
          </div>

          {isEdit ? (
            <div className="pt-2">
              {loadingPagosHistorial ? (
                <p className="text-sm text-muted-foreground">Cargando historial de pagos...</p>
              ) : (
                <HistorialPagosPanel
                  pagos={pagosHistorial}
                  title="Historial de pagos del alumno"
                  emptyMessage="Este alumno no tiene pagos registrados."
                />
              )}
            </div>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
