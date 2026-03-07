/**
 * Pagina de gestion de usuarios (Super Admin)
 */

import { UsuariosAdminTable } from '@/components/usuarios/UsuariosAdminTable'
import { redirect } from 'next/navigation'
import { getUsuariosAdminPageData } from '@/lib/actions/usuarios.actions'

export default async function UsuariosPage() {
  const pageData = await getUsuariosAdminPageData()
  const usuarioActual = pageData.usuario
  if (!usuarioActual) redirect('/login')

  if (pageData.error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Error al cargar usuarios: {pageData.error}
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
        usuarios={pageData.usuarios as any[]}
        sedes={pageData.sedes as any[]}
        currentUserId={usuarioActual.id}
        canAssignSuperAdmin={canAssignSuperAdmin}
        canCreateUsers={canAssignSuperAdmin}
        showClientFilter={true}
      />
    </div>
  )
}
