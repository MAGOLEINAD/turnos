'use client'

import { useState, useEffect } from 'react'
import { FormAlumno } from './FormAlumno'
import { useAlumnos, useEditarAlumno, useEliminarAlumno } from '@/hooks/useAlumnos'
import { activarAlumno } from '@/lib/actions/alumnos.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Edit, UserX, UserCheck, Mail, Phone, Calendar, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'

interface AlumnosListClientProps {
  sedeId?: string
}

export function AlumnosListClient({ sedeId }: AlumnosListClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [alumnoEditar, setAlumnoEditar] = useState<any>(null)

  // React Query maneja loading, error y caching automáticamente
  const { data: alumnos = [], isLoading, error, refetch } = useAlumnos(sedeId)
  const editarMutation = useEditarAlumno()
  const eliminarMutation = useEliminarAlumno()

  useEffect(() => {
    if (error) {
      toast.error('Error al cargar alumnos')
    }
  }, [error])

  const handleNuevoAlumno = () => {
    setAlumnoEditar(null)
    setModalOpen(true)
  }

  const handleEditarAlumno = (alumno: any) => {
    setAlumnoEditar(alumno)
    setModalOpen(true)
  }

  const handleSuccess = () => {
    // React Query automáticamente refresca la lista
    setModalOpen(false)
    toast.success('Alumno guardado exitosamente')
  }

  const handleToggleActivo = async (alumno: any) => {
    try {
      if (alumno.activo) {
        await eliminarMutation.mutateAsync(alumno.id)
        toast.success('Alumno desactivado')
      } else {
        const result = await activarAlumno(alumno.id)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Alumno activado')
          refetch() // Refrescar manualmente después de activar
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado del alumno')
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center">Cargando alumnos...</div>
  }

  const alumnosActivos = alumnos.filter((a: any) => a.activo)
  const alumnosInactivos = alumnos.filter((a: any) => !a.activo)

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              Alumnos Activos ({alumnosActivos.length})
            </h2>
          </div>
          <Button onClick={handleNuevoAlumno}>Agregar Alumno</Button>
        </div>

        {alumnosActivos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay alumnos activos. Agrega el primer alumno para comenzar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alumnosActivos.map((alumno: any) => (
              <Card key={alumno.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {alumno.usuarios?.nombre || 'Sin nombre'}{' '}
                        {alumno.usuarios?.apellido || ''}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alumno.sedes?.nombre || 'Sin sede'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Activo
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {alumno.usuarios?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{alumno.usuarios.email}</span>
                    </div>
                  )}

                  {alumno.usuarios?.telefono && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{alumno.usuarios.telefono}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Desde: {formatDate(alumno.created_at)}</span>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditarAlumno(alumno)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleToggleActivo(alumno)}
                      disabled={eliminarMutation.isPending}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {alumnosInactivos.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-6">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-muted-foreground">
                Alumnos Inactivos ({alumnosInactivos.length})
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
              {alumnosInactivos.map((alumno: any) => (
                <Card key={alumno.id} className="border-dashed">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {alumno.usuarios?.nombre || 'Sin nombre'}{' '}
                          {alumno.usuarios?.apellido || ''}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alumno.sedes?.nombre || 'Sin sede'}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Inactivo
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {alumno.usuarios?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{alumno.usuarios.email}</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActivo(alumno)}
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

      <FormAlumno
        open={modalOpen}
        onOpenChange={setModalOpen}
        alumno={alumnoEditar}
        sedeId={sedeId ?? ''}
        onSuccess={handleSuccess}
      />
    </>
  )
}
