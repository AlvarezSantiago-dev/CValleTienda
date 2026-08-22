-- Dashboard Inicio: agregar en Postgres en vez de bajar meses enteros a Node.
-- get_dashboard_inicio: KPIs hoy/mes, serie 14d, por cobrar, stock bajo.
-- get_dashboard_ganancia: margen hoy+mes en un round-trip.
-- get_dashboard_tops: top productos y var1 con GROUP BY LIMIT.

CREATE OR REPLACE FUNCTION public._dashboard_assert_tienda(p_tienda_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tid uuid;
BEGIN
  v_tid := public.get_tienda_id();
  IF v_tid IS NOT NULL AND v_tid IS DISTINCT FROM p_tienda_id THEN
    RAISE EXCEPTION 'tienda no autorizada' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_inicio(p_tienda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  v_hoy date;
  v_ayer date;
  v_desde_14 date;
  v_ini_mes date;
  v_ini_mes_ant date;
  v_mismo_dia_mes_ant date;
  v_ini_hoy timestamptz;
  v_fin_hoy timestamptz;
  v_ini_14 timestamptz;
  v_ini_mes_ts timestamptz;
  v_ini_mes_ant_ts timestamptz;
  v_fin_mes_ant_ts timestamptz;
  v_lookback timestamptz;
  v_hoy_cant int;
  v_hoy_monto numeric;
  v_ayer_cant int;
  v_ayer_monto numeric;
  v_mes_cant int;
  v_mes_monto numeric;
  v_mes_ant_cant int;
  v_mes_ant_monto numeric;
  v_dev_hoy_cant int;
  v_dev_hoy_monto numeric;
  v_dev_mes_cant int;
  v_dev_mes_monto numeric;
  v_serie jsonb;
  v_por_cobrar_total numeric;
  v_por_cobrar_clientes int;
  v_stock_bajo int;
  v_ultimo_dia_mes_ant int;
  v_dia_clamp int;
BEGIN
  PERFORM public._dashboard_assert_tienda(p_tienda_id);

  v_hoy := (timezone(tz, now()))::date;
  v_ayer := v_hoy - 1;
  v_desde_14 := v_hoy - 13;
  v_ini_mes := date_trunc('month', v_hoy)::date;
  v_ini_mes_ant := (v_ini_mes - interval '1 month')::date;
  v_ultimo_dia_mes_ant := extract(day from (v_ini_mes - interval '1 day'))::int;
  v_dia_clamp := least(extract(day from v_hoy)::int, v_ultimo_dia_mes_ant);
  v_mismo_dia_mes_ant := make_date(
    extract(year from v_ini_mes_ant)::int,
    extract(month from v_ini_mes_ant)::int,
    v_dia_clamp
  );

  v_ini_hoy := v_hoy::timestamp AT TIME ZONE tz;
  v_fin_hoy := (v_hoy + 1)::timestamp AT TIME ZONE tz;
  v_ini_14 := v_desde_14::timestamp AT TIME ZONE tz;
  v_ini_mes_ts := v_ini_mes::timestamp AT TIME ZONE tz;
  v_ini_mes_ant_ts := v_ini_mes_ant::timestamp AT TIME ZONE tz;
  v_fin_mes_ant_ts := (v_mismo_dia_mes_ant + 1)::timestamp AT TIME ZONE tz;
  v_lookback := least(v_ini_mes_ant_ts, v_ini_14);

  SELECT
    coalesce(count(*) FILTER (WHERE dia = v_hoy), 0),
    coalesce(sum(total) FILTER (WHERE dia = v_hoy), 0),
    coalesce(count(*) FILTER (WHERE dia = v_ayer), 0),
    coalesce(sum(total) FILTER (WHERE dia = v_ayer), 0),
    coalesce(count(*) FILTER (WHERE created_at >= v_ini_mes_ts AND created_at < v_fin_hoy), 0),
    coalesce(sum(total) FILTER (WHERE created_at >= v_ini_mes_ts AND created_at < v_fin_hoy), 0),
    coalesce(count(*) FILTER (WHERE created_at >= v_ini_mes_ant_ts AND created_at < v_fin_mes_ant_ts), 0),
    coalesce(sum(total) FILTER (WHERE created_at >= v_ini_mes_ant_ts AND created_at < v_fin_mes_ant_ts), 0)
  INTO
    v_hoy_cant, v_hoy_monto, v_ayer_cant, v_ayer_monto,
    v_mes_cant, v_mes_monto, v_mes_ant_cant, v_mes_ant_monto
  FROM (
    SELECT
      v.total,
      v.created_at,
      (v.created_at AT TIME ZONE tz)::date AS dia
    FROM public.ventas v
    WHERE v.tienda_id = p_tienda_id
      AND v.estado = 'completada'
      AND v.created_at >= v_lookback
      AND v.created_at < v_fin_hoy
  ) s;

  SELECT
    coalesce(count(*) FILTER (WHERE created_at >= v_ini_hoy AND created_at < v_fin_hoy), 0),
    coalesce(sum(total_devuelto) FILTER (WHERE created_at >= v_ini_hoy AND created_at < v_fin_hoy), 0),
    coalesce(count(*) FILTER (WHERE created_at >= v_ini_mes_ts AND created_at < v_fin_hoy), 0),
    coalesce(sum(total_devuelto) FILTER (WHERE created_at >= v_ini_mes_ts AND created_at < v_fin_hoy), 0)
  INTO v_dev_hoy_cant, v_dev_hoy_monto, v_dev_mes_cant, v_dev_mes_monto
  FROM public.devoluciones d
  WHERE d.tienda_id = p_tienda_id
    AND d.estado = 'completada'
    AND (d.tipo_resolucion IS NULL OR d.tipo_resolucion <> 'cambio')
    AND d.created_at >= v_ini_mes_ts
    AND d.created_at < v_fin_hoy;

  SELECT coalesce(jsonb_agg(punto ORDER BY fecha), '[]'::jsonb)
  INTO v_serie
  FROM (
    SELECT
      to_char((g.ts AT TIME ZONE tz)::date, 'YYYY-MM-DD') AS fecha,
      jsonb_build_object(
        'fecha', to_char((g.ts AT TIME ZONE tz)::date, 'YYYY-MM-DD'),
        'cantidad', coalesce(a.cantidad, 0),
        'monto', coalesce(a.monto, 0)
      ) AS punto
    FROM generate_series(v_ini_14, v_ini_hoy, interval '1 day') AS g(ts)
    LEFT JOIN (
      SELECT
        (v.created_at AT TIME ZONE tz)::date AS dia,
        count(*)::int AS cantidad,
        coalesce(sum(v.total), 0) AS monto
      FROM public.ventas v
      WHERE v.tienda_id = p_tienda_id
        AND v.estado = 'completada'
        AND v.created_at >= v_ini_14
        AND v.created_at < v_fin_hoy
      GROUP BY 1
    ) a ON a.dia = (g.ts AT TIME ZONE tz)::date
  ) t;

  SELECT
    coalesce(sum(saldo_cc), 0),
    count(*)::int
  INTO v_por_cobrar_total, v_por_cobrar_clientes
  FROM public.clientes
  WHERE tienda_id = p_tienda_id
    AND saldo_cc > 0;

  SELECT count(*)::int
  INTO v_stock_bajo
  FROM public.variantes_producto
  WHERE tienda_id = p_tienda_id
    AND activo = true
    AND stock_minimo > 0
    AND stock_actual <> -1
    AND stock_actual <= stock_minimo;

  RETURN jsonb_build_object(
    'hoy', jsonb_build_object('cantidad', v_hoy_cant, 'monto', v_hoy_monto),
    'ayer', jsonb_build_object('cantidad', v_ayer_cant, 'monto', v_ayer_monto),
    'mes', jsonb_build_object('cantidad', v_mes_cant, 'monto', v_mes_monto),
    'mes_ant', jsonb_build_object('cantidad', v_mes_ant_cant, 'monto', v_mes_ant_monto),
    'devoluciones_hoy', jsonb_build_object('cantidad', v_dev_hoy_cant, 'monto', v_dev_hoy_monto),
    'devoluciones_mes', jsonb_build_object('cantidad', v_dev_mes_cant, 'monto', v_dev_mes_monto),
    'serie', coalesce(v_serie, '[]'::jsonb),
    'por_cobrar', jsonb_build_object(
      'total', v_por_cobrar_total,
      'clientes', v_por_cobrar_clientes
    ),
    'stock_bajo', v_stock_bajo
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_ganancia(p_tienda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  v_hoy date;
  v_ini_hoy timestamptz;
  v_fin_hoy timestamptz;
  v_ini_mes timestamptz;
  v_hoy_gan numeric;
  v_hoy_costo numeric;
  v_hoy_netas numeric;
  v_hoy_tiene boolean;
  v_mes_gan numeric;
  v_mes_costo numeric;
  v_mes_netas numeric;
  v_mes_tiene boolean;
  v_eg_hoy numeric;
  v_eg_mes numeric;
  v_com_hoy numeric;
  v_com_mes numeric;
BEGIN
  PERFORM public._dashboard_assert_tienda(p_tienda_id);

  v_hoy := (timezone(tz, now()))::date;
  v_ini_hoy := v_hoy::timestamp AT TIME ZONE tz;
  v_fin_hoy := (v_hoy + 1)::timestamp AT TIME ZONE tz;
  v_ini_mes := date_trunc('month', v_hoy)::date::timestamp AT TIME ZONE tz;

  SELECT ganancia, costo_total, ventas_netas, tiene_data
  INTO v_hoy_gan, v_hoy_costo, v_hoy_netas, v_hoy_tiene
  FROM public.get_ganancia_bruta_mes(p_tienda_id, v_ini_hoy, v_fin_hoy);

  SELECT ganancia, costo_total, ventas_netas, tiene_data
  INTO v_mes_gan, v_mes_costo, v_mes_netas, v_mes_tiene
  FROM public.get_ganancia_bruta_mes(p_tienda_id, v_ini_mes, v_fin_hoy);

  SELECT
    coalesce(sum(monto) FILTER (WHERE created_at >= v_ini_hoy AND created_at < v_fin_hoy), 0),
    coalesce(sum(monto) FILTER (WHERE created_at >= v_ini_mes AND created_at < v_fin_hoy), 0)
  INTO v_eg_hoy, v_eg_mes
  FROM public.movimientos_fondos
  WHERE tienda_id = p_tienda_id
    AND tipo = 'egreso'
    AND venta_id IS NULL
    AND created_at >= v_ini_mes
    AND created_at < v_fin_hoy;

  SELECT
    coalesce(sum(pv.comision_calculada) FILTER (WHERE pv.created_at >= v_ini_hoy AND pv.created_at < v_fin_hoy), 0),
    coalesce(sum(pv.comision_calculada) FILTER (WHERE pv.created_at >= v_ini_mes AND pv.created_at < v_fin_hoy), 0)
  INTO v_com_hoy, v_com_mes
  FROM public.pagos_venta pv
  JOIN public.ventas v ON v.id = pv.venta_id
  WHERE pv.tienda_id = p_tienda_id
    AND v.tienda_id = p_tienda_id
    AND v.estado = 'completada'
    AND pv.created_at >= v_ini_mes
    AND pv.created_at < v_fin_hoy;

  RETURN jsonb_build_object(
    'hoy', jsonb_build_object(
      'ganancia', coalesce(v_hoy_gan, 0),
      'costo_total', coalesce(v_hoy_costo, 0),
      'ventas_netas', coalesce(v_hoy_netas, 0),
      'tiene_data', coalesce(v_hoy_tiene, false),
      'total_egresos', coalesce(v_eg_hoy, 0),
      'total_comisiones', coalesce(v_com_hoy, 0)
    ),
    'mes', jsonb_build_object(
      'ganancia', coalesce(v_mes_gan, 0),
      'costo_total', coalesce(v_mes_costo, 0),
      'ventas_netas', coalesce(v_mes_netas, 0),
      'tiene_data', coalesce(v_mes_tiene, false),
      'total_egresos', coalesce(v_eg_mes, 0),
      'total_comisiones', coalesce(v_com_mes, 0)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_tops(
  p_tienda_id uuid,
  p_limit int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  v_hoy date;
  v_ini_mes timestamptz;
  v_fin_hoy timestamptz;
  v_limite int;
  v_productos jsonb;
  v_var1 jsonb;
BEGIN
  PERFORM public._dashboard_assert_tienda(p_tienda_id);

  v_limite := greatest(1, least(coalesce(p_limit, 5), 20));
  v_hoy := (timezone(tz, now()))::date;
  v_ini_mes := date_trunc('month', v_hoy)::date::timestamp AT TIME ZONE tz;
  v_fin_hoy := (v_hoy + 1)::timestamp AT TIME ZONE tz;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_productos
  FROM (
    SELECT
      dv.nombre_producto AS nombre,
      sum(dv.cantidad) AS unidades,
      sum(dv.total_linea) AS monto
    FROM public.detalles_venta dv
    JOIN public.ventas v ON v.id = dv.venta_id
    WHERE dv.tienda_id = p_tienda_id
      AND v.tienda_id = p_tienda_id
      AND v.estado = 'completada'
      AND v.created_at >= v_ini_mes
      AND v.created_at < v_fin_hoy
    GROUP BY dv.nombre_producto
    ORDER BY sum(dv.cantidad) DESC
    LIMIT v_limite
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_var1
  FROM (
    SELECT
      dv.talla AS valor,
      sum(dv.cantidad) AS unidades,
      sum(dv.total_linea) AS monto
    FROM public.detalles_venta dv
    JOIN public.ventas v ON v.id = dv.venta_id
    WHERE dv.tienda_id = p_tienda_id
      AND v.tienda_id = p_tienda_id
      AND v.estado = 'completada'
      AND dv.talla IS NOT NULL
      AND btrim(dv.talla) <> ''
      AND v.created_at >= v_ini_mes
      AND v.created_at < v_fin_hoy
    GROUP BY dv.talla
    ORDER BY sum(dv.cantidad) DESC
    LIMIT v_limite
  ) t;

  RETURN jsonb_build_object(
    'productos', coalesce(v_productos, '[]'::jsonb),
    'var1', coalesce(v_var1, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public._dashboard_assert_tienda(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_inicio(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_ganancia(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_tops(uuid, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_dashboard_inicio(uuid) IS
  'KPIs de Inicio (hoy/mes/serie 14d/por cobrar/stock bajo) agregados en Postgres.';
COMMENT ON FUNCTION public.get_dashboard_ganancia(uuid) IS
  'Ganancia bruta, egresos y comisiones de hoy y del mes en un solo round-trip.';
COMMENT ON FUNCTION public.get_dashboard_tops(uuid, int) IS
  'Top productos y variante 1 del mes con GROUP BY LIMIT.';
