import { useQuery, useQueryClient } from '@tantml:parameter>import { obtenerDatosCalendarioProfesor } from '@/lib/actions/calendario-profesor.actions'

// Hook para obtener datos del calendario del profesor (reservas + horarios fijos + bloqueos)
export function useCalendarioProfesor(profesorId: string) {
  return useQuery({
    queryKey: ['calendario-profesor', profesorId],
    queryFn: async () => {
      const result = await obtenerDatosCalendarioProfesor(profesorId)
      if (result.error) throw new Error(result.error)
      return result.data || { reservas: [], horarios: [], bloqueos: [] }
    },
    enabled: !!profesorId,
    staleTime: 1000 * 30, // 30 segundos - el calendario cambia frecuentemente
  })
}

// Hook helper para invalidar el calendario del profesor después de mutaciones
export function useInvalidarCalendarioProfesor() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['calendario-profesor'] })
    queryClient.invalidateQueries({ queryKey: ['reservas'] })
  }
}
