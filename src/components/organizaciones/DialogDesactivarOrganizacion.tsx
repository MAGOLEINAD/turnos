'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'
import { AlertCircle } from 'lucide-react'

interface DialogDesactivarOrganizacionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizacion: { id: string; nombre: string } | null
  loading: boolean
  onConfirm: (motivo: string) => Promise<void>
}

const MOTIVOS_PREDEFINIDOS = [
  'Falta de pago',
  'Suspension temporal',
  'Solicitud del cliente',
  'Otro',
]

export function DialogDesactivarOrganizacion({
  open,
  onOpenChange,
  organizacion,
  loading,
  onConfirm,
}: DialogDesactivarOrganizacionProps) {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>('')
  const [motivoCustom, setMotivoCustom] = useState('')

  const handleConfirm = async () => {
    const motivo = motivoSeleccionado === 'Otro' ? motivoCustom : motivoSeleccionado
    if (!motivo.trim()) return

    await onConfirm(motivo)
    setMotivoSeleccionado('')
    setMotivoCustom('')
  }

  const handleClose = () => {
    setMotivoSeleccionado('')
    setMotivoCustom('')
    onOpenChange(false)
  }

  const motivoFinal = motivoSeleccionado === 'Otro' ? motivoCustom : motivoSeleccionado
  const isValid = motivoFinal.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Desactivar cliente
          </DialogTitle>
          <DialogDescription>
            Estas a punto de desactivar a &quot;{organizacion?.nombre}&quot;. Los usuarios de este
            cliente no podran acceder al sistema hasta que sea reactivado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Motivo de la desactivacion *</Label>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS_PREDEFINIDOS.map((motivo) => (
                <Button
                  key={motivo}
                  type="button"
                  variant={motivoSeleccionado === motivo ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMotivoSeleccionado(motivo)}
                  className="justify-start"
                >
                  {motivo}
                </Button>
              ))}
            </div>
          </div>

          {motivoSeleccionado === 'Otro' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="motivo-custom">Especificar motivo</Label>
              <Textarea
                id="motivo-custom"
                placeholder="Ingresa el motivo de la desactivacion..."
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {motivoCustom.length}/500 caracteres
              </p>
            </div>
          )}

          {motivoSeleccionado && motivoSeleccionado !== 'Otro' && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-sm text-orange-900">
                <span className="font-medium">Motivo: </span>
                {motivoSeleccionado}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <LoadingButton
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid}
            loading={loading}
            loadingText="Desactivando..."
          >
            Desactivar cliente
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
