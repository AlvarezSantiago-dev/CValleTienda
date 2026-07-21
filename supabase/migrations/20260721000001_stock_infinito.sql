-- =============================================================
-- Stock infinito: stock_actual = -1
-- No se descuenta en ventas/cambios; no se suma en anulaciones/
-- devoluciones. Sentinel único; no otros negativos.
-- =============================================================

-- 1. Constraints
ALTER TABLE public.variantes_producto
  DROP CONSTRAINT IF EXISTS variantes_stock_check;

ALTER TABLE public.variantes_producto
  ADD CONSTRAINT variantes_stock_check
  CHECK (stock_actual = -1 OR stock_actual >= 0);

ALTER TABLE public.movimientos_stock
  DROP CONSTRAINT IF EXISTS movimientos_stock_posterior_check;

ALTER TABLE public.movimientos_stock
  ADD CONSTRAINT movimientos_stock_posterior_check
  CHECK (stock_posterior = -1 OR stock_posterior >= 0);

COMMENT ON COLUMN public.variantes_producto.stock_actual IS
  'Stock actual. -1 = ilimitado (no se descuenta en ventas). Solo >= 0 o -1.';

-- 2. Índice parcial: incluir ilimitados como "con stock"
DROP INDEX IF EXISTS public.variantes_con_stock_idx;

CREATE INDEX variantes_con_stock_idx
  ON public.variantes_producto (tienda_id)
  WHERE activo = true AND (stock_actual > 0 OR stock_actual = -1);

-- =============================================================
-- 3. Trigger salida venta: kits + bundles + infinito
-- =============================================================
CREATE OR REPLACE FUNCTION public.registrar_salida_stock_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_es_kit          boolean;
  v_es_bundle       boolean;
  v_stock_anterior  numeric;
  v_comp            record;
  v_comp_anterior   numeric;
  v_cantidad_total  numeric;
BEGIN
  IF new.variante_id IS NULL THEN
    RETURN new;
  END IF;

  SELECT p.es_kit, p.es_bundle
    INTO v_es_kit, v_es_bundle
  FROM public.variantes_producto vp
  JOIN public.productos p ON p.id = vp.producto_id
  WHERE vp.id = new.variante_id;

  -- Kit: componentes se descuentan en la server action
  IF v_es_kit IS TRUE THEN
    RETURN new;
  END IF;

  IF v_es_bundle IS TRUE THEN
    FOR v_comp IN
      SELECT pc.componente_variante_id,
             pc.cantidad,
             vp2.stock_actual AS comp_stock_actual
      FROM public.producto_componentes pc
      JOIN public.variantes_producto vp2 ON vp2.id = pc.componente_variante_id
      WHERE pc.variante_bundle_id = new.variante_id
        AND pc.tienda_id = new.tienda_id
    LOOP
      v_cantidad_total := v_comp.cantidad * new.cantidad;
      v_comp_anterior  := v_comp.comp_stock_actual;

      IF v_comp_anterior = -1 THEN
        INSERT INTO public.movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior, motivo, venta_id, usuario_id
        )
        SELECT
          new.tienda_id,
          v_comp.componente_variante_id,
          'salida',
          -v_cantidad_total,
          -1,
          -1,
          'Venta #' || v.numero_ticket || ' (bundle, stock ilimitado)',
          new.venta_id,
          v.usuario_id
        FROM public.ventas v WHERE v.id = new.venta_id;
        CONTINUE;
      END IF;

      IF v_comp_anterior < v_cantidad_total THEN
        RAISE EXCEPTION 'Stock insuficiente del componente de bundle. Stock actual: %, requerido: %',
          v_comp_anterior, v_cantidad_total;
      END IF;

      UPDATE public.variantes_producto
        SET stock_actual = stock_actual - v_cantidad_total,
            updated_at   = now()
        WHERE id = v_comp.componente_variante_id;

      INSERT INTO public.movimientos_stock (
        tienda_id, variante_id, tipo, cantidad,
        stock_anterior, stock_posterior, motivo, venta_id, usuario_id
      )
      SELECT
        new.tienda_id,
        v_comp.componente_variante_id,
        'salida',
        -v_cantidad_total,
        v_comp_anterior,
        v_comp_anterior - v_cantidad_total,
        'Venta #' || v.numero_ticket || ' (bundle)',
        new.venta_id,
        v.usuario_id
      FROM public.ventas v WHERE v.id = new.venta_id;
    END LOOP;
    RETURN new;
  END IF;

  -- Producto normal
  SELECT stock_actual INTO v_stock_anterior
  FROM public.variantes_producto
  WHERE id = new.variante_id;

  IF v_stock_anterior = -1 THEN
    INSERT INTO public.movimientos_stock (
      tienda_id, variante_id, tipo, cantidad,
      stock_anterior, stock_posterior, motivo, venta_id, usuario_id
    )
    SELECT
      new.tienda_id,
      new.variante_id,
      'salida',
      -new.cantidad,
      -1,
      -1,
      'Venta #' || v.numero_ticket || ' (stock ilimitado)',
      new.venta_id,
      v.usuario_id
    FROM public.ventas v
    WHERE v.id = new.venta_id;
    RETURN new;
  END IF;

  IF v_stock_anterior < new.cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para la variante %. Stock actual: %, requerido: %',
      new.variante_id, v_stock_anterior, new.cantidad;
  END IF;

  UPDATE public.variantes_producto
  SET stock_actual = stock_actual - new.cantidad,
      updated_at   = now()
  WHERE id = new.variante_id;

  INSERT INTO public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior, motivo, venta_id, usuario_id
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

-- =============================================================
-- 4. Trigger anulación: kits + bundles + infinito
-- =============================================================
CREATE OR REPLACE FUNCTION public.revertir_stock_anulacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_detalle         record;
  v_stock_anterior  numeric;
  v_es_kit          boolean;
  v_es_bundle       boolean;
  v_comp            record;
  v_comp_anterior   numeric;
  v_cantidad_total  numeric;
BEGIN
  IF new.estado != 'anulada' OR old.estado = 'anulada' THEN
    RETURN new;
  END IF;

  FOR v_detalle IN
    SELECT * FROM public.detalles_venta
    WHERE venta_id = new.id AND variante_id IS NOT NULL
  LOOP
    SELECT p.es_kit, p.es_bundle
      INTO v_es_kit, v_es_bundle
    FROM public.variantes_producto vp
    JOIN public.productos p ON p.id = vp.producto_id
    WHERE vp.id = v_detalle.variante_id;

    IF v_es_kit IS TRUE THEN
      FOR v_comp IN
        SELECT * FROM public.kit_componentes
        WHERE kit_variante_id = v_detalle.variante_id
      LOOP
        SELECT stock_actual INTO v_stock_anterior
        FROM public.variantes_producto
        WHERE id = v_comp.componente_variante_id;

        IF v_stock_anterior = -1 THEN
          INSERT INTO public.movimientos_stock (
            tienda_id, variante_id, tipo, cantidad,
            stock_anterior, stock_posterior, motivo, venta_id, usuario_id
          ) VALUES (
            new.tienda_id,
            v_comp.componente_variante_id,
            'devolucion',
            v_detalle.cantidad * v_comp.cantidad,
            -1,
            -1,
            'Anulación venta #' || new.numero_ticket || ' (componente de kit, stock ilimitado)',
            new.id,
            new.usuario_id
          );
          CONTINUE;
        END IF;

        UPDATE public.variantes_producto
        SET stock_actual = stock_actual + (v_detalle.cantidad * v_comp.cantidad),
            updated_at   = now()
        WHERE id = v_comp.componente_variante_id;

        INSERT INTO public.movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior, motivo, venta_id, usuario_id
        ) VALUES (
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

    ELSIF v_es_bundle IS TRUE THEN
      FOR v_comp IN
        SELECT pc.componente_variante_id,
               pc.cantidad,
               vp2.stock_actual AS comp_stock_actual
        FROM public.producto_componentes pc
        JOIN public.variantes_producto vp2 ON vp2.id = pc.componente_variante_id
        WHERE pc.variante_bundle_id = v_detalle.variante_id
          AND pc.tienda_id = new.tienda_id
      LOOP
        v_cantidad_total := v_comp.cantidad * v_detalle.cantidad;
        v_comp_anterior  := v_comp.comp_stock_actual;

        IF v_comp_anterior = -1 THEN
          INSERT INTO public.movimientos_stock (
            tienda_id, variante_id, tipo, cantidad,
            stock_anterior, stock_posterior, motivo, venta_id, usuario_id
          ) VALUES (
            new.tienda_id,
            v_comp.componente_variante_id,
            'devolucion',
            v_cantidad_total,
            -1,
            -1,
            'Anulación venta #' || new.numero_ticket || ' (bundle, stock ilimitado)',
            new.id,
            new.usuario_id
          );
          CONTINUE;
        END IF;

        UPDATE public.variantes_producto
          SET stock_actual = stock_actual + v_cantidad_total,
              updated_at   = now()
          WHERE id = v_comp.componente_variante_id;

        INSERT INTO public.movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior, motivo, venta_id, usuario_id
        ) VALUES (
          new.tienda_id,
          v_comp.componente_variante_id,
          'devolucion',
          v_cantidad_total,
          v_comp_anterior,
          v_comp_anterior + v_cantidad_total,
          'Anulación venta #' || new.numero_ticket || ' (bundle)',
          new.id,
          new.usuario_id
        );
      END LOOP;

    ELSE
      SELECT stock_actual INTO v_stock_anterior
      FROM public.variantes_producto
      WHERE id = v_detalle.variante_id;

      IF v_stock_anterior = -1 THEN
        INSERT INTO public.movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior, motivo, venta_id, usuario_id
        ) VALUES (
          new.tienda_id,
          v_detalle.variante_id,
          'devolucion',
          v_detalle.cantidad,
          -1,
          -1,
          'Anulación venta #' || new.numero_ticket || ' (stock ilimitado)',
          new.id,
          new.usuario_id
        );
      ELSE
        UPDATE public.variantes_producto
          SET stock_actual = stock_actual + v_detalle.cantidad,
              updated_at   = now()
          WHERE id = v_detalle.variante_id;

        INSERT INTO public.movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior, motivo, venta_id, usuario_id
        ) VALUES (
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
    END IF;
  END LOOP;

  RETURN new;
END;
$$;

-- =============================================================
-- 5. Reposición por devolución
-- =============================================================
CREATE OR REPLACE FUNCTION public.reponer_stock_devolucion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_anterior numeric;
BEGIN
  IF new.variante_id IS NULL THEN
    RETURN new;
  END IF;

  SELECT stock_actual INTO v_stock_anterior
  FROM public.variantes_producto
  WHERE id = new.variante_id;

  IF v_stock_anterior = -1 THEN
    INSERT INTO public.movimientos_stock (
      tienda_id, variante_id, tipo, cantidad,
      stock_anterior, stock_posterior, motivo, usuario_id
    )
    SELECT
      new.tienda_id,
      new.variante_id,
      'devolucion',
      new.cantidad,
      -1,
      -1,
      'Devolución #' || d.numero_devolucion || ' (stock ilimitado)',
      d.usuario_id
    FROM public.devoluciones d
    WHERE d.id = new.devolucion_id;
    RETURN new;
  END IF;

  UPDATE public.variantes_producto
  SET stock_actual = stock_actual + new.cantidad,
      updated_at   = now()
  WHERE id = new.variante_id;

  INSERT INTO public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior, motivo, usuario_id
  )
  SELECT
    new.tienda_id,
    new.variante_id,
    'devolucion',
    new.cantidad,
    v_stock_anterior,
    v_stock_anterior + new.cantidad,
    'Devolución #' || d.numero_devolucion,
    d.usuario_id
  FROM public.devoluciones d
  WHERE d.id = new.devolucion_id;

  RETURN new;
END;
$$;

-- =============================================================
-- 6. Descuento en cambio de variante (entrega)
-- =============================================================
CREATE OR REPLACE FUNCTION public.descontar_stock_entrega_cambio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_anterior   numeric;
  v_stock_posterior  numeric;
  v_tipo_resolucion  text;
  v_numero_dev       text;
  v_usuario_id       uuid;
BEGIN
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

  IF v_stock_anterior = -1 THEN
    INSERT INTO public.movimientos_stock (
      tienda_id, variante_id, tipo, cantidad,
      stock_anterior, stock_posterior, motivo, usuario_id
    ) VALUES (
      new.tienda_id,
      new.variante_entrega_id,
      'cambio_devolucion',
      -new.cantidad,
      -1,
      -1,
      'Cambio devolución #' || v_numero_dev || ' (stock ilimitado)',
      v_usuario_id
    );
    RETURN new;
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
    stock_anterior, stock_posterior, motivo, usuario_id
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

-- =============================================================
-- 7. RPC ajuste: permitir -1; rechazar entrada sobre ilimitado
-- =============================================================
CREATE OR REPLACE FUNCTION public.ajustar_stock_variante(
  p_variante_id    uuid,
  p_tipo           text,
  p_cantidad_delta numeric,
  p_motivo         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tienda_id       uuid;
  v_stock_anterior  numeric;
  v_stock_posterior numeric;
  v_movimiento_id   uuid;
BEGIN
  IF p_tipo NOT IN ('entrada', 'ajuste', 'inicial') THEN
    RAISE EXCEPTION 'Tipo de movimiento no permitido vía RPC: %', p_tipo
      USING errcode = '22023';
  END IF;

  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo es obligatorio'
      USING errcode = '22023';
  END IF;

  SELECT tienda_id, stock_actual
    INTO v_tienda_id, v_stock_anterior
  FROM public.variantes_producto
  WHERE id = p_variante_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variante no encontrada: %', p_variante_id
      USING errcode = 'P0002';
  END IF;

  IF v_tienda_id <> public.get_tienda_id() THEN
    RAISE EXCEPTION 'La variante no pertenece a la tienda actual'
      USING errcode = '42501';
  END IF;

  IF v_stock_anterior = -1 AND p_tipo = 'entrada' THEN
    RAISE EXCEPTION 'Producto con stock ilimitado; usá ajuste para salir de ilimitado'
      USING errcode = '22023';
  END IF;

  v_stock_posterior := v_stock_anterior + p_cantidad_delta;

  IF v_stock_posterior < 0 AND v_stock_posterior <> -1 THEN
    RAISE EXCEPTION 'Stock resultante negativo (anterior=%, delta=%)',
      v_stock_anterior, p_cantidad_delta
      USING errcode = '23514';
  END IF;

  UPDATE public.variantes_producto
  SET stock_actual = v_stock_posterior,
      updated_at   = now()
  WHERE id = p_variante_id;

  INSERT INTO public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior,
    motivo, venta_id, usuario_id
  ) VALUES (
    v_tienda_id,
    p_variante_id,
    p_tipo,
    p_cantidad_delta,
    v_stock_anterior,
    v_stock_posterior,
    trim(p_motivo),
    null,
    auth.uid()
  )
  RETURNING id INTO v_movimiento_id;

  RETURN v_movimiento_id;
END;
$$;

COMMENT ON FUNCTION public.ajustar_stock_variante(uuid, text, numeric, text) IS
  'Ajuste atómico de stock. Acepta -1 (ilimitado). Rechaza entradas sobre stock ilimitado.';

-- =============================================================
-- 8. Resumen reportes: excluir -1 de sin_stock y valor
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_stock_resumen(p_tienda_id uuid)
RETURNS TABLE (
  valor_inventario numeric,
  total_variantes integer,
  bajo_stock integer,
  sin_stock integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(
      CASE WHEN v.stock_actual = -1 THEN 0
           ELSE v.stock_actual * COALESCE(p.precio_compra, 0)
      END
    ), 0),
    COUNT(*)::integer,
    COUNT(*) FILTER (
      WHERE v.stock_minimo > 0
        AND v.stock_actual > 0
        AND v.stock_actual <> -1
        AND v.stock_actual <= v.stock_minimo
    )::integer,
    COUNT(*) FILTER (WHERE v.stock_actual = 0)::integer
  FROM public.variantes_producto v
  JOIN public.productos p ON p.id = v.producto_id AND p.activo = true
  WHERE v.tienda_id = p_tienda_id
    AND v.activo = true;
$$;
