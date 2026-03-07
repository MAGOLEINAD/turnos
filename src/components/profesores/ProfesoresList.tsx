'use client'

import { useState } from 'react'
import { FormProfesor } from './FormProfesor'
import { desactivarProfesor, activarProfesor, eliminarProfesor } from '@/lib/actions/profesores.actions'
import { TIPO_AUTORIZACION_PROFESOR_LABELS } from '@/lib/constants/estados'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Edit, UserX, UserCheck, Mail, Phone } from 'lucide-react'

interface ProfesoresListProps {
  profesores: any[]
  sedeId: string
  sedes: Array<{ id: string; nombre: string }>
}

export function ProfesoresList({ profesores: profesoresIniciales, sedeId, sedes }: ProfesoresListProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [profesorEditar, setProfesorEditar] = useState<any>(null)
  const [profesores, setProfesores] = useState(profesoresIniciales)
  const [modalAccionOpen, setModalAccionOpen] = useState(false)
  const [profesorAccion, setProfesorAccion] = useState<any>(null)
  const [loadingAccion, setLoadingAccion] = useState(false)

  const handleNuevoProfesor = () => {
    setProfesorEditar(null)
    setModalOpen(true)
  }

  const handleEditarProfesor = (profesor: any) => {
    setProfesorEditar(profesor)
    setModalOpen(true)
  }

  const handleSuccess = () => {
    // Recargar la página para obtener datos actualizados
    window.location.reload()
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
        // Actualizar estado local
        setProfesores((prev) =>
          prev.map((p) =>
            p.id === profesor.id ? { ...p, activo: !p.activo } : p
          )
        )
      }
    } catch (error) {
      toast.error('Error al cambiar el estado del profesor')
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

      toast.success('Profesor desactivado')
      setProfesores((prev) =>
        prev.map((p) =>
          p.id === profesorAccion.id ? { ...p, activo: false } : p
        )
      )
      setModalAccionOpen(false)
      setProfesorAccion(null)
    } catch (error) {
      toast.error('Error al desactivar el profesor')
    } finally {
      setLoadingAccion(false)
    }
  }

  const handleEliminarProfesor = async () => {
    if (!profesorAccion) return

    setLoadingAccion(true)
    try {
      const result = await eliminarProfesor(profesorAccion.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Profesor eliminado permanentemente')
      setProfesores((prev) => prev.filter((p) => p.id !== profesorAccion.id))
      setModalAccionOpen(false)
      setProfesorAccion(null)
    } catch (error) {
      toast.error('Error al eliminar el profesor')
    } finally {
      setLoadingAccion(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Profesores</h2>
          <p className="text-muted-foreground">
            {profesores.length} {profesores.length === 1 ? 'profesor' : 'profesores'}
          </p>
        </div>
        <Button onClick={handleNuevoProfesor}>Nuevo Profesor</Button>
      </div>

      {profesores.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">
                No hay profesores registrados aún.
              </p>
              <Button onClick={handleNuevoProfesor} className="mt-4">
                Crear Primer Profesor
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profesores.map((profesor) => (
            <Card
              key={profesor.id}
              className={!profesor.activo ? 'opacity-60' : ''}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {profesor.usuarios.nombre} {profesor.usuarios.apellido}
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {
                          TIPO_AUTORIZACION_PROFESOR_LABELS[
                            profesor.tipo_autorizacion as keyof typeof TIPO_AUTORIZACION_PROFESOR_LABELS
                          ]
                        }
                      </Badge>
                      {!profesor.activo && (
                        <Badge variant="destructive">Inactivo</Badge>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: profesor.color_calendario }}
                    title="Color en calendario"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Sede */}
                {profesor.sedes && (
                  <div className="text-sm">
                    <span className="font-medium">Sede: </span>
                    <span className="text-muted-foreground">
                      {profesor.sedes.nombre}
                    </span>
                  </div>
                )}

                {/* Especialidad */}
                {profesor.especialidad && (
                  <div className="text-sm">
                    <span className="font-medium">Especialidad: </span>
                    <span className="text-muted-foreground">
                      {profesor.especialidad}
                    </span>
                  </div>
                )}

                {/* Email */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{profesor.usuarios.email}</span>
                </div>

                {/* Teléfono */}
                {profesor.usuarios.telefono && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{profesor.usuarios.telefono}</span>
                  </div>
                )}

                {/* Biografía */}
                {profesor.biografia && (
                  <div className="text-sm">
                    <p className="text-muted-foreground line-clamp-2">
                      {profesor.biografia}
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditarProfesor(profesor)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={profesor.activo ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleActivo(profesor)}
                  >
                    {profesor.activo ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        Activar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormProfesor
        open={modalOpen}
        onOpenChange={setModalOpen}
        profesor={profesorEditar}
        sedeId={sedeId}
        onSuccess={handleSuccess}
      />

      <Dialog
        open={modalAccionOpen}
        onOpenChange={(open) => {
          if (loadingAccion) return
          setModalAccionOpen(open)
          if (!open) setProfesorAccion(null)
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Gestionar estado del profesor</DialogTitle>
            <DialogDescription>
              Elige que deseas hacer con{' '}
              <span className="font-medium text-foreground">
                {profesorAccion?.usuarios?.nombre} {profesorAccion?.usuarios?.apellido}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">Desactivar</p>
              <p className="text-muted-foreground">
                El profesor deja de estar disponible en calendario, pero su perfil se conserva y puedes reactivarlo
                cuando quieras.
              </p>
            </div>
            <div className="rounded-md border border-destructive/30 p-3">
              <p className="font-medium text-destructive">Borrar permanentemente</p>
              <p className="text-muted-foreground">
                Se elimina el registro de profesor en esta sede. Esta accion no se puede deshacer.
              </p>
              <p className="mt-2 text-muted-foreground">
                Luego podras volver a asignar este mismo usuario como profesor desde el alta.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loadingAccion}
              onClick={() => {
                setModalAccionOpen(false)
                setProfesorAccion(null)
              }}
            >
              Cancelar
            </Button>
            <LoadingButton
              type="button"
              variant="outline"
              loading={loadingAccion}
              loadingText="Procesando..."
              onClick={handleDesactivarProfesor}
            >
              Desactivar
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="destructive"
              loading={loadingAccion}
              loadingText="Eliminando..."
              onClick={handleEliminarProfesor}
            >
              Borrar permanentemente
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
