import { CalendarioPublico } from '@/components/calendario/CalendarioPublico'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function CalendarioPublicoPage({
  params,
}: {
  params: { sedeSlug: string }
}) {
  const supabase = await createClient()

  // Obtener sede por slug
  const { data: sede, error } = await supabase
    .from('sedes')
    .select(`
      id,
      nombre,
      slug,
      configuracion_sede (mostrar_profesor_publico, permitir_reservas_online)
    `)
    .eq('slug', params.sedeSlug)
    .single()

  if (error || !sede) {
    notFound()
  }

  const mostrarProfesor = sede.configuracion_sede?.mostrar_profesor_publico ?? true

  return (
    <div className="container mx-auto py-8 px-4">
      <CalendarioPublico
        sedeId={sede.id}
        sedeNombre={sede.nombre}
        mostrarProfesor={mostrarProfesor}
      />
    </div>
  )
}
