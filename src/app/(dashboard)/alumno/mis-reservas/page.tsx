import { CalendarioAlumnoAgenda } from '@/components/calendario/CalendarioAlumnoAgenda'
import { SedeContextSelector } from '@/components/sedes/SedeContextSelector'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface AlumnoAgendaPageProps {
  searchParams?: {
    sede?: string
  }
}

interface SedeOption {
  id: string
  nombre: string
}

type ReservaLite = {
  id: string
  sede_id: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

export default async function AlumnoMisReservasPage({ searchParams }: AlumnoAgendaPageProps) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const supabase = await createClient()

  const { data: membresiasAlumno } = await supabase
    .from('membresias')
    .select('sede_id, sedes(id, nombre)')
    .eq('usuario_id', usuario.id)
    .eq('rol', 'alumno')
    .eq('activa', true)
    .not('sede_id', 'is', null)

  const sedesPermitidas: SedeOption[] = (membresiasAlumno || [])
    .map((m: any) => {
      const sede = Array.isArray(m.sedes) ? m.sedes[0] : m.sedes
      return m.sede_id && sede?.nombre ? { id: m.sede_id as string, nombre: sede.nombre as string } : null
    })
    .filter((sede: SedeOption | null): sede is SedeOption => !!sede)

  const sedesUnicas: SedeOption[] = Array.from(new Map(sedesPermitidas.map((s: SedeOption) => [s.id, s])).values())

  if (sedesUnicas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tienes accesos activos de alumno. Contacta al administrador.</p>
      </div>
    )
  }

  const filtroSede = searchParams?.sede || null
  const sedeValida = filtroSede && sedesUnicas.some((s: SedeOption) => s.id === filtroSede) ? filtroSede : null

  const { data: perfilesAlumno } = await supabase
    .from('alumnos')
    .select('id, sede_id')
    .eq('usuario_id', usuario.id)
    .eq('activo', true)
    .in('sede_id', sedesUnicas.map((s: SedeOption) => s.id))

  const alumnoIds = (perfilesAlumno || []).map((a: any) => a.id).filter(Boolean)

  const individualesQuery = supabase
    .from('reservas')
    .select(
      `
      id,
      tipo,
      sede_id,
      fecha_inicio,
      fecha_fin,
      estado,
      creado_por,
      profesores (
        usuarios (nombre, apellido)
      ),
      sedes (nombre)
    `
    )
    .eq('estado', 'confirmada')
    .eq('creado_por', usuario.id)

  const grupalesQuery =
    alumnoIds.length > 0
      ? supabase
          .from('participantes_reserva')
          .select(
            `
            id,
            alumno_id,
            reservas (
              id,
              tipo,
              sede_id,
              fecha_inicio,
              fecha_fin,
              estado,
              profesores (
                usuarios (nombre, apellido)
              ),
              sedes (nombre)
            )
          `
          )
          .in('alumno_id', alumnoIds)
      : null

  const [individualesRes, grupalesRes]: any[] = await Promise.all([
    individualesQuery,
    grupalesQuery ? grupalesQuery : Promise.resolve({ data: [], error: null }),
  ])

  const individuales: ReservaLite[] = (individualesRes.data || []).filter((r: any) =>
    sedeValida ? r.sede_id === sedeValida : true
  )

  const grupales: ReservaLite[] = (grupalesRes.data || [])
    .map((row: any) => (Array.isArray(row.reservas) ? row.reservas[0] : row.reservas))
    .filter((r: any) => !!r && r.estado === 'confirmada')
    .filter((r: any) => (sedeValida ? r.sede_id === sedeValida : true))

  const reservasMap = new Map<string, ReservaLite>()
  for (const reserva of [...individuales, ...grupales]) {
    reservasMap.set(reserva.id, reserva)
  }
  const reservas: ReservaLite[] = Array.from(reservasMap.values()).sort(
    (a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Agenda</h1>
        <p className="text-muted-foreground mt-2">Tus reservas confirmadas en todas tus sedes.</p>
      </div>

      <SedeContextSelector sedes={sedesUnicas} sedeSeleccionada={sedeValida} showAllOption />

      <CalendarioAlumnoAgenda reservas={reservas as any[]} sedes={sedesUnicas} />
    </div>
  )
}
