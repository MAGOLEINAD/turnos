import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/providers/ToastProvider"
import { NavigationMonitor } from "@/components/performance/NavigationMonitor"
import { QueryProvider } from "@/components/providers/QueryProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Gestión de Turnos - Saas JT",
  description: "Plataforma de gestión de turnos multi-organización para clubes y escuelas",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <QueryProvider>
          {process.env.NODE_ENV === 'development' && <NavigationMonitor />}
          {children}
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  )
}
