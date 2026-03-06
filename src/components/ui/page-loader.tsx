'use client'

import { Loader2 } from 'lucide-react'

interface PageLoaderProps {
  text?: string
  fullscreen?: boolean
}

export function PageLoader({ text = 'Cargando...', fullscreen = false }: PageLoaderProps) {
  const containerClass = fullscreen
    ? 'min-h-screen flex items-center justify-center bg-background'
    : 'w-full flex items-center justify-center py-10'

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  )
}
