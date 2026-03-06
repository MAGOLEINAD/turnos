# Guía de Configuración - Plataforma de Gestión de Turnos

## Requisitos Previos

- Node.js 18+ y npm
- Cuenta en Supabase
- (Opcional) Cuenta de Mercado Pago para pagos

## Paso 1: Instalación de Dependencias

```bash
npm install
```

## Paso 2: Configurar Supabase

### 2.1 Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Anota la URL y las API Keys (anon key y service role key)

### 2.2 Ejecutar Migraciones SQL

Ve al Editor SQL de Supabase y ejecuta los siguientes archivos en orden:

1. `supabase/migrations/00001_schema_inicial.sql`
2. `supabase/migrations/00002_rls_policies.sql`
3. `supabase/migrations/00003_funciones_auxiliares.sql`
4. `supabase/migrations/00004_seed_data.sql` (datos de ejemplo)

### 2.3 Configurar Google OAuth (opcional)

1. En Supabase Dashboard → Authentication → Providers
2. Habilita Google provider
3. Configura las credenciales de Google Cloud Console
4. Añade la URL de callback: `{NEXT_PUBLIC_APP_URL}/api/auth/callback`

## Paso 3: Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Mercado Pago (opcional por ahora)
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=America/Argentina/Buenos_Aires
```

## Paso 4: Ejecutar el Proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Paso 5: Crear Primer Usuario Super Admin

### Opción A: Desde el código (recomendado para desarrollo)

1. Regístrate normalmente en `/login`
2. Ve a Supabase Dashboard → Table Editor → `membresias`
3. Crea un registro:
   - `usuario_id`: El UUID de tu usuario (de la tabla `usuarios`)
   - `rol`: `super_admin`
   - `sede_id`: NULL
   - `organizacion_id`: NULL
   - `activa`: true

### Opción B: SQL directo

```sql
-- Reemplaza {user_id} con tu UUID de usuario
INSERT INTO membresias (usuario_id, rol, activa, sede_id, organizacion_id)
VALUES ('{user_id}', 'super_admin', true, NULL, NULL);
```

## Paso 6: Verificar Instalación

1. Inicia sesión con tu cuenta
2. Deberías ver el dashboard de Super Admin
3. Ve a "Organizaciones" para crear tu primera organización

## Datos de Ejemplo

El archivo `00004_seed_data.sql` crea:
- 2 organizaciones de ejemplo
- 3 sedes con diferentes configuraciones

## Solución de Problemas

### Error: "Cannot find module..."
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error de autenticación
- Verifica que las variables de entorno estén correctas
- Revisa que las migraciones se hayan ejecutado correctamente
- Verifica las políticas RLS en Supabase

### Error de permisos RLS
- Asegúrate de tener un registro en `membresias` con rol asignado
- Verifica que `activa = true` en tu membresía

## Próximos Pasos

Una vez configurado:
1. Crear organizaciones desde el panel de Super Admin
2. Crear sedes dentro de las organizaciones
3. Asignar Admins a las sedes
4. Los Admins pueden crear Profesores y Alumnos
5. Comenzar a gestionar reservas y horarios

## Desarrollo

```bash
# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm start

# Verificar tipos TypeScript
npm run type-check

# Linter
npm run lint
```

## Estructura del Proyecto

Ver `README.md` para detalles completos de la arquitectura.
