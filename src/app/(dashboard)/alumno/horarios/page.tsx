import { HorariosFijosList } from '@/components/horarios-fijos/HorariosFijosList'
import { obtenerHorariosFijosAlumno } from '@/lib/actions/horarios-fijos.actions'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AlumnoHorariosPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Obtener perfil de alumno
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

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, sede_id')
    .eq('usuario_id', usuario.id)
    .eq('sede_id', sedeContexto)
    .single()

  if (!alumno) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No se encontró tu perfil de alumno. Contacta al administrador.
        </p>
      </div>
    )
  }

  // Obtener horarios fijos del alumno
  const result = await obtenerHorariosFijosAlumno(alumno.id)

  if (result.error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error: {result.error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mis Horarios Fijos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus horarios recurrentes
        </p>
      </div>

      <HorariosFijosList
        horariosFijos={result.data || []}
        sedeId={alumno.sede_id}
        alumnoId={alumno.id}
        mostrarBotonCrear={false}
      />
    </div>
  )
}
