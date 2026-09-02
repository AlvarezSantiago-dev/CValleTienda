-- Tramos: % o monto ($ por presentación). Compat: filas viejas = pct.

alter table public.producto_tramos_cantidad
  add column if not exists tipo text not null default 'pct';

alter table public.producto_tramos_cantidad
  add column if not exists descuento_monto numeric(12, 2);

alter table public.producto_tramos_cantidad
  drop constraint if exists producto_tramos_cantidad_tipo_check;

alter table public.producto_tramos_cantidad
  add constraint producto_tramos_cantidad_tipo_check
  check (tipo in ('pct', 'monto'));

alter table public.producto_tramos_cantidad
  drop constraint if exists producto_tramos_cantidad_monto_check;

alter table public.producto_tramos_cantidad
  add constraint producto_tramos_cantidad_monto_check
  check (descuento_monto is null or descuento_monto >= 0);

comment on column public.producto_tramos_cantidad.tipo is
  'pct = descuento_pct sobre lista; monto = descuento_monto pesos por presentación.';

alter table public.producto_pack_tramos
  add column if not exists tipo text not null default 'pct';

alter table public.producto_pack_tramos
  add column if not exists descuento_monto numeric(12, 2);

alter table public.producto_pack_tramos
  drop constraint if exists producto_pack_tramos_tipo_check;

alter table public.producto_pack_tramos
  add constraint producto_pack_tramos_tipo_check
  check (tipo in ('pct', 'monto'));

alter table public.producto_pack_tramos
  drop constraint if exists producto_pack_tramos_monto_check;

alter table public.producto_pack_tramos
  add constraint producto_pack_tramos_monto_check
  check (descuento_monto is null or descuento_monto >= 0);

comment on column public.producto_pack_tramos.tipo is
  'pct = descuento_pct sobre lista del pack; monto = pesos off por cada pack.';
