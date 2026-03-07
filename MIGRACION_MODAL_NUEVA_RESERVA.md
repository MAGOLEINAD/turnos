# Instrucciones para Migrar ModalNuevaReserva.tsx a React Query

El archivo está siendo modificado por el linter, así que aquí están los cambios necesarios:

## 1. Actualizar imports (líneas 3-13)

```typescript
// REMOVER:
import { useState, useEffect, useCallback } from 'react'
import { obtenerCreditosAlumno } from '@/lib/actions/alumnos.actions'
import {
  obtenerActividadesDisponiblesProfesor,
  type ActividadDisponibleProfesor,
} from '@/lib/actions/actividades.actions'

// AGREGAR:
import { useState, useEffect } from 'react'
import { useActividadesProfesor } from '@/hooks/useActividades'
import { useCreditosAlumno } from '@/hooks/useAlumnos'
import type { ActividadDisponibleProfesor } from '@/lib/actions/actividades.actions'
```

## 2. Reemplazar estado local con hooks de React Query (líneas 48-82)

```typescript
// REMOVER estas líneas:
const [creditos, setCreditos] = useState<any[]>([])
const [actividades, setActividades] = useState<ActividadDisponibleProfesor[]>([])

// Y REMOVER COMPLETAMENTE estas funciones (líneas 84-107):
const cargarActividades = useCallback(async () => { ... }, [profesorId, sedeId, setValue])
const cargarCreditos = useCallback(async () => { ... }, [alumnoId, sedeId])

// AGREGAR DESPUÉS DE const [crearComoRecurrente...]:
// React Query maneja loading, error y caching automáticamente
const { data: actividades = [], error: actividadesError } = useActividadesProfesor(profesorId, sedeId)
const { data: creditos = [] } = useCreditosAlumno(alumnoId || '', sedeId)
```

## 3. Reemplazar useEffect de carga (líneas 109-113)

```typescript
// REMOVER:
useEffect(() => {
  if (!open) return
  cargarActividades()
  if (alumnoId) cargarCreditos()
}, [open, alumnoId, cargarActividades, cargarCreditos])

// AGREGAR:
// Mostrar error si existe
useEffect(() => {
  if (actividadesError) {
    toast.error('Error al cargar actividades')
  }
}, [actividadesError])

// Inicializar actividad seleccionada cuando se cargan las actividades
useEffect(() => {
  if (actividades.length > 0 && !actividadSeleccionada) {
    setActividadSeleccionada(actividades[0].id)
    setValue('actividad_id', actividades[0].id)
    setMontoPagoManual(actividades[0].precio_clase)
  }
}, [actividades, actividadSeleccionada, setValue])

// Inicializar crédito seleccionado cuando se cargan los créditos
useEffect(() => {
  if (creditos.length > 0 && !creditoSeleccionado) {
    setCreditoSeleccionado(creditos[0].id)
  }
}, [creditos, creditoSeleccionado])
```

## Resultado

Después de estos cambios:
- ✅ Las actividades se cachean automáticamente por 5 minutos
- ✅ Los créditos se cachean automáticamente por 1 minuto
- ✅ No más doble fetching al abrir/cerrar el modal
- ✅ El modal se abre instantáneamente si los datos ya están en cache
- ✅ Código más limpio sin callbacks y manejo manual de errores

## Testing

1. Abre el modal → debe cargar actividades y créditos
2. Cierra y vuelve a abrir → debe ser instantáneo (usa cache)
3. Espera 5 minutos → al abrir, refresca actividades automáticamente
