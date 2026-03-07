'use server'

import { unstable_cache } from 'next/cache'
import { getUser } from './auth.actions'
import { createServiceRoleClient } from '../supabase/server'

export interface AdminSedeOption {
  id: string
  nombre: string
  organizacion_id: string
}

const getAdminSedesCached = unstable_cache(
  async (usuarioId: string, esSuperAdmin: boolean) => {
    const supabase = createServiceRoleClient()

    if (esSuperAdmin) {
      const { data: sedes, error } = await supabase
        .from('sedes')
        .select('id, nombre, organizacion_id')
        .eq('activa', true)
        .order('nombre', { ascending: true })

      if (error) {
        return { data: [] as AdminSedeOption[], error: error.message }
      }

      return { data: sedes || [], error: null }
    }

    const [membershipsResult, orgsAsAdminUserResult] = await Promise.all([
      supabase
        .from('membresias')
        .select('organizacion_id')
        .eq('usuario_id', usuarioId)
        .eq('rol', 'admin')
        .eq('activa', true),
      supabase
        .from('organizaciones')
        .select('id')
        .eq('admin_usuario_id', usuarioId),
    ])

    if (membershipsResult.error) {
      return { data: [] as AdminSedeOption[], error: membershipsResult.error.message }
    }

    if (orgsAsAdminUserResult.error) {
      return { data: [] as AdminSedeOption[], error: orgsAsAdminUserResult.error.message }
    }

    const orgIdsSet = new Set<string>(
      (membershipsResult.data || []).map((m: any) => m.organizacion_id).filter(Boolean)
    )

    for (const org of orgsAsAdminUserResult.data || []) {
      if (org.id) orgIdsSet.add(org.id)
    }

    const orgIds = Array.from(orgIdsSet)
    if (orgIds.length === 0) {
      return { data: [] as AdminSedeOption[], error: null }
    }

    const { data: sedes, error } = await supabase
      .from('sedes')
      .select('id, nombre, organizacion_id')
      .in('organizacion_id', orgIds)
      .eq('activa', true)
      .order('nombre', { ascending: true })

    if (error) {
      return { data: [] as AdminSedeOption[], error: error.message }
    }

    return { data: sedes || [], error: null }
  },
  ['admin-scope-sedes'],
  { revalidate: 5 }
)

export async function getAdminSedeContext(searchSede?: string) {
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado', usuario: null, sedes: [] as AdminSedeOption[], sedeSeleccionada: '' }
  }

  const esSuperAdmin = !!usuario.membresias?.some((m: any) => m.rol === 'super_admin' && m.activa)
  const result = await getAdminSedesCached(usuario.id, esSuperAdmin)

  if (result.error) {
    return { error: result.error, usuario, sedes: [] as AdminSedeOption[], sedeSeleccionada: '' }
  }

  const sedes = result.data || []
  const sedeSeleccionada =
    (searchSede && sedes.find((s) => s.id === searchSede)?.id) ||
    sedes[0]?.id ||
    ''

  return {
    error: null,
    usuario,
    esSuperAdmin,
    sedes,
    sedeSeleccionada,
  }
}
