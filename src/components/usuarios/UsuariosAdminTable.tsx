'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShieldCheck, UserCog } from 'lucide-react'
import { asignarRolUsuario } from '@/lib/actions/usuarios.actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type RolUsuario = 'super_admin' | 'admin' | 'profesor' | 'alumno'

interface Membresia {
  id: string
  rol: RolUsuario
  sede_id: string | null
  organizacion_id: string | null
  activa: boolean
}

interface Usuario {
  id: string
  email: string
  nombre: string | null
  apellido: string | null
  created_at: string
  membresias?: Membresia[]
}

interface Sede {
  id: string
  nombre: string
  organizacion_id: string
  organizaciones?: { nombre?: string } | { nombre?: string }[] | null
}

interface UsuariosAdminTableProps {
  usuarios: Usuario[]
  sedes: Sede[]
  canAssignSuperAdmin: boolean
}

const ROLE_LABELS: Record<RolUsuario, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  profesor: 'Profesor',
  alumno: 'Alumno',
}

const ROLE_ORDER: Record<RolUsuario, number> = {
  super_admin: 0,
  admin: 1,
  profesor: 2,
  alumno: 3,
}

function getOrganizacionNombre(sede: Sede) {
  if (!sede.organizaciones) return ''
  if (Array.isArray(sede.organizaciones)) {
    return sede.organizaciones[0]?.nombre || ''
  }
  return sede.organizaciones.nombre || ''
}

export function UsuariosAdminTable({ usuarios, sedes, canAssignSuperAdmin }: UsuariosAdminTableProps) {
  const router = useRouter()
  const [usuarioObjetivo, setUsuarioObjetivo] = useState<Usuario | null>(null)
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario>(
    canAssignSuperAdmin ? 'super_admin' : 'admin'
  )
  const [organizacionFiltro, setOrganizacionFiltro] = useState<string>('all')
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const sedesOrdenadas = useMemo(
    () =>
      [...sedes].sort((a, b) => {
        const orgA = getOrganizacionNombre(a)
        const orgB = getOrganizacionNombre(b)
        return `${orgA}-${a.nombre}`.localeCompare(`${orgB}-${b.nombre}`, 'es')
      }),
    [sedes]
  )

  const abrirModal = (usuario: Usuario) => {
    setUsuarioObjetivo(usuario)
    setRolSeleccionado(canAssignSuperAdmin ? 'super_admin' : 'admin')
    setOrganizacionFiltro('all')
    setSedeSeleccionada('')
  }

  const cerrarModal = () => {
    if (loading) return
    setUsuarioObjetivo(null)
    setRolSeleccionado(canAssignSuperAdmin ? 'super_admin' : 'admin')
    setOrganizacionFiltro('all')
    setSedeSeleccionada('')
  }

  const organizacionesDisponibles = useMemo(() => {
    const map = new Map<string, string>()

    for (const sede of sedesOrdenadas) {
      const nombre = getOrganizacionNombre(sede) || 'Sin organizacion'
      if (!map.has(sede.organizacion_id)) {
        map.set(sede.organizacion_id, nombre)
      }
    }

    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [sedesOrdenadas])

  const sedesFiltradas = useMemo(
    () =>
      sedesOrdenadas.filter((sede) =>
        organizacionFiltro === 'all' ? true : sede.organizacion_id === organizacionFiltro
      ),
    [sedesOrdenadas, organizacionFiltro]
  )

  const guardarRol = async () => {
    if (!usuarioObjetivo) return

    if (rolSeleccionado !== 'super_admin' && !sedeSeleccionada) {
      toast.error('Selecciona una sede para continuar.')
      return
    }

    setLoading(true)
    try {
      const result = await asignarRolUsuario({
        usuarioId: usuarioObjetivo.id,
        rol: rolSeleccionado,
        sedeId: rolSeleccionado === 'super_admin' ? undefined : sedeSeleccionada,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Rol asignado correctamente.')
      cerrarModal()
      router.refresh()
    } catch (error) {
      toast.error('No se pudo asignar el rol.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fecha Registro</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                  const membresiasActivas = (usuario.membresias || [])
                    .filter((m) => m.activa)
                    .sort((a, b) => ROLE_ORDER[a.rol] - ROLE_ORDER[b.rol])

                  return (
                    <tr key={usuario.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{usuario.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {[usuario.nombre, usuario.apellido].filter(Boolean).join(' ') || 'Sin nombre'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {membresiasActivas.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {membresiasActivas.map((membresia) => (
                              <Badge key={membresia.id} variant="secondary" className="font-medium">
                                {ROLE_LABELS[membresia.rol]}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin rol</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {membresiasActivas.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(usuario.created_at).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => abrirModal(usuario)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          Asignar rol y sede
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!usuarioObjetivo} onOpenChange={(open) => !open && cerrarModal()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Asignar rol
            </DialogTitle>
            <DialogDescription>
              Define el rol de{' '}
              <span className="font-medium text-foreground">{usuarioObjetivo?.email}</span>.
              Si el rol es distinto de super admin, debes elegir una sede.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rol-usuario">Rol</Label>
              <Select
                value={rolSeleccionado}
                onValueChange={(value) => setRolSeleccionado(value as RolUsuario)}
              >
                <SelectTrigger id="rol-usuario">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {canAssignSuperAdmin && (
                    <SelectItem value="super_admin">{ROLE_LABELS.super_admin}</SelectItem>
                  )}
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                  <SelectItem value="profesor">{ROLE_LABELS.profesor}</SelectItem>
                  <SelectItem value="alumno">{ROLE_LABELS.alumno}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rolSeleccionado !== 'super_admin' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizacion-filtro">Organizacion</Label>
                  <Select
                    value={organizacionFiltro}
                    onValueChange={(value) => {
                      setOrganizacionFiltro(value)
                      setSedeSeleccionada('')
                    }}
                  >
                    <SelectTrigger id="organizacion-filtro">
                      <SelectValue placeholder="Todas las organizaciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {organizacionesDisponibles.map((organizacion) => (
                        <SelectItem key={organizacion.id} value={organizacion.id}>
                          {organizacion.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sede-usuario">Sede</Label>
                  <Select value={sedeSeleccionada} onValueChange={setSedeSeleccionada}>
                    <SelectTrigger id="sede-usuario">
                      <SelectValue placeholder="Selecciona una sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedesFiltradas.map((sede) => {
                        const organizacionNombre = getOrganizacionNombre(sede)
                        return (
                          <SelectItem key={sede.id} value={sede.id}>
                            {organizacionNombre ? `${organizacionNombre} - ${sede.nombre}` : sede.nombre}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton loading={loading} loadingText="Guardando..." onClick={guardarRol}>
              Guardar rol
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
