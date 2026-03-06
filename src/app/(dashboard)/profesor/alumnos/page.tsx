import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ProfesorAlumnosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Alumnos</h1>
        <p className="mt-2 text-muted-foreground">
          Vista dedicada en implementación. Puedes gestionar clases y alumnos desde el calendario.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión actual</CardTitle>
          <CardDescription>Usa el calendario para administrar reservas grupales e individuales.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/profesor/calendario">Ir a calendario</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
