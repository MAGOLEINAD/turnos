# SaaS JT - Gestion de turnos multi-sede

Aplicacion Next.js 14 para gestionar reservas, calendario y operacion diaria de sedes (multi-tenant) con Supabase.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript strict
- Tailwind CSS + shadcn/ui + Radix UI
- Supabase (Auth + Postgres + RLS)
- FullCalendar
- Zod + React Hook Form
- Day.js
- Mercado Pago (dependencias incluidas, integracion parcial)

## Modulos principales

- Auth (login y registro)
- Dashboard por rol: `super-admin`, `admin`, `profesor`, `alumno`
- Gestion de organizaciones, sedes, profesores, alumnos y usuarios
- Calendario de profesor y alumno
- Reservas, bloqueos y horarios fijos
- Creditos de recupero
- Calendario publico por slug de sede: `/calendario/[sedeSlug]`

## Estructura del repo

```text
src/
  app/
    (auth)/
    (dashboard)/
    (public)/
    api/
  components/
  lib/
    actions/
    constants/
    hooks/
    supabase/
    utils/
    validations/
supabase/
  migrations/
```

## Requisitos

- Node.js 18+
- npm 9+
- Proyecto Supabase

## Configuracion local

1. Instalar dependencias:
```bash
npm install
```

2. Crear `.env.local` a partir de `.env.example` y completar valores reales.

3. Ejecutar migraciones SQL en orden desde `supabase/migrations/`.

4. Levantar el proyecto:
```bash
npm run dev
```

## Variables de entorno

Definidas en `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_TIMEZONE`

## Scripts

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run lint`
- `npm run type-check`

Validacion recomendada antes de merge:

```bash
npm run lint && npm run type-check && npm run build
```

## Estado funcional

El repo esta activo y en evolucion. Para evitar desactualizacion:

- `README.md` documenta estado operativo y setup actual.
- `AGENTS.md` define reglas de colaboracion para agentes.
- `supabase/SQL_STRUCTURE.md` define normas de cambios SQL y migraciones.

No se mantiene documentacion historica de avance por fases en archivos separados.

## Plan activo: Calendario v2 (automatizacion + actividades + cobros)

Ultima actualizacion: 2026-03-07
Estado general: En implementacion

### Objetivo

Implementar un calendario unificado por sede con actividades recurrentes, asignacion inteligente por rol, cobro obligatorio en reserva y actualizacion en tiempo casi real.

### Definiciones funcionales cerradas

- La reserva se confirma solo cuando el pago fue exitoso.
- La reserva se confirma cuando el pago queda registrado como valido (digital o manual).
- La clase de prueba no es gratis: se paga una sena.
- La clase de prueba es unica: maximo 1 por alumno (global).
- Si la reserva queda como prueba, se marca en estado `primera_clase`.
- El alumno debe completar la cuota como maximo el dia anterior a su proxima clase.
- La cuota mensual vence el dia 10 de cada mes.
- Solo admin puede otorgar una prorroga excepcional de hasta 10 dias corridos adicionales.
- Sin pago (o prorroga vigente), no se materializan nuevas clases recurrentes del periodo siguiente.
- La baja de horario fijo puede ser inmediata o a fin de mes (elegible en UI).
- Si es baja a fin de mes, el cupo se mantiene ocupado hasta fin de mes.
- Las actividades reemplazan el tipo actual `individual/grupal`.
- `Clase individual` pasa a ser una actividad mas.
- Un profesor puede dar solo actividades que tenga habilitadas.
- Admin puede asignar clases a cualquier profesor de su sede.
- Calendario publico muestra sede y actividades (sin precio en vista publica).
- Si usuario no autenticado intenta reservar en calendario publico:
  - debe registrarse/iniciar sesion;
  - luego se asigna automaticamente rol `alumno` + sede del calendario;
  - pasa por cobro para confirmar reserva.
- Si un bloqueo pisa un horario fijo:
  - se muestra alerta;
  - se exige accion de resolucion;
  - opciones: reasignar profesor, mover horario fijo, cancelar bloqueo;
  - se registra auditoria.
- Actividades pueden existir en multiples sedes.
- Por default, valores iguales en todas las sedes con opcion de override por sede para:
  - precio
  - duracion
  - cupo
- Mercado Pago: primera etapa con integracion rapida (`Checkout Pro`).
- Debe existir carga manual de pago para casos offline o excepcionales:
  - sena o pago por transferencia
  - sena o pago en efectivo
  - override manual por admin/profesor autorizado
- Todo pago manual debe guardar trazabilidad minima:
  - quien lo registro
  - fecha/hora
  - medio de pago
  - referencia/comprobante (opcional)
  - observaciones
- Reportes in-app requeridos: ingresos, reservas por actividad, ocupacion por sede/profesor, bajas y morosidad.

### Fases de implementacion

#### Fase 0 - Discovery tecnico y mapa de impacto
- [x] Inventariar tablas/campos actuales que impactan calendario, reservas, horarios fijos, pagos y reportes.
- [x] Definir contrato de compatibilidad con datos existentes (sin romper reservas actuales).
- [x] Confirmar estrategia de migracion de `tipo reserva` -> `actividad`.

#### Fase 1 - Modelo de datos de actividades y asignaciones
- [x] Crear entidad `actividades` (nombre, activa, color/tag, parametros base).
- [x] Crear relacion `profesor_actividad` por sede.
- [x] Crear configuracion por sede para actividad (precio, duracion, cupo override).
- [x] Crear `actividad_id` en reservas/horarios fijos y plan de backfill.
- [x] Definir estado de reserva `primera_clase`.

#### Fase 2 - Flujo de calendario y reglas de disponibilidad
- [x] Cambiar UI de alta de reserva: seleccionar actividad (no tipo).
- [x] Restringir selector a actividades habilitadas para el profesor.
- [x] Recurrentes: crear series controladas (sin expandir infinito en DB).
- [x] Implementar clases extras de una sola vez.
- [x] Endurecer chequeo de conflictos: reservas + bloqueos + horarios fijos.

#### Fase 3 - Gestion de conflicto bloqueo vs horario fijo
- [x] Detectar colision al intentar guardar bloqueo.
- [x] Mostrar modal de resolucion obligatorio con 3 caminos:
  - [x] Reasignar profesor
  - [x] Mover horario fijo
  - [x] Cancelar bloqueo
- [x] Persistir auditoria de resolucion de conflicto.

#### Fase 4 - Calendario publico + alta automatica alumno
- [x] Mantener vista publica de disponibilidad por sede/actividad.
- [x] Si quiere reservar, redirigir a auth y retomar flujo post-login.
- [x] Auto-asignar membresia `alumno` en sede origen luego de auth.
- [x] Confirmar reserva solo tras pago aprobado.

#### Fase 5 - Cobros Mercado Pago (MVP rapido)
- [x] Implementar `Checkout Pro` para reserva puntual.
- [x] Implementar `Checkout Pro` para sena de primera clase.
- [x] Permitir decision post-prueba:
  - [x] pagar cuota completa
  - [x] descontar sena de cuota
- [x] Bloquear futuras reservas recurrentes si no cumple regla de pago.
- [x] Implementar registro manual de pago (admin/profesor autorizado).
- [x] Unificar estados de pago digital y manual en una sola logica de confirmacion de reserva.
- [x] Mostrar historial de pagos (digitales y manuales) en ficha de alumno/reserva.

Nota: Checkout Pro y webhook quedaron implementados a nivel backend; resta robustecer estados finales ante webhooks repetidos e inconsistencias de sincronizacion.

#### Fase 6 - Bajas de horarios fijos y ciclo mensual
- [x] UI con opcion de baja inmediata o fin de mes.
- [x] Logica de efectivizacion segun opcion elegida.
- [x] Mantener cupo tomado hasta fecha efectiva de baja.

#### Fase 6.1 - Cuotas mensuales y prorrogas
- [x] Definir estado mensual de cuota por alumno/sede/actividad.
- [x] Aplicar vencimiento fijo al dia 10 de cada mes.
- [x] Bloquear materializacion de recurrencias si cuota vencida.
- [x] Habilitar pago digital/manual desde panel alumno y admin.
- [x] Permitir prorroga solo por admin (maximo 10 dias, una por periodo).
- [x] Registrar auditoria de prorrogas (quien, cuando, motivo, nueva fecha limite).

Nota: panel alumno (checkout) y panel admin (pago manual + prorroga) ya operativos. Resta robustecer validaciones de negocio para escenarios edge.

#### Fase 7 - Reportes in-app
- [ ] Ingresos cobrados por periodo/sede/actividad.
- [ ] Reservas por actividad y conversion de prueba -> recurrente.
- [ ] Ocupacion por sede y profesor.
- [ ] Bajas y churn de horarios fijos.
- [ ] Morosidad y proximos vencimientos.

#### Fase 8 - Tiempo real y performance
- [ ] Actualizacion en tiempo casi real al reservar/cancelar/pagar.
- [ ] Revisar estrategia de refresco (realtime vs invalidacion selectiva).
- [ ] Asegurar que un slot reservado desaparece de disponibilidad inmediatamente.
- [ ] Tests de concurrencia para doble reserva.

### Criterios de release (minimo)

- [ ] No hay doble reserva en mismo slot/cupo.
- [ ] Reserva sin pago no se confirma.
- [ ] Conflictos de bloqueo/fijo resueltos con accion obligatoria.
- [ ] Flujo publico -> auth -> alta alumno -> pago -> reserva confirmado.
- [ ] Reportes basicos operativos disponibles.

### Regla de mantenimiento de este plan

- Este bloque se actualiza en cada sesion de trabajo relevante.
- Cada tarea implementada se marca como completada (`[x]`).
- Si cambia una definicion funcional cerrada, se registra aqui primero.
