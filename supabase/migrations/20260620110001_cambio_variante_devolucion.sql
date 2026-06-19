-- Cambio de variante en devoluciones: columnas, egreso de stock y tipo de movimiento

-- Cabecera: subtipo cuando tipo_resolucion = 'cambio'
ALTER TABLE public.devoluciones
  ADD COLUMN IF NOT EXISTS subtipo_cambio text;

ALTER TABLE public.devoluciones
  DROP CONSTRAINT IF EXISTS devoluciones_subtipo_cambio_check;

ALTER TABLE public.devoluciones
  ADD CONSTRAINT devoluciones_subtipo_cambio_check
  CHECK (
    subtipo_cambio IS NULL
    OR subtipo_cambio IN ('misma_variante', 'otra_variante', 'mixto')
  );

COMMENT ON COLUMN public.devoluciones.subtipo_cambio IS
  'misma_variante | otra_variante | mixto. Solo si tipo_resolucion=cambio';

-- Detalle: variante entregada + snapshot
ALTER TABLE public.detalles_devolucion
  ADD COLUMN IF NOT EXISTS subtipo_cambio text,
  ADD COLUMN IF NOT EXISTS variante_entrega_id uuid REFERENCES public.variantes_producto(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nombre_producto_entrega text,
  ADD COLUMN IF NOT EXISTS talla_entrega text,
  ADD COLUMN IF NOT EXISTS color_entrega text,
  ADD COLUMN IF NOT EXISTS codigo_barras_entrega text;

ALTER TABLE public.detalles_devolucion
  DROP CONSTRAINT IF EXISTS detalles_dev_subtipo_cambio_check;

ALTER TABLE public.detalles_devolucion
  ADD CONSTRAINT detalles_dev_subtipo_cambio_check
  CHECK (subtipo_cambio IS NULL OR subtipo_cambio IN ('misma_variante', 'otra_variante'));

CREATE INDEX IF NOT EXISTS detalles_dev_variante_entrega_idx
  ON public.detalles_devolucion (variante_entrega_id)
  WHERE variante_entrega_id IS NOT NULL;

-- Ampliar tipos de movimiento de stock
ALTER TABLE public.movimientos_stock
  DROP CONSTRAINT IF EXISTS movimientos_tipo_check;

ALTER TABLE public.movimientos_stock
  ADD CONSTRAINT movimientos_tipo_check
  CHECK (
    tipo IN ('entrada', 'salida', 'ajuste', 'devolucion', 'inicial', 'cambio_devolucion')
  );

-- Descontar stock de la variante entregada en cambios
CREATE OR REPLACE FUNCTION public.descontar_stock_entrega_cambio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo_resolucion text;
  v_numero_dev      integer;
  v_usuario_id      uuid;
  v_stock_anterior  numeric;
  v_stock_posterior numeric;
BEGIN
  IF new.subtipo_cambio IS DISTINCT FROM 'otra_variante' THEN
    RETURN new;
  END IF;

  IF new.variante_entrega_id IS NULL THEN
    RETURN new;
  END IF;

  IF new.variante_id IS NOT NULL AND new.variante_entrega_id = new.variante_id THEN
    RETURN new;
  END IF;

  SELECT d.tipo_resolucion, d.numero_devolucion, d.usuario_id
  INTO v_tipo_resolucion, v_numero_dev, v_usuario_id
  FROM public.devoluciones d
  WHERE d.id = new.devolucion_id;

  IF v_tipo_resolucion IS DISTINCT FROM 'cambio' THEN
    RETURN new;
  END IF;

  SELECT stock_actual INTO v_stock_anterior
  FROM public.variantes_producto
  WHERE id = new.variante_entrega_id
  FOR UPDATE;

  IF v_stock_anterior IS NULL THEN
    RAISE EXCEPTION 'Variante de entrega no encontrada';
  END IF;

  IF v_stock_anterior < new.cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente en variante entregada (disponible %, requerido %)',
      v_stock_anterior, new.cantidad;
  END IF;

  v_stock_posterior := v_stock_anterior - new.cantidad;

  UPDATE public.variantes_producto
  SET stock_actual = v_stock_posterior,
      updated_at   = now()
  WHERE id = new.variante_entrega_id;

  INSERT INTO public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior,
    motivo, usuario_id
  ) VALUES (
    new.tienda_id,
    new.variante_entrega_id,
    'cambio_devolucion',
    -new.cantidad,
    v_stock_anterior,
    v_stock_posterior,
    'Cambio devolución #' || v_numero_dev,
    v_usuario_id
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS detalles_devolucion_descontar_entrega ON public.detalles_devolucion;

CREATE TRIGGER detalles_devolucion_descontar_entrega
  AFTER INSERT ON public.detalles_devolucion
  FOR EACH ROW EXECUTE FUNCTION public.descontar_stock_entrega_cambio();
