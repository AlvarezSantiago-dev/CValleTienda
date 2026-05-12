-- =============================================================
-- Migración: RPC get_ganancia_bruta_mes
-- Calcula la ganancia bruta neta del mes:
--   ventas completadas - devoluciones completadas del mismo mes
-- Usa costo_unitario de detalles_venta para las devoluciones
-- (join por detalle_venta_id cuando está disponible).
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_ganancia_bruta_mes(
  p_tienda_id  uuid,
  p_inicio_mes timestamptz,
  p_fin_mes    timestamptz
)
RETURNS TABLE (
  ganancia      numeric,
  costo_total   numeric,
  ventas_netas  numeric,
  tiene_data    boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ventas_mes AS (
    -- Detalles de ventas completadas en el mes
    SELECT
      dv.cantidad,
      dv.precio_unitario,
      COALESCE(dv.costo_unitario, 0)   AS costo_unitario,
      dv.total_linea
    FROM detalles_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    WHERE dv.tienda_id  = p_tienda_id
      AND v.tienda_id   = p_tienda_id
      AND v.estado      = 'completada'
      AND v.created_at >= p_inicio_mes
      AND v.created_at  < p_fin_mes
  ),
  devueltos_mes AS (
    -- Detalles de devoluciones completadas en el mes.
    -- Intentamos recuperar el costo_unitario original desde detalles_venta.
    -- Si detalle_venta_id es null (ítem ya borrado), usamos 0 como costo.
    SELECT
      dd.cantidad,
      dd.precio_unitario,
      COALESCE(dv_orig.costo_unitario, 0) AS costo_unitario,
      dd.total_linea
    FROM detalles_devolucion dd
    JOIN devoluciones d ON d.id = dd.devolucion_id
    LEFT JOIN detalles_venta dv_orig ON dv_orig.id = dd.detalle_venta_id
    WHERE dd.tienda_id  = p_tienda_id
      AND d.tienda_id   = p_tienda_id
      AND d.estado      = 'completada'
      AND d.created_at >= p_inicio_mes
      AND d.created_at  < p_fin_mes
  ),
  ventas_agg AS (
    SELECT
      COALESCE(SUM((precio_unitario - costo_unitario) * cantidad), 0) AS ganancia,
      COALESCE(SUM(costo_unitario * cantidad), 0)                     AS costo_total,
      COALESCE(SUM(total_linea), 0)                                   AS ventas_netas,
      BOOL_OR(costo_unitario > 0)                                     AS tiene_data
    FROM ventas_mes
  ),
  dev_agg AS (
    SELECT
      COALESCE(SUM((precio_unitario - costo_unitario) * cantidad), 0) AS ganancia,
      COALESCE(SUM(costo_unitario * cantidad), 0)                     AS costo_total,
      COALESCE(SUM(total_linea), 0)                                   AS ventas_netas
    FROM devueltos_mes
  )
  SELECT
    (va.ganancia    - da.ganancia)    AS ganancia,
    (va.costo_total - da.costo_total) AS costo_total,
    (va.ventas_netas - da.ventas_netas) AS ventas_netas,
    va.tiene_data
  FROM ventas_agg va, dev_agg da;
$$;

GRANT EXECUTE ON FUNCTION public.get_ganancia_bruta_mes(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;
