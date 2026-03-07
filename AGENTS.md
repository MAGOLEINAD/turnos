# AGENTS.md

## Objetivo

Este archivo define como debe colaborar cualquier agente (Codex u otros) dentro de este repositorio.

## Contexto del proyecto

- Stack: Next.js 14 App Router + TypeScript strict + Supabase + Tailwind.
- Idioma del producto: espanol.
- Rutas principales en `src/app/(auth)`, `src/app/(dashboard)` y `src/app/(public)`.
- Logica de negocio en `src/lib/actions`.

## Reglas de trabajo

1. No asumir estado funcional sin verificar codigo real.
2. Mantener cambios pequenos, reversibles y consistentes con el patron actual.
3. No tocar migraciones historicas en `supabase/migrations`.
4. Usar imports con alias `@/` cuando aplique.
5. Preservar TypeScript strict y evitar `any` innecesario.
6. Reutilizar componentes de `src/components/ui` antes de crear nuevos.

## Convenciones

- Componentes: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Schemas Zod: `*.schema.ts`
- Actions: `*.actions.ts`
- Indentacion: 2 espacios

## Validacion minima por cambio

Ejecutar cuando corresponda:

```bash
npm run lint
npm run type-check
npm run build
```

## Politica de documentacion

Documentacion viva permitida:

- `README.md`: setup y estado operativo actual.
- `AGENTS.md`: reglas para agentes.
- `supabase/SQL_STRUCTURE.md`: normas SQL/migraciones.

No crear ni mantener archivos de seguimiento temporal como planes de sesion, estados porcentuales o proximos pasos si duplican informacion del README.

## Seguridad

- No commitear secretos.
- Usar `.env.local` para credenciales reales.
- Tratar cambios RLS como alto impacto y documentarlos en PR.
