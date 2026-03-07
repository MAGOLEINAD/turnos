'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { organizacionSchema, type OrganizacionInput } from '@/lib/validations/organizacion.schema'
import { crearOrganizacion, actualizarOrganizacion } from '@/lib/actions/organizaciones.actions'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComboboxAdmin } from '@/components/ui/combobox-admin'
import { ClientIconPicker } from '@/components/ui/client-icon-picker'
import { DEFAULT_CLIENT_ICON } from '@/lib/utils/clientes'

interface FormOrganizacionProps {
  open: boolean
  onClose: () => void
  organizacion?: any
  admins: Array<{
    id: string
    nombre: string
    apellido: string
    email: string
  }>
}

export function FormOrganizacion({ open, onClose, organizacion, admins }: FormOrganizacionProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEdit = !!organizacion

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<OrganizacionInput>({
    resolver: zodResolver(organizacionSchema),
    defaultValues: organizacion || {
      nombre: '',
      descripcion: '',
      icono: DEFAULT_CLIENT_ICON,
      admin_usuario_id: '',
      activa: true,
    },
  })

  const adminUsuarioId = watch('admin_usuario_id')

  useEffect(() => {
    if (!open) return

    const defaults = organizacion
      ? {
          ...organizacion,
          icono: organizacion.icono || DEFAULT_CLIENT_ICON,
          admin_usuario_id: organizacion.admin_usuario_id || '',
        }
      : {
          nombre: '',
          descripcion: '',
          icono: DEFAULT_CLIENT_ICON,
          admin_usuario_id: '',
          activa: true,
        }

    reset(defaults)
  }, [open, organizacion, reset])

  const onSubmit = async (data: OrganizacionInput) => {
    setLoading(true)
    try {
      const result = isEdit
        ? await actualizarOrganizacion(organizacion.id, data)
        : await crearOrganizacion(data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado')
        router.refresh()
        onClose()
      }
    } catch (error) {
      toast.error('Error al guardar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar' : 'Nuevo'} Cliente</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos del cliente/empresa.'
              : 'Completa los campos para crear un nuevo cliente/empresa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Cliente / Empresa *</Label>
            <Input id="nombre" {...register('nombre')} disabled={loading} />
            {errors.nombre && <p className="mt-1 text-sm text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="icono">Icono</Label>
            <ClientIconPicker
              value={watch('icono')}
              onChange={(value) => setValue('icono', value, { shouldValidate: true, shouldDirty: true })}
              disabled={loading}
            />
            <input type="hidden" {...register('icono')} />
            {errors.icono && <p className="mt-1 text-sm text-destructive">{errors.icono.message}</p>}
          </div>

          <div>
            <Label htmlFor="descripcion">Descripcion</Label>
            <Textarea id="descripcion" {...register('descripcion')} disabled={loading} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_usuario_id">Usuario Admin (opcional)</Label>
            <ComboboxAdmin
              admins={admins}
              value={adminUsuarioId}
              onValueChange={(value) => setValue('admin_usuario_id', value, { shouldValidate: true })}
              disabled={loading}
              placeholder="Sin asociar por ahora"
            />

            {errors.admin_usuario_id && (
              <p className="mt-1 text-sm text-destructive">{errors.admin_usuario_id.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={isEdit ? 'Actualizando...' : 'Creando...'}
            >
              {isEdit ? 'Actualizar' : 'Crear'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
