-- =============================================================
-- MIGRATION 003: PRODUCTOS, CATEGORÍAS, TALLAS, COLORES Y VARIANTES
-- Núcleo del catálogo de productos para tiendas de ropa.
-- Ejecutar DESPUÉS de 002_perfiles.sql
--
-- NOTA: el helper get_tienda_id() ya está definido en 002_perfiles.sql.
-- =============================================================

-- -------------------------------------------------------------
-- CATEGORÍAS
-- -------------------------------------------------------------
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  tienda_id   uuid not null references public.tiendas (id) on delete cascade,
  nombre      text not null,
  descripcion text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index categorias_tienda_id_idx on public.categorias (tienda_id);

create trigger categorias_updated_at
  before update on public.categorias
  for each row execute function public.set_updated_at();

alter table public.categorias enable row level security;

create policy "categorias_tienda_isolation"
  on public.categorias
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- TALLAS
-- -------------------------------------------------------------
create table if not exists public.tallas (
  id        uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  nombre    text not null,          -- XS, S, M, L, XL, 36, 38, Único, etc.
  orden     integer not null default 0,
  activo    boolean not null default true,
  created_at timestamptz not null default now()
);

create index tallas_tienda_id_idx on public.tallas (tienda_id);
-- Índice compuesto para ordenamiento en listados
create index tallas_tienda_orden_idx on public.tallas (tienda_id, orden);

alter table public.tallas enable row level security;

create policy "tallas_tienda_isolation"
  on public.tallas
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- COLORES
-- -------------------------------------------------------------
create table if not exists public.colores (
  id        uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  nombre    text not null,     -- Rojo, Azul marino, Off white...
  hex_color text,              -- #FF0000 (opcional, para mostrar en UI)
  activo    boolean not null default true,
  created_at timestamptz not null default now()
);

create index colores_tienda_id_idx on public.colores (tienda_id);

alter table public.colores enable row level security;

create policy "colores_tienda_isolation"
  on public.colores
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- PRODUCTOS
-- -------------------------------------------------------------
create table if not exists public.productos (
  id              uuid primary key default gen_random_uuid(),
  tienda_id       uuid not null references public.tiendas (id) on delete cascade,
  categoria_id    uuid references public.categorias (id) on delete set null,
  nombre          text not null,
  descripcion     text,
  codigo_base     text,           -- Código interno del producto (sin variante)
  precio_compra   numeric(12, 2) not null default 0,
  precio_venta    numeric(12, 2) not null,
  imagen_url      text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint productos_precio_venta_check check (precio_venta >= 0),
  constraint productos_precio_compra_check check (precio_compra >= 0)
);

-- Índices de rendimiento críticos para búsquedas en POS
create index productos_tienda_id_idx on public.productos (tienda_id);
create index productos_categoria_id_idx on public.productos (categoria_id);
create index productos_nombre_tienda_idx on public.productos (tienda_id, nombre);

-- Partial index: solo productos activos (los más buscados desde POS)
create index productos_activos_idx on public.productos (tienda_id)
  where activo = true;

create trigger productos_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

alter table public.productos enable row level security;

create policy "productos_tienda_isolation"
  on public.productos
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- VARIANTES DE PRODUCTO
-- Combinación única: producto + talla + color
-- Es la unidad mínima vendible y la que tiene stock propio.
-- -------------------------------------------------------------
create table if not exists public.variantes_producto (
  id               uuid primary key default gen_random_uuid(),
  tienda_id        uuid not null references public.tiendas (id) on delete cascade,
  producto_id      uuid not null references public.productos (id) on delete cascade,
  talla_id         uuid references public.tallas (id) on delete set null,
  color_id         uuid references public.colores (id) on delete set null,
  codigo_barras    text,           -- Código de barras escaneado en POS
  precio_venta     numeric(12, 2), -- Sobrescribe precio del producto si es distinto
  stock_actual     integer not null default 0,
  stock_minimo     integer not null default 0,  -- Para alertas de stock bajo
  activo           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Una combinación producto+talla+color debe ser única por tienda
  constraint variantes_unicas unique (tienda_id, producto_id, talla_id, color_id),
  constraint variantes_stock_check check (stock_actual >= 0)
);

-- Índice crítico para scanner de POS (la búsqueda más frecuente)
create index variantes_codigo_barras_idx on public.variantes_producto (tienda_id, codigo_barras)
  where codigo_barras is not null;

create index variantes_producto_id_idx on public.variantes_producto (producto_id);
create index variantes_tienda_id_idx on public.variantes_producto (tienda_id);

-- Partial index: solo variantes activas con stock (listado de POS)
create index variantes_con_stock_idx on public.variantes_producto (tienda_id)
  where activo = true and stock_actual > 0;

-- Covering index para consulta típica de POS (escaneo → datos de venta)
create index variantes_barcode_covering_idx
  on public.variantes_producto (codigo_barras)
  include (producto_id, talla_id, color_id, precio_venta, stock_actual, tienda_id)
  where codigo_barras is not null;

create trigger variantes_updated_at
  before update on public.variantes_producto
  for each row execute function public.set_updated_at();

alter table public.variantes_producto enable row level security;

create policy "variantes_tienda_isolation"
  on public.variantes_producto
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

comment on table public.productos is 'Catálogo base de productos. Cada producto puede tener múltiples variantes (talla/color).';
comment on table public.variantes_producto is 'Unidad mínima vendible. Tiene su propio código de barras, precio y stock.';
comment on column public.variantes_producto.codigo_barras is 'Código escaneado en POS. Debe ser único dentro de la tienda.';
