'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '../supabase/server'
import { getUser } from './auth.actions'

function calcularFechaVencimiento(anio: number, mes: number) {
  return new Date(Date.UTC(anio, mes - 1, 10)).toISOString().slice(0, 10)
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function obtenerMontoHorarioFijo(service: ReturnType<typeof createServiceRoleClient>, horarioFijoId: string) {
  const { data: hf } = await service
    .from('horarios_fijos')
    .select(`
      id,
      actividad_id,
      sede_id,
      alumno_id,
      actividades (
        precio_base,
        actividades_sede_config!left (
          sede_id,
          precio_clase,
          activa
        )
      )
    `)
    .eq('id', horarioFijoId)
    .single()

  if (!hf) return null

  const cfg = (hf as any).actividades?.actividades_sede_config?.find(
    (c: any) => c.sede_id === hf.sede_id && c.activa !== false
  )
  const monto = Number(cfg?.precio_clase ?? (hf as any).actividades?.precio_base ?? 0)

  return {
    horarioFijoId: hf.id,
    sedeId: hf.sede_id,
    alumnoId: hf.alumno_id,
    actividadId: (hf as any).actividad_id || null,
    monto,
  }
}

export async function asegurarCuotaMensualHorarioFijo(
  horarioFijoId: string,
  anio: number,
  mes: number
) {
  const service = createServiceRoleClient()
  const montoData = await obtenerMontoHorarioFijo(service, horarioFijoId)
  if (!montoData) return { error: 'Horario fijo no encontrado' }

  const fechaVencimiento = calcularFechaVencimiento(anio, mes)

  const { error } = await service
    .from('cuotas_mensuales')
    .upsert(
      {
        horario_fijo_id: montoData.horarioFijoId,
        alumno_id: montoData.alumnoId,
        sede_id: montoData.sedeId,
        actividad_id: montoData.actividadId,
        anio,
        mes,
        monto: montoData.monto,
        estado: 'pendiente',
        fecha_vencimiento: fechaVencimiento,
        fecha_limite_final: fechaVencimiento,
      },
      { onConflict: 'horario_fijo_id,anio,mes' }
    )

  if (error) return { error: error.message }
  return { success: true }
}

export async function asegurarCuotasInicialesHorarioFijo(horarioFijoId: string) {
  const now = new Date()
  const anioActual = now.getUTCFullYear()
  const mesActual = now.getUTCMonth() + 1

  const next = new Date(Date.UTC(anioActual, mesActual, 1))
  const anioSiguiente = next.getUTCFullYear()
  const mesSiguiente = next.getUTCMonth() + 1

  const first = await asegurarCuotaMensualHorarioFijo(horarioFijoId, anioActual, mesActual)
  if ((first as any).error) return first
  const second = await asegurarCuotaMensualHorarioFijo(horarioFijoId, anioSiguiente, mesSiguiente)
  if ((second as any).error) return second

  return { success: true }
}

export async function obtenerCuotasAlumno(alumnoId: string, sedeId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('cuotas_mensuales')
    .select(`
      *,
      horarios_fijos (
        id,
        hora_inicio,
        hora_fin
      ),
      actividades (
        id,
        nombre
      ),
      prorrogas_cuota (
        id,
        dias_otorgados,
        fecha_limite_nueva,
        motivo
      )
    `)
    .eq('alumno_id', alumnoId)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false })

  if (sedeId) query = query.eq('sede_id', sedeId)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { data }
}

export async function registrarPagoManualCuota(input: {
  cuotaId: string
  origen: 'transferencia' | 'efectivo' | 'manual_override'
  referencia?: string
  observaciones?: string
}) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const service = createServiceRoleClient()
  const { data: cuota, error: cuotaError } = await service
    .from('cuotas_mensuales')
    .select('*')
    .eq('id', input.cuotaId)
    .single()

  if (cuotaError || !cuota) return { error: 'Cuota no encontrada' }

  const { data: pago, error: pagoError } = await service
    .from('pagos_mercadopago')
    .insert({
      alumno_id: cuota.alumno_id,
      sede_id: cuota.sede_id,
      monto: cuota.monto,
      estado: 'aprobado',
      origen_registro: input.origen,
      registrado_por_usuario_id: usuario.id,
      referencia_manual: input.referencia,
      observaciones_manual: input.observaciones,
      fecha_pago: new Date().toISOString(),
      fecha_aprobacion: new Date().toISOString(),
      descripcion: `Pago manual cuota ${cuota.anio}-${String(cuota.mes).padStart(2, '0')}`,
    })
    .select('id')
    .single()

  if (pagoError || !pago) return { error: pagoError?.message || 'No se pudo registrar pago' }

  const { error: updateError } = await service
    .from('cuotas_mensuales')
    .update({
      estado: 'pagada',
      fecha_pago: new Date().toISOString(),
      pago_id: pago.id,
    })
    .eq('id', cuota.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/alumno/pagos')
  revalidatePath('/admin/reportes')
  revalidatePath('/profesor/calendario')
  return { success: true }
}

export async function otorgarProrrogaCuota(input: {
  cuotaId: string
  dias: number
  motivo: string
}) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }
  if (!Number.isInteger(input.dias) || input.dias < 1 || input.dias > 10) {
    return { error: 'La prórroga debe ser entre 1 y 10 días.' }
  }

  const service = createServiceRoleClient()

  const { data: cuota, error: cuotaError } = await service
    .from('cuotas_mensuales')
    .select('id, sede_id, fecha_limite_final')
    .eq('id', input.cuotaId)
    .single()
  if (cuotaError || !cuota) return { error: 'Cuota no encontrada' }

  const esSuperAdmin = (usuario.membresias || []).some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )
  const esAdminSede = (usuario.membresias || []).some(
    (m: any) => m.rol === 'admin' && m.activa && m.sede_id === cuota.sede_id
  )
  if (!esSuperAdmin && !esAdminSede) {
    return { error: 'Solo admin puede otorgar prórroga.' }
  }

  const { data: existente } = await service
    .from('prorrogas_cuota')
    .select('id')
    .eq('cuota_id', cuota.id)
    .maybeSingle()
  if (existente) return { error: 'La cuota ya tiene prórroga registrada.' }

  const nuevaFecha = addDaysISO(cuota.fecha_limite_final, input.dias)

  const { error: prorrogaError } = await service.from('prorrogas_cuota').insert({
    cuota_id: cuota.id,
    admin_usuario_id: usuario.id,
    dias_otorgados: input.dias,
    motivo: input.motivo,
    fecha_limite_anterior: cuota.fecha_limite_final,
    fecha_limite_nueva: nuevaFecha,
  })
  if (prorrogaError) return { error: prorrogaError.message }

  const { error: cuotaUpdateError } = await service
    .from('cuotas_mensuales')
    .update({ fecha_limite_final: nuevaFecha })
    .eq('id', cuota.id)
  if (cuotaUpdateError) return { error: cuotaUpdateError.message }

  revalidatePath('/alumno/pagos')
  revalidatePath('/admin/reportes')
  revalidatePath('/profesor/calendario')
  return { success: true }
}

export async function sincronizarCuotasActivasSede(sedeId: string, mesesAdelante = 1) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const esSuperAdmin = (usuario.membresias || []).some(
    (m: any) => m.rol === 'super_admin' && m.activa
  )
  const esAdminSede = (usuario.membresias || []).some(
    (m: any) => m.rol === 'admin' && m.activa && m.sede_id === sedeId
  )
  if (!esSuperAdmin && !esAdminSede) return { error: 'No autorizado' }

  const service = createServiceRoleClient()
  const { data: horarios, error } = await service
    .from('horarios_fijos')
    .select('id')
    .eq('sede_id', sedeId)
    .eq('activo', true)
  if (error) return { error: error.message }

  const hoy = new Date()
  const periodos: Array<{ anio: number; mes: number }> = []
  for (let i = 0; i <= mesesAdelante; i++) {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + i, 1))
    periodos.push({ anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 })
  }

  for (const h of horarios || []) {
    for (const p of periodos) {
      await asegurarCuotaMensualHorarioFijo(h.id, p.anio, p.mes)
    }
  }

  revalidatePath('/admin/reportes')
  revalidatePath('/alumno/pagos')
  return { success: true }
}
