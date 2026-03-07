'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { registrarPagoManualCuota, otorgarProrrogaCuota } from '@/lib/actions/cuotas.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CuotaAdminItem {
  id: string
  anio: number
  mes: number
  estado: 'pendiente' | 'pagada' | 'vencida'
  monto: number
  fecha_limite_final: string
  alumnos?: {
    usuarios?: {
      nombre?: string
      apellido?: string
    }
  } | null
  actividades?: {
    nombre?: string
  } | null
}

interface CuotasAdminPanelProps {
  cuotas: CuotaAdminItem[]
}

export function CuotasAdminPanel({ cuotas }: CuotasAdminPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [medioPago, setMedioPago] = useState<'transferencia' | 'efectivo' | 'manual_override'>(
    'manual_override'
  )
  const [motivoProrroga, setMotivoProrroga] = useState('Prorroga administrativa')
  const [diasProrroga, setDiasProrroga] = useState(10)

  const handlePagoManual = async (cuotaId: string) => {
    setLoadingId(cuotaId)
    try {
      const result = await registrarPagoManualCuota({
        cuotaId,
        origen: medioPago,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Pago manual registrado')
      }
    } catch {
      toast.error('No se pudo registrar el pago manual')
    } finally {
      setLoadingId(null)
    }
  }

  const handleProrroga = async (cuotaId: string) => {
    setLoadingId(cuotaId)
    try {
      const result = await otorgarProrrogaCuota({
        cuotaId,
        dias: diasProrroga,
        motivo: motivoProrroga,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Prorroga aplicada')
      }
    } catch {
      toast.error('No se pudo aplicar la prorroga')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion admin de cuotas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Medio pago manual</Label>
            <Select value={medioPago} onValueChange={(v) => setMedioPago(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_override">Override manual</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dias prorroga</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={diasProrroga}
              onChange={(e) => setDiasProrroga(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Motivo prorroga</Label>
            <Input value={motivoProrroga} onChange={(e) => setMotivoProrroga(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3">
          {cuotas.map((cuota) => (
            <div
              key={cuota.id}
              className="rounded border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">
                  {cuota.alumnos?.usuarios?.nombre || ''} {cuota.alumnos?.usuarios?.apellido || ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  {cuota.actividades?.nombre || 'Actividad'} -{' '}
                  {String(cuota.mes).padStart(2, '0')}/{cuota.anio} - ${cuota.monto} - estado:{' '}
                  {cuota.estado}
                </p>
                <p className="text-xs text-muted-foreground">
                  Limite final: {cuota.fecha_limite_final}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleProrroga(cuota.id)}
                  disabled={loadingId === cuota.id}
                >
                  Prorrogar
                </Button>
                <Button onClick={() => handlePagoManual(cuota.id)} disabled={loadingId === cuota.id}>
                  Marcar pago manual
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
