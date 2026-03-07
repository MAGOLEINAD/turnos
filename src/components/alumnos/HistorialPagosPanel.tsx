'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface HistorialPagoItem {
  id: string
  monto: number
  moneda: string
  descripcion: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'reembolsado'
  origen_registro: 'mercadopago' | 'transferencia' | 'efectivo' | 'manual_override'
  referencia_manual: string | null
  observaciones_manual: string | null
  es_senia: boolean
  fecha_pago: string | null
  fecha_aprobacion: string | null
  created_at: string
  reservas?: {
    fecha_inicio?: string
    estado?: string
    actividades?: {
      nombre?: string
    } | null
  } | null
}

interface HistorialPagosPanelProps {
  pagos: HistorialPagoItem[]
  title?: string
  emptyMessage?: string
}

function getEstadoLabel(estado: HistorialPagoItem['estado']) {
  if (estado === 'aprobado') return 'Aprobado'
  if (estado === 'rechazado') return 'Rechazado'
  if (estado === 'cancelado') return 'Cancelado'
  if (estado === 'reembolsado') return 'Reembolsado'
  return 'Pendiente'
}

function getEstadoVariant(estado: HistorialPagoItem['estado']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (estado === 'aprobado') return 'default'
  if (estado === 'rechazado' || estado === 'cancelado') return 'destructive'
  if (estado === 'reembolsado') return 'outline'
  return 'secondary'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-AR')
}

function getCanalLabel(origen: HistorialPagoItem['origen_registro']) {
  if (origen === 'mercadopago') return 'Mercado Pago'
  if (origen === 'transferencia') return 'Transferencia'
  if (origen === 'efectivo') return 'Efectivo'
  return 'Manual'
}

export function HistorialPagosPanel({
  pagos,
  title = 'Historial de pagos',
  emptyMessage = 'No hay pagos registrados.',
}: HistorialPagosPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid gap-3">
            {pagos.map((pago) => (
              <div key={pago.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {pago.descripcion || 'Pago'} - {pago.moneda} {Number(pago.monto).toFixed(2)}
                  </p>
                  <Badge variant={getEstadoVariant(pago.estado)}>{getEstadoLabel(pago.estado)}</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <p>Canal: {getCanalLabel(pago.origen_registro)}</p>
                  <p>Creado: {formatDate(pago.created_at)}</p>
                  <p>Fecha pago: {formatDate(pago.fecha_pago)}</p>
                  {pago.es_senia ? <p>Tipo: Sena / primera clase</p> : null}
                  {pago.reservas?.actividades?.nombre ? (
                    <p>Actividad: {pago.reservas.actividades.nombre}</p>
                  ) : null}
                  {pago.reservas?.fecha_inicio ? (
                    <p>Clase: {formatDate(pago.reservas.fecha_inicio)}</p>
                  ) : null}
                  {pago.referencia_manual ? <p>Referencia: {pago.referencia_manual}</p> : null}
                  {pago.observaciones_manual ? <p>Obs: {pago.observaciones_manual}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
