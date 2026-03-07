import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { CalendarioProfesorAgenda } from '@/components/calendario/CalendarioProfesorAgenda'

export default async function ProfesorAgendaPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: membresiasProfesor } = await supabase
    .from('membresias')
    .select('sede_id')
    .eq('usuario_id', usuario.id)
    .eq('rol', 'profesor')
    .eq('activa', true)
    .not('sede_id', 'is', null)

  const sedeIdsPermitidas = (membresiasProfesor || [])
    .map((m: any) => m.sede_id)
    .filter((id: any): id is string => !!id)

  if (sedeIdsPermitidas.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No tienes accesos activos de profesor. Contacta al administrador.
        </p>
      </div>
    )
  }

  const { data: perfilesProfesor } = await supabase
    .from('profesores')
    .select(
      `
      id,
      sede_id,
      sedes (
        id,
        nombre
      )
    `
    )
    .eq('usuario_id', usuario.id)
    .eq('activo', true)
    .in('sede_id', sedeIdsPermitidas)
    .order('created_at', { ascending: true })

  if (!perfilesProfesor || perfilesProfesor.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No se encontro el perfil de profesor. Contacta al administrador.
        </p>
      </div>
    )
  }

  const perfiles = (perfilesProfesor as any[]).map((perfil) => ({
    id: perfil.id,
    sede_id: perfil.sede_id,
    sede_nombre: perfil.sedes?.nombre || 'Sede sin nombre',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Agenda Unificada</h1>
        <p className="mt-2 text-muted-foreground">
          Vista combinada de tus horarios y reservas en todas tus sedes.
        </p>
      </div>

      <CalendarioProfesorAgenda perfiles={perfiles} />
    </div>
  )
}
