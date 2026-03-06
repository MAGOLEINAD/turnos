# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js 14 App Router project with TypeScript.

- `src/app/`: routes and layouts by area, including `(auth)`, `(dashboard)`, `(public)`, and `api/`.
- `src/components/`: UI and feature components (`ui/`, `auth/`, `calendario/`, `layout/`).
- `src/lib/`: business logic (`actions/`, `supabase/`, `validations/`, `utils/`, `hooks/`, `constants/`).
- `supabase/migrations/`: SQL schema, RLS policies, and DB fixes.
- Root config: `middleware.ts`, `tailwind.config.ts`, `tsconfig.json`, `.env(.example)`.

## Build, Test, and Development Commands
- `npm run dev`: starts local dev server.
- `npm run build`: creates production build.
- `npm start`: serves the production build.
- `npm run lint`: runs Next.js ESLint checks.
- `npm run type-check`: runs strict TypeScript checks (`tsc --noEmit`).

Recommended local validation before PR:
`npm run lint && npm run type-check && npm run build`

## Coding Style & Naming Conventions
- Language: TypeScript in strict mode.
- Indentation: 2 spaces; keep code and comments concise.
- Components: `PascalCase` files and exports (example: `LoginForm.tsx`).
- Hooks: `useXxx` naming (example: `useAuth.ts`).
- Server Actions: grouped in `src/lib/actions/*`.
- Use path alias `@/` for imports from `src/`.
- Keep UI styling in Tailwind utility classes; reuse `src/components/ui` primitives when possible.

## Testing Guidelines
There is currently no automated test framework configured (`test` script is absent). For now:
- Run lint, type-check, and build on every change.
- Manually verify impacted flows (auth, role redirects, dashboard pages, Supabase-integrated paths).
- When adding tests, prefer colocated `*.test.ts(x)` or `*.spec.ts(x)` near related modules.

## Commit & Pull Request Guidelines
Git history is not established yet (no commits in `master`), so use Conventional Commits:
- `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

PRs should include:
- Clear summary and scope.
- Linked issue/task ID (if applicable).
- Screenshots/video for UI changes.
- Notes on migrations/env changes (especially files under `supabase/migrations/`).
- A short validation checklist with commands executed.

## Security & Configuration Tips
- Never commit secrets; keep them in `.env.local`.
- Required Supabase variables must be set before running auth flows.
- Treat RLS/policy changes as high impact: document behavior changes in the PR.
