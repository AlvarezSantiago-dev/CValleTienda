-- Agrega columna estilo_remito a configuracion_tienda
-- Valores: 'moderno' (diseño actual) | 'clasico' (formato talonario tradicional)

ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS estilo_remito TEXT NOT NULL DEFAULT 'moderno'
  CHECK (estilo_remito IN ('moderno', 'clasico'));
