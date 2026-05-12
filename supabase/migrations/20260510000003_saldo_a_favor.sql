-- Migración: Saldo a favor en devoluciones

-- Columna saldo_favor en clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS saldo_favor numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_saldo_favor_nonneg CHECK (saldo_favor >= 0);

COMMENT ON COLUMN public.clientes.saldo_favor IS 'Crédito acumulado por devoluciones para usar en futuras compras';

-- Tipo de resolución en devoluciones
ALTER TABLE public.devoluciones
  ADD COLUMN IF NOT EXISTS tipo_resolucion text NOT NULL DEFAULT 'reembolso';

COMMENT ON COLUMN public.devoluciones.tipo_resolucion IS 'reembolso | saldo_a_favor | cambio';

-- RPC para incrementar saldo a favor de forma segura
CREATE OR REPLACE FUNCTION public.incrementar_saldo_favor(
  p_cliente_id uuid,
  p_tienda_id  uuid,
  p_monto      numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que cero';
  END IF;
  UPDATE public.clientes
    SET saldo_favor = saldo_favor + p_monto
  WHERE id = p_cliente_id
    AND tienda_id = p_tienda_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
END;
$$;

-- RPC para descontar saldo a favor al pagar (usado en POS)
CREATE OR REPLACE FUNCTION public.descontar_saldo_favor(
  p_cliente_id uuid,
  p_tienda_id  uuid,
  p_monto      numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo numeric;
BEGIN
  SELECT saldo_favor INTO v_saldo
    FROM public.clientes
   WHERE id = p_cliente_id AND tienda_id = p_tienda_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
  IF v_saldo < p_monto THEN
    RAISE EXCEPTION 'Saldo insuficiente (disponible: %, solicitado: %)', v_saldo, p_monto;
  END IF;
  UPDATE public.clientes
    SET saldo_favor = saldo_favor - p_monto
  WHERE id = p_cliente_id AND tienda_id = p_tienda_id;
END;
$$;
