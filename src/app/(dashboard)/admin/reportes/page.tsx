import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAdminSedeContext } from '@/lib/actions/admin-context.actions'

interface AdminReportesPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function AdminReportesPage({ searchParams }: AdminReportesPageProps) {
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

  const sedesDisponibles = ctx.sedes
  const sedeSeleccionada = ctx.sedeSeleccionada

  if (sedesDisponibles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No tienes permisos de admin para una sede.</p>
      </div>
    )
  }

  if (!sedeSeleccionada) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No hay sedes disponibles para mostrar reportes.</p>
      </div>
    )
  }

  const supabase = createServiceRoleClient()

  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const [reservasTotales, confirmadasMes, canceladasMes, profesoresActivos, alumnosActivos] =
    await Promise.all([
      supabase.from('reservas').select('id', { count: 'exact', head: true }).eq('sede_id', sedeSeleccionada),
      supabase
        .from('reservas')
        .select('id', { count: 'exact', head: true })
        .eq('sede_id', sedeSeleccionada)
        .eq('estado', 'confirmada')
        .gte('fecha_inicio', inicioMes.toISOString()),
      supabase
        .from('reservas')
        .select('id', { count: 'exact', head: true })
        .eq('sede_id', sedeSeleccionada)
        .eq('estado', 'cancelada')
        .gte('fecha_inicio', inicioMes.toISOString()),
      supabase
        .from('profesores')
        .select('id', { count: 'exact', head: true })
        .eq('sede_id', sedeSeleccionada)
        .eq('activo', true),
      supabase
        .from('alumnos')
        .select('id', { count: 'exact', head: true })
        .eq('sede_id', sedeSeleccionada)
        .eq('activo', true),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="mt-2 text-muted-foreground">
          Metricas base por sede para seguimiento operativo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contexto de sede</CardTitle>
          <CardDescription>Selecciona la sede para ver reportes.</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button type="submit">Ver reportes</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reservas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reservasTotales.count || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confirmadas (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{confirmadasMes.count || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Canceladas (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{canceladasMes.count || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profesores Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profesoresActivos.count || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alumnos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alumnosActivos.count || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
