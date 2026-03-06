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

interface FormOrganizacionProps {
  open: boolean
  onClose: () => void
  organizacion?: any
}

export function FormOrganizacion({ open, onClose, organizacion }: FormOrganizacionProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEdit = !!organizacion

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrganizacionInput>({
    resolver: zodResolver(organizacionSchema),
    defaultValues: organizacion || {
      nombre: '',
      descripcion: '',
      logo_url: '',
      activa: true,
    },
  })

  useEffect(() => {
    if (!open) return

    reset(
      organizacion || {
        nombre: '',
        descripcion: '',
        logo_url: '',
        activa: true,
      }
    )
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
        toast.success(isEdit ? 'Organización actualizada' : 'Organización creada')
        router.refresh()
        onClose()
      }
    } catch (error) {
      toast.error('Error al guardar organización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar' : 'Nueva'} Organización</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos de la organización.'
              : 'Completa los campos para crear una nueva organización.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" {...register('nombre')} disabled={loading} />
            {errors.nombre && <p className="text-sm text-destructive mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" {...register('descripcion')} disabled={loading} rows={3} />
          </div>

          <div>
            <Label htmlFor="logo_url">URL del Logo</Label>
            <Input id="logo_url" type="url" {...register('logo_url')} disabled={loading} />
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
