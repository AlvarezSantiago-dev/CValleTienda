-- Migración: agregar columna balanza_formato a configuracion_tienda
-- Permite configurar si la balanza genera códigos EAN-13 internos con precio o peso embebido.

ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS balanza_formato text
  CHECK (balanza_formato IN ('precio', 'peso'));

COMMENT ON COLUMN configuracion_tienda.balanza_formato IS
  'Formato de la balanza electrónica: NULL = sin balanza, ''precio'' = valor embebido es precio (÷100), ''peso'' = valor embebido es peso en kg (÷1000)';
