import { OrganizacionesList } from '@/components/organizaciones/OrganizacionesList'
import { obtenerOrganizaciones } from '@/lib/actions/organizaciones.actions'

export default async function OrganizacionesPage() {
  const result = await obtenerOrganizaciones()
  if (result.error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Error al cargar organizaciones: {result.error}
      </div>
    )
  }
  const organizaciones = result.data || []

  return <OrganizacionesList organizacionesIniciales={organizaciones} />
}
