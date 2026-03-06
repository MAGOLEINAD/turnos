import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth.actions'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SedeContextSelector } from '@/components/sedes/SedeContextSelector'

interface VistaGlobalPageProps {
  searchParams?: {
    sede?: string
  }
}

export default async function VistaGlobalPage({ searchParams }: VistaGlobalPageProps) {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre, organizaciones(nombre)')
    .order('nombre', { ascending: true })

  const sedesList = sedes || []
  const sedeSeleccionada = searchParams?.sede || sedesList[0]?.id || ''
  const sedeActual = sedesList.find((s) => s.id === sedeSeleccionada)
  const sedeQuery = sedeSeleccionada ? `?sede=${sedeSeleccionada}` : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vista Global</h1>
        <p className="mt-2 text-muted-foreground">
          Acceso total ordenado por sede para supervisar operación admin, profesor y alumno.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contexto de Sede</CardTitle>
          <CardDescription>
            Selecciona la sede que quieres auditar. Esta vista no cambia roles, solo organiza navegación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SedeContextSelector sedes={sedesList} sedeSeleccionada={sedeSeleccionada} />

          {sedeActual && (
            <p className="mt-3 text-sm text-muted-foreground">
              Organización: {sedeActual.organizaciones?.nombre || 'Sin organización'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>Gestión de sede y recursos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/sedes">Mis Sedes</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/profesores">Profesores</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/alumnos">Alumnos</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/configuracion">Configuración</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/admin/calendario${sedeQuery}`}>Calendario</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/admin/reportes${sedeQuery}`}>Reportes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profesor</CardTitle>
            <CardDescription>Agenda operativa diaria.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/profesor/calendario">Calendario</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/profesor/reservas">Reservas</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/profesor/bloqueos">Bloqueos</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/profesor/alumnos">Alumnos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alumno</CardTitle>
            <CardDescription>Experiencia de reservas y seguimiento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/alumno/calendario">Calendario</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/alumno/mis-reservas">Mis Reservas</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/alumno/horarios-fijos">Horarios Fijos</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/alumno/creditos">Créditos</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/alumno/pagos">Pagos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
