-- =============================================================
-- MIGRATION: Kits / Armados
-- Los kits son productos compuestos cuyo stock se calcula a partir
-- de los componentes. Ideal para conjuntos de ropa, sets, combos.
-- =============================================================

-- 1. Marcar productos como kits
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS es_kit boolean NOT NULL DEFAULT false;

-- 2. Tabla de componentes del kit (por variante del kit → variante del componente)
CREATE TABLE IF NOT EXISTS public.kit_componentes (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id              uuid        NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  kit_variante_id        uuid        NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  componente_variante_id uuid        NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  cantidad               integer     NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kit_variante_id, componente_variante_id)
);

ALTER TABLE public.kit_componentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kit_componentes_tienda_rw" ON public.kit_componentes
  USING  (tienda_id = get_tienda_id())
  WITH CHECK (tienda_id = get_tienda_id());

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS kit_componentes_kit_variante_idx   ON public.kit_componentes (kit_variante_id);
CREATE INDEX IF NOT EXISTS kit_componentes_comp_variante_idx  ON public.kit_componentes (componente_variante_id);

-- 3. Modificar el trigger de salida de stock para saltear variantes de kit
--    (el stock de los componentes se descuenta directamente desde la server action)
CREATE OR REPLACE FUNCTION public.registrar_salida_stock_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_anterior integer;
  v_es_kit         boolean;
BEGIN
  -- Solo procesar si tiene variante asociada
  IF new.variante_id IS NULL THEN
    RETURN new;
  END IF;

  -- Verificar si la variante pertenece a un kit → si es kit, el stock de
  -- componentes ya fue descontado manualmente por la server action.
  SELECT p.es_kit INTO v_es_kit
  FROM public.variantes_producto vp
  JOIN public.productos p ON p.id = vp.producto_id
  WHERE vp.id = new.variante_id;

  IF v_es_kit IS TRUE THEN
    -- Saltear: el kit no tiene stock propio; los componentes ya se descontaron
    RETURN new;
  END IF;

  -- Obtener stock actual antes de descontar
  SELECT stock_actual INTO v_stock_anterior
  FROM public.variantes_producto
  WHERE id = new.variante_id;

  -- Validar que haya stock suficiente
  IF v_stock_anterior < new.cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para la variante %. Stock actual: %, requerido: %',
      new.variante_id, v_stock_anterior, new.cantidad;
  END IF;

  -- Descontar stock
  UPDATE public.variantes_producto
  SET stock_actual = stock_actual - new.cantidad,
      updated_at   = now()
  WHERE id = new.variante_id;

  -- Registrar movimiento de auditoría
  INSERT INTO public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior,
    motivo, venta_id, usuario_id
  )
  SELECT
    new.tienda_id,
    new.variante_id,
    'salida',
    -new.cantidad,
    v_stock_anterior,
    v_stock_anterior - new.cantidad,
    'Venta #' || v.numero_ticket,
    new.venta_id,
    v.usuario_id
  FROM public.ventas v
  WHERE v.id = new.venta_id;

  RETURN new;
END;
$$;

-- 4. Modificar el trigger de anulación para revertir stocks de componentes de kit
CREATE OR REPLACE FUNCTION public.revertir_stock_anulacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_detalle        record;
  v_stock_anterior integer;
  v_es_kit         boolean;
  v_comp           record;
BEGIN
  -- Solo actuar cuando el estado cambia a 'anulada'
  IF new.estado != 'anulada' OR old.estado = 'anulada' THEN
    RETURN new;
  END IF;

  -- Iterar sobre los detalles de la venta anulada
  FOR v_detalle IN
    SELECT * FROM public.detalles_venta
    WHERE venta_id = new.id AND variante_id IS NOT NULL
  LOOP
    -- Detectar si la variante es de un kit
    SELECT p.es_kit INTO v_es_kit
    FROM public.variantes_producto vp
    JOIN public.productos p ON p.id = vp.producto_id
    WHERE vp.id = v_detalle.variante_id;

    IF v_es_kit IS TRUE THEN
      -- Revertir stock de cada componente
      FOR v_comp IN
        SELECT * FROM public.kit_componentes
        WHERE kit_variante_id = v_detalle.variante_id
      LOOP
        SELECT stock_actual INTO v_stock_anterior
        FROM public.variantes_producto
        WHERE id = v_comp.componente_variante_id;

        UPDATE public.variantes_producto
        SET stock_actual = stock_actual + (v_detalle.cantidad * v_comp.cantidad),
            updated_at   = now()
        WHERE id = v_comp.componente_variante_id;

        INSERT INTO public.movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior,
          motivo, venta_id, usuario_id
        )
        VALUES (
          new.tienda_id,
          v_comp.componente_variante_id,
          'devolucion',
          v_detalle.cantidad * v_comp.cantidad,
          v_stock_anterior,
          v_stock_anterior + (v_detalle.cantidad * v_comp.cantidad),
          'Anulación venta #' || new.numero_ticket || ' (componente de kit)',
          new.id,
          new.usuario_id
        );
      END LOOP;
    ELSE
      -- Producto normal: revertir su propio stock
      SELECT stock_actual INTO v_stock_anterior
      FROM public.variantes_producto
      WHERE id = v_detalle.variante_id;

      UPDATE public.variantes_producto
      SET stock_actual = stock_actual + v_detalle.cantidad,
          updated_at   = now()
      WHERE id = v_detalle.variante_id;

      INSERT INTO public.movimientos_stock (
        tienda_id, variante_id, tipo, cantidad,
        stock_anterior, stock_posterior,
        motivo, venta_id, usuario_id
      )
      VALUES (
        new.tienda_id,
        v_detalle.variante_id,
        'devolucion',
        v_detalle.cantidad,
        v_stock_anterior,
        v_stock_anterior + v_detalle.cantidad,
        'Anulación venta #' || new.numero_ticket,
        new.id,
        new.usuario_id
      );
    END IF;
  END LOOP;

  RETURN new;
END;
$$;
