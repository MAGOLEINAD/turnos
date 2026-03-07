import { redirect } from 'next/navigation'
import { ConfiguracionSede } from '@/components/sedes/ConfiguracionSede'
import { obtenerConfiguracionSede } from '@/lib/actions/configuracion-sede.actions'
import { getAdminSedeContext } from '@/lib/actions/admin-context.actions'
import { Button } from '@/components/ui/button'

interface AdminConfiguracionPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function AdminConfiguracionPage({ searchParams }: AdminConfiguracionPageProps) {
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
  const sedeSeleccionada = ctx.sedeSeleccionada

  if (!sedeSeleccionada) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No hay sedes disponibles para configurar.</p>
      </div>
    )
  }

  const result = await obtenerConfiguracionSede(sedeSeleccionada)

  if (result.error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Error: {result.error}</p>
      </div>
    )
  }

  const sedeActual = sedesDisponibles.find((s) => s.id === sedeSeleccionada)

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Configuracion</h1>
          <p className="mt-2 text-muted-foreground">
            Ajusta parametros de funcionamiento para {sedeActual?.nombre || 'la sede'}.
          </p>
        </div>

        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-sm">
            <label htmlFor="sede" className="text-sm font-medium">
              Sede
            </label>
            <select
              id="sede"
              name="sede"
              defaultValue={sedeSeleccionada}
              className="mt-1 w-full rounded-md border px-3 py-2"
              disabled={sedesDisponibles.length <= 1}
            >
              {sedesDisponibles.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Ver sede</Button>
        </form>
      </div>

      <ConfiguracionSede sedeId={sedeSeleccionada} configuracion={result.data} />
    </div>
  )
}
