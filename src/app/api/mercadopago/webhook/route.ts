import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createServiceRoleClient } from '@/lib/supabase/server'

function getMpClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')
  return new MercadoPagoConfig({ accessToken })
}

function mapPaymentStatus(status?: string) {
  if (status === 'approved') return 'aprobado'
  if (status === 'rejected') return 'rechazado'
  if (status === 'cancelled') return 'cancelado'
  if (status === 'refunded' || status === 'charged_back') return 'reembolsado'
  return 'pendiente'
}

function fechaVencimientoDia10(anio: number, mes: number) {
  return new Date(Date.UTC(anio, mes - 1, 10)).toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const topic = url.searchParams.get('topic') || url.searchParams.get('type')
    const idFromQuery = url.searchParams.get('id') || url.searchParams.get('data.id')
    const body = await request.json().catch(() => ({} as any))

    const paymentId = idFromQuery || body?.data?.id || body?.id
    const eventType = topic || body?.type

    if (!paymentId || eventType !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentClient = new Payment(getMpClient())
    const payment = await paymentClient.get({ id: paymentId })

    const externalReference = (payment as any).external_reference
    if (!externalReference) {
      return NextResponse.json({ ok: true })
    }

    const supabase = createServiceRoleClient()
    const estado = mapPaymentStatus((payment as any).status)

    const updatePayload: Record<string, unknown> = {
      payment_id: String((payment as any).id),
      merchant_order_id: (payment as any).order?.id ? String((payment as any).order.id) : null,
      estado,
      fecha_pago: new Date().toISOString(),
    }

    if (estado === 'aprobado') {
      updatePayload.fecha_aprobacion = new Date().toISOString()
    }

    await supabase.from('pagos_mercadopago').update(updatePayload).eq('id', externalReference)

    const metadata = ((payment as any).metadata || {}) as Record<string, any>
    const pagoId = String(externalReference)

    if (
      estado === 'aprobado' &&
      metadata?.tipo_pago === 'reserva_clase' &&
      metadata?.alumno_id &&
      metadata?.sede_id &&
      metadata?.profesor_id &&
      metadata?.actividad_id &&
      metadata?.fecha_inicio &&
      metadata?.fecha_fin
    ) {
      const { data: alumnoData } = await supabase
        .from('alumnos')
        .select('usuario_id')
        .eq('id', metadata.alumno_id)
        .maybeSingle()

      if (!alumnoData?.usuario_id) {
        return NextResponse.json({ ok: true })
      }

      const esSenia = Boolean(metadata?.es_senia)
      const modoPrimeraClase =
        metadata?.modo_regularizacion_primera_clase === 'cuota_completa'
          ? 'cuota_completa'
          : 'descontar_senia'
      const fechaLimite = metadata?.fecha_limite_regularizacion || null
      const tipo = Number(metadata?.cupo_maximo || 1) > 1 ? 'grupal' : 'individual'

      const { data: reserva, error: reservaError } = await supabase
        .from('reservas')
        .insert({
          sede_id: metadata.sede_id,
          profesor_id: metadata.profesor_id,
          actividad_id: metadata.actividad_id,
          fecha_inicio: metadata.fecha_inicio,
          fecha_fin: metadata.fecha_fin,
          tipo,
          cupo_maximo: metadata.cupo_maximo || 1,
          estado: esSenia ? 'primera_clase' : 'confirmada',
          es_clase_prueba: esSenia,
          requiere_regularizacion_pago: esSenia,
          fecha_limite_regularizacion: fechaLimite,
          creado_por: alumnoData.usuario_id,
          notas: metadata.notas || null,
        })
        .select('id')
        .single()

      if (!reservaError && reserva?.id) {
        await supabase.from('participantes_reserva').insert({
          reserva_id: reserva.id,
          alumno_id: metadata.alumno_id,
        })

        await supabase.from('pagos_mercadopago').update({ reserva_id: reserva.id }).eq('id', pagoId)

        if (esSenia) {
          await supabase.from('alumnos_primera_clase').upsert(
            {
              alumno_id: metadata.alumno_id,
              reserva_id: reserva.id,
              pago_id: pagoId,
            },
            { onConflict: 'alumno_id' }
          )

          const fechaClase = new Date(metadata.fecha_inicio)
          const anio = fechaClase.getUTCFullYear()
          const mes = fechaClase.getUTCMonth() + 1
          const fechaVencimiento = fechaVencimientoDia10(anio, mes)

          const { data: horarioFijo } = await supabase
            .from('horarios_fijos')
            .select('id')
            .eq('alumno_id', metadata.alumno_id)
            .eq('sede_id', metadata.sede_id)
            .eq('actividad_id', metadata.actividad_id)
            .eq('activo', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (horarioFijo?.id) {
            const { data: cuotaExistente } = await supabase
              .from('cuotas_mensuales')
              .select('id, monto')
              .eq('horario_fijo_id', horarioFijo.id)
              .eq('anio', anio)
              .eq('mes', mes)
              .maybeSingle()

            if (!cuotaExistente) {
              await supabase.from('cuotas_mensuales').insert({
                horario_fijo_id: horarioFijo.id,
                alumno_id: metadata.alumno_id,
                sede_id: metadata.sede_id,
                actividad_id: metadata.actividad_id,
                anio,
                mes,
                monto: Number((payment as any).transaction_amount || 0),
                estado: modoPrimeraClase === 'cuota_completa' ? 'pagada' : 'pendiente',
                fecha_vencimiento: fechaVencimiento,
                fecha_limite_final: fechaVencimiento,
                fecha_pago: modoPrimeraClase === 'cuota_completa' ? new Date().toISOString() : null,
                pago_id: modoPrimeraClase === 'cuota_completa' ? pagoId : null,
              })
            } else if (modoPrimeraClase === 'cuota_completa') {
              await supabase
                .from('cuotas_mensuales')
                .update({
                  estado: 'pagada',
                  fecha_pago: new Date().toISOString(),
                  pago_id: pagoId,
                })
                .eq('id', cuotaExistente.id)
            } else {
              const montoActual = Number(cuotaExistente.monto || 0)
              const montoSenia = Number((payment as any).transaction_amount || 0)
              const saldo = Math.max(0, montoActual - montoSenia)

              await supabase
                .from('cuotas_mensuales')
                .update({
                  monto: saldo,
                  estado: saldo === 0 ? 'pagada' : 'pendiente',
                  fecha_pago: saldo === 0 ? new Date().toISOString() : null,
                  pago_id: saldo === 0 ? pagoId : null,
                })
                .eq('id', cuotaExistente.id)
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'webhook error' }, { status: 500 })
  }
}
