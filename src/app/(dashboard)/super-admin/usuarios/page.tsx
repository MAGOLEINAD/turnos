/**
 * Pagina de gestion de usuarios (Super Admin)
 */

import { UsuariosAdminTable } from '@/components/usuarios/UsuariosAdminTable'
import { getUser } from '@/lib/actions/auth.actions'
import { getSedesParaAsignacion, getUsuarios } from '@/lib/actions/usuarios.actions'

export default async function UsuariosPage() {
  const [usuarioActual, usuariosResult, sedesResult] = await Promise.all([
    getUser(),
    getUsuarios(),
    getSedesParaAsignacion(),
  ])

  const usuarios = usuariosResult.data || []
  const sedes = sedesResult.data || []

  if (usuariosResult.error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Error al cargar usuarios: {usuariosResult.error}
        </div>
      </div>
    )
  }

  if (sedesResult.error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Error al cargar sedes: {sedesResult.error}
        </div>
      </div>
    )
  }

  const canAssignSuperAdmin = !!usuarioActual?.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona todos los usuarios del sistema
        </p>
      </div>

      <UsuariosAdminTable
        usuarios={usuarios as any[]}
        sedes={sedes as any[]}
        canAssignSuperAdmin={canAssignSuperAdmin}
        canCreateUsers={canAssignSuperAdmin}
        showClientFilter={true}
      />
    </div>
  )
}
