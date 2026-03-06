import { ConfiguracionSede } from '@/components/sedes/ConfiguracionSede'
import { obtenerConfiguracionSede } from '@/lib/actions/configuracion-sede.actions'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminConfiguracionPage() {
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

  // Obtener configuración de la sede
  const result = await obtenerConfiguracionSede(membresia.sede_id)

  if (result.error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error: {result.error}</p>
      </div>
    )
  }

  // Obtener información de la sede
  const { data: sede } = await supabase
    .from('sedes')
    .select('nombre')
    .eq('id', membresia.sede_id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Ajusta los parámetros de funcionamiento de {sede?.nombre || 'tu sede'}
        </p>
      </div>

      <ConfiguracionSede
        sedeId={membresia.sede_id}
        configuracion={result.data}
      />
    </div>
  )
}
