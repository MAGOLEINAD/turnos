import { useQuery } from '@tanstack/react-query'
import { getAdminSedeContext } from '@/lib/actions/admin-context.actions'

// Hook para obtener el contexto de admin (sedes disponibles)
export function useAdminSedeContext(sedeId?: string) {
  return useQuery({
    queryKey: ['admin-context', sedeId],
    queryFn: async () => {
      const result = await getAdminSedeContext(sedeId)
      return result
    },
    staleTime: 1000 * 60 * 2, // 2 minutos - el contexto admin no cambia frecuentemente
  })
}
