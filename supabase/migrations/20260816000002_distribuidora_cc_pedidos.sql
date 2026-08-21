-- Pedidos a cuenta: recargo por producto, ledger de deuda, condición de venta.

-- Producto
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS recargo_cc_pct numeric(6,2);

ALTER TABLE public.productos
  DROP CONSTRAINT IF EXISTS productos_recargo_cc_pct_check;
ALTER TABLE public.productos
  ADD CONSTRAINT productos_recargo_cc_pct_check
  CHECK (recargo_cc_pct IS NULL OR recargo_cc_pct >= 0);

COMMENT ON COLUMN public.productos.recargo_cc_pct IS
  'Recargo % sobre precio_venta cuando el pedido es a cuenta. NULL = usa recargo_cc_default de la tienda.';

-- Tienda
ALTER TABLE public.configuracion_tienda
  ADD COLUMN IF NOT EXISTS recargo_cc_default numeric(6,2) NOT NULL DEFAULT 0;

ALTER TABLE public.configuracion_tienda
  DROP CONSTRAINT IF EXISTS configuracion_recargo_cc_default_check;
ALTER TABLE public.configuracion_tienda
  ADD CONSTRAINT configuracion_recargo_cc_default_check
  CHECK (recargo_cc_default >= 0);

-- Cliente (deuda: me deben)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS saldo_cc numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_cc numeric(14,2),
  ADD COLUMN IF NOT EXISTS cuit text;

ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_saldo_cc_nonneg;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_saldo_cc_nonneg CHECK (saldo_cc >= 0);

COMMENT ON COLUMN public.clientes.saldo_cc IS
  'Deuda de cuenta corriente (me deben). Distinto de saldo_favor (crédito por devolución).';

CREATE INDEX IF NOT EXISTS clientes_tienda_deuda_idx
  ON public.clientes (tienda_id)
  WHERE saldo_cc > 0;

-- Venta
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS condicion_pago text NOT NULL DEFAULT 'contado',
  ADD COLUMN IF NOT EXISTS monto_cc numeric(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_condicion_pago_check;
ALTER TABLE public.ventas ADD CONSTRAINT ventas_condicion_pago_check
  CHECK (condicion_pago IN ('contado', 'cuenta_corriente'));

ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_monto_cc_nonneg;
ALTER TABLE public.ventas ADD CONSTRAINT ventas_monto_cc_nonneg CHECK (monto_cc >= 0);

CREATE INDEX IF NOT EXISTS ventas_tienda_monto_cc_idx
  ON public.ventas (tienda_id)
  WHERE monto_cc > 0;

-- Ledger
CREATE TABLE IF NOT EXISTS public.movimientos_cc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id uuid NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('cargo', 'pago', 'ajuste')),
  monto numeric(14,2) NOT NULL CHECK (monto > 0),
  saldo_anterior numeric(14,2) NOT NULL,
  saldo_posterior numeric(14,2) NOT NULL,
  concepto text,
  venta_id uuid REFERENCES public.ventas(id) ON DELETE SET NULL,
  remito_id uuid REFERENCES public.remitos(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movimientos_cc_cliente_idx
  ON public.movimientos_cc (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS movimientos_cc_tienda_idx
  ON public.movimientos_cc (tienda_id, created_at DESC);
CREATE INDEX IF NOT EXISTS movimientos_cc_venta_idx
  ON public.movimientos_cc (venta_id)
  WHERE venta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS movimientos_cc_remito_idx
  ON public.movimientos_cc (remito_id)
  WHERE remito_id IS NOT NULL;

ALTER TABLE public.movimientos_cc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS movimientos_cc_tienda_isolation ON public.movimientos_cc;
CREATE POLICY movimientos_cc_tienda_isolation ON public.movimientos_cc
  FOR ALL
  USING (tienda_id = (SELECT public.get_tienda_id()))
  WITH CHECK (tienda_id = (SELECT public.get_tienda_id()));

CREATE OR REPLACE FUNCTION public.registrar_movimiento_cc(
  p_tienda_id  uuid,
  p_cliente_id uuid,
  p_tipo       text,
  p_monto      numeric,
  p_concepto   text DEFAULT NULL,
  p_venta_id   uuid DEFAULT NULL,
  p_remito_id  uuid DEFAULT NULL,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tienda_auth uuid;
  v_saldo       numeric;
  v_nuevo       numeric;
BEGIN
  IF p_tipo NOT IN ('cargo', 'pago', 'ajuste') THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que cero';
  END IF;

  v_tienda_auth := (SELECT public.get_tienda_id());
  IF v_tienda_auth IS NULL OR v_tienda_auth IS DISTINCT FROM p_tienda_id THEN
    RAISE EXCEPTION 'Tienda no autorizada';
  END IF;

  SELECT saldo_cc INTO v_saldo
  FROM public.clientes
  WHERE id = p_cliente_id
    AND tienda_id = p_tienda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  IF p_tipo = 'cargo' THEN
    v_nuevo := v_saldo + p_monto;
  ELSE
    v_nuevo := v_saldo - p_monto;
    IF v_nuevo < 0 THEN
      RAISE EXCEPTION 'Pago mayor a la deuda (disponible: %, solicitado: %)', v_saldo, p_monto;
    END IF;
  END IF;

  UPDATE public.clientes
  SET saldo_cc = v_nuevo, updated_at = now()
  WHERE id = p_cliente_id AND tienda_id = p_tienda_id;

  INSERT INTO public.movimientos_cc (
    tienda_id, cliente_id, tipo, monto,
    saldo_anterior, saldo_posterior, concepto,
    venta_id, remito_id, usuario_id
  ) VALUES (
    p_tienda_id, p_cliente_id, p_tipo, p_monto,
    v_saldo, v_nuevo, p_concepto,
    p_venta_id, p_remito_id, p_usuario_id
  );

  RETURN v_nuevo;
END;
$$;

COMMENT ON FUNCTION public.registrar_movimiento_cc IS
  'Cargo/pago/ajuste atómico de cuenta corriente. saldo_cc = deuda (me deben).';

REVOKE ALL ON FUNCTION public.registrar_movimiento_cc(uuid, uuid, text, numeric, text, uuid, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_cc(uuid, uuid, text, numeric, text, uuid, uuid, uuid)
  TO authenticated;

-- Backfill: remitos CC pendientes con cliente → un cargo por remito
INSERT INTO public.movimientos_cc (
  tienda_id, cliente_id, tipo, monto,
  saldo_anterior, saldo_posterior, concepto, remito_id
)
SELECT
  r.tienda_id,
  r.cliente_id,
  'cargo',
  (r.monto_total - COALESCE(r.monto_cobrado, 0)),
  0,
  (r.monto_total - COALESCE(r.monto_cobrado, 0)),
  'Remito #' || r.numero_remito::text || ' pendiente (migración)',
  r.id
FROM public.remitos r
WHERE r.tipo = 'cuenta_corriente'
  AND r.estado_cobro = 'pendiente'
  AND r.estado IS DISTINCT FROM 'anulado'
  AND r.cliente_id IS NOT NULL
  AND (r.monto_total - COALESCE(r.monto_cobrado, 0)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.movimientos_cc m WHERE m.remito_id = r.id
  );

UPDATE public.clientes c
SET saldo_cc = GREATEST(0, COALESCE((
  SELECT
    COALESCE(SUM(CASE WHEN m.tipo = 'cargo' THEN m.monto ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN m.tipo IN ('pago', 'ajuste') THEN m.monto ELSE 0 END), 0)
  FROM public.movimientos_cc m
  WHERE m.cliente_id = c.id
), 0));
