-- Agrega soporte de pack/bulto por variante
-- Reemplaza el modelo bundle/componentes con campos directos en la variante

ALTER TABLE public.variantes_producto
  ADD COLUMN IF NOT EXISTS pack_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_cantidad   integer,
  ADD COLUMN IF NOT EXISTS pack_precio     numeric(12, 2);

-- Constraint: si pack_habilitado, los otros campos son obligatorios y válidos
ALTER TABLE public.variantes_producto
  ADD CONSTRAINT variantes_pack_coherencia CHECK (
    (pack_habilitado = false)
    OR (
      pack_cantidad IS NOT NULL
      AND pack_cantidad > 1
      AND pack_precio IS NOT NULL
      AND pack_precio > 0
    )
  );

COMMENT ON COLUMN public.variantes_producto.pack_habilitado IS 'Si true, la variante también se vende en pack/bulto';
COMMENT ON COLUMN public.variantes_producto.pack_cantidad   IS 'Cantidad de unidades que incluye el pack (ej: 6 para un six-pack)';
COMMENT ON COLUMN public.variantes_producto.pack_precio     IS 'Precio de venta del pack completo';
