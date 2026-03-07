'use server'

import { createClient } from '../supabase/server'

export async function obtenerDatosCalendarioProfesor(profesorId: string) {
  const supabase = await createClient()

  const [reservasResult, horariosResult, bloqueosResult] = await Promise.all([
    supabase
      .from('reservas')
      .select(`
        *,
        profesores (
          id,
          usuarios (nombre, apellido)
        ),
        sedes (nombre)
      `)
      .eq('estado', 'confirmada')
      .eq('profesor_id', profesorId)
      .order('fecha_inicio', { ascending: true }),
    supabase
      .from('horarios_fijos')
      .select(`
        *,
        profesores (
          id,
          usuarios (nombre, apellido)
        ),
        alumnos (
          id,
          usuarios (nombre, apellido)
        ),
        sedes (nombre),
        cuotas_mensuales (
          anio,
          mes,
          estado,
          fecha_limite_final
        )
      `)
      .eq('activo', true)
      .eq('profesor_id', profesorId)
      .order('created_at', { ascending: false }),
    supabase
      .from('bloqueos_disponibilidad')
      .select(`
        *,
        profesores (
          id,
          usuarios (nombre, apellido)
        )
      `)
      .eq('profesor_id', profesorId)
      .order('fecha_inicio', { ascending: false }),
  ])

  if (reservasResult.error) return { error: reservasResult.error.message }
  if (horariosResult.error) return { error: horariosResult.error.message }
  if (bloqueosResult.error) return { error: bloqueosResult.error.message }

  return {
    data: {
      reservas: reservasResult.data || [],
      horarios: horariosResult.data || [],
      bloqueos: bloqueosResult.data || [],
    },
  }
}

export async function obtenerDatosAgendaProfesor(profesorIds: string[]) {
  if (!profesorIds || profesorIds.length === 0) {
    return {
      data: {
        reservas: [],
        horarios: [],
        bloqueos: [],
      },
    }
  }

  const supabase = await createClient()

  const [reservasResult, horariosResult, bloqueosResult] = await Promise.all([
    supabase
      .from('reservas')
      .select(`
        *,
        profesores (
          id,
          usuarios (nombre, apellido)
        ),
        sedes (nombre)
      `)
      .eq('estado', 'confirmada')
      .in('profesor_id', profesorIds)
      .order('fecha_inicio', { ascending: true }),
    supabase
      .from('horarios_fijos')
      .select(`
        *,
        profesores (
          id,
          usuarios (nombre, apellido)
        ),
        alumnos (
          id,
          usuarios (nombre, apellido)
        ),
        sedes (nombre),
        cuotas_mensuales (
          anio,
          mes,
          estado,
          fecha_limite_final
        )
      `)
      .eq('activo', true)
      .in('profesor_id', profesorIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('bloqueos_disponibilidad')
      .select(`
        *,
        profesores (
          id,
          usuarios (nombre, apellido)
        )
      `)
      .in('profesor_id', profesorIds)
      .order('fecha_inicio', { ascending: false }),
  ])

  if (reservasResult.error) return { error: reservasResult.error.message }
  if (horariosResult.error) return { error: horariosResult.error.message }
  if (bloqueosResult.error) return { error: bloqueosResult.error.message }

  return {
    data: {
      reservas: reservasResult.data || [],
      horarios: horariosResult.data || [],
      bloqueos: bloqueosResult.data || [],
    },
  }
}
