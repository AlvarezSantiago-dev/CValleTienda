-- =============================================================
-- Stock infinito (-1) solo para rubros despensa / carnicería
-- Si stock = -1 en otro rubro → stock insuficiente (no no-op)
-- =============================================================

CREATE OR REPLACE FUNCTION public.tienda_permite_stock_infinito(p_tienda_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT t.rubro IN ('despensa', 'carniceria')
     FROM public.tiendas t
     WHERE t.id = p_tienda_id),
    false
  );
$$;

COMMENT ON FUNCTION public.tienda_permite_stock_infinito(uuid) IS
  'True si el rubro de la tienda permite stock_actual = -1 (ilimitado).';

-- =============================================================
-- 1. Trigger salida venta
-- =============================================================
CREATE OR REPLACE FUNCTION public.registrar_salida_stock_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_es_kit             boolean;
  v_es_bundle          boolean;
  v_stock_anterior     numeric;
  v_comp               record;
  v_comp_anterior      numeric;
  v_cantidad_total     numeric;
  v_permite_infinito   boolean;
BEGIN
  IF new.variante_id IS NULL THEN
    RETURN new;
  END IF;

  v_permite_infinito := public.tienda_permite_stock_infinito(new.tienda_id);

  SELECT p.es_kit, p.es_bundle
    INTO v_es_kit, v_es_bundle
  FROM public.variantes_producto vp
  JOIN public.productos p ON p.id = vp.producto_id
  WHERE vp.id = new.variante_id;

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
        IF NOT v_permite_infinito THEN
          RAISE EXCEPTION 'Stock insuficiente del componente de bundle. Stock actual: %, requerido: %',
            v_comp_anterior, v_cantidad_total;
        END IF;
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

  SELECT stock_actual INTO v_stock_anterior
  FROM public.variantes_producto
  WHERE id = new.variante_id;

  IF v_stock_anterior = -1 THEN
    IF NOT v_permite_infinito THEN
      RAISE EXCEPTION 'Stock insuficiente para la variante %. Stock actual: %, requerido: %',
        new.variante_id, v_stock_anterior, new.cantidad;
    END IF;
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
-- 2. Trigger anulación
-- =============================================================
CREATE OR REPLACE FUNCTION public.revertir_stock_anulacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_detalle            record;
  v_stock_anterior     numeric;
  v_es_kit             boolean;
  v_es_bundle          boolean;
  v_comp               record;
  v_comp_anterior      numeric;
  v_cantidad_total     numeric;
  v_permite_infinito   boolean;
BEGIN
  IF new.estado != 'anulada' OR old.estado = 'anulada' THEN
    RETURN new;
  END IF;

  v_permite_infinito := public.tienda_permite_stock_infinito(new.tienda_id);

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
          IF NOT v_permite_infinito THEN
            RAISE EXCEPTION 'Stock insuficiente al anular (componente kit). Stock actual: %',
              v_stock_anterior;
          END IF;
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
          IF NOT v_permite_infinito THEN
            RAISE EXCEPTION 'Stock insuficiente al anular (bundle). Stock actual: %',
              v_comp_anterior;
          END IF;
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
        IF NOT v_permite_infinito THEN
          RAISE EXCEPTION 'Stock insuficiente al anular. Stock actual: %',
            v_stock_anterior;
        END IF;
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
-- 3. Reposición por devolución
-- =============================================================
CREATE OR REPLACE FUNCTION public.reponer_stock_devolucion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_anterior     numeric;
  v_permite_infinito   boolean;
BEGIN
  IF new.variante_id IS NULL THEN
    RETURN new;
  END IF;

  v_permite_infinito := public.tienda_permite_stock_infinito(new.tienda_id);

  SELECT stock_actual INTO v_stock_anterior
  FROM public.variantes_producto
  WHERE id = new.variante_id;

  IF v_stock_anterior = -1 THEN
    IF NOT v_permite_infinito THEN
      RAISE EXCEPTION 'Stock insuficiente al reponer devolución. Stock actual: %',
        v_stock_anterior;
    END IF;
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
-- 4. Descuento en cambio de variante (entrega)
-- =============================================================
CREATE OR REPLACE FUNCTION public.descontar_stock_entrega_cambio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_anterior     numeric;
  v_stock_posterior    numeric;
  v_tipo_resolucion    text;
  v_numero_dev         text;
  v_usuario_id         uuid;
  v_permite_infinito   boolean;
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

  v_permite_infinito := public.tienda_permite_stock_infinito(new.tienda_id);

  SELECT stock_actual INTO v_stock_anterior
  FROM public.variantes_producto
  WHERE id = new.variante_entrega_id
  FOR UPDATE;

  IF v_stock_anterior IS NULL THEN
    RAISE EXCEPTION 'Variante de entrega no encontrada';
  END IF;

  IF v_stock_anterior = -1 THEN
    IF NOT v_permite_infinito THEN
      RAISE EXCEPTION 'Stock insuficiente en variante entregada (disponible %, requerido %)',
        v_stock_anterior, new.cantidad;
    END IF;
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
