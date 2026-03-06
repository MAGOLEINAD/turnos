'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { organizacionSchema, type OrganizacionInput } from '@/lib/validations/organizacion.schema'
import { crearOrganizacion, actualizarOrganizacion } from '@/lib/actions/organizaciones.actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  const isEdit = !!organizacion

  const { register, handleSubmit, formState: { errors } } = useForm<OrganizacionInput>({
    resolver: zodResolver(organizacionSchema),
    defaultValues: organizacion || {
      nombre: '',
      descripcion: '',
      logo_url: '',
      activa: true,
    },
  })

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
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
