-- =============================================================
-- MIGRATION: REVERTIR FONDOS AL ANULAR VENTA
-- Al cambiar ventas.estado a 'anulada', se registra un egreso
-- por cada pago de la venta para revertir el saldo de cada
-- cuenta de fondos involucrada.
-- =============================================================

CREATE OR REPLACE FUNCTION public.revertir_fondos_anulacion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_pago RECORD;
BEGIN
  -- Solo actuar cuando el estado cambia A 'anulada' desde cualquier otro estado
  IF NEW.estado <> 'anulada' OR OLD.estado = 'anulada' THEN
    RETURN NEW;
  END IF;

  -- Iterar sobre cada pago de la venta y registrar egreso inverso
  FOR v_pago IN
    SELECT cuenta_fondo_id, monto, nombre_metodo
    FROM public.pagos_venta
    WHERE venta_id = NEW.id
      AND cuenta_fondo_id IS NOT NULL
  LOOP
    PERFORM public.registrar_movimiento_fondo(
      p_cuenta_fondo_id => v_pago.cuenta_fondo_id,
      p_tipo            => 'egreso',
      p_concepto        => 'Anulación Venta #' || NEW.numero_ticket || ' — ' || v_pago.nombre_metodo,
      p_monto           => v_pago.monto,
      p_venta_id        => NEW.id,
      p_usuario_id      => NEW.usuario_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ventas_revertir_fondos
  AFTER UPDATE OF estado ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.revertir_fondos_anulacion();
