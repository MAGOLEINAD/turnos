'use client'

import { useState } from 'react'
import { darDeBajaHorarioFijo } from '@/lib/actions/horarios-fijos.actions'
import { FormHorarioFijo } from './FormHorarioFijo'
import { DIA_SEMANA_LABELS, FRECUENCIA_HORARIO_LABELS } from '@/lib/constants/estados'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Calendar, Clock, User, Repeat, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'

interface HorariosFijosListProps {
  horariosFijos: any[]
  sedeId: string
  alumnoId?: string
  mostrarBotonCrear?: boolean
}

export function HorariosFijosList({
  horariosFijos: horariosFijosIniciales,
  sedeId,
  alumnoId,
  mostrarBotonCrear = true,
}: HorariosFijosListProps) {
  const [horariosFijos] = useState(horariosFijosIniciales)
  const [modalCrearOpen, setModalCrearOpen] = useState(false)
  const [modalBajaOpen, setModalBajaOpen] = useState(false)
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<any>(null)
  const [motivoBaja, setMotivoBaja] = useState('')
  const [modalidadBaja, setModalidadBaja] = useState<'inmediata' | 'fin_de_mes'>('inmediata')
  const [loadingBaja, setLoadingBaja] = useState(false)

  const handleDarDeBaja = (horario: any) => {
    setHorarioSeleccionado(horario)
    setModalBajaOpen(true)
  }

  const handleConfirmarBaja = async () => {
    if (!horarioSeleccionado) return

    setLoadingBaja(true)
    try {
      const result = await darDeBajaHorarioFijo({
        horario_fijo_id: horarioSeleccionado.id,
        modalidad: modalidadBaja,
        motivo: motivoBaja,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          modalidadBaja === 'fin_de_mes'
            ? 'Baja programada a fin de mes'
            : 'Horario fijo dado de baja exitosamente'
        )
        setMotivoBaja('')
        setModalidadBaja('inmediata')
        setModalBajaOpen(false)
        window.location.reload()
      }
    } catch {
      toast.error('Error al dar de baja el horario')
    } finally {
      setLoadingBaja(false)
    }
  }

  const getDiasSemana = (horario: any) => {
    const dias = Array.isArray(horario.dias_semana)
      ? horario.dias_semana
          .map((dia: string) => DIA_SEMANA_LABELS[dia as keyof typeof DIA_SEMANA_LABELS] || dia)
          .filter(Boolean)
      : []
    return dias.join(', ')
  }

  const getDuracionMinutos = (horario: any) => {
    if (!horario?.hora_inicio || !horario?.hora_fin) return null
    const [hIni, mIni] = String(horario.hora_inicio).split(':').map(Number)
    const [hFin, mFin] = String(horario.hora_fin).split(':').map(Number)
    const inicio = hIni * 60 + mIni
    const fin = hFin * 60 + mFin
    return Math.max(0, fin - inicio)
  }

  return (
    <>
      <div className="space-y-6">
        {mostrarBotonCrear ? (
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Horarios Fijos</h2>
              <p className="text-muted-foreground">
                {horariosFijos.length} {horariosFijos.length === 1 ? 'horario' : 'horarios'} activos
              </p>
            </div>
            <Button onClick={() => setModalCrearOpen(true)}>Nuevo Horario Fijo</Button>
          </div>
        ) : null}

        {horariosFijos.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tienes horarios fijos configurados aun.</p>
                {mostrarBotonCrear ? (
                  <Button onClick={() => setModalCrearOpen(true)} className="mt-4">
                    Crear Primer Horario Fijo
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {horariosFijos.map((horario) => (
              <Card key={horario.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {getDiasSemana(horario)}
                      </CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {
                          FRECUENCIA_HORARIO_LABELS[
                            horario.frecuencia as keyof typeof FRECUENCIA_HORARIO_LABELS
                          ]
                        }
                      </Badge>
                    </div>
                    {horario.profesores ? (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: horario.profesores.color_calendario || '#6366F1' }}
                        title={`${horario.profesores.usuarios?.nombre || ''} ${horario.profesores.usuarios?.apellido || ''}`}
                      />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{horario.hora_inicio}</span>
                    {getDuracionMinutos(horario) ? (
                      <span className="text-muted-foreground">({getDuracionMinutos(horario)} min)</span>
                    ) : null}
                  </div>

                  {horario.profesores ? (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {horario.profesores.usuarios?.nombre} {horario.profesores.usuarios?.apellido}
                      </span>
                    </div>
                  ) : null}

                  {horario.alumnos && !alumnoId ? (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {horario.alumnos.usuarios?.nombre} {horario.alumnos.usuarios?.apellido}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Repeat className="h-4 w-4" />
                    <span>Desde {formatDate(new Date(horario.fecha_inicio))}</span>
                  </div>

                  {horario.fecha_baja_efectiva ? (
                    <p className="text-xs text-orange-600">
                      Baja efectiva: {formatDate(new Date(horario.fecha_baja_efectiva))}
                    </p>
                  ) : null}

                  {horario.sedes ? (
                    <div className="text-sm text-muted-foreground">Sede: {horario.sedes.nombre}</div>
                  ) : null}

                  {alumnoId ? (
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDarDeBaja(horario)}
                        className="w-full"
                      >
                        Dar de Baja
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FormHorarioFijo
        open={modalCrearOpen}
        onOpenChange={setModalCrearOpen}
        sedeId={sedeId}
        alumnoId={alumnoId}
        onSuccess={() => window.location.reload()}
      />

      <Dialog open={modalBajaOpen} onOpenChange={setModalBajaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de Baja Horario Fijo</DialogTitle>
            <DialogDescription>
              Elige si la baja es inmediata o al cierre del mes actual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    Confirma la baja
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                    Si eliges fin de mes, el horario queda reservado y no se libera el cupo hasta la
                    fecha efectiva.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Modalidad de baja *</Label>
              <Select
                value={modalidadBaja}
                onValueChange={(v: string) => setModalidadBaja(v as 'inmediata' | 'fin_de_mes')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inmediata">Inmediata (libera cupo ahora)</SelectItem>
                  <SelectItem value="fin_de_mes">Fin de mes (mantiene cupo hasta cierre mensual)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo de la Baja *</Label>
              <Textarea
                id="motivo"
                placeholder="Explica por que deseas dar de baja este horario..."
                rows={3}
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
              />
              {motivoBaja.length > 0 && motivoBaja.length < 10 ? (
                <p className="text-xs text-destructive">Minimo 10 caracteres ({motivoBaja.length}/10)</p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModalBajaOpen(false)
                  setMotivoBaja('')
                  setModalidadBaja('inmediata')
                }}
                disabled={loadingBaja}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmarBaja}
                disabled={loadingBaja || motivoBaja.length < 10}
              >
                {loadingBaja ? 'Procesando...' : 'Confirmar Baja'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
