# Plataforma de Gestión de Turnos Multi-Tenant

Sistema completo de gestión de turnos/clases para clubes y escuelas (tenis, pilates, yoga, etc.) con soporte multi-organización.

## Stack Tecnológico

- **Frontend/Fullstack**: Next.js 14 (App Router) + TypeScript (strict mode)
- **UI**: Tailwind CSS + shadcn/ui
- **Autenticación**: Supabase Auth (email/password + Google OAuth)
- **Base de Datos**: Supabase Postgres con RLS
- **Calendario**: FullCalendar React
- **Pagos**: Mercado Pago
- **Validación**: Zod
- **Fechas**: Day.js con timezone plugin
- **Timezone**: America/Argentina/Buenos_Aires
- **Idioma**: Español (UI, código, tablas DB)

## Roles del Sistema

### Super Admin
- CRUD Organizaciones y Sedes
- CRUD Admins
- Ver y administrar todo con filtros
- Gestionar settings por sede
- Gestionar usuarios sin rol

### Admin
- Pertenece a 1+ sedes
- Crea Profesores y define autorización (solo grupal/solo individual/ambas)
- Configura sede (horario laboral, duración, cupo grupal máximo)
- Ve todas las clases/reservas de profesores
- Administra alumnos, horarios fijos, reservas, cancelaciones

### Profesor
- Ve su calendario (Mes/Semana/Día)
- Crea reservas y las asigna a alumnos
- Carga bloqueos recurrentes
- Define qué slots son grupales vs individuales

### Alumno
- Ve calendario público (sin login)
- Reserva con autenticación
- Cancela reservas (≥24h genera crédito)
- Ve y usa créditos recuperables
- Gestiona baja/liberación de horario fijo

## Características Principales

- ✅ Sistema multi-organización y multi-sede
- ✅ Calendarios profesionales responsive (Mes/Semana/Día)
- ✅ Reservas individuales y grupales
- ✅ Horarios fijos recurrentes (1/2/3 veces por semana)
- ✅ Baja de horarios fijos por alumno
- ✅ Bloqueos de disponibilidad (puntuales y recurrentes)
- ✅ Sistema de cancelaciones con créditos recuperables (≥24h)
- ✅ Integración con Mercado Pago
- ✅ Calendario público con deep linking
- ✅ RLS completo en todas las tablas

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Copiar `.env.example` a `.env.local` y configurar variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configurar Supabase:
   - Crear proyecto en Supabase
   - Ejecutar migraciones en `supabase/migrations/`
   - Actualizar `.env.local` con credenciales

5. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Rutas autenticadas (paneles por rol)
│   ├── (public)/          # Rutas públicas (calendario)
│   └── api/               # API routes (callbacks, webhooks)
├── components/            # Componentes React
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Componentes de autenticación
│   ├── calendario/       # Componentes de calendario
│   ├── layout/           # Layouts y navegación
│   └── ...               # Otros componentes por feature
├── lib/                  # Lógica de negocio
│   ├── supabase/        # Cliente Supabase
│   ├── actions/         # Server Actions
│   ├── validations/     # Zod schemas
│   ├── utils/           # Utilidades
│   ├── hooks/           # Custom React hooks
│   ├── mercadopago/     # Cliente Mercado Pago
│   └── constants/       # Constantes
└── types/               # Tipos TypeScript
```

## Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Build para producción
- `npm start` - Iniciar servidor de producción
- `npm run lint` - Ejecutar linter
- `npm run type-check` - Verificar tipos TypeScript

## Base de Datos

### Tablas Principales

1. **organizaciones** - Organizaciones multi-tenant
2. **sedes** - Sucursales/sedes por organización
3. **configuracion_sede** - Configuración por sede
4. **usuarios** - Extensión de auth.users
5. **membresias** - Roles y permisos por sede
6. **profesores** - Perfil de profesores
7. **alumnos** - Perfil de alumnos
8. **reservas** - Reservas individuales y grupales
9. **participantes_reserva** - Participantes en reservas grupales
10. **horarios_fijos** - Horarios recurrentes
11. **bajas_horarios_fijos** - Registro de bajas
12. **bloqueos_disponibilidad** - Bloqueos de profesores
13. **creditos_recupero** - Créditos por cancelaciones
14. **pagos_mercadopago** - Historial de pagos

Ver migraciones completas en `supabase/migrations/`

## Reglas de Negocio

- Profesor NO puede ser Alumno del mismo club/sede
- Admin restringe modalidades de profesor (UI profesor oculta opciones no autorizadas)
- Alumnos NUNCA ven cupos en reservas grupales, solo disponibilidad
- Créditos válidos por 90 días (configurable en DB)
- Cancelación ≥24h genera crédito, <24h no genera crédito pero se permite
- Baja de horario fijo aplicada desde próxima ocurrencia futura

## Configuración por Sede

- **Horario laboral**: Default 07:00-18:00, editable por Admin
- **Duración clases**: Default 60min, opciones 45min/60min
- **Cupo grupal máximo**: Default 4, configurable en UI
- **Toggle mostrar profesor público**: Configurable por sede

## Licencia

Privado - Todos los derechos reservados
