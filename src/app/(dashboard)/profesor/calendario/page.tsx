import { CalendarioProfesor } from '@/components/calendario/CalendarioProfesor'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfesorCalendarioPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Obtener datos del profesor
  const supabase = await createClient()
  const { data: profesor } = await supabase
    .from('profesores')
    .select('id, sede_id')
    .eq('usuario_id', usuario.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (!profesor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No se encontró el perfil de profesor. Contacta al administrador.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mi Calendario</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus reservas, horarios y disponibilidad
        </p>
      </div>

      <CalendarioProfesor
        usuarioId={usuario.id}
        profesorId={profesor.id}
        sedeId={profesor.sede_id}
      />
    </div>
  )
}
