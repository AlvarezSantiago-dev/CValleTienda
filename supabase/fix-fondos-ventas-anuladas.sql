-- =============================================================
-- ONE-TIME FIX: Revertir fondos de ventas ya anuladas
-- Ejecutar UNA SOLA VEZ después de aplicar la migración
-- 20260522000002_revertir_fondos_anulacion.sql
--
-- Esto corrige los saldos de ventas que fueron anuladas
-- ANTES de que existiera el trigger de reversión de fondos.
-- =============================================================

DO $$
DECLARE
  v_venta  RECORD;
  v_pago   RECORD;
BEGIN
  -- Iterar sobre todas las ventas anuladas de cada tienda
  FOR v_venta IN
    SELECT id, tienda_id, numero_ticket, usuario_id
    FROM public.ventas
    WHERE estado = 'anulada'
  LOOP
    -- Para cada pago de esa venta, revertir el fondo
    FOR v_pago IN
      SELECT cuenta_fondo_id, monto, nombre_metodo
      FROM public.pagos_venta
      WHERE venta_id = v_venta.id
        AND cuenta_fondo_id IS NOT NULL
    LOOP
      -- Solo revertir si no existe ya un movimiento de anulación para evitar duplicar
      IF NOT EXISTS (
        SELECT 1 FROM public.movimientos_fondos
        WHERE venta_id = v_venta.id
          AND tipo = 'egreso'
          AND concepto LIKE 'Anulación Venta #%'
      ) THEN
        PERFORM public.registrar_movimiento_fondo(
          p_cuenta_fondo_id => v_pago.cuenta_fondo_id,
          p_tipo            => 'egreso',
          p_concepto        => 'Anulación Venta #' || v_venta.numero_ticket || ' — ' || v_pago.nombre_metodo || ' (corrección retroactiva)',
          p_monto           => v_pago.monto,
          p_venta_id        => v_venta.id,
          p_usuario_id      => v_venta.usuario_id
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
