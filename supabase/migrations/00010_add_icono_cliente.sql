-- =============================================================================
-- MIGRACION 00010: Icono visual para clientes (organizaciones)
-- Fecha: 2026-03-07
-- =============================================================================

ALTER TABLE public.organizaciones
ADD COLUMN IF NOT EXISTS icono text;

UPDATE public.organizaciones
SET icono = '🏢'
WHERE icono IS NULL OR btrim(icono) = '';

ALTER TABLE public.organizaciones
ALTER COLUMN icono SET DEFAULT '🏢';
