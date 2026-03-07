/**
 * Layout del dashboard con sidebar y navbar
 */

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  // Verificar si la organización está desactivada
  if (usuario.organizacion_desactivada) {
    redirect('/cuenta-desactivada')
  }

  // Obtener las sedes del usuario usando Service Role (bypass RLS)
  const supabase = createServiceRoleClient()

  const { data: membresias } = await supabase
    .from('membresias')
    .select(`
      sede_id,
      sedes!inner (
        id,
        nombre,
        activa
      )
    `)
    .eq('usuario_id', usuario.id)
    .eq('activa', true)

  // Extraer sedes únicas
  const sedesMap = new Map<string, { id: string; nombre: string }>()

  if (membresias) {
    for (const memb of membresias) {
      if (memb.sedes && memb.sedes.activa) {
        const sede = Array.isArray(memb.sedes) ? memb.sedes[0] : memb.sedes
        if (sede && sede.id && sede.nombre) {
          sedesMap.set(sede.id, { id: sede.id, nombre: sede.nombre })
        }
      }
    }
  }

  const sedes = Array.from(sedesMap.values())

  return <DashboardLayoutClient usuario={usuario} sedes={sedes}>{children}</DashboardLayoutClient>
}
