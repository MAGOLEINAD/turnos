import { useQuery } from '@tanstack/react-query'
import { obtenerProfesores, obtenerProfesor } from '@/lib/actions/profesores.actions'

// Hook para obtener lista de profesores
export function useProfesores(sedeId?: string) {
  return useQuery({
    queryKey: ['profesores', sedeId],
    queryFn: async () => {
      const result = await obtenerProfesores(sedeId)
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    staleTime: 1000 * 60 * 2,
  })
}

// Hook para obtener un profesor especifico
export function useProfesor(profesorId: string) {
  return useQuery({
    queryKey: ['profesor', profesorId],
    queryFn: async () => {
      const result = await obtenerProfesor(profesorId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!profesorId,
    staleTime: 1000 * 60 * 5,
  })
}
