-- El recuadro "Debe" y Por cobrar leían clientes.saldo_cc, que podía
-- desfasarse del ledger (movimientos_cc.saldo_posterior).
-- Trigger: cada movimiento deja saldo_cc = saldo_posterior.
-- Backfill: clientes con drift (caso Corina: ledger 3000, columna 9000).

CREATE OR REPLACE FUNCTION public.sync_cliente_saldo_cc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET saldo_cc = GREATEST(0, NEW.saldo_posterior),
      updated_at = now()
  WHERE id = NEW.cliente_id
    AND tienda_id = NEW.tienda_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS movimientos_cc_sync_saldo ON public.movimientos_cc;
CREATE TRIGGER movimientos_cc_sync_saldo
  AFTER INSERT ON public.movimientos_cc
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cliente_saldo_cc();

UPDATE public.clientes c
SET saldo_cc = GREATEST(0, COALESCE((
  SELECT m.saldo_posterior
  FROM public.movimientos_cc m
  WHERE m.cliente_id = c.id
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 1
), 0)),
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.movimientos_cc m WHERE m.cliente_id = c.id
)
AND c.saldo_cc IS DISTINCT FROM GREATEST(0, COALESCE((
  SELECT m.saldo_posterior
  FROM public.movimientos_cc m
  WHERE m.cliente_id = c.id
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 1
), 0));
