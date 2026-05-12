-- Migración: Cierre de emergencia
-- Agrega tipo_cierre a cierres_caja para distinguir cierres normales de emergencia

ALTER TABLE public.cierres_caja
  ADD COLUMN IF NOT EXISTS tipo_cierre text NOT NULL DEFAULT 'normal';

COMMENT ON COLUMN public.cierres_caja.tipo_cierre IS 'Tipo de cierre: normal | emergencia | automatico';

-- Índice para consultas por tipo
CREATE INDEX IF NOT EXISTS cierres_caja_tipo_idx ON public.cierres_caja (tienda_id, tipo_cierre);
