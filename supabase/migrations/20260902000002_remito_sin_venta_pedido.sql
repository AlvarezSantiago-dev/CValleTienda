-- Remito emitido al aceptar pedido de catálogo: venta_id queda null hasta confirmar cobro.

create unique index if not exists pedidos_catalogo_remito_id_uidx
  on public.pedidos_catalogo (remito_id)
  where remito_id is not null;

comment on column public.remitos.venta_id is
  'Venta vinculada. Null = remito de pedido de catálogo pendiente de cobro/stock.';
