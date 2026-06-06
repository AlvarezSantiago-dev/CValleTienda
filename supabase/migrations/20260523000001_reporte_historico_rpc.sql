-- RPC: get_reporte_historico_meses
-- Devuelve una fila por mes con todas las métricas financieras:
-- ventas brutas, devoluciones, ventas netas, costo, ganancia bruta,
-- egresos manuales (movimientos_fondos donde venta_id IS NULL),
-- resultado neto y margen %.

DROP FUNCTION IF EXISTS public.get_reporte_historico_meses(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_reporte_historico_meses(
  p_tienda_id  uuid,
  p_meses      integer  -- cuántos meses hacia atrás, inclusive el mes actual
)
RETURNS TABLE (
  anio              integer,
  mes               integer,
  ventas_brutas     numeric,
  cantidad_ventas   integer,
  devoluciones      numeric,
  ventas_netas      numeric,
  costo_total       numeric,
  ganancia_bruta    numeric,
  egresos_manuales  numeric,
  comisiones        numeric,
  resultado_neto    numeric,
  margen_pct        numeric,
  tiene_costos      boolean
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
      COALESCE(SUM(v.total), 0)                 AS ventas_brutas
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
      COALESCE(SUM(d.total_devuelto), 0)         AS devoluciones
    FROM devoluciones d
    WHERE d.tienda_id = p_tienda_id
      AND d.estado    = 'completada'
      AND d.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
  ),
  costos_mes AS (
    SELECT
      EXTRACT(YEAR  FROM v.created_at)::integer                             AS anio,
      EXTRACT(MONTH FROM v.created_at)::integer                             AS mes,
      COALESCE(SUM(dv.costo_unitario * dv.cantidad), 0)                     AS costo_total,
      COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0) AS ganancia_bruta,
      BOOL_OR(dv.costo_unitario > 0)                                        AS tiene_costos
    FROM detalles_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    WHERE dv.tienda_id = p_tienda_id
      AND v.estado     = 'completada'
      AND v.created_at >= date_trunc('month', now() - (p_meses - 1) * interval '1 month')
    GROUP BY 1, 2
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

GRANT EXECUTE ON FUNCTION public.get_reporte_historico_meses(uuid, integer)
  TO authenticated, service_role;
