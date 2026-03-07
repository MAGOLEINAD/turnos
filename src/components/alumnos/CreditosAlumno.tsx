'use client'

import { useEffect } from 'react'
import { useCreditosAlumno } from '@/hooks/useAlumnos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDateTime, diferenciaEnDias } from '@/lib/utils/date'
import { Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CreditosAlumnoProps {
  alumnoId: string
  sedeId?: string
}

interface CreditoItem {
  id: string
  utilizado: boolean
  fecha_expiracion: string
  fecha_generacion: string
  fecha_utilizacion?: string | null
  motivo?: string | null
}

export function CreditosAlumno({ alumnoId, sedeId }: CreditosAlumnoProps) {
  const { data: creditos = [], isLoading: loading, error } = useCreditosAlumno(alumnoId, sedeId)
  const creditosList = creditos as CreditoItem[]

  useEffect(() => {
    if (error) {
      toast.error('Error al cargar creditos')
    }
  }, [error])

  const creditosDisponibles = creditosList.filter(
    (c) => !c.utilizado && new Date(c.fecha_expiracion) > new Date()
  )
  const creditosExpirados = creditosList.filter(
    (c) => !c.utilizado && new Date(c.fecha_expiracion) <= new Date()
  )
  const creditosUtilizados = creditosList.filter((c) => c.utilizado)

  const diasParaExpirar = (fechaExpiracion: string) => {
    return diferenciaEnDias(new Date(fechaExpiracion), new Date())
  }

  const getBadgeExpiracion = (dias: number) => {
    if (dias <= 7) {
      return (
        <Badge variant="destructive">
          Expira en {dias} {dias === 1 ? 'dia' : 'dias'}
        </Badge>
      )
    }
    if (dias <= 30) {
      return <Badge className="bg-orange-500">Expira en {dias} dias</Badge>
    }
    return <Badge variant="outline">Expira en {dias} dias</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Cargando creditos...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Mis Creditos
          </CardTitle>
          <CardDescription>Creditos generados por cancelaciones con anticipacion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-green-600">{creditosDisponibles.length}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600">{creditosExpirados.length}</p>
              <p className="text-sm text-muted-foreground">Expirados</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">{creditosUtilizados.length}</p>
              <p className="text-sm text-muted-foreground">Utilizados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Los creditos se generan cuando cancelas una reserva con al menos 24 horas de anticipacion.
          Son validos por 90 dias y pueden usarse en cualquier sede de la organizacion.
        </AlertDescription>
      </Alert>

      {creditosDisponibles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Creditos Disponibles
          </h3>
          <div className="grid gap-3">
            {creditosDisponibles.map((credito) => {
              const dias = diasParaExpirar(credito.fecha_expiracion)
              return (
                <Card key={credito.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            Generado: {formatDateTime(new Date(credito.fecha_generacion))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Expira: {formatDateTime(new Date(credito.fecha_expiracion))}
                          </p>
                        </div>
                        {credito.motivo ? (
                          <p className="text-xs text-muted-foreground">Motivo: {credito.motivo}</p>
                        ) : null}
                      </div>
                      <div>{getBadgeExpiracion(dias)}</div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {creditosExpirados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-orange-600" />
            Creditos Expirados
          </h3>
          <div className="grid gap-3 opacity-60">
            {creditosExpirados.map((credito) => (
              <Card key={credito.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Generado: {formatDateTime(new Date(credito.fecha_generacion))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Expiro: {formatDateTime(new Date(credito.fecha_expiracion))}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">Expirado</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {creditosUtilizados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Creditos Utilizados
          </h3>
          <div className="grid gap-3 opacity-60">
            {creditosUtilizados.map((credito) => (
              <Card key={credito.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Generado: {formatDateTime(new Date(credito.fecha_generacion))}
                        </p>
                      </div>
                      {credito.fecha_utilizacion ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Utilizado: {formatDateTime(new Date(credito.fecha_utilizacion))}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <Badge className="bg-blue-500">Utilizado</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {creditosList.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No tienes creditos aun. Los creditos se generan cuando cancelas una reserva con
                anticipacion.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
