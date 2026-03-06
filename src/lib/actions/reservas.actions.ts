'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { ReservaInput, CancelarReservaInput } from '../validations/reserva.schema'
import { diferenciaEnMinutos } from '../utils/date'
import { CANCELACION_MIN_HORAS } from '../constants/config'

export async function crearReserva(data: ReservaInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Validar disponibilidad del profesor
  const disponible = await verificarDisponibilidadProfesor(
    data.profesor_id,
    new Date(data.fecha_inicio),
    new Date(data.fecha_fin)
  )

  if (!disponible) {
    return { error: 'El profesor no está disponible en ese horario' }
  }

  // Si se quiere usar crédito, verificar y usar
  if (data.usar_credito && data.credito_id) {
    const { data: credito, error: creditoError } = await supabase
      .from('creditos_recupero')
      .select('*')
      .eq('id', data.credito_id)
      .eq('utilizado', false)
      .gte('fecha_expiracion', new Date().toISOString())
      .single()

    if (creditoError || !credito) {
      return { error: 'Crédito no válido o expirado' }
    }
  }

  // Crear reserva
  const { data: reserva, error } = await supabase
    .from('reservas')
    .insert({
      sede_id: data.sede_id,
      profesor_id: data.profesor_id,
      tipo: data.tipo,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      cupo_maximo: data.cupo_maximo,
      notas: data.notas,
      creado_por: usuario.id,
      estado: 'confirmada',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Si se usó crédito, marcarlo como utilizado
  if (data.usar_credito && data.credito_id) {
    const { error: updateCreditoError } = await supabase
      .from('creditos_recupero')
      .update({
        utilizado: true,
        fecha_utilizacion: new Date().toISOString(),
        reserva_utilizada_id: reserva.id,
      })
      .eq('id', data.credito_id)

    if (updateCreditoError) {
      console.error('Error al marcar crédito como usado:', updateCreditoError)
    }
  }

  revalidatePath('/profesor/calendario')
  revalidatePath('/alumno/calendario')
  revalidatePath('/alumno/creditos')
  return { data: reserva, creditoUsado: !!data.usar_credito }
}

export async function obtenerReservas(profesorId?: string, fechaInicio?: Date, fechaFin?: Date) {
  const supabase = await createClient()

  let query = supabase
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

  if (profesorId) {
    query = query.eq('profesor_id', profesorId)
  }

  if (fechaInicio) {
    query = query.gte('fecha_inicio', fechaInicio.toISOString())
  }

  if (fechaFin) {
    query = query.lte('fecha_fin', fechaFin.toISOString())
  }

  const { data, error } = await query.order('fecha_inicio', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function cancelarReserva(input: CancelarReservaInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Obtener reserva
  const { data: reserva, error: fetchError } = await supabase
    .from('reservas')
    .select('*, participantes_reserva(*), alumnos(*)')
    .eq('id', input.reserva_id)
    .single()

  if (fetchError) return { error: 'Reserva no encontrada' }

  // Calcular minutos de anticipación
  const minutosAnticipacion = diferenciaEnMinutos(
    new Date(reserva.fecha_inicio),
    new Date()
  )

  const horasAnticipacion = minutosAnticipacion / 60

  // Cancelar reserva
  const { error: updateError } = await supabase
    .from('reservas')
    .update({
      estado: 'cancelada',
      cancelado_por: usuario.id,
      fecha_cancelacion: new Date().toISOString(),
      motivo_cancelacion: input.motivo_cancelacion,
    })
    .eq('id', input.reserva_id)

  if (updateError) return { error: updateError.message }

  // Si cancela con >=24h de anticipación, generar crédito
  if (horasAnticipacion >= CANCELACION_MIN_HORAS) {
    // TODO: Generar crédito de recupero
    // await generarCreditoRecupero(reserva, usuario.id)
  }

  revalidatePath('/profesor/calendario')
  revalidatePath('/alumno/calendario')
  revalidatePath('/alumno/creditos')

  return {
    success: true,
    generoCredito: horasAnticipacion >= CANCELACION_MIN_HORAS,
  }
}

export async function inscribirseReservaGrupal(reservaId: string, alumnoId: string) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Verificar que la reserva sea grupal y tenga cupo
  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .select('*, participantes_reserva(*)')
    .eq('id', reservaId)
    .single()

  if (reservaError) return { error: 'Reserva no encontrada' }

  if (reserva.tipo !== 'grupal') {
    return { error: 'Esta reserva no es grupal' }
  }

  if (reserva.cupo_actual >= reserva.cupo_maximo) {
    return { error: 'No hay cupo disponible' }
  }

  // Verificar que el alumno no esté ya inscrito
  const yaInscrito = reserva.participantes_reserva?.some(
    (p: any) => p.alumno_id === alumnoId
  )

  if (yaInscrito) {
    return { error: 'Ya estás inscrito en esta clase' }
  }

  // Inscribir al alumno
  const { error: inscripcionError } = await supabase
    .from('participantes_reserva')
    .insert({
      reserva_id: reservaId,
      alumno_id: alumnoId,
    })

  if (inscripcionError) return { error: inscripcionError.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/alumno/calendario')

  return { success: true }
}

export async function desinscribirseReservaGrupal(participanteId: string) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) {
    return { error: 'No autenticado' }
  }

  // Obtener participante y reserva
  const { data: participante, error: fetchError } = await supabase
    .from('participantes_reserva')
    .select('*, reservas(*)')
    .eq('id', participanteId)
    .single()

  if (fetchError) return { error: 'Participante no encontrado' }

  // Verificar anticipación para crédito
  const minutosAnticipacion = diferenciaEnMinutos(
    new Date(participante.reservas.fecha_inicio),
    new Date()
  )

  const horasAnticipacion = minutosAnticipacion / 60

  // Eliminar participación
  const { error: deleteError } = await supabase
    .from('participantes_reserva')
    .delete()
    .eq('id', participanteId)

  if (deleteError) return { error: deleteError.message }

  // Generar crédito si aplica
  const generoCredito = horasAnticipacion >= CANCELACION_MIN_HORAS

  revalidatePath('/profesor/calendario')
  revalidatePath('/alumno/calendario')
  revalidatePath('/alumno/creditos')

  return {
    success: true,
    generoCredito,
  }
}

async function verificarDisponibilidadProfesor(
  profesorId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<boolean> {
  const supabase = await createClient()

  // Verificar reservas existentes
  const { data: reservas } = await supabase
    .from('reservas')
    .select('id')
    .eq('profesor_id', profesorId)
    .eq('estado', 'confirmada')
    .or(`and(fecha_inicio.lt.${fechaFin.toISOString()},fecha_fin.gt.${fechaInicio.toISOString()})`)

  if (reservas && reservas.length > 0) {
    return false
  }

  // TODO: Verificar bloqueos
  // const { data: bloqueos } = await supabase...

  return true
}
