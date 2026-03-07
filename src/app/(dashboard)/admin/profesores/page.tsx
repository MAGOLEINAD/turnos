'use client'

import { redirect } from 'next/navigation'
import { ProfesoresListClient } from '@/components/profesores/ProfesoresListClient'
import { useAdminSedeContext } from '@/hooks/useAdminContext'
import { SedeContextSelectorClient } from '@/components/sedes/SedeContextSelectorClient'
import { useSearchParams } from 'next/navigation'

export default function AdminProfesoresPage() {
  const searchParams = useSearchParams()
  const sedeParam = searchParams.get('sede')

  // Obtener contexto de admin con React Query
  const { data: ctx, isLoading } = useAdminSedeContext(sedeParam || undefined)

  if (isLoading) {
    return <div className="py-12 text-center">Cargando...</div>
  }

  if (!ctx?.usuario) {
    redirect('/login')
  }

  if (ctx.error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Error: {ctx.error}</p>
      </div>
    )
  }

  if (!ctx.sedes || ctx.sedes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No tienes permisos de administrador. Contacta al Super Admin.
        </p>
      </div>
    )
  }

  const sedesDisponibles = ctx.sedes
  const sedeSeleccionada = sedeParam

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Gestion de Profesores</h1>
          <p className="mt-2 text-muted-foreground">
            Administra profesores por sede dentro de tu cliente.
          </p>
        </div>

        <SedeContextSelectorClient sedes={sedesDisponibles} sedeSeleccionada={sedeSeleccionada ?? null} />
      </div>

      <ProfesoresListClient
        sedeId={sedeSeleccionada || undefined}
        sedes={sedesDisponibles.map((sede: any) => ({ id: sede.id, nombre: sede.nombre }))}
      />
    </div>
  )
}
