-- Agregar campo motivo_desactivacion a organizaciones
ALTER TABLE organizaciones
ADD COLUMN motivo_desactivacion TEXT;

-- Agregar comentario explicativo
COMMENT ON COLUMN organizaciones.motivo_desactivacion IS 'Motivo por el cual la organización fue desactivada (ej: falta de pago, suspensión temporal, etc)';
