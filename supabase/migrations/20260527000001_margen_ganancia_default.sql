-- Agrega campo de margen de ganancia default a configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS margen_ganancia_default numeric(5,2) NOT NULL DEFAULT 0
    CHECK (margen_ganancia_default >= 0 AND margen_ganancia_default <= 9999);

COMMENT ON COLUMN configuracion_tienda.margen_ganancia_default IS
  'Porcentaje de markup sobre precio de compra para sugerencia automática de precio de venta. 0 = desactivado.';
