'use client'

import { useState, useEffect } from 'react'
import { FormProfesor } from './FormProfesor'
import { useProfesores } from '@/hooks/useProfesores'
import { desactivarProfesor, activarProfesor } from '@/lib/actions/profesores.actions'
import {
  TIPO_AUTORIZACION_PROFESOR_LABELS,
  type TipoAutorizacionProfesor,
} from '@/lib/constants/estados'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Edit, UserX, UserCheck, Mail, Phone, AlertCircle } from 'lucide-react'

interface ProfesoresListClientProps {
  sedeId?: string
  sedes: Array<{ id: string; nombre: string }>
}

export function ProfesoresListClient({ sedeId, sedes }: ProfesoresListClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [profesorEditar, setProfesorEditar] = useState<any>(null)
  const [modalAccionOpen, setModalAccionOpen] = useState(false)
  const [profesorAccion, setProfesorAccion] = useState<any>(null)
  const [loadingAccion, setLoadingAccion] = useState(false)

  // React Query maneja loading, error y caching automáticamente
  const { data: profesores = [], isLoading, error, refetch } = useProfesores(sedeId)

  useEffect(() => {
    if (error) {
      toast.error('Error al cargar profesores')
    }
  }, [error])

  const handleNuevoProfesor = () => {
    setProfesorEditar(null)
    setModalOpen(true)
  }

  const handleEditarProfesor = (profesor: any) => {
    setProfesorEditar(profesor)
    setModalOpen(true)
  }

  const handleSuccess = () => {
    // React Query automáticamente refresca la lista
    setModalOpen(false)
    toast.success('Profesor guardado exitosamente')
  }

  const handleToggleActivo = async (profesor: any) => {
    if (profesor.activo) {
      setProfesorAccion(profesor)
      setModalAccionOpen(true)
      return
    }

    try {
      const result = await activarProfesor(profesor.id)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Profesor activado')
        refetch() // Refrescar la lista
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar el estado del profesor')
    }
  }

  const handleDesactivarProfesor = async () => {
    if (!profesorAccion) return

    setLoadingAccion(true)
    try {
      const result = await desactivarProfesor(profesorAccion.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Profesor desactivado correctamente')
      refetch() // Refrescar la lista
      setModalAccionOpen(false)
      setProfesorAccion(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar profesor')
    } finally {
      setLoadingAccion(false)
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center">Cargando profesores...</div>
  }

  const profesoresActivos = profesores.filter((p: any) => p.activo)
  const profesoresInactivos = profesores.filter((p: any) => !p.activo)

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              Profesores Activos ({profesoresActivos.length})
            </h2>
          </div>
          <Button onClick={handleNuevoProfesor}>Agregar Profesor</Button>
        </div>

        {profesoresActivos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay profesores activos. Agrega el primer profesor para comenzar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profesoresActivos.map((profesor: any) => (
              <Card key={profesor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {profesor.usuarios?.nombre || 'Sin nombre'}{' '}
                        {profesor.usuarios?.apellido || ''}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {profesor.sedes?.nombre || 'Sin sede'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Activo
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {profesor.usuarios?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{profesor.usuarios.email}</span>
                    </div>
                  )}

                  {profesor.usuarios?.telefono && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profesor.usuarios.telefono}</span>
                    </div>
                  )}

                  {(profesor.tipo_autorizacion || profesor.autorizacion_tipo) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {TIPO_AUTORIZACION_PROFESOR_LABELS[
                          (profesor.tipo_autorizacion ||
                            profesor.autorizacion_tipo) as TipoAutorizacionProfesor
                        ] ?? 'Sin definir'}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditarProfesor(profesor)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleToggleActivo(profesor)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {profesoresInactivos.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-6">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-muted-foreground">
                Profesores Inactivos ({profesoresInactivos.length})
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
              {profesoresInactivos.map((profesor: any) => (
                <Card key={profesor.id} className="border-dashed">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {profesor.usuarios?.nombre || 'Sin nombre'}{' '}
                          {profesor.usuarios?.apellido || ''}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {profesor.sedes?.nombre || 'Sin sede'}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Inactivo
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {profesor.usuarios?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{profesor.usuarios.email}</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActivo(profesor)}
                      className="w-full"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Reactivar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <FormProfesor
        open={modalOpen}
        onOpenChange={setModalOpen}
        profesor={profesorEditar}
        sedeId={sedeId ?? ''}
        onSuccess={handleSuccess}
      />

      {/* Modal de confirmación para desactivar */}
      <Dialog open={modalAccionOpen} onOpenChange={setModalAccionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar desactivación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar a{' '}
              <strong>
                {profesorAccion?.usuarios?.nombre} {profesorAccion?.usuarios?.apellido}
              </strong>
              ? El profesor no podrá iniciar sesión ni crear nuevas reservas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalAccionOpen(false)}
              disabled={loadingAccion}
            >
              Cancelar
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleDesactivarProfesor}
              loading={loadingAccion}
            >
              Desactivar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
