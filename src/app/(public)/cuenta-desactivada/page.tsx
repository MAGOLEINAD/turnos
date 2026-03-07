/**
 * Página de cuenta desactivada
 * Muestra el motivo por el cual la organización fue desactivada
 */

import { redirect } from 'next/navigation'
import { getUser, logout } from '@/lib/actions/auth.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, LogOut, Mail } from 'lucide-react'

export default async function CuentaDesactivadaPage() {
  const usuario = await getUser()

  // Si no hay usuario, redirigir a login
  if (!usuario) {
    redirect('/login')
  }

  // Si la organización está activa, redirigir al dashboard
  if (!usuario.organizacion_desactivada) {
    redirect('/dashboard')
  }

  const motivo = usuario.motivo_desactivacion || 'No se especificó un motivo'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Cuenta Desactivada</CardTitle>
          <CardDescription className="text-base mt-2">
            Tu organización ha sido desactivada temporalmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Motivo de la desactivación
            </h3>
            <p className="text-sm text-orange-800">{motivo}</p>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Tu cuenta de usuario está activa, pero no puedes acceder al sistema porque tu
              organización ha sido desactivada.
            </p>
            <p>
              Para resolver esta situación, por favor contacta con el administrador del sistema
              o resuelve el motivo indicado arriba.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Button
              className="w-full"
              variant="outline"
              onClick={async () => {
                'use server'
                await logout()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              ¿Necesitas ayuda? Contacta a soporte
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
