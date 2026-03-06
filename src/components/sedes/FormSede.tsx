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

interface FormSedeProps {
  open: boolean
  onClose: () => void
  organizaciones: any[]
  sede?: any
}

export function FormSede({ open, onClose, organizaciones, sede }: FormSedeProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEdit = !!sede

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SedeInput>({
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
            <div className="col-span-2">
              <Label htmlFor="organizacion_id">Organización *</Label>
              <select
                id="organizacion_id"
                {...register('organizacion_id')}
                disabled={loading}
                className="w-full px-3 py-2 border rounded-md"
              >
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.nombre}
                  </option>
                ))}
              </select>
              {errors.organizacion_id && (
                <p className="text-sm text-destructive mt-1">{errors.organizacion_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" {...register('nombre')} disabled={loading} />
              {errors.nombre && <p className="text-sm text-destructive mt-1">{errors.nombre.message}</p>}
            </div>

            <div>
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input id="slug" {...register('slug')} disabled={loading} placeholder="sede-centro" />
              {errors.slug && <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>}
            </div>

            <div className="col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" {...register('direccion')} disabled={loading} />
            </div>

            <div>
              <Label htmlFor="telefono">Teléfono</Label>
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
