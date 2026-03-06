'use client'

import { useState } from 'react'
import { FormProfesor } from './FormProfesor'
import { desactivarProfesor, activarProfesor } from '@/lib/actions/profesores.actions'
import { TIPO_AUTORIZACION_PROFESOR_LABELS } from '@/lib/constants/estados'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Edit, UserX, UserCheck, Mail, Phone } from 'lucide-react'

interface ProfesoresListProps {
  profesores: any[]
  sedeId: string
}

export function ProfesoresList({ profesores: profesoresIniciales, sedeId }: ProfesoresListProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [profesorEditar, setProfesorEditar] = useState<any>(null)
  const [profesores, setProfesores] = useState(profesoresIniciales)

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
    try {
      const result = profesor.activo
        ? await desactivarProfesor(profesor.id)
        : await activarProfesor(profesor.id)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          profesor.activo ? 'Profesor desactivado' : 'Profesor activado'
        )
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
    </>
  )
}
