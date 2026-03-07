/**
 * Cliente del layout del dashboard con manejo de menú móvil
 */

'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { Navbar } from '@/components/layout/Navbar'

interface DashboardLayoutClientProps {
  usuario: any
  children: React.ReactNode
}

export function DashboardLayoutClient({ usuario, children }: DashboardLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Desktop - Oculto en mobile */}
      <div className="hidden md:block">
        <Sidebar usuario={usuario} />
      </div>

      {/* Sidebar Mobile - Sheet lateral */}
      <MobileSidebar
        usuario={usuario}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          usuario={usuario}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
