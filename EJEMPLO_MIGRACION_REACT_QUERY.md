# Ejemplo de Migración a React Query

## ❌ ANTES (sin React Query)

```typescript
export function CalendarioAlumno({ usuarioId, alumnoId, sedeId }: CalendarioAlumnoProps) {
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarEventos()
  }, [sedeId])

  const cargarEventos = async () => {
    setLoading(true)
    try {
      // ❌ Problema 1: Trae TODAS las reservas sin filtro
      const result = await obtenerReservas(undefined, undefined, undefined)

      if (result.error) {
        toast.error(result.error)
        setEventos([])
      } else if (result.data) {
        // ❌ Problema 2: Filtra en el cliente (miles de registros)
        const reservasSede = result.data.filter((r: any) => r.sede_id === sedeId)
        const eventosConvertidos = reservasSede.map(reservaToEvent)
        setEventos(eventosConvertidos)
      }
    } catch (error) {
      toast.error('Error al cargar eventos')
      setEventos([])
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = async (clickInfo: EventClickArg) => {
    // ❌ Problema 3: Hace otra query completa solo para obtener detalles
    const result = await obtenerReservas()
    if (result.data) {
      const reserva = result.data.find((r: any) => r.id === reservaId)
      // ...
    }
  }

  const handleInscripcionSuccess = () => {
    // ❌ Problema 4: Tiene que refrescar manualmente
    cargarEventos()
  }
}
```

**Problemas:**
- ❌ Sin caching: cada vez que vuelves a la página, re-fetch completo
- ❌ Trae todas las reservas sin filtrar (ineficiente)
- ❌ Loading/error states manuales (propenso a bugs)
- ❌ Re-fetches innecesarios en cada click
- ❌ Invalidación de cache manual

---

## ✅ DESPUÉS (con React Query)

```typescript
export function CalendarioAlumno({ usuarioId, alumnoId, sedeId }: CalendarioAlumnoProps) {
  const [modalInscripcionOpen, setModalInscripcionOpen] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null)

  // ✅ React Query maneja loading, error, data, y caching automáticamente
  const { data: reservas = [], isLoading, error } = useReservas(sedeId)

  // ✅ Mutación con invalidación automática
  const inscripcionMutation = useInscribirseReserva()

  // ✅ Convertir a eventos para FullCalendar (memoizado)
  const eventos = useMemo(
    () => reservas.map(reservaToEvent),
    [reservas]
  )

  useEffect(() => {
    if (error) {
      toast.error('Error al cargar eventos')
    }
  }, [error])

  const handleEventClick = (clickInfo: EventClickArg) => {
    const reservaId = clickInfo.event.id

    // ✅ Los datos ya están en cache, no hace falta re-fetch
    const reserva = reservas.find((r: any) => r.id === reservaId)

    if (reserva?.tipo === 'grupal') {
      setReservaSeleccionada(reserva)
      setModalInscripcionOpen(true)
    } else if (reserva?.tipo === 'individual') {
      toast.info('Esta es una clase individual. Contacta al profesor para reservar.')
    }
  }

  const handleInscripcionSuccess = async (data: any) => {
    await inscripcionMutation.mutateAsync(data)
    // ✅ React Query automáticamente invalida la query de reservas
    // No necesitas llamar cargarEventos() manualmente
    setModalInscripcionOpen(false)
    toast.success('Inscripción exitosa')
  }

  if (isLoading) {
    return <div className="text-center py-12">Cargando calendario...</div>
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Haz clic en una clase grupal para inscribirte
          </p>
        </div>

        <CalendarioFullCalendar
          eventos={eventos}
          onEventClick={handleEventClick}
        />
      </div>

      {reservaSeleccionada && (
        <ModalInscripcionGrupal
          open={modalInscripcionOpen}
          onClose={() => setModalInscripcionOpen(false)}
          reserva={reservaSeleccionada}
          alumnoId={alumnoId}
          onSuccess={handleInscripcionSuccess}
          // ✅ Mostrar loading durante la mutación
          isLoading={inscripcionMutation.isPending}
        />
      )}
    </>
  )
}
```

**Beneficios:**
- ✅ **Caching automático**: Si vuelves a la página, usa cache (no re-fetch)
- ✅ **Loading states**: `isLoading` manejado automáticamente
- ✅ **Error handling**: `error` disponible sin código extra
- ✅ **No re-fetches innecesarios**: Los datos ya están en memoria
- ✅ **Invalidación automática**: Después de mutar, se refresca solo
- ✅ **DevTools**: Ves todas las queries en tiempo real
- ✅ **Menos código**: ~30% menos líneas

---

## 📊 Performance Comparison

### Sin React Query:
```
1. Usuario navega a /alumno/calendario
   → Fetch completo (1.2s)
2. Usuario hace click en evento
   → Fetch completo OTRA VEZ (1.2s)
3. Usuario se inscribe
   → Fetch completo OTRA VEZ (1.2s)
4. Usuario vuelve a /alumno/calendario
   → Fetch completo OTRA VEZ (1.2s)

Total: 4.8s de fetching
```

### Con React Query:
```
1. Usuario navega a /alumno/calendario
   → Fetch inicial (1.2s) + guardado en cache
2. Usuario hace click en evento
   → Lee del cache (0ms) ✅
3. Usuario se inscribe
   → Mutación (300ms) + invalidación + refetch (1.2s)
4. Usuario vuelve a /alumno/calendario
   → Lee del cache (0ms) ✅

Total: 2.7s de fetching (43% más rápido)
```

---

## 🎯 Próximos Pasos

1. Migra `CalendarioAlumno.tsx` usando el ejemplo de arriba
2. Migra listas de admin (alumnos, profesores) usando `useAlumnos()`
3. Abre las DevTools (icono abajo a la derecha) y observa:
   - Queries activas
   - Estado de cache
   - Tiempo de fetch
   - Invalidaciones automáticas

**Tip:** Presiona el botón de React Query DevTools en la esquina inferior derecha para ver la magia en acción.
