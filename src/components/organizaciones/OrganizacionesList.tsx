'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'
import { FormOrganizacion } from './FormOrganizacion'

interface OrganizacionesListProps {
  organizacionesIniciales: any[]
}

export function OrganizacionesList({ organizacionesIniciales }: OrganizacionesListProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [organizacionEdit, setOrganizacionEdit] = useState<any>(null)

  const handleNueva = () => {
    setOrganizacionEdit(null)
    setModalOpen(true)
  }

  const handleEditar = (org: any) => {
    setOrganizacionEdit(org)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setOrganizacionEdit(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Organizaciones</h1>
        <Button onClick={handleNueva}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Organización
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizacionesIniciales.map((org) => (
          <Card key={org.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{org.nombre}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditar(org)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {org.descripcion || 'Sin descripción'}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    org.activa
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {org.activa ? 'Activa' : 'Inactiva'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(org.created_at).toLocaleDateString('es-AR')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {organizacionesIniciales.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No hay organizaciones creadas aún</p>
            <Button onClick={handleNueva} className="mt-4">
              Crear Primera Organización
            </Button>
          </div>
        )}
      </div>

      <FormOrganizacion
        open={modalOpen}
        onClose={handleClose}
        organizacion={organizacionEdit}
      />
    </div>
  )
}
