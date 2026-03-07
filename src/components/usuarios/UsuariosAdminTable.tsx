'use client'

import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Download,
  EllipsisVertical,
  FileSpreadsheet,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  UserCog,
  UserPlus,
} from 'lucide-react'
import {
  asignarRolUsuario,
  crearUsuario,
  eliminarUsuario,
  importarUsuarios,
  quitarRolUsuario,
} from '@/lib/actions/usuarios.actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatClientName } from '@/lib/utils/clientes'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { ROLES_ICONS, ROLES_LABELS, type RolUsuario } from '@/lib/constants/roles'

type RolGestionable = Exclude<RolUsuario, 'super_admin'>

interface Membresia {
  id: string
  rol: RolUsuario
  sede_id: string | null
  organizacion_id: string | null
  activa: boolean
}

interface UsuarioRow {
  id: string
  email: string
  nombre: string | null
  apellido: string | null
  telefono?: string | null
  activo: boolean
  created_at: string
  membresias?: Membresia[]
}

interface Sede {
  id: string
  nombre: string
  organizacion_id: string
  organizaciones?: { nombre?: string; icono?: string | null } | { nombre?: string; icono?: string | null }[] | null
}

interface UsuariosAdminTableProps {
  usuarios: UsuarioRow[]
  sedes: Sede[]
  canAssignSuperAdmin: boolean
  canCreateUsers: boolean
  showClientFilter?: boolean
}

const ROLE_ORDER: Record<RolUsuario, number> = {
  super_admin: 0,
  admin: 1,
  profesor: 2,
  alumno: 3,
}

function getOrganizacionLabel(sede: Sede) {
  if (!sede.organizaciones) return ''
  if (Array.isArray(sede.organizaciones)) {
    const org = sede.organizaciones[0]
    if (!org?.nombre) return ''
    return formatClientName(org.nombre, org.icono)
  }
  if (!sede.organizaciones.nombre) return ''
  return formatClientName(sede.organizaciones.nombre, sede.organizaciones.icono)
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

export function UsuariosAdminTable({
  usuarios,
  sedes,
  canAssignSuperAdmin,
  canCreateUsers,
  showClientFilter = false,
}: UsuariosAdminTableProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [usuarioObjetivo, setUsuarioObjetivo] = useState<UsuarioRow | null>(null)
  const [rolesSeleccionados, setRolesSeleccionados] = useState<RolGestionable[]>([])
  const [superAdminSeleccionado, setSuperAdminSeleccionado] = useState(false)
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('')
  const [loadingRol, setLoadingRol] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
  })

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importingUsers, setImportingUsers] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState<string>('all')
  const [clienteNuevoUsuario, setClienteNuevoUsuario] = useState<string>('')
  const [clienteImportacion, setClienteImportacion] = useState<string>('')

  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sedesOrdenadas = useMemo(
    () =>
      [...sedes].sort((a, b) => {
        const orgA = getOrganizacionLabel(a)
        const orgB = getOrganizacionLabel(b)
        return `${orgA}-${a.nombre}`.localeCompare(`${orgB}-${b.nombre}`, 'es')
      }),
    [sedes]
  )

  const clientesDisponibles = useMemo(() => {
    const map = new Map<string, string>()
    for (const sede of sedes) {
      if (!sede.organizacion_id) continue
      const label = getOrganizacionLabel(sede) || 'Cliente sin nombre'
      if (!map.has(sede.organizacion_id)) {
        map.set(sede.organizacion_id, label)
      }
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [sedes])

  const roleOptions = useMemo<MultiSelectOption[]>(
    () => [
      { value: 'admin', label: `${ROLES_ICONS.admin} ${ROLES_LABELS.admin}` },
      { value: 'profesor', label: `${ROLES_ICONS.profesor} ${ROLES_LABELS.profesor}` },
      { value: 'alumno', label: `${ROLES_ICONS.alumno} ${ROLES_LABELS.alumno}` },
    ],
    []
  )

  const sedesPorId = useMemo(() => {
    const map = new Map<string, Sede>()
    for (const sede of sedes) {
      map.set(sede.id, sede)
    }
    return map
  }, [sedes])

  const usuariosFiltrados = useMemo(() => {
    if (!showClientFilter || filtroCliente === 'all') return usuarios
    return usuarios.filter((usuario) =>
      (usuario.membresias || []).some((m) => m.organizacion_id === filtroCliente)
    )
  }, [usuarios, showClientFilter, filtroCliente])

  const descargarAlumnos = () => {
    const filas = usuariosFiltrados
      .filter((usuario) =>
        (usuario.membresias || []).some((m) => m.activa && m.rol === 'alumno')
      )
      .map((usuario) => {
        const membresiasAlumno = (usuario.membresias || []).filter((m) => m.activa && m.rol === 'alumno')
        const sedesAlumno = Array.from(
          new Set(
            membresiasAlumno
              .map((m) => (m.sede_id ? sedesPorId.get(m.sede_id)?.nombre || '' : ''))
              .filter(Boolean)
          )
        )
        const clientesAlumno = Array.from(
          new Set(
            membresiasAlumno
              .map((m) => {
                if (!m.sede_id) return ''
                const sede = sedesPorId.get(m.sede_id)
                return sede ? getOrganizacionLabel(sede) : ''
              })
              .filter(Boolean)
          )
        )

        return {
          nombre: usuario.nombre || '',
          apellido: usuario.apellido || '',
          email: usuario.email || '',
          telefono: usuario.telefono || '',
          cliente: clientesAlumno.join(' | '),
          sede: sedesAlumno.join(' | '),
        }
      })

    if (filas.length === 0) {
      toast.error('No hay usuarios con rol alumno para exportar.')
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(filas)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos')
    XLSX.writeFile(workbook, 'usuarios_alumnos.xlsx')
    toast.success(`Excel generado con ${filas.length} alumno(s).`)
  }

  const abrirModalAcceso = (usuario: UsuarioRow) => {
    const membresiasActivas = (usuario.membresias || []).filter((m) => m.activa)
    const tieneSuperAdmin = membresiasActivas.some((m) => m.rol === 'super_admin')
    const membresiaConSede =
      membresiasActivas.find((m) => m.sede_id && m.rol !== 'super_admin') || null
    const sedeInicial = membresiaConSede?.sede_id || ''
    const rolesIniciales = membresiasActivas
      .filter((m) => m.sede_id === sedeInicial && m.rol !== 'super_admin')
      .map((m) => m.rol as RolGestionable)

    setUsuarioObjetivo(usuario)
    setSuperAdminSeleccionado(tieneSuperAdmin)
    setSedeSeleccionada(sedeInicial)
    setRolesSeleccionados(Array.from(new Set(rolesIniciales)))
  }

  const cerrarModalAcceso = () => {
    if (loadingRol) return
    setUsuarioObjetivo(null)
    setSuperAdminSeleccionado(false)
    setRolesSeleccionados([])
    setSedeSeleccionada('')
  }

  const onSedeChange = (nextSedeId: string) => {
    setSedeSeleccionada(nextSedeId)
    if (!usuarioObjetivo) return

    const rolesActivosEnSede = (usuarioObjetivo.membresias || [])
      .filter((m) => m.activa && m.sede_id === nextSedeId && m.rol !== 'super_admin')
      .map((m) => m.rol as RolGestionable)

    setRolesSeleccionados(Array.from(new Set(rolesActivosEnSede)))
  }

  const guardarAccesos = async () => {
    if (!usuarioObjetivo) return

    if (!superAdminSeleccionado && !sedeSeleccionada) {
      toast.error('Selecciona una sede para continuar.')
      return
    }
    if (!superAdminSeleccionado && (rolesSeleccionados.length < 1 || rolesSeleccionados.length > 3)) {
      toast.error('Debes seleccionar entre 1 y 3 roles.')
      return
    }

    setLoadingRol(true)
    try {
      if (superAdminSeleccionado) {
        const result = await asignarRolUsuario({
          usuarioId: usuarioObjetivo.id,
          rol: 'super_admin',
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
      } else {
        const rolesActualesEnSede = (usuarioObjetivo.membresias || [])
          .filter((m) => m.activa && m.sede_id === sedeSeleccionada && m.rol !== 'super_admin')
          .map((m) => m.rol as RolGestionable)

        for (const rol of rolesSeleccionados) {
          const result = await asignarRolUsuario({
            usuarioId: usuarioObjetivo.id,
            rol,
            sedeId: sedeSeleccionada,
          })
          if (result.error) {
            toast.error(result.error)
            return
          }
        }

        const rolesAQuitar = rolesActualesEnSede.filter((rol) => !rolesSeleccionados.includes(rol))
        for (const rol of rolesAQuitar) {
          const result = await quitarRolUsuario({
            usuarioId: usuarioObjetivo.id,
            rol,
            sedeId: sedeSeleccionada,
          })
          if (result.error) {
            toast.error(result.error)
            return
          }
        }
      }

      toast.success('Accesos actualizados correctamente.')
      cerrarModalAcceso()
      router.refresh()
    } catch (error) {
      toast.error('No se pudieron guardar los cambios de acceso.')
    } finally {
      setLoadingRol(false)
    }
  }

  const guardarNuevoUsuario = async () => {
    if (!nuevoUsuario.nombre.trim() || !nuevoUsuario.apellido.trim()) {
      toast.error('Completa nombre y apellido.')
      return
    }
    if (!nuevoUsuario.email.trim().includes('@')) {
      toast.error('Ingresa un email valido.')
      return
    }
    if (nuevoUsuario.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (canAssignSuperAdmin && !clienteNuevoUsuario) {
      toast.error('Selecciona un cliente para crear el usuario.')
      return
    }

    setCreatingUser(true)
    try {
      const result = await crearUsuario({
        nombre: nuevoUsuario.nombre.trim(),
        apellido: nuevoUsuario.apellido.trim(),
        email: nuevoUsuario.email.trim().toLowerCase(),
        telefono: nuevoUsuario.telefono.trim() || null,
        password: nuevoUsuario.password,
        organizacionId: canAssignSuperAdmin ? clienteNuevoUsuario : undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Usuario creado correctamente.')
      setCreateModalOpen(false)
      setNuevoUsuario({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        password: '',
      })
      setClienteNuevoUsuario('')
      router.refresh()
    } catch (error) {
      toast.error('No se pudo crear el usuario.')
    } finally {
      setCreatingUser(false)
    }
  }

  const confirmarEliminarUsuario = async () => {
    if (!usuarioAEliminar) return

    setDeletingId(usuarioAEliminar.id)
    try {
      const result = await eliminarUsuario(usuarioAEliminar.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Usuario eliminado.')
      setUsuarioAEliminar(null)
      router.refresh()
    } catch (error) {
      toast.error('No se pudo eliminar el usuario.')
    } finally {
      setDeletingId(null)
    }
  }

  const descargarPlantilla = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        nombre: 'Juan',
        apellido: 'Perez',
        email: 'juan@ejemplo.com',
        telefono: '+5491112345678',
      },
      {
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'ana@ejemplo.com',
        telefono: '',
      },
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios')
    XLSX.writeFile(workbook, 'plantilla_importacion_usuarios.xlsx')
  }

  const abrirImportadorArchivo = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportingUsers(true)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      if (!firstSheet) {
        toast.error('El archivo no tiene hojas.')
        return
      }

      const sheet = workbook.Sheets[firstSheet]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

      const rows = rawRows.map((row) => {
        const mapped: Record<string, string> = {}
        for (const [key, value] of Object.entries(row)) {
          mapped[normalizeHeader(key)] = typeof value === 'string' ? value : String(value ?? '')
        }
        return {
          nombre: mapped.nombre || '',
          apellido: mapped.apellido || '',
          email: mapped.email || '',
          telefono: mapped.telefono || '',
        }
      })

      const result = await importarUsuarios(
        rows,
        canAssignSuperAdmin ? clienteImportacion : undefined
      )
      if (result.error) {
        toast.error(result.error)
        return
      }

      const erroresPreview = (result.errors || []).slice(0, 3)
      const mensaje = `Importacion completa. Creados: ${result.created}. Omitidos: ${result.skipped}.`
      if (erroresPreview.length > 0) {
        toast.warning(`${mensaje} Errores: ${erroresPreview.join(' | ')}`)
      } else {
        toast.success(mensaje)
      }

      setImportModalOpen(false)
      setClienteImportacion('')
      router.refresh()
    } catch (error) {
      toast.error('No se pudo procesar el archivo Excel.')
    } finally {
      setImportingUsers(false)
      event.target.value = ''
    }
  }

  return (
    <>
      {(canAssignSuperAdmin || canCreateUsers) && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {canCreateUsers && (
            <Button variant="outline" onClick={descargarAlumnos}>
              <Download className="mr-2 h-4 w-4" />
              Exportar alumnos
            </Button>
          )}
          {canCreateUsers && (
            <Button
              onClick={() => {
                if (canAssignSuperAdmin && !clienteImportacion && filtroCliente !== 'all') {
                  setClienteImportacion(filtroCliente)
                }
                setImportModalOpen(true)
              }}
              variant="outline"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Importar usuarios
            </Button>
          )}
          {canCreateUsers && (
            <Button
              onClick={() => {
                if (canAssignSuperAdmin && !clienteNuevoUsuario && filtroCliente !== 'all') {
                  setClienteNuevoUsuario(filtroCliente)
                }
                setCreateModalOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Button>
          )}
        </div>
      )}

      {showClientFilter && clientesDisponibles.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:max-w-sm">
          <Label htmlFor="filtro-cliente">Filtrar por cliente</Label>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger id="filtro-cliente">
              <SelectValue placeholder="Selecciona cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clientesDisponibles.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Alta en sistema</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => {
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
                                {ROLES_ICONS[membresia.rol]} {ROLES_LABELS[membresia.rol]}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin rol</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {usuario.activo ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(usuario.created_at).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" aria-label={`Acciones de ${usuario.email}`}>
                              <EllipsisVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirModalAcceso(usuario)}>
                              <UserCog className="mr-2 h-4 w-4" />
                              Gestionar acceso
                            </DropdownMenuItem>
                            {canAssignSuperAdmin && (
                              <DropdownMenuItem
                                onClick={() => setUsuarioAEliminar(usuario)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar usuario
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!usuarioObjetivo} onOpenChange={(open) => !open && cerrarModalAcceso()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Gestionar acceso de usuario
            </DialogTitle>
            <DialogDescription>
              Configura sede y rol para{' '}
              <span className="font-medium text-foreground">{usuarioObjetivo?.email}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!superAdminSeleccionado && (
              <div className="space-y-2">
                <Label htmlFor="sede-usuario">Sede</Label>
                <Select value={sedeSeleccionada} onValueChange={onSedeChange}>
                  <SelectTrigger id="sede-usuario">
                    <SelectValue placeholder="Selecciona una sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedesOrdenadas.map((sede) => {
                      const organizacionLabel = getOrganizacionLabel(sede)
                      return (
                        <SelectItem key={sede.id} value={sede.id}>
                          {organizacionLabel ? `${organizacionLabel} - ${sede.nombre}` : sede.nombre}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Roles (1 a 3)</Label>
              <div className="space-y-3">
                {canAssignSuperAdmin && (
                  <Button
                    type="button"
                    variant={superAdminSeleccionado ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => {
                      const next = !superAdminSeleccionado
                      setSuperAdminSeleccionado(next)
                      if (next) {
                        setRolesSeleccionados([])
                        setSedeSeleccionada('')
                      }
                    }}
                  >
                    {ROLES_ICONS.super_admin} {ROLES_LABELS.super_admin}
                  </Button>
                )}
                <MultiSelect
                  options={roleOptions}
                  value={rolesSeleccionados}
                  onChange={(next) => setRolesSeleccionados(next as RolGestionable[])}
                  placeholder="Seleccionar roles"
                  searchPlaceholder="Buscar rol..."
                  emptyText="No se encontraron roles"
                  maxSelections={3}
                  disabled={superAdminSeleccionado}
                />
              </div>
              {!superAdminSeleccionado && (
                <p className="text-xs text-muted-foreground">
                  Seleccionados: {rolesSeleccionados.length} / 3
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarModalAcceso} disabled={loadingRol}>
              Cancelar
            </Button>
            <LoadingButton loading={loadingRol} loadingText="Guardando..." onClick={guardarAccesos}>
              Guardar cambios
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createModalOpen} onOpenChange={(open) => !creatingUser && setCreateModalOpen(open)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Nuevo usuario
            </DialogTitle>
            <DialogDescription>
              Crea un usuario del sistema. Luego puedes asignar su acceso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nuevo-nombre">Nombre</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="nuevo-nombre"
                    className="pl-9"
                    placeholder="Nombre"
                    value={nuevoUsuario.nombre}
                    onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, nombre: e.target.value }))}
                    disabled={creatingUser}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuevo-apellido">Apellido</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="nuevo-apellido"
                    className="pl-9"
                    placeholder="Apellido"
                    value={nuevoUsuario.apellido}
                    onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, apellido: e.target.value }))}
                    disabled={creatingUser}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nuevo-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nuevo-email"
                  type="email"
                  className="pl-9"
                  placeholder="usuario@empresa.com"
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={creatingUser}
                />
              </div>
            </div>

            {canAssignSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="cliente-nuevo-usuario">Cliente asociado</Label>
                <Select value={clienteNuevoUsuario} onValueChange={setClienteNuevoUsuario}>
                  <SelectTrigger id="cliente-nuevo-usuario">
                    <SelectValue placeholder="Selecciona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesDisponibles.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nuevo-telefono">Telefono (opcional)</Label>
                <Input
                  id="nuevo-telefono"
                  placeholder="+549..."
                  value={nuevoUsuario.telefono}
                  onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, telefono: e.target.value }))}
                  disabled={creatingUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuevo-password">Contraseña inicial</Label>
                <Input
                  id="nuevo-password"
                  type="password"
                  placeholder="Minimo 6 caracteres"
                  value={nuevoUsuario.password}
                  onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={creatingUser}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={creatingUser}>
              Cancelar
            </Button>
            <LoadingButton loading={creatingUser} loadingText="Creando..." onClick={guardarNuevoUsuario}>
              Crear usuario
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importModalOpen} onOpenChange={(open) => !importingUsers && setImportModalOpen(open)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importar usuarios
            </DialogTitle>
            <DialogDescription>
              Elige si quieres descargar una plantilla o importar un archivo Excel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {canAssignSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="cliente-importacion">Cliente asociado</Label>
                <Select value={clienteImportacion} onValueChange={setClienteImportacion}>
                  <SelectTrigger id="cliente-importacion">
                    <SelectValue placeholder="Selecciona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesDisponibles.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="outline" className="w-full justify-start" onClick={descargarPlantilla}>
              <Download className="mr-2 h-4 w-4" />
              Descargar Excel de ejemplo
            </Button>

            <LoadingButton
              className="w-full justify-start"
              loading={importingUsers}
              loadingText="Importando..."
              onClick={abrirImportadorArchivo}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Importar desde Excel
            </LoadingButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />

            <p className="text-xs text-muted-foreground">
              Columnas esperadas: nombre, apellido, email, telefono (opcional). Filas incompletas se omiten.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)} disabled={importingUsers}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!usuarioAEliminar}
        onOpenChange={(open) => {
          if (!open) setUsuarioAEliminar(null)
        }}
        title="Eliminar usuario"
        description={
          usuarioAEliminar
            ? `Se eliminara "${usuarioAEliminar.email}" de forma permanente. Esta accion no se puede deshacer.`
            : 'Esta accion no se puede deshacer.'
        }
        confirmText="Eliminar"
        confirmVariant="destructive"
        loading={!!usuarioAEliminar && deletingId === usuarioAEliminar.id}
        onConfirm={confirmarEliminarUsuario}
      />
    </>
  )
}
