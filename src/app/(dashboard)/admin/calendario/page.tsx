import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AdminCalendarioPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function AdminCalendarioPage({ searchParams }: AdminCalendarioPageProps) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const supabase = createServiceRoleClient()
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
    const { data: memberships } = await supabase
      .from('membresias')
      .select('organizacion_id')
      .eq('usuario_id', usuario.id)
      .eq('rol', 'admin')
      .eq('activa', true)

    const orgIdsSet = new Set<string>(
      (memberships || []).map((m: any) => m.organizacion_id).filter(Boolean)
    )

    const { data: orgsComoAdminUsuario } = await supabase
      .from('organizaciones')
      .select('id')
      .eq('admin_usuario_id', usuario.id)

    for (const org of orgsComoAdminUsuario || []) {
      if (org.id) orgIdsSet.add(org.id)
    }

    const orgIds = Array.from(orgIdsSet)

    if (orgIds.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No tienes permisos de admin para una sede.</p>
        </div>
      )
    }

    const { data: sedes } = await supabase
      .from('sedes')
      .select('id, nombre')
      .in('organizacion_id', orgIds)
      .eq('activa', true)
      .order('nombre', { ascending: true })

    sedesDisponibles = sedes || []
    if (!sedeSeleccionada && sedesDisponibles.length > 0) {
      sedeSeleccionada = sedesDisponibles[0].id
    }
  }

  if (!sedeSeleccionada) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No hay sedes disponibles para mostrar.</p>
      </div>
    )
  }

  const hoy = new Date()
  const inicioDia = new Date(hoy)
  inicioDia.setHours(0, 0, 0, 0)
  const finDia = new Date(hoy)
  finDia.setHours(23, 59, 59, 999)

  const [reservasHoyResult, reservasProximasResult] = await Promise.all([
    supabase
      .from('reservas')
      .select('id')
      .eq('sede_id', sedeSeleccionada)
      .eq('estado', 'confirmada')
      .gte('fecha_inicio', inicioDia.toISOString())
      .lte('fecha_inicio', finDia.toISOString()),
    supabase
      .from('reservas')
      .select(
        `
        id,
        tipo,
        estado,
        fecha_inicio,
        fecha_fin,
        profesores (
          usuarios (nombre, apellido)
        )
      `
      )
      .eq('sede_id', sedeSeleccionada)
      .in('estado', ['confirmada', 'cancelada'])
      .gte('fecha_inicio', new Date().toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(12),
  ])

  const reservasHoy = reservasHoyResult.data?.length || 0
  const proximasReservas = reservasProximasResult.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendario Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Vista operativa de reservas por sede con acceso rapido a la agenda de profesor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contexto de sede</CardTitle>
          <CardDescription>Selecciona la sede para ver actividad de calendario.</CardDescription>
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
            <Button type="submit">Ver calendario</Button>
            <Button asChild variant="outline">
              <Link href="/profesor/calendario">Abrir calendario profesor</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reservas hoy</CardTitle>
            <CardDescription>Confirmadas para la sede seleccionada.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{reservasHoy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Proximas reservas</CardTitle>
            <CardDescription>Siguientes 12 eventos (confirmadas/canceladas).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{proximasReservas.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda proxima</CardTitle>
          <CardDescription>Lista resumida de actividad por sede.</CardDescription>
        </CardHeader>
        <CardContent>
          {proximasReservas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay reservas para mostrar.</p>
          ) : (
            <div className="space-y-3">
              {proximasReservas.map((reserva: any) => (
                <div
                  key={reserva.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(reserva.fecha_inicio).toLocaleString('es-AR')}
                    </p>
                    <p className="text-muted-foreground">
                      {reserva.tipo} -{' '}
                      {reserva.profesores?.usuarios
                        ? `${reserva.profesores.usuarios.nombre} ${reserva.profesores.usuarios.apellido}`
                        : 'Profesor sin datos'}
                    </p>
                  </div>
                  <span className="rounded bg-muted px-2 py-1 text-xs">{reserva.estado}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
