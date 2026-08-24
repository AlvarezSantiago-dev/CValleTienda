-- Ganancia neta de un rango arbitrario (un día de /ventas).
-- Misma fórmula que get_dashboard_ganancia: margen − comisiones − egresos manuales.

CREATE OR REPLACE FUNCTION public.get_ganancia_periodo(
  p_tienda_id uuid,
  p_inicio    timestamptz,
  p_fin       timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ganancia numeric;
  v_costo numeric;
  v_netas numeric;
  v_tiene boolean;
  v_egresos numeric;
  v_comisiones numeric;
BEGIN
  PERFORM public._dashboard_assert_tienda(p_tienda_id);

  IF p_inicio IS NULL OR p_fin IS NULL OR p_fin <= p_inicio THEN
    RETURN jsonb_build_object(
      'ganancia', 0,
      'costo_total', 0,
      'ventas_netas', 0,
      'tiene_data', false,
      'total_egresos', 0,
      'total_comisiones', 0
    );
  END IF;

  SELECT ganancia, costo_total, ventas_netas, tiene_data
  INTO v_ganancia, v_costo, v_netas, v_tiene
  FROM public.get_ganancia_bruta_mes(p_tienda_id, p_inicio, p_fin);

  SELECT coalesce(sum(monto), 0)
  INTO v_egresos
  FROM public.movimientos_fondos
  WHERE tienda_id = p_tienda_id
    AND tipo = 'egreso'
    AND venta_id IS NULL
    AND created_at >= p_inicio
    AND created_at < p_fin;

  SELECT coalesce(sum(pv.comision_calculada), 0)
  INTO v_comisiones
  FROM public.pagos_venta pv
  JOIN public.ventas v ON v.id = pv.venta_id
  WHERE pv.tienda_id = p_tienda_id
    AND v.tienda_id = p_tienda_id
    AND v.estado = 'completada'
    AND pv.created_at >= p_inicio
    AND pv.created_at < p_fin;

  RETURN jsonb_build_object(
    'ganancia', coalesce(v_ganancia, 0),
    'costo_total', coalesce(v_costo, 0),
    'ventas_netas', coalesce(v_netas, 0),
    'tiene_data', coalesce(v_tiene, false),
    'total_egresos', coalesce(v_egresos, 0),
    'total_comisiones', coalesce(v_comisiones, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ganancia_periodo(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_ganancia_periodo(uuid, timestamptz, timestamptz) IS
  'Ganancia bruta, egresos y comisiones de un rango [inicio, fin). Misma fórmula que Inicio.';
