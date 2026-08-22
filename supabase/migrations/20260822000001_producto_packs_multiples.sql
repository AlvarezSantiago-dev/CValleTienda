-- Packs N por producto (x8, x24…) + tramos por pack + snapshot en ítems de pedido.

-- -------------------------------------------------------------
-- PRODUCTO: packs
-- -------------------------------------------------------------
create table if not exists public.producto_packs (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  unidades integer not null check (unidades > 1),
  precio numeric(12, 2) not null check (precio > 0),
  codigo_barras text,
  imagen_url text,
  nombre text,
  orden integer not null default 0,
  unique (producto_id, unidades)
);

create index if not exists producto_packs_producto_idx
  on public.producto_packs (producto_id);

create index if not exists producto_packs_tienda_idx
  on public.producto_packs (tienda_id);

create unique index if not exists producto_packs_codigo_barras_unique_idx
  on public.producto_packs (tienda_id, codigo_barras)
  where codigo_barras is not null;

comment on table public.producto_packs is
  'Presentaciones pack/caja a nivel producto. Todas las variantes heredan los mismos packs.';

-- -------------------------------------------------------------
-- PACK: tramos (desde N packs → X %)
-- -------------------------------------------------------------
create table if not exists public.producto_pack_tramos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  pack_id uuid not null references public.producto_packs (id) on delete cascade,
  cantidad_desde numeric(12, 3) not null check (cantidad_desde > 0),
  descuento_pct numeric(6, 2) not null check (descuento_pct >= 0 and descuento_pct <= 100),
  unique (pack_id, cantidad_desde)
);

create index if not exists producto_pack_tramos_pack_idx
  on public.producto_pack_tramos (pack_id);

create index if not exists producto_pack_tramos_tienda_idx
  on public.producto_pack_tramos (tienda_id);

comment on table public.producto_pack_tramos is
  'Descuento % por cantidad de ese pack. Gana el mayor cantidad_desde <= qty; no se apilan.';

-- -------------------------------------------------------------
-- PEDIDO: snapshot pack
-- -------------------------------------------------------------
alter table public.pedido_catalogo_items
  add column if not exists pack_id uuid references public.producto_packs (id) on delete set null;

alter table public.pedido_catalogo_items
  add column if not exists pack_unidades integer;

create index if not exists pedido_catalogo_items_pack_idx
  on public.pedido_catalogo_items (pack_id)
  where pack_id is not null;

comment on column public.pedido_catalogo_items.pack_id is
  'Pack vendido (null = unidad suelta).';
comment on column public.pedido_catalogo_items.pack_unidades is
  'Unidades físicas por pack al momento del pedido.';

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
alter table public.producto_packs enable row level security;
alter table public.producto_pack_tramos enable row level security;

drop policy if exists producto_packs_tienda_isolation on public.producto_packs;
create policy producto_packs_tienda_isolation
  on public.producto_packs
  for all
  to authenticated
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

drop policy if exists producto_pack_tramos_tienda_isolation on public.producto_pack_tramos;
create policy producto_pack_tramos_tienda_isolation
  on public.producto_pack_tramos
  for all
  to authenticated
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

grant select, insert, update, delete on public.producto_packs to authenticated;
grant select, insert, update, delete on public.producto_pack_tramos to authenticated;

-- -------------------------------------------------------------
-- Códigos únicos: variante ↔ pack de producto
-- -------------------------------------------------------------
create or replace function public.validar_codigos_barras_variante()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  codigo text;
begin
  if new.codigo_barras is not null
     and new.pack_codigo_barras is not null
     and new.codigo_barras = new.pack_codigo_barras then
    raise exception 'El código de unidad y el código de pack deben ser diferentes'
      using errcode = '23505';
  end if;

  foreach codigo in array array[new.codigo_barras, new.pack_codigo_barras]
  loop
    if codigo is null then
      continue;
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(new.tienda_id::text || ':' || codigo, 0)
    );

    if exists (
      select 1
      from public.variantes_producto vp
      where vp.tienda_id = new.tienda_id
        and vp.id <> new.id
        and (vp.codigo_barras = codigo or vp.pack_codigo_barras = codigo)
    ) then
      raise exception 'El código de barras % ya está asociado a otra variante', codigo
        using errcode = '23505';
    end if;

    -- Unidad no puede coincidir con un pack de producto.
    -- pack_codigo_barras del mismo producto sí (legado 1:1 + producto_packs).
    if exists (
      select 1
      from public.producto_packs pp
      where pp.tienda_id = new.tienda_id
        and pp.codigo_barras = codigo
        and (
          codigo = new.codigo_barras
          or pp.producto_id <> new.producto_id
        )
    ) then
      raise exception 'El código de barras % ya está asociado a un pack', codigo
        using errcode = '23505';
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.validar_codigos_barras_producto_pack()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo_barras is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.tienda_id::text || ':' || new.codigo_barras, 0)
  );

  -- No pisar un código de unidad. pack_codigo_barras del mismo producto es el legado 1:1.
  if exists (
    select 1
    from public.variantes_producto vp
    where vp.tienda_id = new.tienda_id
      and vp.codigo_barras = new.codigo_barras
  ) then
    raise exception 'El código de barras % ya está asociado a una variante', new.codigo_barras
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.variantes_producto vp
    where vp.tienda_id = new.tienda_id
      and vp.pack_codigo_barras = new.codigo_barras
      and vp.producto_id <> new.producto_id
  ) then
    raise exception 'El código de barras % ya está asociado a una variante', new.codigo_barras
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.producto_packs pp
    where pp.tienda_id = new.tienda_id
      and pp.id <> new.id
      and pp.codigo_barras = new.codigo_barras
  ) then
    raise exception 'El código de barras % ya está asociado a otro pack', new.codigo_barras
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_codigos_barras_producto_pack_trigger
  on public.producto_packs;

create trigger validar_codigos_barras_producto_pack_trigger
before insert or update of codigo_barras, tienda_id
on public.producto_packs
for each row
execute function public.validar_codigos_barras_producto_pack();

-- -------------------------------------------------------------
-- Backfill desde pack 1:1 de variante
-- -------------------------------------------------------------
insert into public.producto_packs (
  tienda_id, producto_id, unidades, precio, codigo_barras, nombre, orden
)
select distinct on (v.producto_id, v.pack_cantidad)
  v.tienda_id,
  v.producto_id,
  v.pack_cantidad,
  v.pack_precio,
  case
    when v.pack_codigo_barras is null then null
    when exists (
      select 1
      from public.variantes_producto u
      where u.tienda_id = v.tienda_id
        and u.codigo_barras = v.pack_codigo_barras
    ) then null
    else v.pack_codigo_barras
  end,
  null,
  0
from public.variantes_producto v
where v.pack_habilitado = true
  and v.pack_cantidad is not null
  and v.pack_cantidad > 1
  and v.pack_precio is not null
  and v.pack_precio > 0
order by v.producto_id, v.pack_cantidad, v.id
on conflict (producto_id, unidades) do nothing;
