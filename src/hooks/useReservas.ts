import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { obtenerReservas, crearReserva, cancelarReserva } from '@/lib/actions/reservas.actions'
import type { ReservaInput, CancelarReservaInput } from '@/lib/validations/reserva.schema'

// Hook para obtener reservas con caching automático
export function useReservas(sedeId?: string, fechaInicio?: Date, fechaFin?: Date) {
  return useQuery({
    queryKey: ['reservas', sedeId, fechaInicio?.toISOString(), fechaFin?.toISOString()],
    queryFn: async () => {
      const result = await obtenerReservas(undefined, fechaInicio, fechaFin)
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    // Configuración específica para reservas
    staleTime: 1000 * 30, // 30 segundos - las reservas cambian rápido
    enabled: !!sedeId, // Solo ejecutar si hay sedeId
  })
}

// Hook para crear reservas con invalidación automática de cache
export function useCrearReserva() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nuevaReserva: ReservaInput) => {
      const result = await crearReserva(nuevaReserva)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // Invalida TODAS las queries de reservas automáticamente
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
      // También invalida disponibilidad si tienes esa query
      queryClient.invalidateQueries({ queryKey: ['disponibilidad'] })
    },
  })
}

// Hook para cancelar reservas
export function useCancelarReserva() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CancelarReservaInput) => {
      const result = await cancelarReserva(payload)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
    },
  })
}
