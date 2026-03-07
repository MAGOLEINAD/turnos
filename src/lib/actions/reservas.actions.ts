'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import type { ReservaInput, CancelarReservaInput } from '../validations/reserva.schema'
import { diferenciaEnMinutos } from '../utils/date'
import { CANCELACION_MIN_HORAS } from '../constants/config'
import { ESTADO_RESERVA } from '../constants/estados'

type OrigenPagoManual = 'transferencia' | 'efectivo' | 'manual_override'

function toIsoDate(input?: string | Date) {
  if (!input) return null
  if (typeof input === 'string') return input
  return input.toISOString().slice(0, 10)
}

export async function crearReserva(data: ReservaInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) return { error: 'No autenticado' }
  if (!data.actividad_id) return { error: 'Debes seleccionar una actividad.' }

  const { data: actividadData, error: actividadError } = await supabase
    .from('actividades')
    .select(
      `
      id,
      nombre,
      precio_base,
      duracion_minutos_base,
      cupo_maximo_base,
      senia_prueba,
      actividades_sede_config!left (
        sede_id,
        precio_clase,
        duracion_minutos,
        cupo_maximo,
        activa
      )
    `
    )
    .eq('id', data.actividad_id)
    .single()

  if (actividadError || !actividadData) return { error: 'Actividad no encontrada.' }

  const cfgSede = (actividadData as any).actividades_sede_config?.find(
    (cfg: any) => cfg.sede_id === data.sede_id && cfg.activa !== false
  )
  const cupoActividad = Number(cfgSede?.cupo_maximo ?? actividadData.cupo_maximo_base ?? 1)
  const cupoMaximo = data.cupo_maximo || cupoActividad
  const tipo = data.tipo || (cupoMaximo > 1 ? 'grupal' : 'individual')

  const disponible = await verificarDisponibilidadProfesor(
    data.profesor_id,
    new Date(data.fecha_inicio),
    new Date(data.fecha_fin)
  )
  if (!disponible) return { error: 'El profesor no está disponible en ese horario' }

  const requierePago = Boolean(data.alumno_id)
  if (requierePago && !data.usar_credito && !data.pago_registrado) {
    return { error: 'La reserva requiere pago registrado para confirmarse.' }
  }

  if (data.es_clase_prueba && !data.alumno_id) {
    return { error: 'La clase de prueba requiere alumno asociado.' }
  }

  if (data.es_clase_prueba && data.alumno_id) {
    const { data: primeraClase } = await supabase
      .from('alumnos_primera_clase')
      .select('alumno_id')
      .eq('alumno_id', data.alumno_id)
      .maybeSingle()

    if (primeraClase) return { error: 'El alumno ya utilizó su clase de prueba.' }
  }

  if (data.usar_credito && data.credito_id) {
    const { data: credito, error: creditoError } = await supabase
      .from('creditos_recupero')
      .select('*')
      .eq('id', data.credito_id)
      .eq('utilizado', false)
      .gte('fecha_expiracion', new Date().toISOString())
      .single()

    if (creditoError || !credito) return { error: 'Crédito no válido o expirado' }
  }

  const { data: reserva, error } = await supabase
    .from('reservas')
    .insert({
      sede_id: data.sede_id,
      profesor_id: data.profesor_id,
      tipo,
      actividad_id: data.actividad_id,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      cupo_maximo: cupoMaximo,
      notas: data.notas,
      creado_por: usuario.id,
      estado: data.es_clase_prueba ? ESTADO_RESERVA.PRIMERA_CLASE : ESTADO_RESERVA.CONFIRMADA,
      es_clase_prueba: !!data.es_clase_prueba,
      requiere_regularizacion_pago: !!data.es_clase_prueba,
      fecha_limite_regularizacion: toIsoDate(data.fecha_limite_regularizacion),
    })
    .select()
    .single()

  if (error) return { error: error.message }

  if (data.alumno_id) {
    const { error: participanteError } = await supabase.from('participantes_reserva').insert({
      reserva_id: reserva.id,
      alumno_id: data.alumno_id,
    })

    if (participanteError) {
      await supabase.from('reservas').delete().eq('id', reserva.id)
      return { error: participanteError.message }
    }
  }

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

  if (data.pago_registrado && data.alumno_id) {
    const montoManual =
      data.monto_pago_manual ?? Number(cfgSede?.precio_clase ?? actividadData.precio_base ?? 0)
    const origenManual: OrigenPagoManual = data.origen_pago_manual || 'manual_override'

    const { data: pagoManual, error: pagoError } = await supabase
      .from('pagos_mercadopago')
      .insert({
        alumno_id: data.alumno_id,
        sede_id: data.sede_id,
        reserva_id: reserva.id,
        monto: montoManual,
        estado: 'aprobado',
        origen_registro: origenManual,
        registrado_por_usuario_id: usuario.id,
        referencia_manual: data.referencia_pago_manual,
        observaciones_manual: data.observaciones_pago_manual,
        es_senia: !!data.es_clase_prueba,
        afecta_cuota: !!data.es_clase_prueba,
        fecha_pago: new Date().toISOString(),
        fecha_aprobacion: new Date().toISOString(),
        descripcion: data.es_clase_prueba
          ? `Seña de primera clase - ${actividadData.nombre}`
          : `Pago manual - ${actividadData.nombre}`,
      })
      .select('id')
      .single()

    if (pagoError) {
      await supabase.from('participantes_reserva').delete().eq('reserva_id', reserva.id)
      await supabase.from('reservas').delete().eq('id', reserva.id)
      return { error: pagoError.message }
    }

    if (data.es_clase_prueba) {
      const { error: primeraClaseError } = await supabase.from('alumnos_primera_clase').insert({
        alumno_id: data.alumno_id,
        reserva_id: reserva.id,
        pago_id: pagoManual.id,
      })

      if (primeraClaseError) {
        await supabase.from('pagos_mercadopago').delete().eq('id', pagoManual.id)
        await supabase.from('participantes_reserva').delete().eq('reserva_id', reserva.id)
        await supabase.from('reservas').delete().eq('id', reserva.id)
        return { error: primeraClaseError.message }
      }
    }
  }

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
  revalidatePath('/alumno/calendario')
  revalidatePath('/alumno/creditos')
  return { data: reserva, creditoUsado: !!data.usar_credito }
}

export async function obtenerReservas(profesorId?: string, fechaInicio?: Date, fechaFin?: Date) {
  const supabase = await createClient()

  let query = supabase
    .from('reservas')
    .select(
      `
      *,
      profesores (
        id,
        usuarios (nombre, apellido)
      ),
      actividades (
        id,
        nombre,
        color_calendario
      ),
      sedes (nombre)
    `
    )
    .in('estado', [ESTADO_RESERVA.CONFIRMADA, ESTADO_RESERVA.PRIMERA_CLASE])

  if (profesorId) query = query.eq('profesor_id', profesorId)
  if (fechaInicio) query = query.gte('fecha_inicio', fechaInicio.toISOString())
  if (fechaFin) query = query.lte('fecha_fin', fechaFin.toISOString())

  const { data, error } = await query.order('fecha_inicio', { ascending: true })
  if (error) return { error: error.message }
  return { data }
}

export async function cancelarReserva(input: CancelarReservaInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  if (!usuario) return { error: 'No autenticado' }

  const { data: reserva, error: fetchError } = await supabase
    .from('reservas')
    .select('*, participantes_reserva(*), alumnos(*)')
    .eq('id', input.reserva_id)
    .single()
  if (fetchError) return { error: 'Reserva no encontrada' }

  const minutosAnticipacion = diferenciaEnMinutos(new Date(reserva.fecha_inicio), new Date())
  const horasAnticipacion = minutosAnticipacion / 60

  const { error: updateError } = await supabase
    .from('reservas')
    .update({
      estado: ESTADO_RESERVA.CANCELADA,
      cancelado_por: usuario.id,
      fecha_cancelacion: new Date().toISOString(),
      motivo_cancelacion: input.motivo_cancelacion,
    })
    .eq('id', input.reserva_id)
  if (updateError) return { error: updateError.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
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
  if (!usuario) return { error: 'No autenticado' }

  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .select('*, participantes_reserva(*)')
    .eq('id', reservaId)
    .single()
  if (reservaError) return { error: 'Reserva no encontrada' }

  if (reserva.tipo !== 'grupal') return { error: 'Esta reserva no es grupal' }
  if (reserva.cupo_actual >= reserva.cupo_maximo) return { error: 'No hay cupo disponible' }

  const yaInscrito = reserva.participantes_reserva?.some((p: any) => p.alumno_id === alumnoId)
  if (yaInscrito) return { error: 'Ya estás inscrito en esta clase' }

  const { error: inscripcionError } = await supabase.from('participantes_reserva').insert({
    reserva_id: reservaId,
    alumno_id: alumnoId,
  })
  if (inscripcionError) return { error: inscripcionError.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
  revalidatePath('/alumno/calendario')
  return { success: true }
}

export async function desinscribirseReservaGrupal(participanteId: string) {
  const supabase = await createClient()
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const { data: participante, error: fetchError } = await supabase
    .from('participantes_reserva')
    .select('*, reservas(*)')
    .eq('id', participanteId)
    .single()
  if (fetchError) return { error: 'Participante no encontrado' }

  const minutosAnticipacion = diferenciaEnMinutos(
    new Date(participante.reservas.fecha_inicio),
    new Date()
  )
  const horasAnticipacion = minutosAnticipacion / 60

  const { error: deleteError } = await supabase
    .from('participantes_reserva')
    .delete()
    .eq('id', participanteId)
  if (deleteError) return { error: deleteError.message }

  revalidatePath('/profesor/calendario')
  revalidatePath('/profesor/agenda')
  revalidatePath('/alumno/calendario')
  revalidatePath('/alumno/creditos')
  return { success: true, generoCredito: horasAnticipacion >= CANCELACION_MIN_HORAS }
}

async function verificarDisponibilidadProfesor(
  profesorId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<boolean> {
  const supabase = await createClient()

  const { data: perfilBase } = await supabase
    .from('profesores')
    .select('usuario_id')
    .eq('id', profesorId)
    .single()
  if (!perfilBase?.usuario_id) return false

  const { data: perfilesProfesor } = await supabase
    .from('profesores')
    .select('id')
    .eq('usuario_id', perfilBase.usuario_id)
    .eq('activo', true)
  const profesorIds = (perfilesProfesor || [])
    .map((p: { id: string }) => p.id)
    .filter(Boolean)
  if (profesorIds.length === 0) return false

  const { data: reservas } = await supabase
    .from('reservas')
    .select('id')
    .in('profesor_id', profesorIds)
    .in('estado', [ESTADO_RESERVA.CONFIRMADA, ESTADO_RESERVA.PRIMERA_CLASE])
    .or(`and(fecha_inicio.lt.${fechaFin.toISOString()},fecha_fin.gt.${fechaInicio.toISOString()})`)
  if (reservas && reservas.length > 0) return false

  const { data: bloqueosPuntuales } = await supabase
    .from('bloqueos_disponibilidad')
    .select('id')
    .in('profesor_id', profesorIds)
    .eq('activo', true)
    .eq('es_recurrente', false)
    .or(`and(fecha_inicio.lt.${fechaFin.toISOString()},fecha_fin.gt.${fechaInicio.toISOString()})`)
  if (bloqueosPuntuales && bloqueosPuntuales.length > 0) return false

  return true
}
