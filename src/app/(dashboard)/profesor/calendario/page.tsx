import { CalendarioProfesor } from '@/components/calendario/CalendarioProfesor'
import { SedeContextSelector } from '@/components/sedes/SedeContextSelector'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface ProfesorCalendarioPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function ProfesorCalendarioPage({ searchParams }: ProfesorCalendarioPageProps) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Obtener datos del profesor
  const supabase = await createClient()
  const { data: membresiasProfesor } = await supabase
    .from('membresias')
    .select('sede_id')
    .eq('usuario_id', usuario.id)
    .eq('rol', 'profesor')
    .eq('activa', true)
    .not('sede_id', 'is', null)

  const sedeIdsPermitidas = (membresiasProfesor || [])
    .map((m) => m.sede_id)
    .filter((id): id is string => !!id)

  if (sedeIdsPermitidas.length === 0) {
    return (
      <div className="text-center py-12">
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
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No se encontró el perfil de profesor. Contacta al administrador.
        </p>
      </div>
    )
  }

  const perfiles = perfilesProfesor as any[]
  const sedeSeleccionada =
    (searchParams?.sede && perfiles.find((perfil) => perfil.sede_id === searchParams.sede)?.sede_id) ||
    perfiles[0].sede_id
  const perfilSeleccionado = perfiles.find((perfil) => perfil.sede_id === sedeSeleccionada) || perfiles[0]
  const sedesDisponibles = perfiles.map((perfil) => ({
    id: perfil.sede_id,
    nombre: perfil.sedes?.nombre || 'Sede sin nombre',
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mi Calendario</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus reservas, horarios y disponibilidad
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <SedeContextSelector sedes={sedesDisponibles} sedeSeleccionada={sedeSeleccionada} showAllOption={false} />
      </div>

      <CalendarioProfesor
        usuarioId={usuario.id}
        profesorId={perfilSeleccionado.id}
        sedeId={perfilSeleccionado.sede_id}
      />
    </div>
  )
}
