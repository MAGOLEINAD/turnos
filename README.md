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
