'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Phone, Mail, Trash2, Edit, Building2, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormSede } from './FormSede'
import { eliminarSede } from '@/lib/actions/sedes.actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatClientName } from '@/lib/utils/clientes'

interface SedesListProps {
  sedesIniciales: any[]
  organizaciones: any[]
  canSelectOrganizacion?: boolean
  showEntrarASede?: boolean
}

export function SedesList({
  sedesIniciales,
  organizaciones,
  canSelectOrganizacion = true,
  showEntrarASede = true,
}: SedesListProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [sedeEdit, setSedeEdit] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sedeAEliminar, setSedeAEliminar] = useState<any | null>(null)
  const [filtroOrganizacion, setFiltroOrganizacion] = useState<string | null>(null)

  const sedesFiltradas = useMemo(() => {
    if (!filtroOrganizacion) return sedesIniciales
    return sedesIniciales.filter((sede) => sede.organizacion_id === filtroOrganizacion)
  }, [sedesIniciales, filtroOrganizacion])

  const cantidadPorOrganizacion = useMemo(() => {
    const counts = new Map<string, number>()
    for (const sede of sedesIniciales) {
      const key = sede.organizacion_id
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
  }, [sedesIniciales])

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
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold">Sedes</h1>
        <Button onClick={abrirCrearSede}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Sede
        </Button>
      </div>

      {canSelectOrganizacion && organizaciones.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="shrink-0 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtrar:</span>
            </div>
          </div>
          <Select
            value={filtroOrganizacion || 'todas'}
            onValueChange={(value) => setFiltroOrganizacion(value === 'todas' ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Seleccionar cliente/empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">
                Todos los clientes ({sedesIniciales.length})
              </SelectItem>
              {organizaciones.map((org) => {
                const count = cantidadPorOrganizacion.get(org.id) || 0
                return (
                  <SelectItem key={org.id} value={org.id}>
                    {formatClientName(org.nombre, org.icono)} ({count})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {filtroOrganizacion && (
            <Button variant="ghost" size="sm" onClick={() => setFiltroOrganizacion(null)}>
              Limpiar
            </Button>
          )}
        </div>
      )}

      {sedesFiltradas.length === 0 ? (
        <div className="py-12 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">No hay sedes</h3>
          <p className="mb-4 text-muted-foreground">
            {filtroOrganizacion
              ? 'No se encontraron sedes para este cliente.'
              : 'Crea tu primera sede para comenzar.'}
          </p>
          {!filtroOrganizacion && (
            <Button onClick={abrirCrearSede}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sede
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sedesFiltradas.map((sede) => (
            <Card key={sede.id} className="transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{sede.nombre}</CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {formatClientName(sede.organizaciones?.nombre || 'Sin cliente', sede.organizaciones?.icono)}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
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
              <CardContent className="space-y-3">
                {sede.direccion && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="leading-tight">{sede.direccion}</span>
                  </div>
                )}
                {sede.telefono && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="leading-tight">{sede.telefono}</span>
                  </div>
                )}
                {sede.email && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-all leading-tight">{sede.email}</span>
                  </div>
                )}
                {showEntrarASede && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/super-admin/vista-global?sede=${sede.id}`}>
                        Entrar a Sede
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormSede
        open={modalOpen}
        onClose={cerrarModalSede}
        organizaciones={organizaciones}
        sede={sedeEdit || undefined}
        canSelectOrganizacion={canSelectOrganizacion}
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
