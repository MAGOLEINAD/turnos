'use server'

import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '../supabase/server'
import { getUser } from './auth.actions'
import { APP_URL, MP_MONEDA } from '../constants/config'

type CrearCheckoutReservaInput = {
  alumnoId: string
  sedeId: string
  reservaId?: string
  titulo: string
  descripcion?: string
  monto: number
  esSenia?: boolean
  metadata?: Record<string, unknown>
}

function getMercadoPagoClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')
  }
  return new MercadoPagoConfig({ accessToken })
}

export async function crearCheckoutProReserva(input: CrearCheckoutReservaInput) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }
  if (input.monto <= 0) return { error: 'Monto inválido' }

  const supabase = await createClient()

  const pagoPayload = {
    alumno_id: input.alumnoId,
    sede_id: input.sedeId,
    reserva_id: input.reservaId || null,
    monto: input.monto,
    moneda: MP_MONEDA,
    descripcion: input.descripcion || input.titulo,
    estado: 'pendiente',
    origen_registro: 'mercadopago',
    es_senia: !!input.esSenia,
    afecta_cuota: !!input.esSenia,
    metadata: input.metadata || {},
  }

  const { data: pago, error: pagoError } = await supabase
    .from('pagos_mercadopago')
    .insert(pagoPayload)
    .select('id')
    .single()

  if (pagoError || !pago) {
    return { error: pagoError?.message || 'No se pudo crear el pago' }
  }

  try {
    const client = getMercadoPagoClient()
    const preference = new Preference(client)

    const response = await preference.create({
      body: {
        items: [
          {
            id: input.reservaId || input.alumnoId,
            title: input.titulo,
            description: input.descripcion,
            quantity: 1,
            unit_price: Number(input.monto),
            currency_id: MP_MONEDA,
          },
        ],
        external_reference: pago.id,
        back_urls: {
          success: `${APP_URL}/alumno/pagos?status=success`,
          failure: `${APP_URL}/alumno/pagos?status=failure`,
          pending: `${APP_URL}/alumno/pagos?status=pending`,
        },
        auto_return: 'approved',
        metadata: {
          pago_id: pago.id,
          alumno_id: input.alumnoId,
          sede_id: input.sedeId,
          reserva_id: input.reservaId || null,
          ...(input.metadata || {}),
        },
      },
    })

    const preferenceId = (response as any).id || null
    const initPoint = (response as any).init_point || null

    await supabase
      .from('pagos_mercadopago')
      .update({
        preference_id: preferenceId,
      })
      .eq('id', pago.id)

    return {
      data: {
        pagoId: pago.id,
        preferenceId,
        initPoint,
      },
    }
  } catch (error: any) {
    await supabase.from('pagos_mercadopago').update({ estado: 'cancelado' }).eq('id', pago.id)
    return { error: error?.message || 'No se pudo crear la preferencia de pago' }
  }
}

export async function crearCheckoutProCuota(cuotaId: string) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const supabase = await createClient()
  const { data: cuota, error: cuotaError } = await supabase
    .from('cuotas_mensuales')
    .select(
      `
      id,
      alumno_id,
      sede_id,
      monto,
      anio,
      mes,
      actividades (
        nombre
      )
    `
    )
    .eq('id', cuotaId)
    .single()

  if (cuotaError || !cuota) {
    return { error: cuotaError?.message || 'Cuota no encontrada' }
  }

  const actividadNombre = (cuota as any).actividades?.nombre || 'Actividad'
  return crearCheckoutProReserva({
    alumnoId: cuota.alumno_id,
    sedeId: cuota.sede_id,
    titulo: `Cuota ${String(cuota.mes).padStart(2, '0')}/${cuota.anio} - ${actividadNombre}`,
    descripcion: `Pago de cuota mensual ${String(cuota.mes).padStart(2, '0')}/${cuota.anio}`,
    monto: Number(cuota.monto),
    esSenia: false,
    metadata: {
      cuota_id: cuota.id,
      tipo_pago: 'cuota_mensual',
    },
  })
}

export async function obtenerHistorialPagosAlumno(alumnoId: string, sedeId?: string) {
  const usuario = await getUser()
  if (!usuario) return { error: 'No autenticado' }

  const supabase = await createClient()

  let query = supabase
    .from('pagos_mercadopago')
    .select(
      `
      id,
      alumno_id,
      sede_id,
      reserva_id,
      monto,
      moneda,
      descripcion,
      estado,
      origen_registro,
      referencia_manual,
      observaciones_manual,
      es_senia,
      fecha_pago,
      fecha_aprobacion,
      created_at,
      reservas (
        id,
        fecha_inicio,
        estado,
        actividades (
          nombre
        )
      )
    `
    )
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

  if (sedeId) query = query.eq('sede_id', sedeId)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { data }
}
