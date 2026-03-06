import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AdminReportesPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function AdminReportesPage({ searchParams }: AdminReportesPageProps) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const supabase = await createClient()
  const esSuperAdmin = usuario.membresias?.some((m: any) => m.rol === 'super_admin' && m.activa)

  let sedesDisponibles: Array<{ id: string; nombre: string }> = []
  let sedeSeleccionada = searchParams?.sede || ''

  if (esSuperAdmin) {
    const { data: sedes } = await supabase
      .from('sedes')
      .select('id, nombre')
      .order('nombre', { ascending: true })

    sedesDisponibles = sedes || []
    if (!sedeSeleccionada && sedesDisponibles.length > 0) {
      sedeSeleccionada = sedesDisponibles[0].id
    }
  } else {
    const { data: membresia } = await supabase
      .from('membresias')
      .select('sede_id, rol')
      .eq('usuario_id', usuario.id)
      .eq('rol', 'admin')
      .single()

    if (!membresia?.sede_id) {
      return (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No tienes permisos de admin para una sede.</p>
        </div>
      )
    }

    sedeSeleccionada = membresia.sede_id
    const { data: sede } = await supabase
      .from('sedes')
      .select('id, nombre')
      .eq('id', membresia.sede_id)
      .single()

    if (sede) {
      sedesDisponibles = [sede]
    }
  }

  if (!sedeSeleccionada) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No hay sedes disponibles para mostrar reportes.</p>
      </div>
    )
  }

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
          Métricas base por sede para seguimiento operativo.
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
