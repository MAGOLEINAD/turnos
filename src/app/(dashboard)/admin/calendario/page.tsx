import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAdminSedeContext } from '@/lib/actions/admin-context.actions'
import { CalendarioFullCalendar } from '@/components/calendario/CalendarioFullCalendar'
import { AdminCalendarioFilters } from '@/components/calendario/AdminCalendarioFilters'
import { bloqueoToEvent, reservaToEvent, horarioFijoToEvent } from '@/lib/utils/calendario'
import { generarOcurrenciasMultiplesHorariosFijos } from '@/lib/utils/recurrencia'

interface AdminCalendarioPageProps {
  searchParams?: {
    sede?: string
    profesor?: string
  }
}

export default async function AdminCalendarioPage({ searchParams }: AdminCalendarioPageProps) {
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
  const profesorSeleccionado = searchParams?.profesor || 'todos'

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
        <p className="text-muted-foreground">No hay sedes disponibles para mostrar.</p>
      </div>
    )
  }

  const supabase = createServiceRoleClient()
  const { data: profesorPropio } = await supabase
    .from('profesores')
    .select('id')
    .eq('usuario_id', ctx.usuario.id)
    .eq('activo', true)
    .eq('sede_id', sedeSeleccionada)
    .maybeSingle()
  const { data: profesoresData } = await supabase
    .from('profesores')
    .select(
      `
      id,
      sede_id,
      usuarios (nombre, apellido)
    `
    )
    .eq('activo', true)
    .eq('sede_id', sedeSeleccionada)
    .order('created_at', { ascending: true })

  const profesores = (profesoresData || []) as any[]
  const idsProfesoresSede = profesores.map((p) => p.id).filter(Boolean)
  const idsProfesoresConsulta =
    profesorSeleccionado !== 'todos' ? [profesorSeleccionado] : idsProfesoresSede
  const profesorEsValido =
    profesorSeleccionado === 'todos' || idsProfesoresSede.includes(profesorSeleccionado)
  const profesorFiltroFinal = profesorEsValido ? profesorSeleccionado : 'todos'

  const [reservasResult, horariosFijosResult, bloqueosResult] = await Promise.all([
    idsProfesoresConsulta.length > 0
      ? supabase
          .from('reservas')
          .select(
            `
            *,
            profesores (
              id,
              usuarios (nombre, apellido)
            ),
            sedes (nombre)
          `
          )
          .eq('sede_id', sedeSeleccionada)
          .in('estado', ['confirmada', 'cancelada'])
          .in(
            'profesor_id',
            profesorFiltroFinal !== 'todos' ? [profesorFiltroFinal] : idsProfesoresConsulta
          )
          .order('fecha_inicio', { ascending: true })
      : Promise.resolve({ data: [], error: null } as any),
    idsProfesoresConsulta.length > 0
      ? supabase
          .from('horarios_fijos')
          .select(
            `
            *,
            profesores (
              id,
              usuarios (nombre, apellido)
            ),
            alumnos (
              id,
              usuarios (nombre, apellido)
            ),
            sedes (nombre),
            cuotas_mensuales (
              anio,
              mes,
              estado,
              fecha_limite_final
            )
          `
          )
          .eq('activo', true)
          .eq('sede_id', sedeSeleccionada)
          .in(
            'profesor_id',
            profesorFiltroFinal !== 'todos' ? [profesorFiltroFinal] : idsProfesoresConsulta
          )
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any),
    idsProfesoresConsulta.length > 0
      ? supabase
          .from('bloqueos_disponibilidad')
          .select(
            `
            *,
            profesores (
              id,
              usuarios (nombre, apellido)
            )
          `
          )
          .in(
            'profesor_id',
            profesorFiltroFinal !== 'todos' ? [profesorFiltroFinal] : idsProfesoresConsulta
          )
          .order('fecha_inicio', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any),
  ])

  const eventos: any[] = []

  for (const reserva of reservasResult.data || []) {
    eventos.push(reservaToEvent(reserva))
  }

  const hoy = new Date()
  const dentroTresMeses = new Date()
  dentroTresMeses.setMonth(dentroTresMeses.getMonth() + 3)
  const horariosFijos = horariosFijosResult.data || []
  const ocurrencias = generarOcurrenciasMultiplesHorariosFijos(horariosFijos, hoy, dentroTresMeses)
  for (const ocurrencia of ocurrencias) {
    const horario = horariosFijos.find((h: any) => h.id === ocurrencia.horarioFijoId)
    if (!horario) continue
    const evento = horarioFijoToEvent(
      horario,
      ocurrencia.fecha,
      (ocurrencia as any).estadoCuota
    )
    eventos.push({
      ...evento,
      start: evento.start instanceof Date ? evento.start.toISOString() : evento.start,
      end: evento.end instanceof Date ? evento.end.toISOString() : evento.end,
    })
  }

  for (const bloqueo of bloqueosResult.data || []) {
    eventos.push(bloqueoToEvent(bloqueo))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendario Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Calendario compartido por sede. Puedes ver todos los profesores o filtrar por uno.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Datos limitados a la sede seleccionada (cliente en cuestion).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-2xl">
              <AdminCalendarioFilters
                sedes={sedesDisponibles}
                sedeSeleccionada={sedeSeleccionada}
                profesorSeleccionado={profesorFiltroFinal}
                profesores={profesores.map((profesor) => ({
                  id: profesor.id,
                  nombre:
                    `${profesor.usuarios?.nombre || ''} ${profesor.usuarios?.apellido || ''}`.trim() ||
                    'Profesor sin nombre',
                }))}
              />
            </div>
            {profesorPropio ? (
              <Button asChild variant="outline">
                <Link href="/profesor/calendario">Abrir mi calendario de profesor</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendario Compartido</CardTitle>
          <CardDescription>
            Mostrando {profesorFiltroFinal === 'todos' ? 'todos los profesores' : 'profesor seleccionado'} en la
            sede actual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarioFullCalendar eventos={eventos} selectable={false} editable={false} />
        </CardContent>
      </Card>
    </div>
  )
}
