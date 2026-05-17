-- ─── Migración: Remito — cobro, tipo, items propios y CRM ────────────────────
-- Fecha: 2026-05-17

-- 1. Columnas nuevas en remitos
ALTER TABLE public.remitos
  ADD COLUMN IF NOT EXISTS tipo          text NOT NULL DEFAULT 'entrega'
    CHECK (tipo IN ('entrega', 'cuenta_corriente')),
  ADD COLUMN IF NOT EXISTS cliente_id    uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS monto_total   numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_cobrado numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_cobro  text NOT NULL DEFAULT 'no_aplica'
    CHECK (estado_cobro IN ('no_aplica', 'pendiente', 'cobrado')),
  ADD COLUMN IF NOT EXISTS fecha_cobro   date;

CREATE INDEX IF NOT EXISTS remitos_cliente_id_idx   ON public.remitos(cliente_id);
CREATE INDEX IF NOT EXISTS remitos_estado_cobro_idx ON public.remitos(estado_cobro);

-- 2. Tabla de ítems propios del remito (para remitos sin venta_id)
CREATE TABLE IF NOT EXISTS public.remito_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  remito_id       uuid          NOT NULL REFERENCES public.remitos(id) ON DELETE CASCADE,
  tienda_id       uuid          NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  nombre_producto text          NOT NULL,
  talla           text,
  color           text,
  cantidad        integer       NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario numeric(12,2) NOT NULL DEFAULT 0,
  total_linea     numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS remito_items_remito_id_idx ON public.remito_items(remito_id);

ALTER TABLE public.remito_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remito_items_policy ON public.remito_items;
CREATE POLICY remito_items_policy ON public.remito_items
  USING  (tienda_id = get_tienda_id())
  WITH CHECK (tienda_id = get_tienda_id());
