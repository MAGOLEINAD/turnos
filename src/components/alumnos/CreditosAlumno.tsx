'use client'

import { useEffect, useState } from 'react'
import { obtenerCreditosAlumno } from '@/lib/actions/alumnos.actions'
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

export function CreditosAlumno({ alumnoId, sedeId }: CreditosAlumnoProps) {
  const [creditos, setCreditos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarCreditos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoId, sedeId])

  const cargarCreditos = async () => {
    setLoading(true)
    try {
      const result = await obtenerCreditosAlumno(alumnoId, sedeId)

      if (result.error) {
        toast.error(result.error)
        setCreditos([])
      } else {
        setCreditos(result.data || [])
      }
    } catch (error) {
      toast.error('Error al cargar créditos')
      setCreditos([])
    } finally {
      setLoading(false)
    }
  }

  const creditosDisponibles = creditos.filter((c) => !c.utilizado && new Date(c.fecha_expiracion) > new Date())
  const creditosExpirados = creditos.filter((c) => !c.utilizado && new Date(c.fecha_expiracion) <= new Date())
  const creditosUtilizados = creditos.filter((c) => c.utilizado)

  const diasParaExpirar = (fechaExpiracion: string) => {
    const dias = diferenciaEnDias(new Date(fechaExpiracion), new Date())
    return dias
  }

  const getBadgeExpiracion = (dias: number) => {
    if (dias <= 7) {
      return <Badge variant="destructive">Expira en {dias} {dias === 1 ? 'día' : 'días'}</Badge>
    } else if (dias <= 30) {
      return <Badge className="bg-orange-500">Expira en {dias} días</Badge>
    } else {
      return <Badge variant="outline">Expira en {dias} días</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Cargando créditos...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Mis Créditos
          </CardTitle>
          <CardDescription>
            Créditos generados por cancelaciones con anticipación
          </CardDescription>
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

      {/* Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Los créditos se generan cuando cancelas una reserva con al menos 24 horas de anticipación.
          Son válidos por 90 días y pueden usarse en cualquier sede de la organización.
        </AlertDescription>
      </Alert>

      {/* Créditos Disponibles */}
      {creditosDisponibles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Créditos Disponibles
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
                        {credito.motivo && (
                          <p className="text-xs text-muted-foreground">Motivo: {credito.motivo}</p>
                        )}
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

      {/* Créditos Expirados */}
      {creditosExpirados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-orange-600" />
            Créditos Expirados
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
                          Expiró: {formatDateTime(new Date(credito.fecha_expiracion))}
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

      {/* Créditos Utilizados */}
      {creditosUtilizados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Créditos Utilizados
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
                      {credito.fecha_utilizacion && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Utilizado: {formatDateTime(new Date(credito.fecha_utilizacion))}
                          </p>
                        </div>
                      )}
                    </div>
                    <Badge className="bg-blue-500">Utilizado</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sin créditos */}
      {creditos.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No tienes créditos aún. Los créditos se generan cuando cancelas una reserva con anticipación.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
