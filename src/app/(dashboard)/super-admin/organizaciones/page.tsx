import { OrganizacionesList } from '@/components/organizaciones/OrganizacionesList'
import { obtenerOrganizaciones } from '@/lib/actions/organizaciones.actions'

export default async function OrganizacionesPage() {
  const result = await obtenerOrganizaciones()
  const organizaciones = result.data || []

  return <OrganizacionesList organizacionesIniciales={organizaciones} />
}
