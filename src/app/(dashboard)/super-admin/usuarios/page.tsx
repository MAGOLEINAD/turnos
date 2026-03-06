/**
 * Página de gestión de usuarios (Super Admin)
 */

import { getUsuarios } from '@/lib/actions/usuarios.actions'

export default async function UsuariosPage() {
  const result = await getUsuarios()
  const usuarios = result.data || []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona todos los usuarios del sistema
        </p>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario: any) => (
                  <tr key={usuario.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{usuario.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {usuario.nombre} {usuario.apellido}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {usuario.membresias?.[0]?.rol ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {usuario.membresias[0].rol}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin rol</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {usuario.membresias?.[0]?.activa ? (
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
                        day: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
