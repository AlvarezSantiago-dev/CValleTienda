-- P&L: cobrado no incluye lo fiado (monto_cc).
-- Caja: total_ventas_monto = total − monto_cc (plata que no entró).

DROP FUNCTION IF EXISTS public.get_reporte_historico_meses(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_reporte_historico_meses(
  p_tienda_id  uuid,
  p_meses      integer
)
RETURNS TABLE (
  anio                    integer,
  mes                     integer,
  ventas_brutas           numeric,
  cantidad_ventas         integer,
  devoluciones            numeric,
  devoluciones_reembolso  numeric,
  devoluciones_credito    numeric,
  credito_usado           numeric,
  cobrado                 numeric,
  ventas_netas            numeric,
  costo_total             numeric,
  ganancia_bruta          numeric,
  egresos_manuales        numeric,
  comisiones              numeric,
  resultado_neto          numeric,
  margen_pct              numeric,
  tiene_costos            boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  meses_serie AS (
    SELECT
      EXTRACT(YEAR  FROM gs)::integer AS anio,
      EXTRACT(MONTH FROM gs)::integer AS mes,
      date_trunc('month', gs)                          AS inicio_mes,
      date_trunc('month', gs) + interval '1 month'     AS fin_mes
    FROM generate_series(
      date_trunc('month', now() - (p_meses - 1) * interval '1 month'),
      date_trunc('month', now()),
      interval '1 month'
    ) gs
  ),
  ventas_mes AS (
    SELECT
      EXTRACT(YEAR  FROM v.created_at)::integer AS anio,
      EXTRACT(MONTH FROM v.created_at)::integer AS mes,
      COUNT(*)::integer                          AS cantidad_ventas,
      COALESCE(SUM(v.total), 0)                 AS ventas_brutas,
      COALESCE(SUM(v.saldo_favor_usado), 0)     AS credito_usado,
      COALESCE(SUM(v.monto_cc), 0)              AS monto_cc
    FROM ventas v
    WHERE v.tienda_id = p_tienda_id
      AND v.estado    = 'completada'
      AND v.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  devs_mes AS (
    SELECT
      EXTRACT(YEAR  FROM d.created_at)::integer AS anio,
      EXTRACT(MONTH FROM d.created_at)::integer AS mes,
      COALESCE(SUM(d.total_devuelto), 0) AS devoluciones,
      COALESCE(SUM(
        CASE WHEN d.tipo_resolucion = 'saldo_a_favor' THEN d.total_devuelto ELSE 0 END
      ), 0) AS devoluciones_credito,
      COALESCE(SUM(
        CASE WHEN d.tipo_resolucion IS DISTINCT FROM 'saldo_a_favor' THEN d.total_devuelto ELSE 0 END
      ), 0) AS devoluciones_reembolso
    FROM devoluciones d
    WHERE d.tienda_id = p_tienda_id
      AND d.estado    = 'completada'
      AND (d.tipo_resolucion IS NULL OR d.tipo_resolucion != 'cambio')
      AND d.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  ventas_linea_mes AS (
    SELECT
      EXTRACT(YEAR  FROM v.created_at)::integer AS anio,
      EXTRACT(MONTH FROM v.created_at)::integer AS mes,
      COALESCE(SUM(dv.costo_unitario * dv.cantidad), 0) AS costo_ventas,
      COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0) AS ganancia_ventas,
      BOOL_OR(dv.costo_unitario > 0) AS tiene_costos
    FROM detalles_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    WHERE dv.tienda_id = p_tienda_id
      AND v.estado     = 'completada'
      AND v.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  devs_linea_mes AS (
    SELECT
      EXTRACT(YEAR  FROM d.created_at)::integer AS anio,
      EXTRACT(MONTH FROM d.created_at)::integer AS mes,
      COALESCE(SUM(COALESCE(dv_orig.costo_unitario, 0) * dd.cantidad), 0) AS costo_devuelto,
      COALESCE(SUM((dd.precio_unitario - COALESCE(dv_orig.costo_unitario, 0)) * dd.cantidad), 0) AS ganancia_devuelta
    FROM detalles_devolucion dd
    JOIN devoluciones d ON d.id = dd.devolucion_id
    LEFT JOIN detalles_venta dv_orig ON dv_orig.id = dd.detalle_venta_id
    WHERE dd.tienda_id = p_tienda_id
      AND d.tienda_id   = p_tienda_id
      AND d.estado      = 'completada'
      AND (d.tipo_resolucion IS NULL OR d.tipo_resolucion != 'cambio')
      AND d.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  costos_mes AS (
    SELECT
      ms.anio,
      ms.mes,
      COALESCE(vl.costo_ventas, 0) - COALESCE(dl.costo_devuelto, 0)     AS costo_total,
      COALESCE(vl.ganancia_ventas, 0) - COALESCE(dl.ganancia_devuelta, 0) AS ganancia_bruta,
      COALESCE(vl.tiene_costos, false)                                    AS tiene_costos
    FROM meses_serie ms
    LEFT JOIN ventas_linea_mes vl ON vl.anio = ms.anio AND vl.mes = ms.mes
    LEFT JOIN devs_linea_mes dl ON dl.anio = ms.anio AND dl.mes = ms.mes
  ),
  egresos_mes AS (
    SELECT
      EXTRACT(YEAR  FROM mf.created_at)::integer AS anio,
      EXTRACT(MONTH FROM mf.created_at)::integer AS mes,
      COALESCE(SUM(mf.monto), 0)                  AS egresos_manuales
    FROM movimientos_fondos mf
    WHERE mf.tienda_id = p_tienda_id
      AND mf.tipo      = 'egreso'
      AND mf.venta_id IS NULL
      AND mf.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  comisiones_mes AS (
    SELECT
      EXTRACT(YEAR  FROM pv.created_at)::integer AS anio,
      EXTRACT(MONTH FROM pv.created_at)::integer AS mes,
      COALESCE(SUM(pv.comision_calculada), 0) AS comisiones
    FROM pagos_venta pv
    JOIN ventas v ON v.id = pv.venta_id
    WHERE pv.tienda_id = p_tienda_id
      AND v.estado    = 'completada'
      AND pv.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  )
  SELECT
    ms.anio,
    ms.mes,
    COALESCE(vm.ventas_brutas,   0)                                          AS ventas_brutas,
    COALESCE(vm.cantidad_ventas, 0)                                          AS cantidad_ventas,
    COALESCE(dm.devoluciones,    0)                                          AS devoluciones,
    COALESCE(dm.devoluciones_reembolso, 0)                                   AS devoluciones_reembolso,
    COALESCE(dm.devoluciones_credito, 0)                                     AS devoluciones_credito,
    COALESCE(vm.credito_usado, 0)                                            AS credito_usado,
    COALESCE(vm.ventas_brutas, 0) - COALESCE(vm.credito_usado, 0) - COALESCE(vm.monto_cc, 0) AS cobrado,
    COALESCE(vm.ventas_brutas,   0) - COALESCE(dm.devoluciones, 0)          AS ventas_netas,
    COALESCE(cm.costo_total,     0)                                          AS costo_total,
    COALESCE(cm.ganancia_bruta,  0)                                          AS ganancia_bruta,
    COALESCE(em.egresos_manuales, 0)                                         AS egresos_manuales,
    COALESCE(cm2.comisiones, 0)                                              AS comisiones,
    COALESCE(cm.ganancia_bruta,  0) - COALESCE(em.egresos_manuales, 0) - COALESCE(cm2.comisiones, 0) AS resultado_neto,
    CASE
      WHEN (COALESCE(vm.ventas_brutas, 0) - COALESCE(dm.devoluciones, 0)) > 0
           AND COALESCE(cm.tiene_costos, false)
      THEN ROUND(
        COALESCE(cm.ganancia_bruta, 0) /
        (COALESCE(vm.ventas_brutas, 0) - COALESCE(dm.devoluciones, 0)) * 100,
        1
      )
      ELSE NULL
    END                                                                       AS margen_pct,
    COALESCE(cm.tiene_costos, false)                                          AS tiene_costos
  FROM meses_serie ms
  LEFT JOIN ventas_mes vm ON vm.anio = ms.anio AND vm.mes = ms.mes
  LEFT JOIN devs_mes    dm ON dm.anio = ms.anio AND dm.mes = ms.mes
  LEFT JOIN costos_mes  cm ON cm.anio = ms.anio AND cm.mes = ms.mes
  LEFT JOIN egresos_mes em ON em.anio = ms.anio AND em.mes = ms.mes
  LEFT JOIN comisiones_mes cm2 ON cm2.anio = ms.anio AND cm2.mes = ms.mes
  ORDER BY ms.anio DESC, ms.mes DESC;
$$;

COMMENT ON FUNCTION public.get_reporte_historico_meses(uuid, integer) IS
  'P&L mensual: cobrado = brutas − saldo_favor_usado − monto_cc. Ventas netas = brutas − devoluciones.';

GRANT EXECUTE ON FUNCTION public.get_reporte_historico_meses(uuid, integer)
  TO authenticated, service_role;

-- Caja: el total de ventas del turno no incluye lo fiado
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
    coalesce(sum(total - coalesce(monto_cc, 0)), 0),
    count(*)::integer
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
    coalesce(sum(total - coalesce(monto_cc, 0)), 0),
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
