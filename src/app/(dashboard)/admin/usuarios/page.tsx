/**
 * Pagina de gestion de usuarios (Admin)
 */

import { redirect } from 'next/navigation'
import { UsuariosAdminTable } from '@/components/usuarios/UsuariosAdminTable'
import { getUsuariosAdminPageData } from '@/lib/actions/usuarios.actions'

export default async function AdminUsuariosPage() {
  const pageData = await getUsuariosAdminPageData()
  const usuarioActual = pageData.usuario

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

  if (pageData.error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Error al cargar usuarios: {pageData.error}
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
        usuarios={pageData.usuarios as any[]}
        sedes={pageData.sedes as any[]}
        currentUserId={usuarioActual.id}
        canAssignSuperAdmin={esSuperAdmin}
        canCreateUsers={esSuperAdmin || esAdmin}
      />
    </div>
  )
}
