'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { sedeSchema, type SedeInput } from '@/lib/validations/sede.schema'
import { actualizarSede, crearSede } from '@/lib/actions/sedes.actions'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatClientName } from '@/lib/utils/clientes'

interface FormSedeProps {
  open: boolean
  onClose: () => void
  organizaciones: any[]
  sede?: any
  canSelectOrganizacion?: boolean
}

export function FormSede({
  open,
  onClose,
  organizaciones,
  sede,
  canSelectOrganizacion = true,
}: FormSedeProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEdit = !!sede

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SedeInput>({
    resolver: zodResolver(sedeSchema),
    defaultValues: {
      organizacion_id: organizaciones[0]?.id || '',
      nombre: '',
      slug: '',
      direccion: '',
      telefono: '',
      email: '',
      activa: true,
    },
  })

  useEffect(() => {
    if (!open) return

    reset(
      sede || {
        organizacion_id: organizaciones[0]?.id || '',
        nombre: '',
        slug: '',
        direccion: '',
        telefono: '',
        email: '',
        activa: true,
      }
    )
  }, [open, sede, organizaciones, reset])

  const onSubmit = async (data: SedeInput) => {
    setLoading(true)
    try {
      const result = isEdit
        ? await actualizarSede(sede.id, data)
        : await crearSede(data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Sede actualizada exitosamente' : 'Sede creada exitosamente')
        router.refresh()
        onClose()
      }
    } catch (error) {
      toast.error(isEdit ? 'Error al actualizar sede' : 'Error al crear sede')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Sede' : 'Nueva Sede'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos de la sede y guarda los cambios.'
              : 'Completa los datos para crear una nueva sede.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {canSelectOrganizacion ? (
              <div className="col-span-2">
                <Label htmlFor="organizacion_id">Cliente / Empresa *</Label>
                <Select
                  value={watch('organizacion_id')}
                  onValueChange={(value) =>
                    setValue('organizacion_id', value, { shouldDirty: true, shouldValidate: true })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="organizacion_id">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizaciones.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {formatClientName(org.nombre, org.icono)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organizacion_id && (
                  <p className="mt-1 text-sm text-destructive">{errors.organizacion_id.message}</p>
                )}
              </div>
            ) : (
              <input type="hidden" {...register('organizacion_id')} />
            )}

            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" {...register('nombre')} disabled={loading} />
              {errors.nombre && <p className="mt-1 text-sm text-destructive">{errors.nombre.message}</p>}
            </div>

            <div>
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input id="slug" {...register('slug')} disabled={loading} placeholder="sede-centro" />
              {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="col-span-2">
              <Label htmlFor="direccion">Direccion</Label>
              <Input id="direccion" {...register('direccion')} disabled={loading} />
            </div>

            <div>
              <Label htmlFor="telefono">Telefono</Label>
              <Input id="telefono" {...register('telefono')} disabled={loading} />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} disabled={loading} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={isEdit ? 'Actualizando sede...' : 'Creando sede...'}
            >
              {isEdit ? 'Actualizar Sede' : 'Crear Sede'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
