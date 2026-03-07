'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configuración por defecto para todas las queries
            staleTime: 1000 * 60, // 1 minuto - datos frescos por 1 min
            gcTime: 1000 * 60 * 5, // 5 minutos - mantener en cache 5 min (antes era cacheTime)
            refetchOnWindowFocus: false, // No refetch al cambiar de tab
            refetchOnReconnect: false, // No refetch al reconectar
            retry: 1, // Solo reintentar 1 vez en caso de error
          },
          mutations: {
            // Configuración para mutaciones (crear/editar/eliminar)
            retry: false, // No reintentar mutaciones fallidas automáticamente
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools solo en desarrollo - MUY ÚTIL para debuggear */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  )
}
