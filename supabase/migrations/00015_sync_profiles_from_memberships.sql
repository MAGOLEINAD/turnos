-- =============================================================================
-- MIGRACION 00015: SINCRONIZAR PERFILES (ALUMNOS/PROFESORES) DESDE MEMBRESIAS
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_role_profile_from_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Manejar baja/cambio de la membresia anterior
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.rol = 'alumno'::rol_usuario AND OLD.sede_id IS NOT NULL THEN
      IF TG_OP = 'DELETE' THEN
        UPDATE public.alumnos
        SET activo = false,
            updated_at = NOW()
        WHERE usuario_id = OLD.usuario_id
          AND sede_id = OLD.sede_id
          AND activo = true;
      ELSIF NEW.rol <> OLD.rol
         OR NEW.sede_id IS DISTINCT FROM OLD.sede_id
         OR NEW.activa = false THEN
        UPDATE public.alumnos
        SET activo = false,
            updated_at = NOW()
        WHERE usuario_id = OLD.usuario_id
          AND sede_id = OLD.sede_id
          AND activo = true;
      END IF;
    END IF;

    IF OLD.rol = 'profesor'::rol_usuario AND OLD.sede_id IS NOT NULL THEN
      IF TG_OP = 'DELETE' THEN
        UPDATE public.profesores
        SET activo = false,
            updated_at = NOW()
        WHERE usuario_id = OLD.usuario_id
          AND sede_id = OLD.sede_id
          AND activo = true;
      ELSIF NEW.rol <> OLD.rol
         OR NEW.sede_id IS DISTINCT FROM OLD.sede_id
         OR NEW.activa = false THEN
        UPDATE public.profesores
        SET activo = false,
            updated_at = NOW()
        WHERE usuario_id = OLD.usuario_id
          AND sede_id = OLD.sede_id
          AND activo = true;
      END IF;
    END IF;
  END IF;

  -- Manejar alta/reactivacion de la membresia nueva
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.activa = true AND NEW.sede_id IS NOT NULL THEN
      IF NEW.rol = 'alumno'::rol_usuario THEN
        INSERT INTO public.alumnos (usuario_id, sede_id, activo)
        VALUES (NEW.usuario_id, NEW.sede_id, true)
        ON CONFLICT (usuario_id, sede_id)
        DO UPDATE SET
          activo = true,
          updated_at = NOW();
      ELSIF NEW.rol = 'profesor'::rol_usuario THEN
        INSERT INTO public.profesores (usuario_id, sede_id, activo)
        VALUES (NEW.usuario_id, NEW.sede_id, true)
        ON CONFLICT (usuario_id, sede_id)
        DO UPDATE SET
          activo = true,
          updated_at = NOW();
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_profile_from_membership ON public.membresias;

CREATE TRIGGER trg_sync_role_profile_from_membership
AFTER INSERT OR UPDATE OR DELETE
ON public.membresias
FOR EACH ROW
EXECUTE FUNCTION public.sync_role_profile_from_membership();

-- Backfill alumnos activos segun membresias activas
INSERT INTO public.alumnos (usuario_id, sede_id, activo)
SELECT DISTINCT m.usuario_id, m.sede_id, true
FROM public.membresias m
WHERE m.rol = 'alumno'::rol_usuario
  AND m.activa = true
  AND m.sede_id IS NOT NULL
ON CONFLICT (usuario_id, sede_id)
DO UPDATE SET
  activo = true,
  updated_at = NOW();

UPDATE public.alumnos a
SET activo = false,
    updated_at = NOW()
WHERE a.activo = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.membresias m
    WHERE m.usuario_id = a.usuario_id
      AND m.sede_id = a.sede_id
      AND m.rol = 'alumno'::rol_usuario
      AND m.activa = true
  );

-- Backfill profesores activos segun membresias activas
INSERT INTO public.profesores (usuario_id, sede_id, activo)
SELECT DISTINCT m.usuario_id, m.sede_id, true
FROM public.membresias m
WHERE m.rol = 'profesor'::rol_usuario
  AND m.activa = true
  AND m.sede_id IS NOT NULL
ON CONFLICT (usuario_id, sede_id)
DO UPDATE SET
  activo = true,
  updated_at = NOW();

UPDATE public.profesores p
SET activo = false,
    updated_at = NOW()
WHERE p.activo = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.membresias m
    WHERE m.usuario_id = p.usuario_id
      AND m.sede_id = p.sede_id
      AND m.rol = 'profesor'::rol_usuario
      AND m.activa = true
  );

COMMIT;
