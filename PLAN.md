# PLAN DE IMPLEMENTACIÓN - Plataforma de Gestión de Turnos

## 📋 RESUMEN EJECUTIVO

**Completitud Actual:** ~25%
**Funcionalidades Faltantes:** 14 módulos principales
**Prioridad:** Implementar CORE primero (Fase 1)

---

## 🎯 ESTADO ACTUAL

### ✅ Implementado
- Base de datos completa (17 tablas)
- RLS sin recursión infinita
- Autenticación (email/password + Google OAuth)
- Estructura Next.js + TypeScript + Tailwind + shadcn/ui
- Páginas placeholder por rol
- Middleware de protección

### ❌ No Implementado (75%)
- Sistema de Reservas (CORE)
- Calendario Profesional con FullCalendar
- Landing + Calendario Público
- Horarios Fijos Recurrentes
- Bloqueos Recurrentes
- Sistema de Créditos/Cancelaciones
- Integración MercadoPago
- Configuración completa de Sede
- Gestión completa de Profesores/Alumnos

---

## 🚀 PLAN DE IMPLEMENTACIÓN

## FASE 1: CORE DEL SISTEMA (PRIORIDAD MÁXIMA)

### 1.1 Sistema de Reservas ⭐⭐⭐

**Objetivo:** Implementar CRUD completo de reservas con modalidad Individual/Grupal

**Archivos a crear/modificar:**
- `src/lib/actions/reservas.actions.ts` (server actions)
- `src/lib/validations/reserva.schema.ts` (Zod schemas)
- `src/components/reservas/CrearReservaModal.tsx`
- `src/components/reservas/DetalleReservaDrawer.tsx`
- `src/components/reservas/ListaReservas.tsx`
- `src/app/(dashboard)/admin/reservas/page.tsx`
- `src/app/(dashboard)/profesor/reservas/page.tsx`

**Lógica a implementar:**

```typescript
// Schema Zod
export const crearReservaSchema = z.object({
  sede_id: z.string().uuid(),
  profesor_id: z.string().uuid(),
  fecha: z.date(),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  modalidad: z.enum(['individual', 'grupal']),
  estado: z.enum(['pendiente', 'confirmada', 'cancelada', 'completada']),
  origen_creacion: z.enum(['admin', 'profesor', 'alumno']),
  alumno_ids: z.array(z.string().uuid()).min(1), // Para grupales: múltiples alumnos
  notas: z.string().optional(),
})

// Server Actions
export async function crearReserva(data: CrearReservaInput) {
  // 1. Validar disponibilidad del profesor
  // 2. Validar que no haya conflictos de horario
  // 3. Validar cupo grupal si aplica
  // 4. Validar autorización de modalidad del profesor
  // 5. Crear reserva en tabla reservas
  // 6. Si es grupal: crear registros en participantes_reserva
  // 7. Retornar reserva creada
}

export async function cancelarReserva(reservaId: string, motivoCancelacion?: string) {
  // 1. Validar que reserva existe y está confirmada
  // 2. Calcular horas hasta la reserva
  // 3. Si ≥24h: generar crédito recuperable
  // 4. Si <24h: no generar crédito pero permitir
  // 5. Actualizar estado a 'cancelada'
  // 6. Registrar auditoría
  // 7. Retornar resultado y mensaje apropiado
}

export async function obtenerReservas(filtros: FiltrosReservas) {
  // Filtros: sede_id, profesor_id, alumno_id, fecha_desde, fecha_hasta, estado
  // Incluir: profesor, alumnos, sede, participantes
  // Ordenar por fecha/hora
}

export async function validarDisponibilidad(
  profesorId: string,
  fecha: Date,
  horaInicio: string,
  horaFin: string
) {
  // 1. Verificar horario laboral de la sede
  // 2. Verificar bloqueos del profesor
  // 3. Verificar otras reservas del profesor
  // 4. Verificar horarios fijos que ocupen ese slot
  // 5. Retornar disponible: boolean + motivo si no disponible
}
```

**UI Components:**

```typescript
// CrearReservaModal.tsx
// - Form con react-hook-form + Zod
// - Selector de sede (si SuperAdmin/Admin multi-sede)
// - Selector de profesor (filtrado por sede)
// - Date picker + Time pickers (inicio/fin)
// - Radio: Individual vs Grupal (según autorización profesor)
// - Si grupal: Multi-select de alumnos (max = cupo sede)
// - Botón validar disponibilidad antes de crear
// - Submit: crear reserva

// DetalleReservaDrawer.tsx
// - Drawer lateral con info completa
// - Profesor, Sede, Fecha/Hora
// - Modalidad, Estado
// - Lista de alumnos participantes
// - Origen de creación
// - Si grupal: mostrar cupos (ej: 2/4)
// - Botón cancelar (si aplicable)
// - Botón editar (si aplicable)
// - Historial de cambios
```

**Base de Datos:**
- Tabla `reservas` ya existe ✅
- Tabla `participantes_reserva` ya existe ✅
- Agregar índices si no existen:
  ```sql
  CREATE INDEX idx_reservas_profesor_fecha ON reservas(profesor_id, fecha);
  CREATE INDEX idx_reservas_sede_fecha ON reservas(sede_id, fecha);
  CREATE INDEX idx_participantes_alumno ON participantes_reserva(alumno_id);
  ```

---

### 1.2 Calendario Profesional con FullCalendar ⭐⭐⭐

**Objetivo:** Implementar calendario interactivo con vistas Mes/Semana/Día

**Dependencias:**
```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/rrule
```

**Archivos a crear/modificar:**
- `src/components/calendario/CalendarioFullCalendar.tsx`
- `src/components/calendario/EventoReservaModal.tsx`
- `src/lib/utils/calendario.ts` (helpers)
- `src/lib/constants/colores-calendario.ts`
- Actualizar: `/admin/calendario/page.tsx`
- Actualizar: `/profesor/calendario/page.tsx`

**Lógica:**

```typescript
// colores-calendario.ts
export const COLORES_CALENDARIO = {
  reserva_admin: '#3B82F6', // Azul - creada por Admin/SuperAdmin
  reserva_profesor: '#10B981', // Verde - creada por Profesor
  bloqueo: '#EF4444', // Rojo - bloqueo
  horario_fijo: '#8B5CF6', // Púrpura - horario fijo
  conflicto: '#F59E0B', // Ámbar - conflicto/recuperatorio
} as const

// calendario.ts helpers
export function transformarReservasAEventos(reservas: Reserva[]) {
  return reservas.map(reserva => ({
    id: reserva.id,
    title: getTituloEvento(reserva),
    start: combinarFechaHora(reserva.fecha, reserva.hora_inicio),
    end: combinarFechaHora(reserva.fecha, reserva.hora_fin),
    backgroundColor: getColorPorOrigen(reserva.origen_creacion),
    borderColor: getColorPorOrigen(reserva.origen_creacion),
    extendedProps: {
      tipo: 'reserva',
      modalidad: reserva.modalidad,
      estado: reserva.estado,
      profesor: reserva.profesor,
      alumnos: reserva.participantes,
      cupoActual: reserva.modalidad === 'grupal' ? reserva.participantes?.length : 1,
      cupoMaximo: reserva.cupo_maximo,
    }
  }))
}

function getTituloEvento(reserva: Reserva) {
  if (reserva.modalidad === 'grupal') {
    const cupoTexto = `${reserva.participantes?.length || 0}/${reserva.cupo_maximo || 4}`
    return `Grupal ${cupoTexto} - ${reserva.profesor?.nombre}`
  }
  return `Individual - ${reserva.alumnos?.[0]?.nombre || 'Sin asignar'}`
}
```

**Component:**

```typescript
// CalendarioFullCalendar.tsx
'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'

export function CalendarioFullCalendar({
  eventos,
  onEventoClick,
  onSlotClick,
  rol
}: CalendarioProps) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }}
      locale={esLocale}
      timeZone="America/Argentina/Buenos_Aires"
      events={eventos}
      eventClick={(info) => onEventoClick(info.event)}
      dateClick={(info) => onSlotClick(info.date)}
      slotMinTime="07:00:00"
      slotMaxTime="22:00:00"
      slotDuration="00:15:00"
      height="auto"
      allDaySlot={false}
      nowIndicator={true}
      eventContent={(arg) => (
        <EventoCustomizado evento={arg.event} rol={rol} />
      )}
    />
  )
}

function EventoCustomizado({ evento, rol }) {
  const props = evento.extendedProps
  const mostrarCupos = ['super_admin', 'admin'].includes(rol) &&
                       props.modalidad === 'grupal'

  return (
    <div className="p-1 text-xs">
      <div className="font-semibold">{evento.title}</div>
      {mostrarCupos && (
        <div className="text-white/80">
          {props.cupoActual}/{props.cupoMaximo} ocupados
        </div>
      )}
    </div>
  )
}
```

**Páginas a actualizar:**

```typescript
// app/(dashboard)/admin/calendario/page.tsx
export default async function AdminCalendarioPage() {
  const usuario = await getUser()
  const sede_id = usuario.membresias[0].sede_id

  // Obtener todas las reservas de la sede
  const reservas = await obtenerReservas({ sede_id })
  const bloqueos = await obtenerBloqueos({ sede_id })
  const horariosFijos = await obtenerHorariosFijos({ sede_id })

  const eventos = [
    ...transformarReservasAEventos(reservas),
    ...transformarBloqueosAEventos(bloqueos),
    ...transformarHorariosFijosAEventos(horariosFijos),
  ]

  return (
    <CalendarioAdmin
      eventosIniciales={eventos}
      sedeId={sede_id}
    />
  )
}
```

---

### 1.3 Configuración de Sede Completa ⭐⭐⭐

**Objetivo:** Formulario completo para configurar sede

**Archivos a modificar:**
- `src/app/(dashboard)/admin/configuracion/page.tsx`
- `src/components/configuracion/FormConfiguracionSede.tsx`
- `src/lib/actions/configuracion.actions.ts`
- `src/lib/validations/configuracion.schema.ts`

**Schema:**

```typescript
// configuracion.schema.ts
export const configuracionSedeSchema = z.object({
  sede_id: z.string().uuid(),
  horario_inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:mm
  horario_fin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  duracion_clase_default: z.enum(['45', '60']), // minutos
  cupo_grupal_maximo: z.number().int().min(1).max(20),
  mostrar_nombre_profesor_publico: z.boolean(),
  cancelacion_min_horas: z.number().int().min(1).max(168), // default 24
  max_meses_recupero: z.number().int().min(1).max(12), // default 3
})
```

**Server Actions:**

```typescript
// configuracion.actions.ts
export async function obtenerConfiguracionSede(sedeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('configuracion_sede')
    .select('*')
    .eq('sede_id', sedeId)
    .single()

  if (error && error.code === 'PGRST116') {
    // No existe configuración, crear con defaults
    return await crearConfiguracionDefault(sedeId)
  }

  return { data, error }
}

export async function actualizarConfiguracionSede(
  sedeId: string,
  config: ConfiguracionSedeInput
) {
  const supabase = await createClient()

  // Validar con Zod
  const validated = configuracionSedeSchema.parse(config)

  const { data, error } = await supabase
    .from('configuracion_sede')
    .upsert({
      sede_id: sedeId,
      ...validated,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  revalidatePath('/admin/configuracion')
  return { data, error }
}
```

**UI Component:**

```typescript
// FormConfiguracionSede.tsx
'use client'

export function FormConfiguracionSede({
  configuracionInicial
}: FormConfiguracionSedeProps) {
  const form = useForm<ConfiguracionSedeInput>({
    resolver: zodResolver(configuracionSedeSchema),
    defaultValues: configuracionInicial,
  })

  const onSubmit = async (data: ConfiguracionSedeInput) => {
    const result = await actualizarConfiguracionSede(data.sede_id, data)
    if (result.error) {
      toast.error('Error al guardar configuración')
    } else {
      toast.success('Configuración guardada correctamente')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Horario Laboral</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Hora Inicio</Label>
            <Input
              type="time"
              {...form.register('horario_inicio')}
            />
          </div>
          <div>
            <Label>Hora Fin</Label>
            <Input
              type="time"
              {...form.register('horario_fin')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Clases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Duración por Defecto</Label>
            <Select {...form.register('duracion_clase_default')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cupo Máximo Clases Grupales</Label>
            <Input
              type="number"
              min={1}
              max={20}
              {...form.register('cupo_grupal_maximo', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Cantidad máxima de alumnos por clase grupal
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendario Público</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="mostrar-profesor"
              {...form.register('mostrar_nombre_profesor_publico')}
            />
            <Label htmlFor="mostrar-profesor">
              Mostrar nombre del profesor en calendario público
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Políticas de Cancelación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Horas mínimas para cancelar con crédito</Label>
            <Input
              type="number"
              min={1}
              {...form.register('cancelacion_min_horas', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Default: 24 horas
            </p>
          </div>

          <div>
            <Label>Validez de créditos de recupero (meses)</Label>
            <Input
              type="number"
              min={1}
              max={12}
              {...form.register('max_meses_recupero', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit">Guardar Configuración</Button>
    </form>
  )
}
```

---

### 1.4 Gestión de Profesores con Autorización ⭐⭐⭐

**Objetivo:** CRUD profesores con campo de autorización de modalidades

**Archivos a crear/modificar:**
- `src/components/profesores/CrearProfesorModal.tsx`
- `src/components/profesores/EditarProfesorModal.tsx`
- `src/lib/actions/profesores.actions.ts`
- `src/lib/validations/profesor.schema.ts`
- Actualizar: `src/app/(dashboard)/admin/profesores/page.tsx`

**Schema:**

```typescript
// profesor.schema.ts
export const crearProfesorSchema = z.object({
  usuario_id: z.string().uuid(),
  sede_id: z.string().uuid(),
  autorizacion_individual: z.boolean(),
  autorizacion_grupal: z.boolean(),
  especialidad: z.string().optional(),
  bio: z.string().optional(),
  activo: z.boolean().default(true),
}).refine(
  (data) => data.autorizacion_individual || data.autorizacion_grupal,
  {
    message: 'Debe autorizar al menos una modalidad',
    path: ['autorizacion_individual'],
  }
)
```

**Server Actions:**

```typescript
// profesores.actions.ts
export async function crearProfesor(data: CrearProfesorInput) {
  const supabase = await createClient()
  const usuario = await getUser()

  // Validar que el usuario actual es Admin de la sede
  if (!esAdminDeSede(usuario, data.sede_id)) {
    return { error: 'No autorizado' }
  }

  // Validar que el usuario_id existe y no es ya profesor
  const { data: existente } = await supabase
    .from('profesores')
    .select('id')
    .eq('usuario_id', data.usuario_id)
    .eq('sede_id', data.sede_id)
    .single()

  if (existente) {
    return { error: 'El usuario ya es profesor de esta sede' }
  }

  // Crear profesor
  const { data: profesor, error } = await supabase
    .from('profesores')
    .insert({
      ...data,
      creado_por_usuario_id: usuario.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Crear membresía con rol profesor si no existe
  await supabase
    .from('membresias')
    .upsert({
      usuario_id: data.usuario_id,
      sede_id: data.sede_id,
      organizacion_id: usuario.membresias[0].organizacion_id,
      rol: 'profesor',
      activa: true,
    })

  revalidatePath('/admin/profesores')
  return { data: profesor, error: null }
}

export async function actualizarAutorizacionProfesor(
  profesorId: string,
  autorizacion: {
    autorizacion_individual: boolean
    autorizacion_grupal: boolean
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profesores')
    .update(autorizacion)
    .eq('id', profesorId)
    .select()
    .single()

  revalidatePath('/admin/profesores')
  return { data, error }
}
```

**UI Component:**

```typescript
// CrearProfesorModal.tsx
'use client'

export function CrearProfesorModal({
  sedeId,
  usuariosDisponibles
}: CrearProfesorModalProps) {
  const [open, setOpen] = useState(false)
  const form = useForm<CrearProfesorInput>({
    resolver: zodResolver(crearProfesorSchema),
    defaultValues: {
      sede_id: sedeId,
      autorizacion_individual: true,
      autorizacion_grupal: true,
      activo: true,
    }
  })

  const onSubmit = async (data: CrearProfesorInput) => {
    const result = await crearProfesor(data)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Profesor creado correctamente')
      setOpen(false)
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Profesor
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Profesor</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Usuario</Label>
            <Select {...form.register('usuario_id')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {usuariosDisponibles.map(usuario => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.nombre} {usuario.apellido} ({usuario.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Modalidades Autorizadas</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="individual"
                {...form.register('autorizacion_individual')}
              />
              <Label htmlFor="individual" className="font-normal">
                Clases Individuales
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="grupal"
                {...form.register('autorizacion_grupal')}
              />
              <Label htmlFor="grupal" className="font-normal">
                Clases Grupales
              </Label>
            </div>

            {form.formState.errors.autorizacion_individual && (
              <p className="text-sm text-destructive">
                {form.formState.errors.autorizacion_individual.message}
              </p>
            )}
          </div>

          <div>
            <Label>Especialidad (opcional)</Label>
            <Input {...form.register('especialidad')} />
          </div>

          <div>
            <Label>Biografía (opcional)</Label>
            <Textarea {...form.register('bio')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Profesor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## FASE 2: EXPERIENCIA ALUMNO

### 2.1 Landing + Calendario Público ⭐⭐⭐

**Objetivo:** Página pública para que alumnos vean disponibilidad y reserven

**Archivos a crear:**
- `src/app/(public)/page.tsx` (landing)
- `src/app/(public)/reservar/page.tsx` (selector sede)
- `src/app/(public)/reservar/[sedeSlug]/page.tsx` (calendario público)
- `src/components/publico/SelectorSede.tsx`
- `src/components/publico/CalendarioPublico.tsx`
- `src/lib/actions/disponibilidad.actions.ts`

**Estructura:**

```
/                          → Landing con selector organización
/reservar                  → Selector de sede
/reservar/sede-palermo     → Calendario público de esa sede
```

**Lógica:**

```typescript
// disponibilidad.actions.ts
export async function obtenerDisponibilidadPublica(
  sedeId: string,
  fechaDesde: Date,
  fechaHasta: Date
) {
  const supabase = await createClient()

  // 1. Obtener configuración de la sede
  const config = await obtenerConfiguracionSede(sedeId)

  // 2. Obtener todos los profesores activos de la sede
  const profesores = await obtenerProfesores({ sede_id: sedeId, activo: true })

  // 3. Generar slots disponibles basados en:
  //    - Horario laboral de la sede
  //    - Duración default
  //    - Para cada profesor
  const slotsDisponibles = []

  for (const profesor of profesores) {
    // 4. Obtener reservas, bloqueos y horarios fijos del profesor
    const [reservas, bloqueos, horariosFijos] = await Promise.all([
      obtenerReservas({ profesor_id: profesor.id, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      obtenerBloqueos({ profesor_id: profesor.id }),
      obtenerHorariosFijos({ profesor_id: profesor.id }),
    ])

    // 5. Generar slots y filtrar ocupados
    const slots = generarSlots(
      fechaDesde,
      fechaHasta,
      config.horario_inicio,
      config.horario_fin,
      config.duracion_clase_default
    )

    // 6. Filtrar slots disponibles
    const disponibles = slots.filter(slot =>
      !estaOcupado(slot, reservas, bloqueos, horariosFijos)
    )

    slotsDisponibles.push(...disponibles.map(slot => ({
      ...slot,
      profesor: config.mostrar_nombre_profesor_publico
        ? { id: profesor.id, nombre: profesor.usuario.nombre }
        : { id: profesor.id, nombre: null },
      modalidades: {
        individual: profesor.autorizacion_individual && hayDisponibilidadIndividual(slot),
        grupal: profesor.autorizacion_grupal && hayDisponibilidadGrupal(slot),
      }
    })))
  }

  return slotsDisponibles
}
```

**UI:**

```typescript
// CalendarioPublico.tsx
'use client'

export function CalendarioPublico({
  sedeSlug,
  slotsDisponibles
}: CalendarioPublicoProps) {
  const [slotSeleccionado, setSlotSeleccionado] = useState(null)
  const { data: session } = useSession()

  const handleSlotClick = (slot: SlotDisponible) => {
    if (!session) {
      // Guardar selección en localStorage
      localStorage.setItem('reserva_pendiente', JSON.stringify(slot))
      // Redirigir a login
      router.push(`/login?redirect=/reservar/${sedeSlug}`)
    } else {
      // Abrir modal de confirmación
      setSlotSeleccionado(slot)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Reservá tu Clase
      </h1>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={transformarSlotsAEventos(slotsDisponibles)}
        eventClick={(info) => handleSlotClick(info.event.extendedProps.slot)}
        locale={esLocale}
        timeZone="America/Argentina/Buenos_Aires"
      />

      {slotSeleccionado && (
        <ConfirmarReservaModal
          slot={slotSeleccionado}
          onClose={() => setSlotSeleccionado(null)}
        />
      )}
    </div>
  )
}
```

---

### 2.2 Sistema de Créditos y Cancelaciones ⭐⭐

**Objetivo:** Implementar lógica de cancelación con generación de créditos

**Archivos a crear/modificar:**
- `src/lib/actions/creditos.actions.ts`
- `src/components/reservas/CancelarReservaDialog.tsx`
- `src/app/(dashboard)/alumno/creditos/page.tsx` (actualizar)

**Lógica:**

```typescript
// creditos.actions.ts
export async function cancelarReservaConCredito(
  reservaId: string,
  motivoCancelacion?: string
) {
  const supabase = await createClient()
  const usuario = await getUser()

  // 1. Obtener reserva
  const { data: reserva } = await supabase
    .from('reservas')
    .select('*, sede:sedes!inner(configuracion_sede(*))')
    .eq('id', reservaId)
    .single()

  if (!reserva) return { error: 'Reserva no encontrada' }

  // 2. Calcular horas hasta la reserva
  const ahora = new Date()
  const fechaReserva = new Date(`${reserva.fecha} ${reserva.hora_inicio}`)
  const horasHastaReserva = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60)

  const config = reserva.sede.configuracion_sede
  const generarCredito = horasHastaReserva >= config.cancelacion_min_horas

  // 3. Actualizar estado de reserva
  await supabase
    .from('reservas')
    .update({
      estado: 'cancelada',
      cancelada_en: ahora.toISOString(),
      cancelada_por_usuario_id: usuario.id,
      motivo_cancelacion: motivoCancelacion,
    })
    .eq('id', reservaId)

  // 4. Si aplica, generar crédito
  let credito = null
  if (generarCredito) {
    const fechaVencimiento = new Date()
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + config.max_meses_recupero)

    const { data: creditoCreado } = await supabase
      .from('creditos_recupero')
      .insert({
        alumno_id: usuario.id, // Obtener desde participantes_reserva
        sede_id: reserva.sede_id,
        reserva_cancelada_id: reserva.id,
        fecha_vencimiento: fechaVencimiento.toISOString(),
        usado: false,
      })
      .select()
      .single()

    credito = creditoCreado
  }

  // 5. Retornar resultado
  return {
    success: true,
    generado_credito: generarCredito,
    credito,
    mensaje: generarCredito
      ? 'Reserva cancelada. Se generó un crédito de recupero.'
      : 'Reserva cancelada. Gracias por avisar. No se generó crédito por política de cancelación.',
  }
}

export async function obtenerCreditosDisponibles(alumnoId: string) {
  const supabase = await createClient()
  const ahora = new Date().toISOString()

  const { data: creditos } = await supabase
    .from('creditos_recupero')
    .select('*, reserva_cancelada:reservas(*), sede:sedes(*)')
    .eq('alumno_id', alumnoId)
    .eq('usado', false)
    .gte('fecha_vencimiento', ahora)
    .order('fecha_vencimiento', { ascending: true })

  return creditos || []
}

export async function usarCredito(creditoId: string, nuevaReservaId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('creditos_recupero')
    .update({
      usado: true,
      usado_en_reserva_id: nuevaReservaId,
      usado_en: new Date().toISOString(),
    })
    .eq('id', creditoId)

  return { error }
}
```

---

### 2.3 Integración MercadoPago ⭐⭐

**Objetivo:** Flujo de pago para reservas

**Dependencias:**
```bash
npm install mercadopago
```

**Archivos a crear:**
- `src/lib/mercadopago/client.ts`
- `src/lib/actions/pagos.actions.ts`
- `src/app/api/webhooks/mercadopago/route.ts`
- `src/components/reservas/ProcesarPagoButton.tsx`

**Configuración:**

```typescript
// mercadopago/client.ts
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
  }
})

const preference = new Preference(client)

export { client, preference }
```

**Server Actions:**

```typescript
// pagos.actions.ts
export async function crearPreferenciaPago(reservaId: string) {
  const supabase = await createClient()

  // 1. Obtener reserva
  const { data: reserva } = await supabase
    .from('reservas')
    .select('*, sede:sedes(*)')
    .eq('id', reservaId)
    .single()

  // 2. Crear preferencia en MercadoPago
  const preferencia = await preference.create({
    body: {
      items: [
        {
          id: reserva.id,
          title: `Clase ${reserva.modalidad} - ${reserva.sede.nombre}`,
          quantity: 1,
          unit_price: reserva.precio || 1000, // Precio desde config o default
          currency_id: 'ARS',
        }
      ],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/reservas/${reserva.id}/pago-exitoso`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/reservas/${reserva.id}/pago-fallido`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/reservas/${reserva.id}/pago-pendiente`,
      },
      auto_return: 'approved',
      external_reference: reserva.id,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    }
  })

  // 3. Guardar referencia de pago
  await supabase
    .from('pagos_mercadopago')
    .insert({
      reserva_id: reserva.id,
      alumno_id: reserva.alumno_id,
      sede_id: reserva.sede_id,
      preference_id: preferencia.id,
      estado: 'pendiente',
      monto: reserva.precio || 1000,
    })

  return {
    init_point: preferencia.init_point,
    preference_id: preferencia.id,
  }
}
```

**Webhook:**

```typescript
// app/api/webhooks/mercadopago/route.ts
export async function POST(request: Request) {
  const body = await request.json()

  // Verificar firma del webhook (importante para seguridad)
  const signature = request.headers.get('x-signature')
  // ... validar firma

  if (body.type === 'payment') {
    const paymentId = body.data.id

    // Obtener información del pago desde MP
    const payment = await getPaymentInfo(paymentId)

    // Actualizar estado en DB
    const supabase = await createServiceRoleClient()

    await supabase
      .from('pagos_mercadopago')
      .update({
        payment_id: payment.id,
        estado: payment.status,
        estado_detalle: payment.status_detail,
        metodo_pago: payment.payment_method_id,
        actualizado_en: new Date().toISOString(),
      })
      .eq('preference_id', payment.external_reference)

    // Si el pago fue aprobado, confirmar la reserva
    if (payment.status === 'approved') {
      await supabase
        .from('reservas')
        .update({
          estado: 'confirmada',
          pagada: true,
        })
        .eq('id', payment.external_reference)
    }
  }

  return NextResponse.json({ received: true })
}
```

---

## FASE 3: RECURRENCIA

### 3.1 Horarios Fijos Recurrentes ⭐⭐

**Lógica compleja de generación de recurrencias con RRule**

### 3.2 Bloqueos Recurrentes ⭐⭐

**Similar a horarios fijos pero para bloquear disponibilidad**

### 3.3 Baja de Horario Fijo por Alumno ⭐⭐

**Con recomendaciones de slots disponibles**

---

## FASE 4: ADMINISTRACIÓN

### 4.1 Gestión de Alumnos Completa
### 4.2 Reportes y Estadísticas
### 4.3 Calendario Admin Consolidado
### 4.4 Usuarios sin Rol

---

## FASE 5: POLISH

### 5.1 Validaciones Zod Completas
### 5.2 Timezone Argentina
### 5.3 Documentación y Seeds
### 5.4 Testing

---

## 📝 NOTAS IMPORTANTES

### Dependencias a Instalar

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/rrule mercadopago rrule
```

### Variables de Entorno Necesarias

```env
# Supabase (ya configurado)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=America/Argentina/Buenos_Aires
```

### Índices de DB Recomendados

```sql
-- Performance para queries frecuentes
CREATE INDEX idx_reservas_profesor_fecha ON reservas(profesor_id, fecha);
CREATE INDEX idx_reservas_sede_fecha ON reservas(sede_id, fecha);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_participantes_alumno ON participantes_reserva(alumno_id);
CREATE INDEX idx_participantes_reserva ON participantes_reserva(reserva_id);
CREATE INDEX idx_creditos_alumno_usado ON creditos_recupero(alumno_id, usado);
CREATE INDEX idx_horarios_fijos_alumno ON horarios_fijos(alumno_id, activo);
CREATE INDEX idx_bloqueos_profesor ON bloqueos_disponibilidad(profesor_id, activo);
```

---

## ⏱️ ESTIMACIÓN DE ESFUERZO

| Fase | Complejidad | Tiempo Estimado |
|------|-------------|-----------------|
| Fase 1: CORE | Alta | 40-50 horas |
| Fase 2: Alumno | Media | 25-30 horas |
| Fase 3: Recurrencia | Alta | 20-25 horas |
| Fase 4: Admin | Media | 15-20 horas |
| Fase 5: Polish | Baja | 10-15 horas |
| **TOTAL** | | **110-140 horas** |

---

## 🎯 SIGUIENTE PASO

**Entrar en Plan Mode para diseñar la arquitectura detallada de FASE 1 (CORE)**

---

*Documento creado: 2026-03-06*
*Última actualización: 2026-03-06*
