import { CalendarioAlumno } from '@/components/calendario/CalendarioAlumno'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AlumnoCalendarioPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Obtener datos del alumno
  const supabase = await createClient()
  const { data: membresiasAlumno } = await supabase
    .from('membresias')
    .select('sede_id')
    .eq('usuario_id', usuario.id)
    .eq('rol', 'alumno')
    .eq('activa', true)
    .not('sede_id', 'is', null)

  const sedeIdsPermitidas = (membresiasAlumno || [])
    .map((m) => m.sede_id)
    .filter((id): id is string => !!id)

  if (sedeIdsPermitidas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No tienes accesos activos de alumno. Contacta al administrador.
        </p>
      </div>
    )
  }

  const sedeContexto =
    usuario?.membresia_activa?.rol === 'alumno' && usuario?.membresia_activa?.sede_id
      ? usuario.membresia_activa.sede_id
      : sedeIdsPermitidas[0]

  const { data: perfilesAlumno } = await supabase
    .from('alumnos')
    .select('id, sede_id')
    .eq('usuario_id', usuario.id)
    .in('sede_id', sedeIdsPermitidas)
    .eq('activo', true)

  const alumno = (perfilesAlumno || []).find((perfil) => perfil.sede_id === sedeContexto) || perfilesAlumno?.[0]

  if (!alumno) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No se encontró el perfil de alumno. Contacta al administrador.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Calendario de Clases</h1>
        <p className="text-muted-foreground mt-2">
          Explora y reserva clases disponibles
        </p>
      </div>

      <CalendarioAlumno
        usuarioId={usuario.id}
        alumnoId={alumno.id}
        sedeId={alumno.sede_id}
      />
    </div>
  )
}
