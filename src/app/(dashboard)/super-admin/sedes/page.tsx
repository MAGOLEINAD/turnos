import { obtenerSedes } from '@/lib/actions/sedes.actions'
import { obtenerOrganizaciones } from '@/lib/actions/organizaciones.actions'
import { SedesList } from '@/components/sedes/SedesList'

export default async function SedesPage() {
  const [sedesResult, orgsResult] = await Promise.all([
    obtenerSedes(),
    obtenerOrganizaciones(),
  ])

  const sedes = sedesResult.data || []
  const organizaciones = orgsResult.data || []

  return <SedesList sedesIniciales={sedes} organizaciones={organizaciones} />
}
