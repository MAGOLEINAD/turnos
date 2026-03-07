import { redirect } from 'next/navigation'
import { ProfesoresList } from '@/components/profesores/ProfesoresList'
import { obtenerProfesores } from '@/lib/actions/profesores.actions'
import { getAdminSedeContext } from '@/lib/actions/admin-context.actions'
import { SedeContextSelector } from '@/components/sedes/SedeContextSelector'

interface AdminProfesoresPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function AdminProfesoresPage({ searchParams }: AdminProfesoresPageProps) {
  const ctx = await getAdminSedeContext(searchParams?.sede)
  if (!ctx.usuario) {
    redirect('/login')
  }

  if (ctx.error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Error: {ctx.error}</p>
      </div>
    )
  }

  if (ctx.sedes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No tienes permisos de administrador. Contacta al Super Admin.
        </p>
      </div>
    )
  }

  const sedesDisponibles = ctx.sedes
  // Si no hay parámetro sede, obtener profesores de todas las sedes
  const sedeSeleccionada = searchParams?.sede || null

  const result = sedeSeleccionada
    ? await obtenerProfesores(sedeSeleccionada)
    : await obtenerProfesores(null) // null = todas las sedes del admin

  if (result.error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Error: {result.error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Gestion de Profesores</h1>
          <p className="mt-2 text-muted-foreground">
            Administra profesores por sede dentro de tu cliente.
          </p>
        </div>

        <SedeContextSelector sedes={sedesDisponibles} sedeSeleccionada={sedeSeleccionada} />
      </div>

      <ProfesoresList
        profesores={result.data || []}
        sedeId={sedeSeleccionada || sedesDisponibles[0]?.id}
        sedes={sedesDisponibles.map((sede) => ({ id: sede.id, nombre: sede.nombre }))}
      />
    </div>
  )
}
