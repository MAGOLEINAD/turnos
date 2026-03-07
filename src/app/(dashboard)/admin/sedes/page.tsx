import { SedesList } from '@/components/sedes/SedesList'
import { obtenerOrganizaciones } from '@/lib/actions/organizaciones.actions'
import { obtenerSedes } from '@/lib/actions/sedes.actions'

export default async function AdminSedesPage() {
  const [sedesResult, orgsResult] = await Promise.all([
    obtenerSedes(),
    obtenerOrganizaciones(),
  ])

  if (sedesResult.error || orgsResult.error) {
    return (
      <div className="space-y-2">
        {sedesResult.error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Error al cargar sedes: {sedesResult.error}
          </div>
        )}
        {orgsResult.error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Error al cargar clientes: {orgsResult.error}
          </div>
        )}
      </div>
    )
  }

  const sedes = sedesResult.data || []
  const organizaciones = orgsResult.data || []

  return (
    <SedesList
      sedesIniciales={sedes}
      organizaciones={organizaciones}
      canSelectOrganizacion={false}
      showEntrarASede={false}
    />
  )
}
