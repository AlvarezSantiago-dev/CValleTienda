-- =============================================================
-- MIGRATION: HISTORIAL DE PRECIOS
-- Registra cada cambio de precio_venta en productos para
-- auditoría y análisis histórico.
-- =============================================================

-- -------------------------------------------------------------
-- TABLA: historial_precios
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.historial_precios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id       uuid NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  producto_id     uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  precio_anterior numeric(12, 2) NOT NULL,
  precio_nuevo    numeric(12, 2) NOT NULL,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS historial_precios_producto_idx
  ON public.historial_precios (producto_id, changed_at DESC);

COMMENT ON TABLE public.historial_precios IS
  'Log inmutable de cambios de precio_venta a nivel producto. El trigger trg_log_precio lo alimenta automáticamente.';

ALTER TABLE public.historial_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historial_precios_select" ON public.historial_precios
  FOR SELECT USING (tienda_id = public.get_tienda_id());

CREATE POLICY "historial_precios_insert" ON public.historial_precios
  FOR INSERT WITH CHECK (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- TRIGGER: registrar cambio de precio_venta en productos
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_cambio_precio()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.precio_venta IS DISTINCT FROM NEW.precio_venta THEN
    INSERT INTO public.historial_precios (tienda_id, producto_id, precio_anterior, precio_nuevo)
    VALUES (NEW.tienda_id, NEW.id, OLD.precio_venta, NEW.precio_venta);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_precio
  AFTER UPDATE ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_cambio_precio();
