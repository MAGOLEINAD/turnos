# SQL Structure

## Rules

1. `supabase/migrations/`:
   Immutable migration history only.
   Never edit, rename, or delete applied migrations.

2. `supabase/scripts/`:
   Manual one-off scripts (bootstrap, ops, support).
   These are not auto-applied by migration tooling.

3. New changes:
   Always create a new migration file with next numeric prefix:
   `00014_...`, `00015_...`, etc.

## Current conventions

1. Keep old duplicated prefixes (`00009`, `00010`) as-is.
   They are already part of history.

2. Do not "clean" history by removing old fixes.
   Replace behavior with new corrective migrations.

## Operational checklist

1. Schema/policy change:
   create migration in `migrations/`.

2. Admin/manual helper:
   create script in `scripts/`.

3. Before deploy:
   run pending migrations in target environment.

