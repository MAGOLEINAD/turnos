'use client'

import { useState } from 'react'
import { FormAlumno } from './FormAlumno'
import { desactivarAlumno, activarAlumno } from '@/lib/actions/alumnos.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Edit, UserX, UserCheck, Mail, Phone, Calendar, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'

interface AlumnosListProps {
  alumnos: any[]
  sedeId: string
}

export function AlumnosList({ alumnos: alumnosIniciales, sedeId }: AlumnosListProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [alumnoEditar, setAlumnoEditar] = useState<any>(null)
  const [alumnos, setAlumnos] = useState(alumnosIniciales)

  const handleNuevoAlumno = () => {
    setAlumnoEditar(null)
    setModalOpen(true)
  }

  const handleEditarAlumno = (alumno: any) => {
    setAlumnoEditar(alumno)
    setModalOpen(true)
  }

  const handleSuccess = () => {
    // Recargar la página para obtener datos actualizados
    window.location.reload()
  }

  const handleToggleActivo = async (alumno: any) => {
    try {
      const result = alumno.activo
        ? await desactivarAlumno(alumno.id)
        : await activarAlumno(alumno.id)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          alumno.activo ? 'Alumno desactivado' : 'Alumno activado'
        )
        // Actualizar estado local
        setAlumnos((prev) =>
          prev.map((a) =>
            a.id === alumno.id ? { ...a, activo: !a.activo } : a
          )
        )
      }
    } catch (error) {
      toast.error('Error al cambiar el estado del alumno')
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Alumnos</h2>
          <p className="text-muted-foreground">
            {alumnos.length} {alumnos.length === 1 ? 'alumno' : 'alumnos'}
          </p>
        </div>
        <Button onClick={handleNuevoAlumno}>Nuevo Alumno</Button>
      </div>

      {alumnos.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">
                No hay alumnos registrados aún.
              </p>
              <Button onClick={handleNuevoAlumno} className="mt-4">
                Crear Primer Alumno
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {alumnos.map((alumno) => (
            <Card
              key={alumno.id}
              className={!alumno.activo ? 'opacity-60' : ''}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {alumno.usuarios.nombre} {alumno.usuarios.apellido}
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">Alumno</Badge>
                      {!alumno.activo && (
                        <Badge variant="destructive">Inactivo</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Sede */}
                {alumno.sedes && (
                  <div className="text-sm">
                    <span className="font-medium">Sede: </span>
                    <span className="text-muted-foreground">
                      {alumno.sedes.nombre}
                    </span>
                  </div>
                )}

                {/* Email */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{alumno.usuarios.email}</span>
                </div>

                {/* Teléfono */}
                {alumno.usuarios.telefono && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{alumno.usuarios.telefono}</span>
                  </div>
                )}

                {/* Fecha de Nacimiento */}
                {alumno.fecha_nacimiento && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(new Date(alumno.fecha_nacimiento))}</span>
                  </div>
                )}

                {/* Contacto de Emergencia */}
                {alumno.contacto_emergencia && (
                  <div className="text-sm">
                    <span className="font-medium">Emergencia: </span>
                    <span className="text-muted-foreground">
                      {alumno.contacto_emergencia}
                      {alumno.telefono_emergencia && ` (${alumno.telefono_emergencia})`}
                    </span>
                  </div>
                )}

                {/* Notas Médicas */}
                {alumno.notas_medicas && (
                  <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-950/20 p-2 rounded text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-orange-600 dark:text-orange-400 line-clamp-2">
                      {alumno.notas_medicas}
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditarAlumno(alumno)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={alumno.activo ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleActivo(alumno)}
                  >
                    {alumno.activo ? (
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

      <FormAlumno
        open={modalOpen}
        onOpenChange={setModalOpen}
        alumno={alumnoEditar}
        sedeId={sedeId}
        onSuccess={handleSuccess}
      />
    </>
  )
}
