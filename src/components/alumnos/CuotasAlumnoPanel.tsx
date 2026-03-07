'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { crearCheckoutProCuota } from '@/lib/actions/pagos.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CuotaItem {
  id: string
  anio: number
  mes: number
  monto: number
  estado: 'pendiente' | 'pagada' | 'vencida'
  fecha_vencimiento: string
  fecha_limite_final: string
  actividades?: {
    nombre?: string
  } | null
  prorrogas_cuota?: Array<{
    dias_otorgados: number
    fecha_limite_nueva: string
  }>
}

interface CuotasAlumnoPanelProps {
  cuotas: CuotaItem[]
}

function getEstadoBadge(estado: CuotaItem['estado']) {
  if (estado === 'pagada') return 'default'
  if (estado === 'vencida') return 'destructive'
  return 'secondary'
}

export function CuotasAlumnoPanel({ cuotas }: CuotasAlumnoPanelProps) {
  const [loadingCuotaId, setLoadingCuotaId] = useState<string | null>(null)

  const handlePagar = async (cuotaId: string) => {
    setLoadingCuotaId(cuotaId)
    try {
      const result = await crearCheckoutProCuota(cuotaId)
      if (result.error || !result.data?.initPoint) {
        toast.error(result.error || 'No se pudo iniciar el checkout')
        return
      }
      window.open(result.data.initPoint, '_blank', 'noopener,noreferrer')
      toast.success('Checkout generado. Completa el pago para regularizar la cuota.')
    } catch {
      toast.error('Error al generar pago')
    } finally {
      setLoadingCuotaId(null)
    }
  }

  if (cuotas.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay cuotas generadas aún.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {cuotas.map((cuota) => (
        <Card key={cuota.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {cuota.actividades?.nombre || 'Actividad'} - {String(cuota.mes).padStart(2, '0')}/{cuota.anio}
              </CardTitle>
              <Badge variant={getEstadoBadge(cuota.estado)}>
                {cuota.estado === 'pagada'
                  ? 'Pagada'
                  : cuota.estado === 'vencida'
                    ? 'Vencida'
                    : 'Pendiente'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Monto: ${cuota.monto}</p>
            <p>Vence: {cuota.fecha_vencimiento}</p>
            <p>Límite final: {cuota.fecha_limite_final}</p>
            {cuota.prorrogas_cuota && cuota.prorrogas_cuota.length > 0 ? (
              <p className="text-muted-foreground">
                Prórroga aplicada: +{cuota.prorrogas_cuota[0].dias_otorgados} días
              </p>
            ) : null}

            {cuota.estado !== 'pagada' ? (
              <div className="pt-2">
                <Button
                  onClick={() => handlePagar(cuota.id)}
                  disabled={loadingCuotaId === cuota.id}
                >
                  {loadingCuotaId === cuota.id ? 'Generando...' : 'Pagar cuota'}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
