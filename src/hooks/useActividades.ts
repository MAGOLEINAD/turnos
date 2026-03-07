import { useQuery } from '@tanstack/react-query'
import { obtenerActividadesDisponiblesProfesor } from '@/lib/actions/actividades.actions'

// Hook para obtener actividades disponibles de un profesor
export function useActividadesProfesor(profesorId: string, sedeId: string) {
  return useQuery({
    queryKey: ['actividades-profesor', profesorId, sedeId],
    queryFn: async () => {
      const result = await obtenerActividadesDisponiblesProfesor(profesorId, sedeId)
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: !!profesorId && !!sedeId,
    staleTime: 1000 * 60 * 5, // 5 minutos - las actividades no cambian frecuentemente
  })
}
