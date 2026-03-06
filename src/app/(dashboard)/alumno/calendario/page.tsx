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
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, sede_id')
    .eq('usuario_id', usuario.id)
    .single()

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
