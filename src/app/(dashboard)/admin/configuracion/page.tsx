import { redirect } from 'next/navigation'
import { ConfiguracionSede } from '@/components/sedes/ConfiguracionSede'
import { obtenerConfiguracionSede } from '@/lib/actions/configuracion-sede.actions'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

interface AdminConfiguracionPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function AdminConfiguracionPage({ searchParams }: AdminConfiguracionPageProps) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from('membresias')
    .select('sede_id, organizacion_id')
    .eq('usuario_id', usuario.id)
    .eq('rol', 'admin')
    .eq('activa', true)

  const orgIds = Array.from(
    new Set((memberships || []).map((m: any) => m.organizacion_id).filter(Boolean))
  )

  if (orgIds.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No tienes permisos de administrador. Contacta al Super Admin.
        </p>
      </div>
    )
  }

  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre, organizacion_id')
    .in('organizacion_id', orgIds)
    .order('nombre', { ascending: true })

  const sedesDisponibles = sedes || []
  const sedeSeleccionada =
    (searchParams?.sede && sedesDisponibles.find((s) => s.id === searchParams.sede)?.id) ||
    sedesDisponibles[0]?.id

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
