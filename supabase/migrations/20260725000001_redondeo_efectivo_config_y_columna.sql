-- Redondeo efectivo a $100: config por tienda + trazabilidad en ventas.
-- El monto NO altera ventas.total ni margen de producto; es plata retenida en caja
-- por no devolver vuelto en monedas/billetes chicos.
-- Política de producto (2026-07-28): NO mostrar en ticket al cliente.

alter table public.configuracion_tienda
  add column if not exists redondeo_efectivo_activo boolean not null default true;

comment on column public.configuracion_tienda.redondeo_efectivo_activo is
  'Si true, el vuelto en efectivo solo se entrega en múltiplos de $100; el resto queda en caja. No modifica el total de la venta.';

alter table public.ventas
  add column if not exists redondeo_efectivo_monto numeric(14, 2) not null default 0;

comment on column public.ventas.redondeo_efectivo_monto is
  'Monto retenido en caja por redondeo de vuelto (no se entrega al cliente). No altera total ni ganancia de producto. Uso interno; no imprimir en ticket.';

create index if not exists ventas_sesion_redondeo_idx
  on public.ventas (sesion_caja_id)
  where redondeo_efectivo_monto > 0;
