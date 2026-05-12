-- =============================================================
-- Migración: costo_unitario en detalles_venta
-- Captura el precio de compra al momento de la venta para
-- calcular ganancia bruta histórica precisa (snapshot inmutable).
-- =============================================================

ALTER TABLE public.detalles_venta
  ADD COLUMN IF NOT EXISTS costo_unitario numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.detalles_venta
  ADD CONSTRAINT detalles_costo_check CHECK (costo_unitario >= 0);

COMMENT ON COLUMN public.detalles_venta.costo_unitario IS
  'Snapshot del precio_compra al momento de la venta. Inmutable. Permite calcular ganancia bruta histórica.';
