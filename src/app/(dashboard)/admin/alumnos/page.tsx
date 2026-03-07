'use client'

import { redirect } from 'next/navigation'
import { AlumnosListClient } from '@/components/alumnos/AlumnosListClient'
import { useAdminSedeContext } from '@/hooks/useAdminContext'
import { SedeContextSelectorClient } from '@/components/sedes/SedeContextSelectorClient'
import { useSearchParams } from 'next/navigation'

export default function AdminAlumnosPage() {
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
          <h1 className="text-3xl font-bold">Gestion de Alumnos</h1>
          <p className="mt-2 text-muted-foreground">
            Administra alumnos por sede dentro de tu cliente.
          </p>
        </div>

        <SedeContextSelectorClient sedes={sedesDisponibles} sedeSeleccionada={sedeSeleccionada ?? null} />
      </div>

      <AlumnosListClient sedeId={sedeSeleccionada || undefined} />
    </div>
  )
}
