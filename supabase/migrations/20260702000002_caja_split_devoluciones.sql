-- Caja: separar devoluciones del turno en reintegros (dinero que salió)
-- vs créditos store (saldo a favor: pasivo sin egreso de caja).
-- El total de devoluciones sigue excluyendo 'cambio' (rotación de stock).
-- Requiere que registrarDevolucion asigne sesion_caja_id a toda devolución
-- hecha con caja abierta (fix en app/app/actions/devoluciones.ts).

-- Columnas para persistir el split en cierres históricos
ALTER TABLE public.cierres_caja
  ADD COLUMN IF NOT EXISTS total_devoluciones_reintegro numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_devoluciones_credito   numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.cierres_caja.total_devoluciones_reintegro IS
  'Devoluciones del turno con reintegro de dinero (reembolso o legacy NULL).';
COMMENT ON COLUMN public.cierres_caja.total_devoluciones_credito IS
  'Devoluciones del turno acreditadas como saldo a favor (sin egreso de caja).';

CREATE OR REPLACE FUNCTION public.preview_resumen_turno(p_sesion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sesion              record;
  v_tienda_id           uuid;
  v_total_ventas        numeric := 0;
  v_cant_ventas         integer := 0;
  v_total_devoluciones  numeric := 0;
  v_cant_devoluciones   integer := 0;
  v_dev_reintegro       numeric := 0;
  v_dev_credito         numeric := 0;
  v_total_comisiones    numeric := 0;
  v_efectivo_esperado   numeric := 0;
  v_total_neto          numeric := 0;
  v_cuenta              record;
  v_ingresos_cuenta     numeric;
  v_egresos_cuenta      numeric;
  v_comision_cuenta     numeric;
  v_detalle             jsonb := '[]'::jsonb;
  v_pagos               jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_sesion
  FROM public.sesiones_caja
  WHERE id = p_sesion_id
    AND tienda_id = public.get_tienda_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión de caja no encontrada.';
  END IF;

  v_tienda_id := v_sesion.tienda_id;

  SELECT
    coalesce(sum(total), 0),
    count(*)::integer
  INTO v_total_ventas, v_cant_ventas
  FROM public.ventas
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada';

  -- Reintegros: reembolso (o legacy sin tipo) — dinero que salió de las cuentas
  SELECT coalesce(sum(total_devuelto), 0)
  INTO v_dev_reintegro
  FROM public.devoluciones
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada'
    AND (tipo_resolucion IS NULL OR tipo_resolucion = 'reembolso');

  -- Créditos store: saldo a favor — pasivo, sin egreso de caja
  SELECT coalesce(sum(total_devuelto), 0)
  INTO v_dev_credito
  FROM public.devoluciones
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada'
    AND tipo_resolucion = 'saldo_a_favor';

  SELECT count(*)::integer
  INTO v_cant_devoluciones
  FROM public.devoluciones
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada'
    AND (tipo_resolucion IS NULL OR tipo_resolucion != 'cambio');

  v_total_devoluciones := v_dev_reintegro + v_dev_credito;

  SELECT coalesce(sum(pv.comision_calculada), 0)
  INTO v_total_comisiones
  FROM public.pagos_venta pv
  JOIN public.ventas v ON v.id = pv.venta_id
  WHERE v.sesion_caja_id = p_sesion_id
    AND v.estado = 'completada';

  v_total_neto := v_total_ventas - v_total_devoluciones - v_total_comisiones;

  SELECT
    v_sesion.monto_apertura_efectivo
    + coalesce((
        SELECT sum(case WHEN mf.tipo = 'ingreso' THEN mf.monto ELSE 0 END)
        FROM public.movimientos_fondos mf
        JOIN public.cuentas_fondos cf ON cf.id = mf.cuenta_fondo_id
        WHERE mf.tienda_id = v_tienda_id
          AND cf.tipo = 'efectivo'
          AND mf.created_at >= v_sesion.fecha_apertura
      ), 0)
    - coalesce((
        SELECT sum(case WHEN mf.tipo = 'egreso' THEN mf.monto ELSE 0 END)
        FROM public.movimientos_fondos mf
        JOIN public.cuentas_fondos cf ON cf.id = mf.cuenta_fondo_id
        WHERE mf.tienda_id = v_tienda_id
          AND cf.tipo = 'efectivo'
          AND mf.created_at >= v_sesion.fecha_apertura
      ), 0)
  INTO v_efectivo_esperado;

  FOR v_cuenta IN
    SELECT cf.*
    FROM public.cuentas_fondos cf
    WHERE cf.tienda_id = v_tienda_id AND cf.activo = true
  LOOP
    SELECT coalesce(sum(case WHEN mf.tipo = 'ingreso' THEN mf.monto ELSE 0 END), 0)
    INTO v_ingresos_cuenta
    FROM public.movimientos_fondos mf
    WHERE mf.cuenta_fondo_id = v_cuenta.id
      AND mf.created_at >= v_sesion.fecha_apertura;

    SELECT coalesce(sum(case WHEN mf.tipo = 'egreso' THEN mf.monto ELSE 0 END), 0)
    INTO v_egresos_cuenta
    FROM public.movimientos_fondos mf
    WHERE mf.cuenta_fondo_id = v_cuenta.id
      AND mf.created_at >= v_sesion.fecha_apertura;

    SELECT coalesce(sum(pv.comision_calculada), 0) INTO v_comision_cuenta
    FROM public.pagos_venta pv
    JOIN public.ventas v ON v.id = pv.venta_id
    WHERE v.sesion_caja_id = p_sesion_id
      AND v.estado = 'completada'
      AND pv.cuenta_fondo_id = v_cuenta.id;

    IF v_ingresos_cuenta > 0 OR v_egresos_cuenta > 0 THEN
      v_detalle := v_detalle || jsonb_build_array(jsonb_build_object(
        'cuenta_fondo_id',     v_cuenta.id,
        'nombre_cuenta',       v_cuenta.nombre,
        'tipo_cuenta',         v_cuenta.tipo,
        'total_ingresos',      v_ingresos_cuenta,
        'total_egresos',       v_egresos_cuenta,
        'comision_estimada',   v_comision_cuenta,
        'total_neto',          v_ingresos_cuenta - v_egresos_cuenta - v_comision_cuenta,
        'saldo_antes_turno',   v_cuenta.saldo_actual - v_ingresos_cuenta + v_egresos_cuenta,
        'saldo_despues_turno', v_cuenta.saldo_actual
      ));
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'nombre_cuenta',   sub.nombre_cuenta,
    'cantidad_pagos',  sub.cantidad_pagos,
    'monto_bruto',     sub.monto_bruto,
    'comision',        sub.comision,
    'monto_neto',      sub.monto_neto
  ) ORDER BY sub.nombre_cuenta), '[]'::jsonb)
  INTO v_pagos
  FROM (
    SELECT
      pv.nombre_cuenta_fondo AS nombre_cuenta,
      count(*)::integer AS cantidad_pagos,
      coalesce(sum(pv.monto), 0) AS monto_bruto,
      coalesce(sum(pv.comision_calculada), 0) AS comision,
      coalesce(sum(pv.monto_neto), 0) AS monto_neto
    FROM public.pagos_venta pv
    JOIN public.ventas v ON v.id = pv.venta_id
    WHERE v.sesion_caja_id = p_sesion_id
      AND v.estado = 'completada'
    GROUP BY pv.cuenta_fondo_id, pv.nombre_cuenta_fondo
  ) sub;

  RETURN jsonb_build_object(
    'total_ventas_monto',            v_total_ventas,
    'total_ventas_cantidad',         v_cant_ventas,
    'total_devoluciones_monto',      v_total_devoluciones,
    'total_devoluciones_cantidad',   v_cant_devoluciones,
    'total_devoluciones_reintegro',  v_dev_reintegro,
    'total_devoluciones_credito',    v_dev_credito,
    'total_comisiones',              v_total_comisiones,
    'total_neto',                    v_total_neto,
    'monto_apertura_efectivo',       v_sesion.monto_apertura_efectivo,
    'efectivo_esperado',             v_efectivo_esperado,
    'detalle_por_cuenta',            v_detalle,
    'pagos_por_cuenta',              v_pagos
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cerrar_caja(
  p_sesion_id             uuid,
  p_efectivo_declarado    numeric DEFAULT NULL,
  p_observaciones         text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sesion              record;
  v_tienda_id           uuid;
  v_usuario_id          uuid;
  v_cierre_id           uuid;
  v_total_ventas        numeric := 0;
  v_cant_ventas         integer := 0;
  v_total_devoluciones  numeric := 0;
  v_cant_devoluciones   integer := 0;
  v_dev_reintegro       numeric := 0;
  v_dev_credito         numeric := 0;
  v_total_comisiones    numeric := 0;
  v_efectivo_esperado   numeric := 0;
  v_cuenta              record;
  v_ingresos_cuenta     numeric;
  v_egresos_cuenta      numeric;
  v_comision_cuenta     numeric;
BEGIN
  SELECT * INTO v_sesion
  FROM public.sesiones_caja
  WHERE id = p_sesion_id
    AND tienda_id = public.get_tienda_id()
    AND estado = 'abierta';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión de caja no encontrada o ya cerrada.';
  END IF;

  v_tienda_id  := v_sesion.tienda_id;
  v_usuario_id := auth.uid();

  SELECT
    coalesce(sum(total), 0),
    count(*)
  INTO v_total_ventas, v_cant_ventas
  FROM public.ventas
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada';

  SELECT coalesce(sum(total_devuelto), 0)
  INTO v_dev_reintegro
  FROM public.devoluciones
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada'
    AND (tipo_resolucion IS NULL OR tipo_resolucion = 'reembolso');

  SELECT coalesce(sum(total_devuelto), 0)
  INTO v_dev_credito
  FROM public.devoluciones
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada'
    AND tipo_resolucion = 'saldo_a_favor';

  SELECT count(*)
  INTO v_cant_devoluciones
  FROM public.devoluciones
  WHERE sesion_caja_id = p_sesion_id
    AND estado = 'completada'
    AND (tipo_resolucion IS NULL OR tipo_resolucion != 'cambio');

  v_total_devoluciones := v_dev_reintegro + v_dev_credito;

  SELECT coalesce(sum(pv.comision_calculada), 0)
  INTO v_total_comisiones
  FROM public.pagos_venta pv
  JOIN public.ventas v ON v.id = pv.venta_id
  WHERE v.sesion_caja_id = p_sesion_id
    AND v.estado = 'completada';

  SELECT
    v_sesion.monto_apertura_efectivo
    + coalesce((
        SELECT sum(case WHEN mf.tipo = 'ingreso' THEN mf.monto ELSE 0 END)
        FROM public.movimientos_fondos mf
        JOIN public.cuentas_fondos cf ON cf.id = mf.cuenta_fondo_id
        WHERE mf.tienda_id = v_tienda_id
          AND cf.tipo = 'efectivo'
          AND mf.created_at >= v_sesion.fecha_apertura
      ), 0)
    - coalesce((
        SELECT sum(case WHEN mf.tipo = 'egreso' THEN mf.monto ELSE 0 END)
        FROM public.movimientos_fondos mf
        JOIN public.cuentas_fondos cf ON cf.id = mf.cuenta_fondo_id
        WHERE mf.tienda_id = v_tienda_id
          AND cf.tipo = 'efectivo'
          AND mf.created_at >= v_sesion.fecha_apertura
      ), 0)
  INTO v_efectivo_esperado;

  INSERT INTO public.cierres_caja (
    sesion_id, tienda_id, usuario_id,
    total_ventas_monto, total_ventas_cantidad,
    total_devoluciones_monto, total_devoluciones_cantidad,
    total_devoluciones_reintegro, total_devoluciones_credito,
    total_neto,
    monto_apertura_efectivo, efectivo_esperado,
    efectivo_declarado, diferencia_efectivo,
    observaciones
  ) VALUES (
    p_sesion_id, v_tienda_id, v_usuario_id,
    v_total_ventas, v_cant_ventas,
    v_total_devoluciones, v_cant_devoluciones,
    v_dev_reintegro, v_dev_credito,
    v_total_ventas - v_total_devoluciones - v_total_comisiones,
    v_sesion.monto_apertura_efectivo, v_efectivo_esperado,
    p_efectivo_declarado,
    CASE WHEN p_efectivo_declarado IS NOT NULL
         THEN p_efectivo_declarado - v_efectivo_esperado
         ELSE NULL END,
    p_observaciones
  )
  RETURNING id INTO v_cierre_id;

  FOR v_cuenta IN
    SELECT cf.*
    FROM public.cuentas_fondos cf
    WHERE cf.tienda_id = v_tienda_id AND cf.activo = true
  LOOP
    SELECT coalesce(sum(case WHEN mf.tipo = 'ingreso' THEN mf.monto ELSE 0 END), 0)
    INTO v_ingresos_cuenta
    FROM public.movimientos_fondos mf
    WHERE mf.cuenta_fondo_id = v_cuenta.id
      AND mf.created_at >= v_sesion.fecha_apertura;

    SELECT coalesce(sum(case WHEN mf.tipo = 'egreso' THEN mf.monto ELSE 0 END), 0)
    INTO v_egresos_cuenta
    FROM public.movimientos_fondos mf
    WHERE mf.cuenta_fondo_id = v_cuenta.id
      AND mf.created_at >= v_sesion.fecha_apertura;

    SELECT coalesce(sum(pv.comision_calculada), 0) INTO v_comision_cuenta
    FROM public.pagos_venta pv
    JOIN public.ventas v ON v.id = pv.venta_id
    WHERE v.sesion_caja_id = p_sesion_id
      AND v.estado = 'completada'
      AND pv.cuenta_fondo_id = v_cuenta.id;

    IF v_ingresos_cuenta > 0 OR v_egresos_cuenta > 0 THEN
      INSERT INTO public.cierres_caja_detalle (
        cierre_id, tienda_id, cuenta_fondo_id,
        nombre_cuenta, tipo_cuenta,
        total_ingresos, total_egresos, comision_estimada, total_neto,
        saldo_antes_turno, saldo_despues_turno
      ) VALUES (
        v_cierre_id, v_tienda_id, v_cuenta.id,
        v_cuenta.nombre, v_cuenta.tipo,
        v_ingresos_cuenta, v_egresos_cuenta, v_comision_cuenta,
        v_ingresos_cuenta - v_egresos_cuenta - v_comision_cuenta,
        v_cuenta.saldo_actual - v_ingresos_cuenta + v_egresos_cuenta,
        v_cuenta.saldo_actual
      );
    END IF;
  END LOOP;

  UPDATE public.sesiones_caja
  SET estado            = 'cerrada',
      fecha_cierre      = now(),
      usuario_cierre_id = v_usuario_id,
      observaciones_cierre = p_observaciones,
      updated_at        = now()
  WHERE id = p_sesion_id;

  RETURN v_cierre_id;
END;
$$;

COMMENT ON FUNCTION public.preview_resumen_turno(uuid) IS
  'Resumen de turno sin cerrar. Devoluciones monetarias separadas en reintegros y créditos store (excluye cambio de variante).';
