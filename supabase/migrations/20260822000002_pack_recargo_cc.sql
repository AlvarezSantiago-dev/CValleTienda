-- Recargo a cuenta por pack (NULL = hereda el del producto / default de tienda).

ALTER TABLE public.producto_packs
  ADD COLUMN IF NOT EXISTS recargo_cc_pct numeric(6, 2);

ALTER TABLE public.producto_packs
  DROP CONSTRAINT IF EXISTS producto_packs_recargo_cc_pct_check;

ALTER TABLE public.producto_packs
  ADD CONSTRAINT producto_packs_recargo_cc_pct_check
  CHECK (recargo_cc_pct IS NULL OR recargo_cc_pct >= 0);

COMMENT ON COLUMN public.producto_packs.recargo_cc_pct IS
  'Recargo % a cuenta para este pack. NULL = usa recargo del producto o recargo_cc_default de la tienda.';
