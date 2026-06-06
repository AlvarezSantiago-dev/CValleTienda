-- Migración: Revertir saldo a favor al anular una venta
-- Si una venta tenía devoluciones con tipo_resolucion='saldo_a_favor',
-- al anular esa venta hay que descontar ese crédito del cliente.

CREATE OR REPLACE FUNCTION public.revertir_saldo_favor_de_venta(
  p_venta_id  uuid,
  p_tienda_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id uuid;
  v_total_a_revertir numeric;
BEGIN
  -- Obtener el cliente de la venta
  SELECT cliente_id INTO v_cliente_id
    FROM public.ventas
   WHERE id = p_venta_id
     AND tienda_id = p_tienda_id;

  -- Si la venta no tiene cliente, no hay saldo que revertir
  IF v_cliente_id IS NULL THEN
    RETURN;
  END IF;

  -- Sumar todo lo acreditado como saldo_a_favor en devoluciones completadas de esta venta
  SELECT COALESCE(SUM(total_devuelto), 0) INTO v_total_a_revertir
    FROM public.devoluciones
   WHERE venta_id     = p_venta_id
     AND tienda_id    = p_tienda_id
     AND tipo_resolucion = 'saldo_a_favor'
     AND estado       = 'completada';

  -- Si no hay nada que revertir, salir
  IF v_total_a_revertir <= 0 THEN
    RETURN;
  END IF;

  -- Descontar el saldo, sin bajar de 0 (GREATEST evita saldo negativo)
  UPDATE public.clientes
     SET saldo_favor = GREATEST(0, saldo_favor - v_total_a_revertir)
   WHERE id        = v_cliente_id
     AND tienda_id = p_tienda_id;
END;
$$;

COMMENT ON FUNCTION public.revertir_saldo_favor_de_venta(uuid, uuid) IS
  'Al anular una venta, descuenta del saldo_favor del cliente el crédito que se había otorgado via devoluciones saldo_a_favor de esa venta.';
