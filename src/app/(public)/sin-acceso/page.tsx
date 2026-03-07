import { redirect } from 'next/navigation'
import { AlertCircle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUser, logout } from '@/lib/actions/auth.actions'

export default async function SinAccesoPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const tieneMembresias = (usuario.membresias || []).length > 0

  if (tieneMembresias) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Sin acceso habilitado</CardTitle>
          <CardDescription className="text-base mt-2">
            Tu usuario no tiene perfiles activos en este momento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            Contacta al administrador para que te asigne un rol y una sede.
          </div>

          <form action={logout}>
            <Button className="w-full" variant="outline" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesion
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

