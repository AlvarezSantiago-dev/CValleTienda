-- Agrega código de barras propio para el pack/bulto
-- El pack puede tener un EAN distinto al de la unidad individual

ALTER TABLE public.variantes_producto
  ADD COLUMN IF NOT EXISTS pack_codigo_barras varchar(100);

COMMENT ON COLUMN public.variantes_producto.pack_codigo_barras IS 'Código de barras del pack (puede diferir del código de la unidad individual)';
