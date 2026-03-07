'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { crearBloqueo } from '@/lib/actions/bloqueos.actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface FormBloqueoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesorId: string
  onSuccess?: () => void
}

function getLocalDateTimeValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function FormBloqueo({ open, onOpenChange, profesorId, onSuccess }: FormBloqueoProps) {
  const now = new Date()
  const plusOneHour = new Date(now.getTime() + 60 * 60 * 1000)

  const [fechaInicio, setFechaInicio] = useState(getLocalDateTimeValue(now))
  const [fechaFin, setFechaFin] = useState(getLocalDateTimeValue(plusOneHour))
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    const base = new Date()
    setFechaInicio(getLocalDateTimeValue(base))
    setFechaFin(getLocalDateTimeValue(new Date(base.getTime() + 60 * 60 * 1000)))
    setMotivo('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const result = await crearBloqueo({
        profesor_id: profesorId,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        fecha_fin: new Date(fechaFin).toISOString(),
        es_recurrente: false,
        motivo: motivo || undefined,
        resoluciones_conflicto: [],
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Bloqueo creado')
      onOpenChange(false)
      reset()
      onSuccess?.()
    } catch {
      toast.error('No se pudo crear el bloqueo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear disponibilidad</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="bloqueo-inicio">Inicio</Label>
            <Input
              id="bloqueo-inicio"
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bloqueo-fin">Fin</Label>
            <Input
              id="bloqueo-fin"
              type="datetime-local"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bloqueo-motivo">Motivo (opcional)</Label>
            <Textarea
              id="bloqueo-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Vacaciones, reunion, mantenimiento, etc."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear bloqueo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
