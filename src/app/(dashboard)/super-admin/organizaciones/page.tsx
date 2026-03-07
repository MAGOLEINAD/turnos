import { OrganizacionesList } from '@/components/organizaciones/OrganizacionesList'
import { obtenerAdminsDisponibles, obtenerOrganizaciones } from '@/lib/actions/organizaciones.actions'

export default async function OrganizacionesPage() {
  const [result, adminsResult] = await Promise.all([
    obtenerOrganizaciones(),
    obtenerAdminsDisponibles(),
  ])

  if (result.error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Error al cargar clientes: {result.error}
      </div>
    )
  }

  if (adminsResult.error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Error al cargar admins: {adminsResult.error}
      </div>
    )
  }

  const organizaciones = result.data || []
  const admins = adminsResult.data || []

  return <OrganizacionesList organizacionesIniciales={organizaciones} admins={admins} />
}
