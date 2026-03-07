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

type RolUsuario = 'super_admin' | 'admin' | 'profesor' | 'alumno'

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
}: UsuariosAdminTableProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [usuarioObjetivo, setUsuarioObjetivo] = useState<UsuarioRow | null>(null)
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario>('admin')
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

  const abrirModalAcceso = (usuario: UsuarioRow) => {
    setUsuarioObjetivo(usuario)
    setRolSeleccionado('admin')
    setSedeSeleccionada('')
  }

  const cerrarModalAcceso = () => {
    if (loadingRol) return
    setUsuarioObjetivo(null)
    setRolSeleccionado('admin')
    setSedeSeleccionada('')
  }

  const guardarRol = async () => {
    if (!usuarioObjetivo) return

    if (rolSeleccionado !== 'super_admin' && !sedeSeleccionada) {
      toast.error('Selecciona una sede para continuar.')
      return
    }

    setLoadingRol(true)
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
      cerrarModalAcceso()
      router.refresh()
    } catch (error) {
      toast.error('No se pudo asignar el rol.')
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

    setCreatingUser(true)
    try {
      const result = await crearUsuario({
        nombre: nuevoUsuario.nombre.trim(),
        apellido: nuevoUsuario.apellido.trim(),
        email: nuevoUsuario.email.trim().toLowerCase(),
        telefono: nuevoUsuario.telefono.trim() || null,
        password: nuevoUsuario.password,
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

      const result = await importarUsuarios(rows)
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
          {canAssignSuperAdmin && (
            <Button onClick={() => setImportModalOpen(true)} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Importar usuarios
            </Button>
          )}
          {canCreateUsers && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Button>
          )}
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
            {rolSeleccionado !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="sede-usuario">Sede</Label>
                <Select value={sedeSeleccionada} onValueChange={setSedeSeleccionada}>
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
              <Label htmlFor="rol-usuario">Rol</Label>
              <Select
                value={rolSeleccionado}
                onValueChange={(value) => {
                  setRolSeleccionado(value as RolUsuario)
                  if (value === 'super_admin') {
                    setSedeSeleccionada('')
                  }
                }}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarModalAcceso} disabled={loadingRol}>
              Cancelar
            </Button>
            <LoadingButton loading={loadingRol} loadingText="Guardando..." onClick={guardarRol}>
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
