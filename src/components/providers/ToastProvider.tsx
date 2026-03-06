/**
 * Provider de notificaciones toast con Sonner
 */

'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'rounded-lg border',
          title: 'font-medium',
          description: 'text-sm opacity-90',
        },
      }}
    />
  )
}
