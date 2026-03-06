'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { FormOrganizacion } from './FormOrganizacion'
import { eliminarOrganizacion } from '@/lib/actions/organizaciones.actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface OrganizacionesListProps {
  organizacionesIniciales: any[]
}

export function OrganizacionesList({ organizacionesIniciales }: OrganizacionesListProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [organizacionEdit, setOrganizacionEdit] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [organizacionAEliminar, setOrganizacionAEliminar] = useState<any | null>(null)

  const handleNueva = () => {
    setOrganizacionEdit(null)
    setModalOpen(true)
  }

  const handleEditar = (org: any) => {
    setOrganizacionEdit(org)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setOrganizacionEdit(null)
  }

  const confirmarEliminacion = async () => {
    if (!organizacionAEliminar) return

    setDeletingId(organizacionAEliminar.id)
    try {
      const result = await eliminarOrganizacion(organizacionAEliminar.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Organizacion eliminada')
      setOrganizacionAEliminar(null)
      router.refresh()
    } catch (error) {
      toast.error('Error al eliminar organizacion')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Organizaciones</h1>
        <Button onClick={handleNueva}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Organizacion
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizacionesIniciales.map((org) => (
          <Card key={org.id} className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>{org.nombre}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditar(org)}
                    aria-label={`Editar ${org.nombre}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setOrganizacionAEliminar(org)}
                    disabled={deletingId === org.id}
                    aria-label={`Eliminar ${org.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {org.descripcion || 'Sin descripcion'}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    org.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {org.activa ? 'Activa' : 'Inactiva'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(org.created_at).toLocaleDateString('es-AR')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {organizacionesIniciales.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-muted-foreground">No hay organizaciones creadas aun</p>
            <Button onClick={handleNueva} className="mt-4">
              Crear primera organizacion
            </Button>
          </div>
        )}
      </div>

      <FormOrganizacion open={modalOpen} onClose={handleClose} organizacion={organizacionEdit} />

      <ConfirmDialog
        open={!!organizacionAEliminar}
        onOpenChange={(open) => {
          if (!open) setOrganizacionAEliminar(null)
        }}
        title="Eliminar organizacion"
        description={
          organizacionAEliminar
            ? `Se eliminara "${organizacionAEliminar.nombre}" de forma permanente. Esta accion no se puede deshacer.`
            : 'Esta accion no se puede deshacer.'
        }
        confirmText="Eliminar"
        confirmVariant="destructive"
        loading={!!organizacionAEliminar && deletingId === organizacionAEliminar.id}
        onConfirm={confirmarEliminacion}
      />
    </div>
  )
}
