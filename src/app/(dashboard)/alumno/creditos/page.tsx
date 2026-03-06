import { CreditosAlumno } from '@/components/alumnos/CreditosAlumno'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AlumnoCreditosPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Obtener perfil de alumno
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
          No se encontró tu perfil de alumno. Contacta al administrador.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mis Créditos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona y utiliza tus créditos de recupero
        </p>
      </div>

      <CreditosAlumno alumnoId={alumno.id} sedeId={alumno.sede_id} />
    </div>
  )
}
