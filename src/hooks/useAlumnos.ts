import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  obtenerAlumnos,
  obtenerAlumno,
  crearAlumno,
  actualizarAlumno,
  desactivarAlumno,
  obtenerCreditosAlumno,
} from '@/lib/actions/alumnos.actions'
import type { AlumnoInput } from '@/lib/validations/alumno.schema'

type NuevoAlumno = AlumnoInput
type ActualizarAlumnoPayload = Partial<AlumnoInput>

// Hook para obtener lista de alumnos
export function useAlumnos(sedeId?: string) {
  return useQuery({
    queryKey: ['alumnos', sedeId],
    queryFn: async () => {
      const result = await obtenerAlumnos(sedeId)
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    staleTime: 1000 * 60 * 2, // 2 minutos - los alumnos no cambian tan seguido
  })
}

// Hook para obtener un alumno específico
export function useAlumno(alumnoId: string) {
  return useQuery({
    queryKey: ['alumno', alumnoId],
    queryFn: async () => {
      const result = await obtenerAlumno(alumnoId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!alumnoId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// Hook para crear alumno
export function useCrearAlumno() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nuevoAlumno: NuevoAlumno) => {
      const result = await crearAlumno(nuevoAlumno)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      // Invalida la lista de alumnos para que se recargue
      queryClient.invalidateQueries({ queryKey: ['alumnos'] })
    },
  })
}

// Hook para editar alumno
export function useEditarAlumno() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ActualizarAlumnoPayload }) => {
      const result = await actualizarAlumno(id, data)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: (_, variables) => {
      // Invalida tanto la lista como el alumno específico
      queryClient.invalidateQueries({ queryKey: ['alumnos'] })
      queryClient.invalidateQueries({ queryKey: ['alumno', variables.id] })
    },
  })
}

// Hook para eliminar alumno
export function useEliminarAlumno() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (alumnoId: string) => {
      const result = await desactivarAlumno(alumnoId)
      if (result.error) throw new Error(result.error)
      return result.success
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumnos'] })
    },
  })
}

// Hook para obtener créditos de un alumno
export function useCreditosAlumno(alumnoId: string, sedeId?: string) {
  return useQuery({
    queryKey: ['creditos-alumno', alumnoId, sedeId],
    queryFn: async () => {
      const result = await obtenerCreditosAlumno(alumnoId, sedeId)
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: !!alumnoId,
    staleTime: 1000 * 60, // 1 minuto - los créditos pueden cambiar
  })
}
