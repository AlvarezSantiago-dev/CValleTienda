-- Tramos de descuento por cantidad, condición al convertir pedido, medio de cobro CC.

-- -------------------------------------------------------------
-- PRODUCTO: tramos (desde N unidades → X %)
-- -------------------------------------------------------------
create table if not exists public.producto_tramos_cantidad (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  cantidad_desde numeric(12, 3) not null check (cantidad_desde > 0),
  descuento_pct numeric(6, 2) not null check (descuento_pct >= 0 and descuento_pct <= 100),
  unique (producto_id, cantidad_desde)
);

create index if not exists producto_tramos_cantidad_producto_idx
  on public.producto_tramos_cantidad (producto_id);

create index if not exists producto_tramos_cantidad_tienda_idx
  on public.producto_tramos_cantidad (tienda_id);

comment on table public.producto_tramos_cantidad is
  'Descuento % por cantidad a nivel producto. Gana el mayor cantidad_desde <= qty; no se apilan.';

alter table public.producto_tramos_cantidad enable row level security;

drop policy if exists producto_tramos_cantidad_tienda_isolation on public.producto_tramos_cantidad;
create policy producto_tramos_cantidad_tienda_isolation
  on public.producto_tramos_cantidad
  for all
  to authenticated
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

grant select, insert, update, delete on public.producto_tramos_cantidad to authenticated;

-- -------------------------------------------------------------
-- PEDIDO CATÁLOGO: condición elegida al convertir (no en la vitrina)
-- -------------------------------------------------------------
alter table public.pedidos_catalogo
  add column if not exists condicion_pago text not null default 'contado';

alter table public.pedidos_catalogo
  drop constraint if exists pedidos_catalogo_condicion_pago_check;
alter table public.pedidos_catalogo
  add constraint pedidos_catalogo_condicion_pago_check
  check (condicion_pago in ('contado', 'cuenta_corriente'));

comment on column public.pedidos_catalogo.condicion_pago is
  'Contado o cuenta corriente. Lo elige el comercio al convertir, no el visitante.';

-- -------------------------------------------------------------
-- LEDGER CC: medio de pago del cobro (para el recibo)
-- -------------------------------------------------------------
alter table public.movimientos_cc
  add column if not exists medio_pago text;

comment on column public.movimientos_cc.medio_pago is
  'Nombre del método o cuenta (Efectivo, Transferencia). Solo en tipo pago.';
