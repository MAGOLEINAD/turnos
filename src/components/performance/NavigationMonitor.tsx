'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationMonitor() {
  const pathname = usePathname()

  useEffect(() => {
    const navigationStart = performance.now()
    console.log(`🚀 [NAVIGATION START] ${pathname}`)

    // Medir cuando React termina de renderizar
    const renderEnd = performance.now()
    console.log(`✅ [REACT RENDER] ${pathname}: ${(renderEnd - navigationStart).toFixed(2)}ms`)

    // Medir cuando todo el contenido carga (incluyendo queries)
    const timeout = setTimeout(() => {
      const totalTime = performance.now() - navigationStart
      console.log(`🏁 [NAVIGATION COMPLETE] ${pathname}: ${totalTime.toFixed(2)}ms`)

      // Desglose de tiempos
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        console.table({
          'DNS': `${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`,
          'TCP': `${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`,
          'Request': `${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`,
          'Response': `${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`,
          'DOM Processing': `${(navigation.domComplete - navigation.domInteractive).toFixed(2)}ms`,
          'Total': `${totalTime.toFixed(2)}ms`
        })
      }
    }, 2000) // Espera 2s después del render

    return () => clearTimeout(timeout)
  }, [pathname])

  return null
}
