'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Phone, Mail, Trash2, Edit } from 'lucide-react'
import { FormSede } from './FormSede'
import { eliminarSede } from '@/lib/actions/sedes.actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface SedesListProps {
  sedesIniciales: any[]
  organizaciones: any[]
}

export function SedesList({ sedesIniciales, organizaciones }: SedesListProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [sedeEdit, setSedeEdit] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sedeAEliminar, setSedeAEliminar] = useState<any | null>(null)

  const abrirCrearSede = () => {
    setSedeEdit(null)
    setModalOpen(true)
  }

  const abrirEditarSede = (sede: any) => {
    setSedeEdit(sede)
    setModalOpen(true)
  }

  const cerrarModalSede = () => {
    setModalOpen(false)
    setSedeEdit(null)
  }

  const confirmarEliminacion = async () => {
    if (!sedeAEliminar) return

    setDeletingId(sedeAEliminar.id)
    try {
      const result = await eliminarSede(sedeAEliminar.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Sede eliminada')
      setSedeAEliminar(null)
      router.refresh()
    } catch (error) {
      toast.error('Error al eliminar sede')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sedes</h1>
        <Button onClick={abrirCrearSede}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Sede
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sedesIniciales.map((sede) => (
          <Card key={sede.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{sede.nombre}</CardTitle>
                  <Badge variant="outline" className="mt-2">
                    {sede.organizaciones?.nombre}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEditarSede(sede)}
                    aria-label={`Editar ${sede.nombre}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setSedeAEliminar(sede)}
                    disabled={deletingId === sede.id}
                    aria-label={`Eliminar ${sede.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sede.direccion && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {sede.direccion}
                </div>
              )}
              {sede.telefono && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  {sede.telefono}
                </div>
              )}
              {sede.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  {sede.email}
                </div>
              )}
              <div className="pt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/super-admin/vista-global?sede=${sede.id}`}>
                    Entrar a Sede
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FormSede
        open={modalOpen}
        onClose={cerrarModalSede}
        organizaciones={organizaciones}
        sede={sedeEdit || undefined}
      />

      <ConfirmDialog
        open={!!sedeAEliminar}
        onOpenChange={(open) => {
          if (!open) setSedeAEliminar(null)
        }}
        title="Eliminar sede"
        description={
          sedeAEliminar
            ? `Se eliminara "${sedeAEliminar.nombre}" de forma permanente. Esta accion no se puede deshacer.`
            : 'Esta accion no se puede deshacer.'
        }
        confirmText="Eliminar"
        confirmVariant="destructive"
        loading={!!sedeAEliminar && deletingId === sedeAEliminar.id}
        onConfirm={confirmarEliminacion}
      />
    </div>
  )
}
