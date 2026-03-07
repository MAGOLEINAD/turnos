import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardRoute } from '@/lib/constants/navigation'
import { ROLES_LABELS, type RolUsuario } from '@/lib/constants/roles'
import { getUser, seleccionarPerfilActivo } from '@/lib/actions/auth.actions'

function normalizeRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export default async function SeleccionarPerfilPage() {
  const usuario = await getUser()

  if (!usuario) {
    redirect('/login')
  }

  const membresiasActivas = (usuario.membresias || []).filter((m: any) => {
    if (!m?.activa) return false
    if (m?.rol === 'super_admin') return true
    const org = normalizeRel<any>(m.organizaciones)
    return !org || org.activa !== false
  })

  if (membresiasActivas.length === 0) {
    redirect('/sin-acceso')
  }

  if (membresiasActivas.length === 1) {
    redirect(getDashboardRoute(membresiasActivas[0].rol as RolUsuario))
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Seleccionar perfil</h1>
        <p className="text-muted-foreground">
          Tu usuario tiene multiples perfiles activos. Elegi con cual queres trabajar en esta sesion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {membresiasActivas.map((membresia: any) => {
          const org = normalizeRel<any>(membresia.organizaciones)
          const sede = normalizeRel<any>(membresia.sedes)
          const esActiva = usuario.membresia_activa?.id === membresia.id

          return (
            <Card key={membresia.id} className={esActiva ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{ROLES_LABELS[membresia.rol as RolUsuario] || membresia.rol}</CardTitle>
                  {esActiva ? <Badge>En uso</Badge> : null}
                </div>
                <CardDescription>
                  {org?.nombre || 'Sin cliente asignado'} {sede?.nombre ? `- ${sede.nombre}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={async () => {
                    'use server'
                    await seleccionarPerfilActivo(membresia.id)
                  }}
                >
                  <Button type="submit" className="w-full">
                    {esActiva ? 'Continuar con este perfil' : 'Usar este perfil'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
