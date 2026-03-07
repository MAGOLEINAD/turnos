'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { Plus, Edit, Trash2, UserCheck, UserX, Search, Filter, X, Building2, Calendar, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormOrganizacion } from './FormOrganizacion'
import { DialogDesactivarOrganizacion } from './DialogDesactivarOrganizacion'
import { actualizarOrganizacion, eliminarOrganizacion } from '@/lib/actions/organizaciones.actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils/cn'
import { normalizeClientIcon } from '@/lib/utils/clientes'

interface OrganizacionesListProps {
  organizacionesIniciales: any[]
  admins: Array<{
    id: string
    nombre: string
    apellido: string
    email: string
  }>
}

export function OrganizacionesList({ organizacionesIniciales, admins }: OrganizacionesListProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [organizacionEdit, setOrganizacionEdit] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [organizacionAEliminar, setOrganizacionAEliminar] = useState<any | null>(null)
  const [organizacionADesactivar, setOrganizacionADesactivar] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Filtrado y búsqueda
  const organizacionesFiltradas = useMemo(() => {
    return organizacionesIniciales.filter((org) => {
      const matchesSearch =
        org.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && org.activa) ||
        (statusFilter === 'inactive' && !org.activa)

      return matchesSearch && matchesStatus
    })
  }, [organizacionesIniciales, searchTerm, statusFilter])

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

      toast.success('Cliente eliminado')
      setOrganizacionAEliminar(null)
      router.refresh()
    } catch (error) {
      toast.error('Error al eliminar cliente')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleEstado = async (org: any) => {
    // Si está activo, pedir motivo antes de desactivar
    if (org.activa) {
      setOrganizacionADesactivar(org)
      return
    }

    // Si está inactivo, activar directamente
    setTogglingId(org.id)
    try {
      const result = await actualizarOrganizacion(org.id, {
        activa: true,
        motivo_desactivacion: null
      })
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Cliente activado')
      router.refresh()
    } catch (error) {
      toast.error('Error al activar el cliente')
    } finally {
      setTogglingId(null)
    }
  }

  const confirmarDesactivacion = async (motivo: string) => {
    if (!organizacionADesactivar) return

    setTogglingId(organizacionADesactivar.id)
    try {
      const result = await actualizarOrganizacion(organizacionADesactivar.id, {
        activa: false,
        motivo_desactivacion: motivo
      })
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Cliente desactivado')
      setOrganizacionADesactivar(null)
      router.refresh()
    } catch (error) {
      toast.error('Error al desactivar el cliente')
    } finally {
      setTogglingId(null)
    }
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all'
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los clientes/empresas y sus configuraciones
          </p>
        </div>
        <Button
          onClick={handleNueva}
          size="lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {admins.length === 0 && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No hay usuarios admin activos para asociar al cliente. Puedes crearlo igual y asociarlo luego.
        </div>
      )}

      {/* Buscador y Filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro de estado */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Solo activos</SelectItem>
                <SelectItem value="inactive">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrando {organizacionesFiltradas.length} de {organizacionesIniciales.length} clientes</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Grid de cards */}
      {organizacionesFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {hasActiveFilters ? 'No se encontraron resultados' : 'No hay clientes'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Crea tu primer cliente para comenzar'}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearFilters} variant="outline">
              Limpiar filtros
            </Button>
          ) : (
            <Button onClick={handleNueva}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizacionesFiltradas.map((org) => (
            <Card
              key={org.id}
              className={cn(
                "group relative overflow-hidden transition-all duration-300",
                "hover:shadow-xl",
                org.activa ? "border-l-4 border-l-green-500" : "border-l-4 border-l-gray-300 opacity-75",
                !org.admin_usuario_id && "border-r-4 border-r-amber-400"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-2xl leading-none" aria-hidden="true">
                        {normalizeClientIcon(org.icono)}
                      </span>
                      <span className="truncate" title={org.nombre}>
                        {org.nombre}
                      </span>
                      {!org.admin_usuario_id && (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      {org.activa ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                    </CardTitle>
                    <Badge
                      variant={org.activa ? "default" : "secondary"}
                      className="mt-2"
                    >
                      {org.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                    {!org.admin_usuario_id && (
                      <Badge variant="outline" className="mt-2 ml-2 border-amber-300 text-amber-700">
                        Sin admin asociado
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditar(org)}
                      aria-label={`Editar ${org.nombre}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setOrganizacionAEliminar(org)}
                      disabled={deletingId === org.id}
                      aria-label={`Eliminar ${org.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {org.descripcion || 'Sin descripción'}
                </CardDescription>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="leading-tight">
                    Alta en sistema: {new Date(org.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>

                <LoadingButton
                  className="w-full"
                  variant={org.activa ? 'outline' : 'default'}
                  size="sm"
                  loading={togglingId === org.id}
                  loadingText={org.activa ? 'Desactivando...' : 'Activando...'}
                  onClick={() => toggleEstado(org)}
                >
                  {org.activa ? (
                    <>
                      <UserX className="mr-2 h-4 w-4" />
                      Desactivar cliente
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activar cliente
                    </>
                  )}
                </LoadingButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormOrganizacion
        open={modalOpen}
        onClose={handleClose}
        organizacion={organizacionEdit}
        admins={admins}
      />

      <ConfirmDialog
        open={!!organizacionAEliminar}
        onOpenChange={(open) => {
          if (!open) setOrganizacionAEliminar(null)
        }}
        title="Eliminar cliente"
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

      <DialogDesactivarOrganizacion
        open={!!organizacionADesactivar}
        onOpenChange={(open) => {
          if (!open) setOrganizacionADesactivar(null)
        }}
        organizacion={organizacionADesactivar}
        loading={!!organizacionADesactivar && togglingId === organizacionADesactivar.id}
        onConfirm={confirmarDesactivacion}
      />
    </div>
  )
}
