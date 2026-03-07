import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { obtenerCuotasAlumno } from '@/lib/actions/cuotas.actions'
import { CuotasAlumnoPanel } from '@/components/alumnos/CuotasAlumnoPanel'
import { obtenerHistorialPagosAlumno } from '@/lib/actions/pagos.actions'
import { HistorialPagosPanel } from '@/components/alumnos/HistorialPagosPanel'

export default async function AlumnoPagosPage() {
  const usuario = await getUser()
  if (!usuario) redirect('/login')

  const supabase = await createClient()

  const { data: membresiasAlumno } = await supabase
    .from('membresias')
    .select('sede_id')
    .eq('usuario_id', usuario.id)
    .eq('rol', 'alumno')
    .eq('activa', true)
    .not('sede_id', 'is', null)

  const sedeIdsPermitidas = (membresiasAlumno || [])
    .map((m: any) => m.sede_id)
    .filter((id: any): id is string => !!id)

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

  const alumno =
    (perfilesAlumno || []).find((perfil: any) => perfil.sede_id === sedeContexto) ||
    perfilesAlumno?.[0]

  if (!alumno) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No se encontró tu perfil de alumno. Contacta al administrador.
        </p>
      </div>
    )
  }

  const cuotasResult = await obtenerCuotasAlumno(alumno.id, alumno.sede_id)
  const pagosResult = await obtenerHistorialPagosAlumno(alumno.id, alumno.sede_id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pagos</h1>
        <p className="mt-2 text-muted-foreground">
          Gestiona tus cuotas mensuales y regulariza pagos pendientes.
        </p>
      </div>

      <CuotasAlumnoPanel cuotas={(cuotasResult.data || []) as any[]} />
      <HistorialPagosPanel
        pagos={(pagosResult.data || []) as any[]}
        title="Historial de pagos (digitales y manuales)"
      />
    </div>
  )
}
