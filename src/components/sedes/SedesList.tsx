'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Phone, Mail } from 'lucide-react'
import { FormSede } from './FormSede'

interface SedesListProps {
  sedesIniciales: any[]
  organizaciones: any[]
}

export function SedesList({ sedesIniciales, organizaciones }: SedesListProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sedes</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Sede
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sedesIniciales.map((sede) => (
          <Card key={sede.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{sede.nombre}</CardTitle>
                  <Badge variant="outline" className="mt-2">
                    {sede.organizaciones?.nombre}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sede.direccion && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {sede.direccion}
                </div>
              )}
              {sede.telefono && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  {sede.telefono}
                </div>
              )}
              {sede.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  {sede.email}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <FormSede
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        organizaciones={organizaciones}
      />
    </div>
  )
}
