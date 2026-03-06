import { ProfesoresList } from '@/components/profesores/ProfesoresList'
import { obtenerProfesores } from '@/lib/actions/profesores.actions'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminProfesoresPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Obtener la sede del admin
  const supabase = await createClient()
  const { data: membresia } = await supabase
    .from('membresias')
    .select('sede_id, rol')
    .eq('usuario_id', usuario.id)
    .eq('rol', 'admin')
    .single()

  if (!membresia) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No tienes permisos de administrador. Contacta al Super Admin.
        </p>
      </div>
    )
  }

  // Obtener profesores de la sede del admin
  const result = await obtenerProfesores(membresia.sede_id)

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
        <h1 className="text-3xl font-bold">Gestión de Profesores</h1>
        <p className="text-muted-foreground mt-2">
          Administra los profesores de tu sede
        </p>
      </div>

      <ProfesoresList profesores={result.data || []} sedeId={membresia.sede_id} />
    </div>
  )
}
