import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AlumnoPagosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pagos</h1>
        <p className="mt-2 text-muted-foreground">
          Integración en implementación. Próximamente verás aquí el historial y estado de pagos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mientras tanto</CardTitle>
          <CardDescription>
            Puedes seguir gestionando tus créditos para reservas desde la sección correspondiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/alumno/creditos">Ir a créditos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
