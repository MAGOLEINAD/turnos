# PLAN DE IMPLEMENTACION - SaaS JT

## Estado Real (2026-03-06)

Este plan reemplaza la version anterior (desactualizada) y mantiene el patron actual del proyecto:
- Next.js 14 App Router
- Server Actions en `src/lib/actions/*`
- Zod + React Hook Form
- UI con shadcn/ui + Tailwind
- Nombres y textos en espanol

## Patron de diseno a mantener

1. Logica de negocio en `src/lib/actions/*`.
2. Validacion en `src/lib/validations/*` con Zod.
3. Componentes de UI por feature en `src/components/*`.
4. Paginas en `src/app/*` minimalistas (orquestan, no concentran logica).
5. Revalidaciones con `revalidatePath` despues de mutaciones.
6. Manejo de errores con objeto `{ error: string }`.

## Avance por modulos

### Ya implementado (base funcional)
- [x] Auth (email/password + Google callback)
- [x] Roles y middleware de proteccion
- [x] CRUD base de organizaciones/sedes/profesores/alumnos
- [x] Calendarios con FullCalendar (profesor, alumno, publico)
- [x] Reservas individuales/grupales (base)
- [x] Horarios fijos y bloqueos (base)
- [x] Creditos (flujo base)

### Pendiente real
- [ ] Mercado Pago end-to-end (actions + webhook + UI de pagos)
- [ ] Completar rutas del sidebar que aun no existen
- [ ] Tipado fuerte de Supabase (hoy `database.types.ts` incompleto)
- [ ] Cerrar deuda de TypeScript/lint para dejar CI en verde
- [ ] Cobertura de testing minima (smoke + flujos criticos)

## Fase 0 (bloqueante): Estabilidad tecnica

Objetivo: dejar el proyecto compilando y navegable sin rutas rotas.

### Tareas
- [ ] Regenerar `src/lib/supabase/database.types.ts` con el esquema real.
- [ ] Ajustar `createClient`/`middleware` para eliminar `any` implicitos.
- [ ] Corregir errores TS restantes y validar con:
  - `npm run lint`
  - `npm run type-check`
  - `npm run build`
- [ ] Crear paginas placeholder para rutas de sidebar aun faltantes:
  - `/admin/sedes`
  - `/admin/calendario`
  - `/admin/reportes`
  - `/profesor/reservas`
  - `/profesor/bloqueos`
  - `/profesor/alumnos`
  - `/alumno/mis-reservas`
  - `/alumno/horarios-fijos`
  - `/alumno/pagos`

## Fase 1: Mercado Pago

Objetivo: completar el modulo de pagos manteniendo el patron actual.

### Archivos
- [ ] `src/lib/mercadopago/client.ts`
- [ ] `src/lib/actions/pagos.actions.ts`
- [ ] `src/app/api/webhooks/mercadopago/route.ts`
- [ ] `src/components/reservas/ProcesarPagoButton.tsx`
- [ ] `src/app/(dashboard)/alumno/pagos/page.tsx`

### Criterios de aceptacion
- [ ] Crear preferencia de pago desde una reserva.
- [ ] Guardar transaccion en `pagos_mercadopago`.
- [ ] Webhook actualiza estado de pago y reserva.
- [ ] Alumno puede ver historial de pagos.
- [ ] Manejo de errores y mensajes claros en UI.

## Fase 2: Reserva + creditos (hardening)

Objetivo: cerrar reglas de negocio que hoy estan parciales.

### Tareas
- [ ] Cancelacion >= ventana configurada genera credito automaticamente.
- [ ] Cancelacion fuera de ventana no genera credito.
- [ ] Uso de credito consume registro y audita reserva usada.
- [ ] Validaciones de disponibilidad (reservas + bloqueos + horarios fijos).

## Fase 3: Calidad y release

### Tareas
- [ ] Revisar i18n/textos y consistencia UX.
- [ ] Tests minimos de flujos criticos.
- [ ] Checklist final de release y entorno.

## Checklist de validacion por entrega

Para cada PR/iteracion:
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] Validacion manual del flujo impactado
- [ ] Actualizacion de docs si cambia comportamiento

## Proxima iteracion recomendada

1. Ejecutar Fase 0 completa (bloqueante).
2. Implementar Fase 1 (Mercado Pago).
3. Cerrar hardening de reservas/creditos.

---

Ultima actualizacion: 2026-03-06
