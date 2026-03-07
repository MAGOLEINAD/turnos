'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { BloqueoInput } from '../validations/bloqueo.schema'

type ConflictoDetectado = {
  horario_fijo_id: string
  alumno_id: string
  hora_inicio: string
  hora_fin: string
}

function toDate(input: string | Date) {
  return typeof input === 'string' ? new Date(input) : input
}

function overlapsTimeRange(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB
}

function horaTimeFromDate(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}:00`
}

export async function crearBloqueo(data: BloqueoInput) {
  const supabase = await createClient()
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const fechaInicio = toDate(data.fecha_inicio)
  const fechaFin = toDate(data.fecha_fin)
  const fechaInicioISO = fechaInicio.toISOString()
  const fechaFinISO = fechaFin.toISOString()

  const { data: profesor, error: profesorError } = await supabase
    .from('profesores')
    .select('id, sede_id')
    .eq('id', data.profesor_id)
    .single()
  if (profesorError || !profesor) return { error: 'Profesor no encontrado' }

  const bloqueDia = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][
    fechaInicio.getDay()
  ]
  const bloqueHoraInicio = horaTimeFromDate(fechaInicio)
  const bloqueHoraFin = horaTimeFromDate(fechaFin)
  const bloqueFecha = fechaInicio.toISOString().slice(0, 10)

  const { data: horariosFijos } = await supabase
    .from('horarios_fijos')
    .select('id, alumno_id, hora_inicio, hora_fin, dias_semana, fecha_inicio, fecha_fin')
    .eq('profesor_id', data.profesor_id)
    .eq('activo', true)
    .lte('fecha_inicio', bloqueFecha)
    .or(`fecha_fin.is.null,fecha_fin.gte.${bloqueFecha}`)

  const conflictos: ConflictoDetectado[] = (horariosFijos || [])
    .filter((hf: any) => {
      const dias: string[] = hf.dias_semana || []
      if (!dias.includes(bloqueDia)) return false
      return overlapsTimeRange(hf.hora_inicio, hf.hora_fin, bloqueHoraInicio, bloqueHoraFin)
    })
    .map((hf: any) => ({
      horario_fijo_id: hf.id,
      alumno_id: hf.alumno_id,
      hora_inicio: hf.hora_inicio,
      hora_fin: hf.hora_fin,
    }))

  if (conflictos.length > 0 && (!data.resoluciones_conflicto || data.resoluciones_conflicto.length === 0)) {
    return {
      error: 'Conflicto con horarios fijos detectado',
      requiereResolucion: true,
      conflictos,
    }
  }

  const resoluciones = data.resoluciones_conflicto || []
  const accionCancelarBloqueo = resoluciones.some((r) => r.accion === 'cancelar_bloqueo')
  if (accionCancelarBloqueo) {
    for (const resolucion of resoluciones) {
      await supabase.from('conflictos_bloqueo_horario_fijo').insert({
        bloqueo_id: null,
        horario_fijo_id: resolucion.horario_fijo_id,
        accion: resolucion.accion,
        resuelto_por_usuario_id: usuario.id,
        detalles: { motivo: 'Bloqueo cancelado por resolución de conflictos' },
      })
    }

    return { success: true, bloqueoCancelado: true }
  }

  for (const resolucion of resoluciones) {
    if (resolucion.accion === 'reasignar_profesor' && resolucion.nuevo_profesor_id) {
      await supabase
        .from('horarios_fijos')
        .update({ profesor_id: resolucion.nuevo_profesor_id })
        .eq('id', resolucion.horario_fijo_id)
    }

    if (
      resolucion.accion === 'mover_horario_fijo' &&
      resolucion.nueva_hora_inicio &&
      resolucion.nueva_hora_fin
    ) {
      await supabase
        .from('horarios_fijos')
        .update({
          hora_inicio: resolucion.nueva_hora_inicio,
          hora_fin: resolucion.nueva_hora_fin,
        })
        .eq('id', resolucion.horario_fijo_id)
    }
  }

  const { data: bloqueo, error } = await supabase
    .from('bloqueos_disponibilidad')
    .insert({
      profesor_id: data.profesor_id,
      sede_id: profesor.sede_id,
      fecha_inicio: fechaInicioISO,
      fecha_fin: fechaFinISO,
      motivo: data.motivo,
      es_recurrente: false,
    })
    .select(
      `
      *,
      profesores (
        id,
        usuarios (nombre, apellido)
      )
    `
    )
    .single()

  if (error) return { error: error.message }

  for (const resolucion of resoluciones) {
    await supabase.from('conflictos_bloqueo_horario_fijo').insert({
      bloqueo_id: bloqueo.id,
      horario_fijo_id: resolucion.horario_fijo_id,
      accion: resolucion.accion,
      resuelto_por_usuario_id: usuario.id,
      detalles: {
        nuevo_profesor_id: resolucion.nuevo_profesor_id || null,
        nueva_hora_inicio: resolucion.nueva_hora_inicio || null,
        nueva_hora_fin: resolucion.nueva_hora_fin || null,
      },
    })
  }

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
  revalidatePath('/admin/bloqueos')
  return { data: bloqueo }
}

export async function obtenerBloqueos(profesorId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('bloqueos_disponibilidad')
    .select(
      `
      *,
      profesores (
        id,
        usuarios (nombre, apellido)
      )
    `
    )
    .order('fecha_inicio', { ascending: false })

  if (profesorId) query = query.eq('profesor_id', profesorId)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { data }
}

export async function eliminarBloqueo(bloqueoId: string) {
  const supabase = await createClient()
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const { error } = await supabase.from('bloqueos_disponibilidad').delete().eq('id', bloqueoId)
  if (error) return { error: error.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
  revalidatePath('/admin/bloqueos')
  return { success: true }
}
