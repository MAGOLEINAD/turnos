'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '../supabase/server'
import { getUser } from './auth.actions'

export type ActividadDisponibleProfesor = {
  id: string
  nombre: string
  color_calendario: string
  permite_prueba: boolean
  es_recurrente_default: boolean
  senia_prueba: number
  precio_clase: number
  duracion_minutos: number
  cupo_maximo: number
}

export async function obtenerActividadesDisponiblesProfesor(
  profesorId: string,
  sedeId: string
): Promise<{ data?: ActividadDisponibleProfesor[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profesor_actividades')
    .select(`
      actividad_id,
      activo,
      actividades (
        id,
        nombre,
        color_calendario,
        permite_prueba,
        es_recurrente_default,
        senia_prueba,
        precio_base,
        duracion_minutos_base,
        cupo_maximo_base,
        activa,
        actividades_sede_config!left (
          sede_id,
          precio_clase,
          duracion_minutos,
          cupo_maximo,
          activa
        )
      )
    `)
    .eq('profesor_id', profesorId)
    .eq('activo', true)

  if (error) return { error: error.message }

  const actividades = (data || [])
    .map((row: any) => row.actividades)
    .filter((actividad: any) => !!actividad && actividad.activa)
    .map((actividad: any) => {
      const configSede = (actividad.actividades_sede_config || []).find(
        (cfg: any) => cfg.sede_id === sedeId
      )

      return {
        id: actividad.id,
        nombre: actividad.nombre,
        color_calendario: actividad.color_calendario || '#F59E0B',
        permite_prueba: actividad.permite_prueba ?? true,
        es_recurrente_default: actividad.es_recurrente_default ?? true,
        senia_prueba: Number(actividad.senia_prueba ?? 0),
        precio_clase: Number(configSede?.precio_clase ?? actividad.precio_base ?? 0),
        duracion_minutos: Number(
          configSede?.duracion_minutos ?? actividad.duracion_minutos_base ?? 60
        ),
        cupo_maximo: Number(configSede?.cupo_maximo ?? actividad.cupo_maximo_base ?? 1),
      } as ActividadDisponibleProfesor
    })

  return { data: actividades }
}

export async function asignarActividadesProfesor(
  profesorId: string,
  actividadIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const supabase = createServiceRoleClient()

  const { data: profesor, error: profesorError } = await supabase
    .from('profesores')
    .select('id, sede_id')
    .eq('id', profesorId)
    .single()

  if (profesorError || !profesor) return { error: 'Profesor no encontrado' }

  const esSuperAdmin = (usuario.membresias || []).some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )
  const puedeGestionarSede = (usuario.membresias || []).some(
    (m: any) => m.rol === 'admin' && m.activa && m.sede_id === profesor.sede_id
  )

  if (!esSuperAdmin && !puedeGestionarSede) {
    return { error: 'No autorizado para asignar actividades a este profesor' }
  }

  const actividadIdsUnicos = Array.from(new Set((actividadIds || []).filter(Boolean)))

  const { error: desactivarError } = await supabase
    .from('profesor_actividades')
    .update({ activo: false })
    .eq('profesor_id', profesorId)
  if (desactivarError) return { error: desactivarError.message }

  if (actividadIdsUnicos.length > 0) {
    const payload = actividadIdsUnicos.map((actividadId) => ({
      profesor_id: profesorId,
      actividad_id: actividadId,
      activo: true,
    }))
    const { error: upsertError } = await supabase
      .from('profesor_actividades')
      .upsert(payload, { onConflict: 'profesor_id,actividad_id' })
    if (upsertError) return { error: upsertError.message }
  }

  revalidatePath('/admin/profesores')
  revalidatePath('/super-admin/profesores')
  revalidatePath('/profesor/calendario')
  return { success: true }
}

export async function obtenerActividadesPorSede(
  sedeId: string
): Promise<{ data?: Array<{ id: string; nombre: string }>; error?: string }> {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const supabase = await createClient()

  const { data: sede, error: sedeError } = await supabase
    .from('sedes')
    .select('organizacion_id')
    .eq('id', sedeId)
    .single()

  if (sedeError || !sede) return { error: 'Sede no encontrada' }

  const { data, error } = await supabase
    .from('actividades')
    .select('id, nombre')
    .eq('organizacion_id', sede.organizacion_id)
    .eq('activa', true)
    .order('nombre', { ascending: true })

  if (error) return { error: error.message }
  return { data: (data || []) as Array<{ id: string; nombre: string }> }
}

export async function obtenerActividadIdsProfesor(
  profesorId: string
): Promise<{ data?: string[]; error?: string }> {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profesor_actividades')
    .select('actividad_id')
    .eq('profesor_id', profesorId)
    .eq('activo', true)

  if (error) return { error: error.message }
  return { data: (data || []).map((row: any) => row.actividad_id).filter(Boolean) }
}
