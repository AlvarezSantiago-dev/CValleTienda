-- =============================================================
-- Catálogo público + pedidos WhatsApp + notificaciones
-- Productos: visible_en_catalogo default false (hay que marcarlos).
-- Pedidos: no descuentan stock; el stock baja al convertir a venta
-- (confirmar envío/retiro luego de gestionar).
-- =============================================================

-- -------------------------------------------------------------
-- TIENDAS: config del catálogo
-- -------------------------------------------------------------
alter table public.tiendas
  add column if not exists catalogo_slug text,
  add column if not exists catalogo_activo boolean not null default false,
  add column if not exists whatsapp_pedidos text,
  add column if not exists catalogo_retiro boolean not null default true,
  add column if not exists catalogo_envio boolean not null default true,
  add column if not exists catalogo_mensaje_bienvenida text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tiendas_catalogo_slug_format'
  ) then
    alter table public.tiendas
      add constraint tiendas_catalogo_slug_format
      check (
        catalogo_slug is null
        or (
          catalogo_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
          and char_length(catalogo_slug) between 3 and 48
        )
      );
  end if;
end $$;

create unique index if not exists tiendas_catalogo_slug_uidx
  on public.tiendas (catalogo_slug)
  where catalogo_slug is not null;

comment on column public.tiendas.catalogo_slug is 'Slug único para URL pública /c/{slug}';
comment on column public.tiendas.catalogo_activo is 'Si false, /c/{slug} responde 404';
comment on column public.tiendas.whatsapp_pedidos is 'Dígitos internacionales (549…) para wa.me de pedidos';

-- -------------------------------------------------------------
-- PRODUCTOS: opt-in al catálogo (default apagado)
-- -------------------------------------------------------------
alter table public.productos
  add column if not exists visible_en_catalogo boolean not null default false;

create index if not exists productos_catalogo_visible_idx
  on public.productos (tienda_id)
  where visible_en_catalogo = true and activo = true;

comment on column public.productos.visible_en_catalogo is
  'Si true, el producto aparece en el catálogo público. Default false.';

-- -------------------------------------------------------------
-- PEDIDOS DE CATÁLOGO
-- -------------------------------------------------------------
create table if not exists public.pedidos_catalogo (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  numero integer not null,
  estado text not null default 'nuevo'
    check (estado in (
      'nuevo', 'visto', 'confirmado', 'listo', 'entregado', 'cancelado', 'convertido'
    )),
  cliente_nombre text not null,
  cliente_telefono text not null,
  cliente_id uuid references public.clientes (id) on delete set null,
  tipo_entrega text not null check (tipo_entrega in ('retiro', 'envio')),
  direccion_entrega text,
  notas text,
  subtotal numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  venta_id uuid references public.ventas (id) on delete set null,
  remito_id uuid references public.remitos (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tienda_id, numero)
);

create index if not exists pedidos_catalogo_tienda_created_idx
  on public.pedidos_catalogo (tienda_id, created_at desc);
create index if not exists pedidos_catalogo_tienda_estado_idx
  on public.pedidos_catalogo (tienda_id, estado);
create index if not exists pedidos_catalogo_cliente_id_idx
  on public.pedidos_catalogo (cliente_id)
  where cliente_id is not null;
create index if not exists pedidos_catalogo_venta_id_idx
  on public.pedidos_catalogo (venta_id)
  where venta_id is not null;

drop trigger if exists pedidos_catalogo_updated_at on public.pedidos_catalogo;
create trigger pedidos_catalogo_updated_at
  before update on public.pedidos_catalogo
  for each row execute function public.set_updated_at();

comment on table public.pedidos_catalogo is
  'Pedidos del catálogo público. Stock no se mueve aquí; baja al convertir a venta.';

-- -------------------------------------------------------------
-- ÍTEMS (snapshots)
-- -------------------------------------------------------------
create table if not exists public.pedido_catalogo_items (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  pedido_id uuid not null references public.pedidos_catalogo (id) on delete cascade,
  variante_id uuid references public.variantes_producto (id) on delete set null,
  producto_nombre text not null,
  talla text,
  color text,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null,
  total_linea numeric(12, 2) not null,
  imagen_url text
);

create index if not exists pedido_catalogo_items_pedido_idx
  on public.pedido_catalogo_items (pedido_id);
create index if not exists pedido_catalogo_items_tienda_idx
  on public.pedido_catalogo_items (tienda_id);
create index if not exists pedido_catalogo_items_variante_idx
  on public.pedido_catalogo_items (variante_id)
  where variante_id is not null;

-- -------------------------------------------------------------
-- NOTIFICACIONES IN-APP
-- -------------------------------------------------------------
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  tipo text not null default 'pedido_catalogo',
  titulo text not null,
  cuerpo text,
  leida boolean not null default false,
  pedido_id uuid references public.pedidos_catalogo (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists notificaciones_tienda_leida_idx
  on public.notificaciones (tienda_id, leida, created_at desc);
create index if not exists notificaciones_pedido_idx
  on public.notificaciones (pedido_id)
  where pedido_id is not null;

comment on table public.notificaciones is 'Avisos in-app por tienda (v1: nuevo pedido de catálogo).';

-- -------------------------------------------------------------
-- RLS — solo tenant autenticado. Anon NO lee/escribe estas tablas.
-- El POST público usa service role.
-- -------------------------------------------------------------
alter table public.pedidos_catalogo enable row level security;
alter table public.pedido_catalogo_items enable row level security;
alter table public.notificaciones enable row level security;

drop policy if exists pedidos_catalogo_tienda_isolation on public.pedidos_catalogo;
create policy pedidos_catalogo_tienda_isolation
  on public.pedidos_catalogo
  for all
  to authenticated
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

drop policy if exists pedido_catalogo_items_tienda_isolation on public.pedido_catalogo_items;
create policy pedido_catalogo_items_tienda_isolation
  on public.pedido_catalogo_items
  for all
  to authenticated
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

drop policy if exists notificaciones_tienda_isolation on public.notificaciones;
create policy notificaciones_tienda_isolation
  on public.notificaciones
  for all
  to authenticated
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

grant select, insert, update, delete on public.pedidos_catalogo to authenticated;
grant select, insert, update, delete on public.pedido_catalogo_items to authenticated;
grant select, insert, update, delete on public.notificaciones to authenticated;
