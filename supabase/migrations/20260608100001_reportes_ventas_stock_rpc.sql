-- RPCs para módulo Reportes — ventas y stock

CREATE OR REPLACE FUNCTION public.get_top_productos_mes(
  p_tienda_id uuid,
  p_anio integer,
  p_mes integer,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (nombre text, cantidad numeric, monto numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dv.nombre_producto AS nombre,
    COALESCE(SUM(dv.cantidad), 0) AS cantidad,
    COALESCE(SUM(dv.total_linea), 0) AS monto
  FROM detalles_venta dv
  JOIN ventas v ON v.id = dv.venta_id
  WHERE dv.tienda_id = p_tienda_id
    AND v.estado = 'completada'
    AND EXTRACT(YEAR FROM v.created_at)::integer = p_anio
    AND EXTRACT(MONTH FROM v.created_at)::integer = p_mes
  GROUP BY dv.nombre_producto
  ORDER BY monto DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_kpis_ventas_mes(
  p_tienda_id uuid,
  p_anio integer,
  p_mes integer
)
RETURNS TABLE (
  cantidad_ventas integer,
  ventas_netas numeric,
  ticket_promedio numeric,
  unidades_vendidas numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH v AS (
    SELECT COUNT(*)::integer AS cnt, COALESCE(SUM(total), 0) AS brutas
    FROM ventas
    WHERE tienda_id = p_tienda_id
      AND estado = 'completada'
      AND EXTRACT(YEAR FROM created_at)::integer = p_anio
      AND EXTRACT(MONTH FROM created_at)::integer = p_mes
  ),
  d AS (
    SELECT COALESCE(SUM(d.total_devuelto), 0) AS devs
    FROM devoluciones d
    WHERE d.tienda_id = p_tienda_id
      AND d.estado = 'completada'
      AND (d.tipo_resolucion IS NULL OR d.tipo_resolucion != 'cambio')
      AND EXTRACT(YEAR FROM d.created_at)::integer = p_anio
      AND EXTRACT(MONTH FROM d.created_at)::integer = p_mes
  ),
  u AS (
    SELECT COALESCE(SUM(dv.cantidad), 0) AS unidades
    FROM detalles_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    WHERE dv.tienda_id = p_tienda_id
      AND v.estado = 'completada'
      AND EXTRACT(YEAR FROM v.created_at)::integer = p_anio
      AND EXTRACT(MONTH FROM v.created_at)::integer = p_mes
  )
  SELECT
    v.cnt,
    v.brutas - d.devs,
    CASE WHEN v.cnt > 0 THEN ROUND((v.brutas - d.devs) / v.cnt, 2) ELSE 0 END,
    u.unidades
  FROM v, d, u;
$$;

CREATE OR REPLACE FUNCTION public.get_mix_pagos_mes(
  p_tienda_id uuid,
  p_anio integer,
  p_mes integer
)
RETURNS TABLE (metodo_nombre text, monto numeric, porcentaje numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      COALESCE(mp.nombre, 'Otro') AS metodo_nombre,
      SUM(pv.monto) AS monto
    FROM pagos_venta pv
    JOIN ventas v ON v.id = pv.venta_id
    LEFT JOIN metodos_pago mp ON mp.id = pv.metodo_pago_id
    WHERE pv.tienda_id = p_tienda_id
      AND v.estado = 'completada'
      AND EXTRACT(YEAR FROM v.created_at)::integer = p_anio
      AND EXTRACT(MONTH FROM v.created_at)::integer = p_mes
    GROUP BY COALESCE(mp.nombre, 'Otro')
  ),
  tot AS (SELECT COALESCE(SUM(monto), 0) AS t FROM base)
  SELECT
    b.metodo_nombre,
    b.monto,
    CASE WHEN tot.t > 0 THEN ROUND(b.monto / tot.t * 100, 1) ELSE 0 END
  FROM base b, tot
  ORDER BY b.monto DESC;
$$;

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
    COALESCE(SUM(v.stock_actual * COALESCE(p.precio_compra, 0)), 0),
    COUNT(*)::integer,
    COUNT(*) FILTER (
      WHERE v.stock_minimo > 0 AND v.stock_actual > 0 AND v.stock_actual <= v.stock_minimo
    )::integer,
    COUNT(*) FILTER (WHERE v.stock_actual <= 0)::integer
  FROM variantes_producto v
  JOIN productos p ON p.id = v.producto_id AND p.activo = true
  WHERE v.tienda_id = p_tienda_id
    AND v.activo = true;
$$;

CREATE OR REPLACE FUNCTION public.get_movimientos_stock_mes(
  p_tienda_id uuid,
  p_anio integer,
  p_mes integer
)
RETURNS TABLE (tipo text, cantidad_total numeric, cantidad_movs integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.tipo::text,
    COALESCE(SUM(ABS(m.cantidad)), 0) AS cantidad_total,
    COUNT(*)::integer AS cantidad_movs
  FROM movimientos_stock m
  WHERE m.tienda_id = p_tienda_id
    AND EXTRACT(YEAR FROM m.created_at)::integer = p_anio
    AND EXTRACT(MONTH FROM m.created_at)::integer = p_mes
  GROUP BY m.tipo
  ORDER BY cantidad_total DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_productos_mes(uuid, integer, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_kpis_ventas_mes(uuid, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_mix_pagos_mes(uuid, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_resumen(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_movimientos_stock_mes(uuid, integer, integer) TO authenticated, service_role;
