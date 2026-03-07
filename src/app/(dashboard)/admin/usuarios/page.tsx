/**
 * Pagina de gestion de usuarios (Admin)
 */

import { redirect } from 'next/navigation'
import { UsuariosAdminTable } from '@/components/usuarios/UsuariosAdminTable'
import { getUser } from '@/lib/actions/auth.actions'
import { getSedesParaAsignacion, getUsuarios } from '@/lib/actions/usuarios.actions'

export default async function AdminUsuariosPage() {
  const [usuarioActual, usuariosResult, sedesResult] = await Promise.all([
    getUser(),
    getUsuarios(),
    getSedesParaAsignacion(),
  ])

  if (!usuarioActual) {
    redirect('/login')
  }

  const esSuperAdmin = !!usuarioActual.membresias?.some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )
  const esAdmin = !!usuarioActual.membresias?.some(
    (m: any) => m.rol === 'admin' && m.activa
  )

  if (!esSuperAdmin && !esAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          No autorizado para gestionar usuarios.
        </div>
      </div>
    )
  }

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios y asigna rol/sede
        </p>
      </div>

      <UsuariosAdminTable
        usuarios={usuarios as any[]}
        sedes={sedes as any[]}
        canAssignSuperAdmin={esSuperAdmin}
        canCreateUsers={esSuperAdmin || esAdmin}
      />
    </div>
  )
}
