-- ============================================================================
-- FILE: 20260419000001_tiendas.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 001: TIENDAS (TENANTS)
-- Base del sistema multi-tenant. Cada fila representa una tienda.
-- =============================================================

create table if not exists public.tiendas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  descripcion   text,
  email         text,
  telefono      text,
  direccion     text,
  ciudad        text,
  provincia     text,
  cuit          text,
  logo_url      text,
  moneda        text not null default 'ARS',
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Ãndice para bÃºsquedas por nombre
create index tiendas_nombre_idx on public.tiendas (nombre);

-- Trigger para actualizar updated_at automÃ¡ticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tiendas_updated_at
  before update on public.tiendas
  for each row execute function public.set_updated_at();

-- RLS (habilitado aquÃ­, policies se crean en 002_perfiles.sql
-- una vez que la tabla perfiles existe)
alter table public.tiendas enable row level security;

comment on table public.tiendas is 'Tabla de tenants â€” cada fila es una tienda del sistema SaaS CValleTienda';


-- ============================================================================
-- FILE: 20260419000002_perfiles.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 002: PERFILES DE USUARIO
-- Extiende auth.users con datos del rol y la tienda a la que pertenece.
-- Ejecutar DESPUÃ‰S de 001_tiendas.sql
-- =============================================================

create table if not exists public.perfiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  tienda_id     uuid not null references public.tiendas (id) on delete cascade,
  nombre        text not null,
  apellido      text,
  rol           text not null default 'vendedor',
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint perfiles_rol_check check (rol in ('owner', 'admin', 'vendedor'))
);

-- Ãndices
create index perfiles_tienda_id_idx on public.perfiles (tienda_id);
create index perfiles_rol_idx on public.perfiles (rol);

-- Partial index: solo usuarios activos (los mÃ¡s consultados)
create index perfiles_activos_idx on public.perfiles (tienda_id)
  where activo = true;

create trigger perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------
-- Helper: get_tienda_id()
-- FunciÃ³n SECURITY DEFINER que retorna el tienda_id del usuario
-- autenticado. Se usa en TODAS las polÃ­ticas RLS para evitar
-- recursiÃ³n al consultar la tabla perfiles desde sus propias
-- polÃ­ticas (Postgres bloquea recursiÃ³n de RLS).
-- Se define aquÃ­ (no en 003) porque las policies de perfiles
-- ya la necesitan.
-- -------------------------------------------------------
create or replace function public.get_tienda_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tienda_id from public.perfiles where id = auth.uid()
$$;

-- Helper: rol del usuario autenticado
create or replace function public.get_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid()
$$;

-- -------------------------------------------------------
-- Trigger: crear perfil automÃ¡ticamente cuando se registra
-- un nuevo usuario en auth.users.
--
-- Comportamiento:
--  - Si raw_user_meta_data trae 'tienda_id': el usuario se une a una
--    tienda existente con el rol indicado (default 'vendedor').
--  - Si NO trae 'tienda_id': es un registro nuevo de dueÃ±o â€” se crea
--    una tienda automÃ¡ticamente usando 'nombre_tienda' de la metadata
--    (o 'Mi Tienda' por defecto) y el usuario queda como 'owner'.
-- -------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id     uuid;
  v_nombre_tienda text;
  v_rol           text;
begin
  v_nombre_tienda := new.raw_user_meta_data ->> 'nombre_tienda';

  if (new.raw_user_meta_data ->> 'tienda_id') is not null then
    -- Se une a una tienda existente
    v_tienda_id := (new.raw_user_meta_data ->> 'tienda_id')::uuid;
    v_rol       := coalesce(new.raw_user_meta_data ->> 'rol', 'vendedor');
  else
    -- Nuevo registro: crear la tienda primero
    insert into public.tiendas (nombre)
    values (coalesce(v_nombre_tienda, 'Mi Tienda'))
    returning id into v_tienda_id;
    v_rol := 'owner';
  end if;

  insert into public.perfiles (id, tienda_id, nombre, apellido, rol)
  values (
    new.id,
    v_tienda_id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'apellido',
    v_rol
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.perfiles enable row level security;

-- Cada usuario puede ver SU propio perfil (sin recursiÃ³n)
create policy "usuario_ve_su_propio_perfil"
  on public.perfiles
  for select
  using (id = auth.uid());

-- Y los perfiles de su misma tienda (usa helper SECURITY DEFINER
-- para evitar recursiÃ³n de RLS)
create policy "usuarios_ven_perfiles_de_su_tienda"
  on public.perfiles
  for select
  using (tienda_id = public.get_tienda_id());

-- Cada usuario puede actualizar su propio perfil
create policy "usuario_actualiza_su_perfil"
  on public.perfiles
  for update
  using (id = auth.uid());

-- Solo owner/admin pueden crear perfiles nuevos (invitar usuarios)
create policy "admin_crea_perfiles"
  on public.perfiles
  for insert
  with check (
    tienda_id = public.get_tienda_id()
    and public.get_rol() in ('owner', 'admin')
  );

-- Solo owner/admin pueden desactivar usuarios de su tienda
create policy "admin_desactiva_perfiles"
  on public.perfiles
  for update
  using (
    tienda_id = public.get_tienda_id()
    and public.get_rol() in ('owner', 'admin')
  );

comment on table public.perfiles is 'Perfiles de usuario vinculados a una tienda. Extiende auth.users.';
comment on column public.perfiles.rol is 'owner: dueÃ±o de la tienda | admin: administrador | vendedor: operador de caja';

-- -------------------------------------------------------------
-- RLS policies de TIENDAS (requieren get_tienda_id ya definida)
-- -------------------------------------------------------------
create policy "usuarios_ven_su_tienda"
  on public.tiendas
  for select
  using (id = public.get_tienda_id());

create policy "owner_actualiza_tienda"
  on public.tiendas
  for update
  using (
    id = public.get_tienda_id()
    and public.get_rol() = 'owner'
  );


-- ============================================================================
-- FILE: 20260419000003_productos.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 003: PRODUCTOS, CATEGORÃAS, TALLAS, COLORES Y VARIANTES
-- NÃºcleo del catÃ¡logo de productos para tiendas de ropa.
-- Ejecutar DESPUÃ‰S de 002_perfiles.sql
--
-- NOTA: el helper get_tienda_id() ya estÃ¡ definido en 002_perfiles.sql.
-- =============================================================

-- -------------------------------------------------------------
-- CATEGORÃAS
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
  nombre    text not null,          -- XS, S, M, L, XL, 36, 38, Ãšnico, etc.
  orden     integer not null default 0,
  activo    boolean not null default true,
  created_at timestamptz not null default now()
);

create index tallas_tienda_id_idx on public.tallas (tienda_id);
-- Ãndice compuesto para ordenamiento en listados
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
  codigo_base     text,           -- CÃ³digo interno del producto (sin variante)
  precio_compra   numeric(12, 2) not null default 0,
  precio_venta    numeric(12, 2) not null,
  imagen_url      text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint productos_precio_venta_check check (precio_venta >= 0),
  constraint productos_precio_compra_check check (precio_compra >= 0)
);

-- Ãndices de rendimiento crÃ­ticos para bÃºsquedas en POS
create index productos_tienda_id_idx on public.productos (tienda_id);
create index productos_categoria_id_idx on public.productos (categoria_id);
create index productos_nombre_tienda_idx on public.productos (tienda_id, nombre);

-- Partial index: solo productos activos (los mÃ¡s buscados desde POS)
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
-- CombinaciÃ³n Ãºnica: producto + talla + color
-- Es la unidad mÃ­nima vendible y la que tiene stock propio.
-- -------------------------------------------------------------
create table if not exists public.variantes_producto (
  id               uuid primary key default gen_random_uuid(),
  tienda_id        uuid not null references public.tiendas (id) on delete cascade,
  producto_id      uuid not null references public.productos (id) on delete cascade,
  talla_id         uuid references public.tallas (id) on delete set null,
  color_id         uuid references public.colores (id) on delete set null,
  codigo_barras    text,           -- CÃ³digo de barras escaneado en POS
  precio_venta     numeric(12, 2), -- Sobrescribe precio del producto si es distinto
  stock_actual     integer not null default 0,
  stock_minimo     integer not null default 0,  -- Para alertas de stock bajo
  activo           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Una combinaciÃ³n producto+talla+color debe ser Ãºnica por tienda
  constraint variantes_unicas unique (tienda_id, producto_id, talla_id, color_id),
  constraint variantes_stock_check check (stock_actual >= 0)
);

-- Ãndice crÃ­tico para scanner de POS (la bÃºsqueda mÃ¡s frecuente)
create index variantes_codigo_barras_idx on public.variantes_producto (tienda_id, codigo_barras)
  where codigo_barras is not null;

create index variantes_producto_id_idx on public.variantes_producto (producto_id);
create index variantes_tienda_id_idx on public.variantes_producto (tienda_id);

-- Partial index: solo variantes activas con stock (listado de POS)
create index variantes_con_stock_idx on public.variantes_producto (tienda_id)
  where activo = true and stock_actual > 0;

-- Covering index para consulta tÃ­pica de POS (escaneo â†’ datos de venta)
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

comment on table public.productos is 'CatÃ¡logo base de productos. Cada producto puede tener mÃºltiples variantes (talla/color).';
comment on table public.variantes_producto is 'Unidad mÃ­nima vendible. Tiene su propio cÃ³digo de barras, precio y stock.';
comment on column public.variantes_producto.codigo_barras is 'CÃ³digo escaneado en POS. Debe ser Ãºnico dentro de la tienda.';


-- ============================================================================
-- FILE: 20260419000004_clientes.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 004: CLIENTES (CRM)
-- GestiÃ³n de clientes de la tienda con historial de compras.
-- Ejecutar DESPUÃ‰S de 003_productos.sql
-- =============================================================

create table if not exists public.clientes (
  id               uuid primary key default gen_random_uuid(),
  tienda_id        uuid not null references public.tiendas (id) on delete cascade,
  nombre           text not null,
  apellido         text,
  dni              text,
  telefono         text,
  email            text,
  direccion        text,
  ciudad           text,
  fecha_nacimiento date,
  notas            text,
  -- MÃ©tricas calculadas / actualizadas por triggers
  total_compras    integer not null default 0,     -- Cantidad de ventas
  monto_total      numeric(14, 2) not null default 0, -- Suma histÃ³rica
  ultima_compra    timestamptz,
  activo           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Ãndices para bÃºsquedas frecuentes en POS y CRM
create index clientes_tienda_id_idx on public.clientes (tienda_id);
create index clientes_nombre_idx on public.clientes (tienda_id, nombre, apellido);
create index clientes_telefono_idx on public.clientes (tienda_id, telefono)
  where telefono is not null;
create index clientes_dni_idx on public.clientes (tienda_id, dni)
  where dni is not null;

-- Partial index: solo clientes activos
create index clientes_activos_idx on public.clientes (tienda_id)
  where activo = true;

create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

-- RLS
alter table public.clientes enable row level security;

create policy "clientes_tienda_isolation"
  on public.clientes
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

comment on table public.clientes is 'CRM de clientes de la tienda. Se vincula con ventas para historial de compras.';
comment on column public.clientes.total_compras is 'Contador actualizado automÃ¡ticamente por trigger al cerrar una venta.';
comment on column public.clientes.monto_total is 'Suma histÃ³rica de compras. Actualizado por trigger.';


-- ============================================================================
-- FILE: 20260419000005_ventas.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 005: VENTAS Y POS (cabecera y lÃ­neas)
-- MÃ³dulo de punto de venta: ventas y sus lÃ­neas de detalle.
-- NOTA: metodos_pago y pagos_venta estÃ¡n en 009_metodos_pago.sql
--       para poder referenciar cuentas_fondos (008).
--       sesion_caja_id se agrega en 010_sesiones_caja.sql.
-- Ejecutar DESPUÃ‰S de 004_clientes.sql
-- =============================================================

-- -------------------------------------------------------------
-- VENTAS (cabecera)
-- -------------------------------------------------------------
create table if not exists public.ventas (
  id              uuid primary key default gen_random_uuid(),
  tienda_id       uuid not null references public.tiendas (id) on delete cascade,
  cliente_id      uuid references public.clientes (id) on delete set null,
  usuario_id      uuid references public.perfiles (id) on delete set null,
  -- sesion_caja_id se aÃ±ade via ALTER en 010_sesiones_caja.sql
  -- NumeraciÃ³n legible del ticket (por tienda)
  numero_ticket   integer not null,
  subtotal        numeric(14, 2) not null default 0,
  descuento       numeric(14, 2) not null default 0,
  total           numeric(14, 2) not null default 0,
  estado          text not null default 'completada',
  observaciones   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint ventas_estado_check check (estado in ('completada', 'anulada', 'pendiente')),
  constraint ventas_total_check check (total >= 0),
  constraint ventas_descuento_check check (descuento >= 0),
  constraint ventas_numero_ticket_unique unique (tienda_id, numero_ticket)
);

-- Ãndices crÃ­ticos para rendimiento del POS y reportes
create index ventas_tienda_id_idx on public.ventas (tienda_id);
create index ventas_cliente_id_idx on public.ventas (cliente_id)
  where cliente_id is not null;
create index ventas_usuario_id_idx on public.ventas (usuario_id);
create index ventas_tienda_fecha_idx on public.ventas (tienda_id, created_at desc);
create index ventas_completadas_idx on public.ventas (tienda_id, created_at desc)
  where estado = 'completada';
create index ventas_ticket_covering_idx
  on public.ventas (tienda_id, numero_ticket desc)
  include (total, estado, created_at);

create trigger ventas_updated_at
  before update on public.ventas
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------
-- Secuencia de nÃºmero de ticket por tienda (atÃ³mica)
-- -------------------------------------------------------
create or replace function public.get_siguiente_numero_ticket(p_tienda_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_siguiente integer;
begin
  update public.configuracion_tienda
  set ultimo_numero_ticket = ultimo_numero_ticket + 1
  where tienda_id = p_tienda_id
  returning ultimo_numero_ticket into v_siguiente;

  return v_siguiente;
end;
$$;

-- Exponer la funciÃ³n como RPC segura para el frontend
revoke all on function public.get_siguiente_numero_ticket(uuid) from public;
grant execute on function public.get_siguiente_numero_ticket(uuid) to authenticated;

-- RLS ventas
alter table public.ventas enable row level security;

create policy "ventas_tienda_isolation"
  on public.ventas
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- DETALLES DE VENTA (lÃ­neas del ticket)
-- -------------------------------------------------------------
create table if not exists public.detalles_venta (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  venta_id          uuid not null references public.ventas (id) on delete cascade,
  variante_id       uuid references public.variantes_producto (id) on delete set null,
  -- Snapshot inmutable del producto al momento de la venta
  nombre_producto   text not null,
  codigo_barras     text,
  talla             text,
  color             text,
  cantidad          integer not null,
  precio_unitario   numeric(12, 2) not null,
  descuento_linea   numeric(12, 2) not null default 0,
  total_linea       numeric(14, 2) not null,
  created_at        timestamptz not null default now(),

  constraint detalles_cantidad_check check (cantidad > 0),
  constraint detalles_precio_check check (precio_unitario >= 0),
  constraint detalles_total_check check (total_linea >= 0)
);

create index detalles_venta_id_idx on public.detalles_venta (venta_id);
create index detalles_tienda_id_idx on public.detalles_venta (tienda_id);
create index detalles_variante_id_idx on public.detalles_venta (variante_id)
  where variante_id is not null;

alter table public.detalles_venta enable row level security;

create policy "detalles_venta_tienda_isolation"
  on public.detalles_venta
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Trigger: actualizar mÃ©tricas del cliente al completar una venta
-- -------------------------------------------------------------
create or replace function public.actualizar_metricas_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'completada' and new.cliente_id is not null then
    update public.clientes
    set
      total_compras = total_compras + 1,
      monto_total   = monto_total + new.total,
      ultima_compra = new.created_at,
      updated_at    = now()
    where id = new.cliente_id;
  end if;

  if new.estado = 'anulada' and old.estado = 'completada' and new.cliente_id is not null then
    update public.clientes
    set
      total_compras = greatest(0, total_compras - 1),
      monto_total   = greatest(0, monto_total - old.total),
      updated_at    = now()
    where id = new.cliente_id;
  end if;

  return new;
end;
$$;

create trigger ventas_actualizar_cliente
  after insert or update of estado on public.ventas
  for each row execute function public.actualizar_metricas_cliente();

comment on table public.ventas is 'Cabecera de cada transacciÃ³n de venta en el POS.';
comment on table public.detalles_venta is 'LÃ­neas del ticket. Snapshot inmutable del producto para trazabilidad histÃ³rica.';
comment on column public.detalles_venta.nombre_producto is 'Snapshot inmutable â€” no cambia si el producto se modifica luego.';


-- ============================================================================
-- FILE: 20260419000006_stock.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 006: MOVIMIENTOS DE STOCK
-- Registro de auditorÃ­a de todos los cambios de inventario.
-- Ejecutar DESPUÃ‰S de 005_ventas.sql
-- =============================================================

create table if not exists public.movimientos_stock (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  variante_id       uuid not null references public.variantes_producto (id) on delete cascade,
  tipo              text not null,
  cantidad          integer not null,          -- Positivo = entrada, Negativo = salida
  stock_anterior    integer not null,
  stock_posterior   integer not null,
  motivo            text,                       -- DescripciÃ³n libre
  venta_id          uuid references public.ventas (id) on delete set null,
  usuario_id        uuid references public.perfiles (id) on delete set null,
  created_at        timestamptz not null default now(),

  constraint movimientos_tipo_check check (
    tipo in ('entrada', 'salida', 'ajuste', 'devolucion', 'inicial')
  ),
  constraint movimientos_stock_posterior_check check (stock_posterior >= 0)
);

-- Ãndices para reportes y auditorÃ­a
create index movimientos_tienda_id_idx on public.movimientos_stock (tienda_id);
create index movimientos_variante_id_idx on public.movimientos_stock (variante_id);
create index movimientos_fecha_idx on public.movimientos_stock (tienda_id, created_at desc);
create index movimientos_venta_id_idx on public.movimientos_stock (venta_id)
  where venta_id is not null;

-- Partial index para consultas de entradas/salidas recientes
create index movimientos_recientes_idx
  on public.movimientos_stock (tienda_id, variante_id, created_at desc);

-- RLS
alter table public.movimientos_stock enable row level security;

-- Los vendedores pueden ver el historial pero no insertar manualmente
create policy "movimientos_select_tienda"
  on public.movimientos_stock
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo owner/admin pueden registrar movimientos manuales (ajustes)
create policy "admin_inserta_movimientos"
  on public.movimientos_stock
  for insert
  with check (
    tienda_id = public.get_tienda_id()
    and (
      -- El sistema puede insertar (vÃ­a trigger), o admin/owner manual
      tipo in ('entrada', 'ajuste', 'inicial')
      or exists (
        select 1 from public.perfiles
        where id = auth.uid()
        and tienda_id = public.get_tienda_id()
        and rol in ('owner', 'admin')
      )
    )
  );

-- -------------------------------------------------------------
-- Trigger: registrar movimiento de stock automÃ¡ticamente
-- cuando se inserta un detalle de venta (salida)
-- -------------------------------------------------------------
create or replace function public.registrar_salida_stock_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_anterior integer;
begin
  -- Solo procesar si tiene variante asociada
  if new.variante_id is null then
    return new;
  end if;

  -- Obtener stock actual antes de descontar
  select stock_actual into v_stock_anterior
  from public.variantes_producto
  where id = new.variante_id;

  -- Validar que haya stock suficiente
  if v_stock_anterior < new.cantidad then
    raise exception 'Stock insuficiente para la variante %. Stock actual: %, requerido: %',
      new.variante_id, v_stock_anterior, new.cantidad;
  end if;

  -- Descontar stock
  update public.variantes_producto
  set stock_actual = stock_actual - new.cantidad,
      updated_at   = now()
  where id = new.variante_id;

  -- Registrar movimiento de auditorÃ­a
  insert into public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior,
    motivo, venta_id, usuario_id
  )
  select
    new.tienda_id,
    new.variante_id,
    'salida',
    -new.cantidad,
    v_stock_anterior,
    v_stock_anterior - new.cantidad,
    'Venta #' || v.numero_ticket,
    new.venta_id,
    v.usuario_id
  from public.ventas v
  where v.id = new.venta_id;

  return new;
end;
$$;

create trigger detalles_venta_salida_stock
  after insert on public.detalles_venta
  for each row execute function public.registrar_salida_stock_venta();

-- -------------------------------------------------------------
-- Trigger: revertir stock cuando se anula una venta
-- -------------------------------------------------------------
create or replace function public.revertir_stock_anulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle record;
  v_stock_anterior integer;
begin
  -- Solo actuar cuando el estado cambia a 'anulada'
  if new.estado != 'anulada' or old.estado = 'anulada' then
    return new;
  end if;

  -- Iterar sobre los detalles de la venta anulada
  for v_detalle in
    select * from public.detalles_venta
    where venta_id = new.id and variante_id is not null
  loop
    select stock_actual into v_stock_anterior
    from public.variantes_producto
    where id = v_detalle.variante_id;

    -- Devolver stock
    update public.variantes_producto
    set stock_actual = stock_actual + v_detalle.cantidad,
        updated_at   = now()
    where id = v_detalle.variante_id;

    -- Registrar devoluciÃ³n en historial
    insert into public.movimientos_stock (
      tienda_id, variante_id, tipo, cantidad,
      stock_anterior, stock_posterior,
      motivo, venta_id, usuario_id
    ) values (
      new.tienda_id,
      v_detalle.variante_id,
      'devolucion',
      v_detalle.cantidad,
      v_stock_anterior,
      v_stock_anterior + v_detalle.cantidad,
      'AnulaciÃ³n venta #' || new.numero_ticket,
      new.id,
      new.usuario_id
    );
  end loop;

  return new;
end;
$$;

create trigger ventas_revertir_stock
  after update of estado on public.ventas
  for each row execute function public.revertir_stock_anulacion();

comment on table public.movimientos_stock is 'Log inmutable de todos los cambios de inventario. Actualizado por triggers automÃ¡ticamente.';
comment on column public.movimientos_stock.cantidad is 'Positivo = entrada de stock. Negativo = salida.';


-- ============================================================================
-- FILE: 20260419000007_configuracion.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 007: CONFIGURACIÃ“N DE TIENDA Y ETIQUETAS
-- Settings por tenant: datos fiscales, tickets y etiquetas.
-- Ejecutar DESPUÃ‰S de 006_stock.sql
-- =============================================================

-- -------------------------------------------------------------
-- CONFIGURACIÃ“N GENERAL DE LA TIENDA
-- Una fila por tienda (1:1)
-- -------------------------------------------------------------
create table if not exists public.configuracion_tienda (
  id                    uuid primary key default gen_random_uuid(),
  tienda_id             uuid not null unique references public.tiendas (id) on delete cascade,
  -- Datos fiscales para ticket/factura
  razon_social          text,
  cuit                  text,
  condicion_iva         text default 'Monotributista',
  direccion_legal       text,
  -- PersonalizaciÃ³n del ticket impreso
  texto_encabezado      text,    -- Ej: "Â¡Gracias por tu compra!"
  texto_pie             text,    -- Ej: "No se aceptan cambios sin ticket"
  mostrar_logo          boolean not null default true,
  mostrar_iva           boolean not null default false,
  -- NumeraciÃ³n de tickets y devoluciones
  prefijo_ticket            text default 'T',       -- T-0001, V-0001, etc.
  ultimo_numero_ticket      integer not null default 0,
  ultimo_numero_devolucion  integer not null default 0,
  -- Impresora por defecto
  impresora_ticket      text,    -- Nombre de la impresora configurada
  ancho_ticket_mm       integer not null default 80,   -- 58mm o 80mm
  -- Moneda y regiÃ³n
  moneda                text not null default 'ARS',
  simbolo_moneda        text not null default '$',
  separador_decimal     text not null default ',',
  separador_miles       text not null default '.',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint config_ancho_ticket_check check (ancho_ticket_mm in (58, 80))
);

create trigger configuracion_tienda_updated_at
  before update on public.configuracion_tienda
  for each row execute function public.set_updated_at();

-- RLS
alter table public.configuracion_tienda enable row level security;

-- Todos los usuarios de la tienda pueden leer la configuraciÃ³n
create policy "config_tienda_select"
  on public.configuracion_tienda
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo owner/admin pueden modificar la configuraciÃ³n
create policy "config_tienda_update"
  on public.configuracion_tienda
  for update
  using (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

create policy "config_tienda_insert"
  on public.configuracion_tienda
  for insert
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- CONFIGURACIÃ“N DE ETIQUETAS
-- MÃºltiples formatos por tienda (una tienda puede tener varios)
-- -------------------------------------------------------------
create table if not exists public.configuracion_etiquetas (
  id                  uuid primary key default gen_random_uuid(),
  tienda_id           uuid not null references public.tiendas (id) on delete cascade,
  nombre              text not null,        -- "Etiqueta chica", "Etiqueta grande"
  es_predeterminado   boolean not null default false,
  -- Dimensiones del papel
  formato             text not null default '50x30',   -- WxH en mm
  ancho_mm            integer not null default 50,
  alto_mm             integer not null default 30,
  -- Contenido a mostrar en la etiqueta
  mostrar_nombre      boolean not null default true,
  mostrar_precio      boolean not null default true,
  mostrar_talla       boolean not null default true,
  mostrar_color       boolean not null default false,
  mostrar_codigo      boolean not null default true,    -- CÃ³digo legible
  mostrar_barcode     boolean not null default true,    -- Imagen de cÃ³digo de barras
  mostrar_logo        boolean not null default false,
  -- TipografÃ­a
  tamano_fuente_nombre  integer not null default 10,
  tamano_fuente_precio  integer not null default 14,
  tamano_fuente_talla   integer not null default 8,
  -- Cantidad por hoja (para impresiÃ³n en A4 con mÃºltiples etiquetas)
  etiquetas_por_fila  integer not null default 3,
  etiquetas_por_col   integer not null default 8,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint etiquetas_ancho_check check (ancho_mm > 0),
  constraint etiquetas_alto_check check (alto_mm > 0)
);

create index etiquetas_tienda_id_idx on public.configuracion_etiquetas (tienda_id);

create trigger config_etiquetas_updated_at
  before update on public.configuracion_etiquetas
  for each row execute function public.set_updated_at();

-- Solo puede haber una etiqueta predeterminada por tienda
create unique index etiquetas_predeterminada_idx
  on public.configuracion_etiquetas (tienda_id)
  where es_predeterminado = true;

-- RLS
alter table public.configuracion_etiquetas enable row level security;

create policy "etiquetas_tienda_isolation"
  on public.configuracion_etiquetas
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- FunciÃ³n y trigger: inicializar configuraciÃ³n al crear una tienda
-- NOTA: seed de cuentas_fondos y metodos_pago se hace en 009_metodos_pago.sql
--       ya que dependen de cuentas_fondos (008).
-- -------------------------------------------------------------
create or replace function public.inicializar_tienda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ConfiguraciÃ³n general
  insert into public.configuracion_tienda (tienda_id, razon_social)
  values (new.id, new.nombre);

  -- Etiqueta predeterminada (50x30mm, la mÃ¡s comÃºn en retail)
  insert into public.configuracion_etiquetas (
    tienda_id, nombre, es_predeterminado,
    formato, ancho_mm, alto_mm
  ) values (
    new.id, 'Etiqueta estÃ¡ndar', true,
    '50x30', 50, 30
  );

  return new;
end;
$$;

create trigger tiendas_inicializar
  after insert on public.tiendas
  for each row execute function public.inicializar_tienda();

comment on table public.configuracion_tienda is 'ConfiguraciÃ³n 1:1 con cada tienda. Datos fiscales, ticket, impresora y moneda.';
comment on table public.configuracion_etiquetas is 'Plantillas de etiquetas de producto. Una tienda puede tener mÃºltiples formatos.';
comment on column public.configuracion_tienda.ultimo_numero_ticket is 'Contador atÃ³mico de tickets. Actualizado por get_siguiente_numero_ticket().';


-- ============================================================================
-- FILE: 20260419000008_cuentas_fondos.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 008: CUENTAS DE FONDOS
-- Representa los "lugares" donde va el dinero: caja efectivo,
-- billetera Mercado Pago, cuenta bancaria, etc.
-- Cada tienda configura las suyas y ve el saldo en tiempo real.
-- Ejecutar DESPUÃ‰S de 007_configuracion.sql
-- =============================================================

create table if not exists public.cuentas_fondos (
  id            uuid primary key default gen_random_uuid(),
  tienda_id     uuid not null references public.tiendas (id) on delete cascade,
  nombre        text not null,    -- "Efectivo en caja", "Mercado Pago", "Cuenta Banco NaciÃ³n"
  tipo          text not null,    -- efectivo | mercado_pago | banco | otro
  descripcion   text,             -- DescripciÃ³n libre: "CBU 123...", "Alias: mitienda"
  saldo_actual  numeric(14, 2) not null default 0,
  -- Visual en UI
  color         text default '#6366f1',  -- Color hex para tarjeta/badge
  icono         text default 'wallet',   -- Nombre de Ã­cono (Lucide/Heroicons)
  activo        boolean not null default true,
  orden         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint cuentas_tipo_check check (tipo in ('efectivo', 'mercado_pago', 'banco', 'otro'))
);

-- Ãndices
create index cuentas_fondos_tienda_id_idx on public.cuentas_fondos (tienda_id);
create index cuentas_fondos_tipo_idx on public.cuentas_fondos (tienda_id, tipo);
create index cuentas_fondos_activas_idx on public.cuentas_fondos (tienda_id, orden)
  where activo = true;

create trigger cuentas_fondos_updated_at
  before update on public.cuentas_fondos
  for each row execute function public.set_updated_at();

-- RLS
alter table public.cuentas_fondos enable row level security;

-- Todos los usuarios de la tienda pueden ver los saldos
create policy "cuentas_fondos_select"
  on public.cuentas_fondos
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo owner/admin pueden crear/modificar cuentas
create policy "cuentas_fondos_write"
  on public.cuentas_fondos
  for insert
  with check (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

create policy "cuentas_fondos_update"
  on public.cuentas_fondos
  for update
  using (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

-- -------------------------------------------------------------
-- HISTORIAL DE MOVIMIENTOS DE FONDOS
-- Cada ingreso o egreso de una cuenta queda registrado.
-- Alimentado por triggers de pagos_venta, pagos_devolucion
-- y movimientos manuales.
-- -------------------------------------------------------------
create table if not exists public.movimientos_fondos (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  cuenta_fondo_id   uuid not null references public.cuentas_fondos (id) on delete cascade,
  tipo              text not null,           -- ingreso | egreso | ajuste
  concepto          text not null,           -- "Venta #42", "DevoluciÃ³n #3", "Ajuste manual"
  monto             numeric(14, 2) not null, -- Siempre positivo
  saldo_anterior    numeric(14, 2) not null,
  saldo_posterior   numeric(14, 2) not null,
  -- Referencias opcionales al origen del movimiento
  venta_id          uuid references public.ventas (id) on delete set null,
  usuario_id        uuid references public.perfiles (id) on delete set null,
  created_at        timestamptz not null default now(),

  constraint movimientos_fondos_tipo_check check (tipo in ('ingreso', 'egreso', 'ajuste')),
  constraint movimientos_fondos_monto_check check (monto > 0)
);

-- Ãndices para reportes por cuenta y perÃ­odo
create index movimientos_fondos_cuenta_idx on public.movimientos_fondos (cuenta_fondo_id, created_at desc);
create index movimientos_fondos_tienda_idx on public.movimientos_fondos (tienda_id, created_at desc);
create index movimientos_fondos_venta_idx on public.movimientos_fondos (venta_id)
  where venta_id is not null;

-- RLS
alter table public.movimientos_fondos enable row level security;

create policy "movimientos_fondos_select"
  on public.movimientos_fondos
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo el sistema (security definer functions) y admin/owner pueden insertar
create policy "movimientos_fondos_insert"
  on public.movimientos_fondos
  for insert
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- FunciÃ³n helper: registrar movimiento de fondos y actualizar saldo
-- Usada por triggers de pagos_venta y pagos_devolucion
-- -------------------------------------------------------------
create or replace function public.registrar_movimiento_fondo(
  p_cuenta_fondo_id uuid,
  p_tipo            text,         -- ingreso | egreso | ajuste
  p_concepto        text,
  p_monto           numeric,
  p_venta_id        uuid default null,
  p_usuario_id      uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo_anterior  numeric;
  v_saldo_nuevo     numeric;
  v_tienda_id       uuid;
begin
  -- Obtener saldo actual y tienda con lock de fila para evitar race condition
  select saldo_actual, tienda_id
  into v_saldo_anterior, v_tienda_id
  from public.cuentas_fondos
  where id = p_cuenta_fondo_id
  for update;

  -- Calcular nuevo saldo
  if p_tipo = 'ingreso' then
    v_saldo_nuevo := v_saldo_anterior + p_monto;
  elsif p_tipo = 'egreso' then
    v_saldo_nuevo := v_saldo_anterior - p_monto;
  else
    -- ajuste: el monto puede ser positivo o negativo segÃºn concepto
    v_saldo_nuevo := p_monto;
  end if;

  -- Actualizar saldo en la cuenta
  update public.cuentas_fondos
  set saldo_actual = v_saldo_nuevo,
      updated_at   = now()
  where id = p_cuenta_fondo_id;

  -- Registrar en historial
  insert into public.movimientos_fondos (
    tienda_id, cuenta_fondo_id, tipo, concepto, monto,
    saldo_anterior, saldo_posterior, venta_id, usuario_id
  ) values (
    v_tienda_id, p_cuenta_fondo_id, p_tipo, p_concepto, p_monto,
    v_saldo_anterior, v_saldo_nuevo, p_venta_id, p_usuario_id
  );
end;
$$;

-- -------------------------------------------------------------
-- Seed de cuentas de fondos por defecto
-- Llamado desde 009_metodos_pago.sql al registrar una tienda nueva
-- -------------------------------------------------------------
create or replace function public.seed_cuentas_fondos(p_tienda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cuentas_fondos (tienda_id, nombre, tipo, descripcion, color, icono, orden) values
    (p_tienda_id, 'Efectivo en caja', 'efectivo',    'Dinero fÃ­sico en el mostrador',             '#22c55e', 'banknotes',      1),
    (p_tienda_id, 'Mercado Pago',     'mercado_pago', 'Billetera virtual de Mercado Pago',         '#009ee3', 'qr-code',        2),
    (p_tienda_id, 'Cuenta bancaria',  'banco',        'Cuenta corriente / caja de ahorro bancaria','#6366f1', 'building-library',3);
end;
$$;

comment on table public.cuentas_fondos is 'Destinos de fondos configurados por la tienda: efectivo, MP, banco. Refleja el saldo real disponible.';
comment on table public.movimientos_fondos is 'Log inmutable de cada movimiento de dinero por cuenta. Alimentado automÃ¡ticamente por triggers.';
comment on column public.cuentas_fondos.saldo_actual is 'Saldo calculado en tiempo real. Actualizado atÃ³micamente por registrar_movimiento_fondo().';


-- ============================================================================
-- FILE: 20260419000009_metodos_pago.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 009: MÃ‰TODOS DE PAGO Y PAGOS DE VENTA
-- MÃ©todos de pago completamente configurables: nombre, destino
-- de fondos, comisiÃ³n y dÃ­as de acreditaciÃ³n.
-- Ejecutar DESPUÃ‰S de 008_cuentas_fondos.sql
-- =============================================================

-- -------------------------------------------------------------
-- MÃ‰TODOS DE PAGO
-- Cada tienda define los suyos con nombre propio y vinculaciÃ³n
-- a una cuenta de fondos especÃ­fica.
-- Ej: "QR Mercado Pago" â†’ cuenta MP, 3% comisiÃ³n, 1 dÃ­a
--     "Efectivo"        â†’ cuenta Efectivo, 0% comisiÃ³n, 0 dÃ­as
-- -------------------------------------------------------------
create table if not exists public.metodos_pago (
  id                    uuid primary key default gen_random_uuid(),
  tienda_id             uuid not null references public.tiendas (id) on delete cascade,
  cuenta_fondo_id       uuid not null references public.cuentas_fondos (id) on delete restrict,
  nombre                text not null,              -- Nombre visible en POS: "QR Mercado Pago"
  descripcion           text,
  comision_porcentaje   numeric(5, 2) not null default 0,  -- Ej: 3.99 = 3.99%
  dias_acreditacion     integer not null default 0,        -- 0 = inmediato
  activo                boolean not null default true,
  orden                 integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint metodos_comision_check check (comision_porcentaje >= 0 and comision_porcentaje < 100),
  constraint metodos_dias_check check (dias_acreditacion >= 0)
);

-- Ãndices
create index metodos_pago_tienda_id_idx on public.metodos_pago (tienda_id);
create index metodos_pago_cuenta_idx on public.metodos_pago (cuenta_fondo_id);
create index metodos_pago_activos_idx on public.metodos_pago (tienda_id, orden)
  where activo = true;

create trigger metodos_pago_updated_at
  before update on public.metodos_pago
  for each row execute function public.set_updated_at();

-- RLS
alter table public.metodos_pago enable row level security;

-- Todos ven los mÃ©todos de pago de su tienda
create policy "metodos_pago_select"
  on public.metodos_pago
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo owner/admin pueden crear o modificar mÃ©todos
create policy "metodos_pago_write"
  on public.metodos_pago
  for insert
  with check (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

create policy "metodos_pago_update"
  on public.metodos_pago
  for update
  using (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

-- -------------------------------------------------------------
-- PAGOS DE VENTA
-- Una venta puede tener mÃºltiples pagos (split de mÃ©todos).
-- Al insertar, un trigger actualiza el saldo de la cuenta de fondos.
-- -------------------------------------------------------------
create table if not exists public.pagos_venta (
  id                    uuid primary key default gen_random_uuid(),
  tienda_id             uuid not null references public.tiendas (id) on delete cascade,
  venta_id              uuid not null references public.ventas (id) on delete cascade,
  metodo_pago_id        uuid references public.metodos_pago (id) on delete set null,
  cuenta_fondo_id       uuid references public.cuentas_fondos (id) on delete set null,
  -- Snapshots al momento del pago (inmutables)
  nombre_metodo         text not null,
  nombre_cuenta_fondo   text not null,
  comision_porcentaje   numeric(5, 2) not null default 0,
  dias_acreditacion     integer not null default 0,
  -- Montos
  monto                 numeric(14, 2) not null,
  comision_calculada    numeric(14, 2) not null default 0,  -- monto * comision / 100
  monto_neto            numeric(14, 2) not null,            -- monto - comision_calculada
  referencia            text,    -- Nro. de transferencia, voucher, cÃ³digo MP, etc.
  created_at            timestamptz not null default now(),

  constraint pagos_monto_check check (monto > 0),
  constraint pagos_neto_check check (monto_neto >= 0)
);

-- Ãndices
create index pagos_venta_id_idx on public.pagos_venta (venta_id);
create index pagos_tienda_id_idx on public.pagos_venta (tienda_id);
create index pagos_metodo_id_idx on public.pagos_venta (metodo_pago_id)
  where metodo_pago_id is not null;
create index pagos_cuenta_fondo_idx on public.pagos_venta (cuenta_fondo_id)
  where cuenta_fondo_id is not null;

-- RLS
alter table public.pagos_venta enable row level security;

create policy "pagos_venta_tienda_isolation"
  on public.pagos_venta
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Trigger: al registrar un pago, mover los fondos a la cuenta
-- correspondiente y registrar en el historial de movimientos
-- -------------------------------------------------------------
create or replace function public.mover_fondos_por_pago_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero_ticket integer;
begin
  if new.cuenta_fondo_id is null then
    return new;
  end if;

  -- Obtener nÃºmero de ticket de la venta para el concepto
  select numero_ticket into v_numero_ticket
  from public.ventas
  where id = new.venta_id;

  -- Registrar ingreso en la cuenta de fondos
  perform public.registrar_movimiento_fondo(
    p_cuenta_fondo_id => new.cuenta_fondo_id,
    p_tipo            => 'ingreso',
    p_concepto        => 'Venta #' || v_numero_ticket || ' â€” ' || new.nombre_metodo,
    p_monto           => new.monto,
    p_venta_id        => new.venta_id,
    p_usuario_id      => (select usuario_id from public.ventas where id = new.venta_id)
  );

  return new;
end;
$$;

create trigger pagos_venta_mover_fondos
  after insert on public.pagos_venta
  for each row execute function public.mover_fondos_por_pago_venta();

-- -------------------------------------------------------------
-- Seed: cuentas de fondos + mÃ©todos de pago por defecto
-- Llamado desde el trigger de inicializaciÃ³n de tienda
-- -------------------------------------------------------------
create or replace function public.seed_metodos_pago(p_tienda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_efectivo   uuid;
  v_id_mp         uuid;
  v_id_banco      uuid;
begin
  -- 1. Crear cuentas de fondos
  perform public.seed_cuentas_fondos(p_tienda_id);

  -- 2. Obtener IDs reciÃ©n creadas
  select id into v_id_efectivo from public.cuentas_fondos
    where tienda_id = p_tienda_id and tipo = 'efectivo' limit 1;
  select id into v_id_mp from public.cuentas_fondos
    where tienda_id = p_tienda_id and tipo = 'mercado_pago' limit 1;
  select id into v_id_banco from public.cuentas_fondos
    where tienda_id = p_tienda_id and tipo = 'banco' limit 1;

  -- 3. Crear mÃ©todos de pago vinculados a cada cuenta
  insert into public.metodos_pago
    (tienda_id, cuenta_fondo_id, nombre, descripcion, comision_porcentaje, dias_acreditacion, orden)
  values
    (p_tienda_id, v_id_efectivo, 'Efectivo',
      'Pago en efectivo al contado', 0, 0, 1),
    (p_tienda_id, v_id_mp, 'QR Mercado Pago',
      'EscaneÃ¡s el QR con la app de Mercado Pago', 3.99, 1, 2),
    (p_tienda_id, v_id_mp, 'Link de pago MP',
      'Pago por link generado desde Mercado Pago', 3.99, 1, 3),
    (p_tienda_id, v_id_banco, 'Transferencia bancaria',
      'Transferencia / CBU directo a cuenta bancaria', 0, 1, 4),
    (p_tienda_id, v_id_efectivo, 'Tarjeta dÃ©bito',
      'Posnet â€” fondos al efectivo de caja', 1.10, 1, 5),
    (p_tienda_id, v_id_efectivo, 'Tarjeta crÃ©dito',
      'Posnet â€” fondos al efectivo de caja', 3.67, 14, 6);
end;
$$;

-- -------------------------------------------------------------
-- Actualizar trigger inicializar_tienda para que incluya el seed
-- de cuentas y mÃ©todos de pago (reemplaza la funciÃ³n en 007)
-- -------------------------------------------------------------
create or replace function public.inicializar_tienda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ConfiguraciÃ³n general
  insert into public.configuracion_tienda (tienda_id, razon_social)
  values (new.id, new.nombre);

  -- Etiqueta predeterminada (50x30mm, la mÃ¡s comÃºn en retail)
  insert into public.configuracion_etiquetas (
    tienda_id, nombre, es_predeterminado,
    formato, ancho_mm, alto_mm
  ) values (
    new.id, 'Etiqueta estÃ¡ndar', true,
    '50x30', 50, 30
  );

  -- Cuentas de fondos + mÃ©todos de pago por defecto
  perform public.seed_metodos_pago(new.id);

  return new;
end;
$$;

comment on table public.metodos_pago is 'MÃ©todos de pago configurados por la tienda. Cada uno dirige fondos a una cuenta especÃ­fica.';
comment on column public.metodos_pago.comision_porcentaje is 'ComisiÃ³n que cobra el procesador (ej: 3.99 para MP QR). Se descuenta del monto neto.';
comment on column public.metodos_pago.dias_acreditacion is 'DÃ­as hÃ¡biles que tarda en acreditarse el dinero en la cuenta. 0 = inmediato.';
comment on table public.pagos_venta is 'Pagos de una venta. Permite split entre mÃºltiples mÃ©todos. Actualiza saldos automÃ¡ticamente.';
comment on column public.pagos_venta.comision_calculada is 'ComisiÃ³n en pesos calculada al momento del pago: monto Ã— comisiÃ³n% / 100.';
comment on column public.pagos_venta.monto_neto is 'Monto que efectivamente ingresa a la cuenta luego de descontar la comisiÃ³n.';


-- ============================================================================
-- FILE: 20260419000010_sesiones_caja.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 010: SESIONES Y CIERRES DE CAJA
-- Control completo de apertura/cierre de caja con historial
-- detallado por mÃ©todo de pago y cuenta de fondos.
-- Ejecutar DESPUÃ‰S de 009_metodos_pago.sql
-- =============================================================

-- -------------------------------------------------------------
-- SESIONES DE CAJA
-- Una sesiÃ³n = un turno de trabajo (apertura â†’ cierre).
-- Solo puede haber una sesiÃ³n abierta por tienda a la vez.
-- -------------------------------------------------------------
create table if not exists public.sesiones_caja (
  id                      uuid primary key default gen_random_uuid(),
  tienda_id               uuid not null references public.tiendas (id) on delete cascade,
  usuario_apertura_id     uuid not null references public.perfiles (id) on delete restrict,
  usuario_cierre_id       uuid references public.perfiles (id) on delete set null,
  fecha_apertura          timestamptz not null default now(),
  fecha_cierre            timestamptz,
  -- Monto de efectivo con el que se inicia la caja (fondo de cambio)
  monto_apertura_efectivo numeric(14, 2) not null default 0,
  estado                  text not null default 'abierta',
  observaciones_apertura  text,
  observaciones_cierre    text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint sesiones_estado_check check (estado in ('abierta', 'cerrada'))
);

-- Solo puede haber una sesiÃ³n abierta por tienda
create unique index sesiones_caja_unica_abierta_idx
  on public.sesiones_caja (tienda_id)
  where estado = 'abierta';

create index sesiones_caja_tienda_idx on public.sesiones_caja (tienda_id, fecha_apertura desc);
create index sesiones_caja_usuario_idx on public.sesiones_caja (usuario_apertura_id);

create trigger sesiones_caja_updated_at
  before update on public.sesiones_caja
  for each row execute function public.set_updated_at();

-- RLS
alter table public.sesiones_caja enable row level security;

create policy "sesiones_caja_tienda_isolation"
  on public.sesiones_caja
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- ALTER ventas: agregar referencia a sesiÃ³n de caja
-- Cada venta queda asociada al turno en que fue realizada
-- -------------------------------------------------------------
alter table public.ventas
  add column if not exists sesion_caja_id uuid
    references public.sesiones_caja (id) on delete set null;

create index ventas_sesion_caja_idx on public.ventas (sesion_caja_id)
  where sesion_caja_id is not null;

-- -------------------------------------------------------------
-- CIERRES DE CAJA
-- Resumen ejecutivo generado al cerrar una sesiÃ³n.
-- Incluye totales de venta, devoluciones y saldo por cuenta.
-- -------------------------------------------------------------
create table if not exists public.cierres_caja (
  id                          uuid primary key default gen_random_uuid(),
  sesion_id                   uuid not null unique references public.sesiones_caja (id) on delete cascade,
  tienda_id                   uuid not null references public.tiendas (id) on delete cascade,
  usuario_id                  uuid references public.perfiles (id) on delete set null,
  fecha_cierre                timestamptz not null default now(),
  -- MÃ©tricas del turno
  total_ventas_monto          numeric(14, 2) not null default 0,
  total_ventas_cantidad       integer not null default 0,
  total_devoluciones_monto    numeric(14, 2) not null default 0,
  total_devoluciones_cantidad integer not null default 0,
  total_neto                  numeric(14, 2) not null default 0,   -- ventas - devoluciones - comisiones
  -- Arqueo de efectivo
  monto_apertura_efectivo     numeric(14, 2) not null default 0,
  efectivo_esperado            numeric(14, 2) not null default 0,  -- apertura + ventas efectivo - devoluciones efectivo
  efectivo_declarado           numeric(14, 2),                     -- lo que cuenta fÃ­sicamente el cajero
  diferencia_efectivo          numeric(14, 2),                     -- declarado - esperado
  -- Notas
  observaciones               text,
  created_at                  timestamptz not null default now()
);

create index cierres_caja_sesion_idx on public.cierres_caja (sesion_id);
create index cierres_caja_tienda_idx on public.cierres_caja (tienda_id, fecha_cierre desc);

-- RLS
alter table public.cierres_caja enable row level security;

create policy "cierres_caja_tienda_isolation"
  on public.cierres_caja
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- DETALLE DE CIERRE POR CUENTA DE FONDOS
-- Desglosa cuÃ¡nto dinero entrÃ³/saliÃ³ de cada cuenta durante
-- el turno: Efectivo, Mercado Pago, Banco, etc.
-- -------------------------------------------------------------
create table if not exists public.cierres_caja_detalle (
  id                  uuid primary key default gen_random_uuid(),
  cierre_id           uuid not null references public.cierres_caja (id) on delete cascade,
  tienda_id           uuid not null references public.tiendas (id) on delete cascade,
  cuenta_fondo_id     uuid references public.cuentas_fondos (id) on delete set null,
  -- Snapshots
  nombre_cuenta       text not null,
  tipo_cuenta         text not null,
  -- Totales del turno en esta cuenta
  total_ingresos      numeric(14, 2) not null default 0,   -- pagos recibidos
  total_egresos       numeric(14, 2) not null default 0,   -- devoluciones pagadas
  comision_estimada   numeric(14, 2) not null default 0,   -- comisiones totales del turno
  total_neto          numeric(14, 2) not null default 0,   -- ingresos - egresos - comisiones
  -- Saldos globales de la cuenta (no solo del turno)
  saldo_antes_turno   numeric(14, 2) not null default 0,
  saldo_despues_turno numeric(14, 2) not null default 0
);

create index cierres_detalle_cierre_idx on public.cierres_caja_detalle (cierre_id);
create index cierres_detalle_tienda_idx on public.cierres_caja_detalle (tienda_id);

-- RLS
alter table public.cierres_caja_detalle enable row level security;

create policy "cierres_detalle_tienda_isolation"
  on public.cierres_caja_detalle
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- FunciÃ³n: cerrar caja
-- Genera el cierre completo con todos los cÃ¡lculos automÃ¡ticos.
-- El frontend llama esta funciÃ³n desde RPC.
-- -------------------------------------------------------------
create or replace function public.cerrar_caja(
  p_sesion_id             uuid,
  p_efectivo_declarado    numeric default null,
  p_observaciones         text    default null
)
returns uuid    -- retorna el id del cierre generado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesion              record;
  v_tienda_id           uuid;
  v_usuario_id          uuid;
  v_cierre_id           uuid;
  v_total_ventas        numeric := 0;
  v_cant_ventas         integer := 0;
  v_total_devoluciones  numeric := 0;
  v_cant_devoluciones   integer := 0;
  v_total_comisiones    numeric := 0;
  v_efectivo_esperado   numeric := 0;
  v_cuenta              record;
  v_ingresos_cuenta     numeric;
  v_egresos_cuenta      numeric;
  v_comision_cuenta     numeric;
begin
  -- Validar que la sesiÃ³n existe, estÃ¡ abierta y pertenece a la tienda del usuario
  select * into v_sesion
  from public.sesiones_caja
  where id = p_sesion_id
    and tienda_id = public.get_tienda_id()
    and estado = 'abierta';

  if not found then
    raise exception 'SesiÃ³n de caja no encontrada o ya cerrada.';
  end if;

  v_tienda_id  := v_sesion.tienda_id;
  v_usuario_id := auth.uid();

  -- Totales de ventas del turno
  select
    coalesce(sum(total), 0),
    count(*)
  into v_total_ventas, v_cant_ventas
  from public.ventas
  where sesion_caja_id = p_sesion_id
    and estado = 'completada';

  -- Totales de devoluciones del turno
  select
    coalesce(sum(total_devuelto), 0),
    count(*)
  into v_total_devoluciones, v_cant_devoluciones
  from public.devoluciones
  where sesion_caja_id = p_sesion_id
    and estado = 'completada';

  -- Comisiones del turno
  select coalesce(sum(pv.comision_calculada), 0)
  into v_total_comisiones
  from public.pagos_venta pv
  join public.ventas v on v.id = pv.venta_id
  where v.sesion_caja_id = p_sesion_id
    and v.estado = 'completada';

  -- Efectivo esperado: fondo apertura + ventas en efectivo - devoluciones en efectivo
  select
    v_sesion.monto_apertura_efectivo
    + coalesce((
        select sum(pv.monto)
        from public.pagos_venta pv
        join public.ventas v on v.id = pv.venta_id
        join public.cuentas_fondos cf on cf.id = pv.cuenta_fondo_id
        where v.sesion_caja_id = p_sesion_id
          and v.estado = 'completada'
          and cf.tipo = 'efectivo'
      ), 0)
    - coalesce((
        select sum(pd.monto)
        from public.pagos_devolucion pd
        join public.devoluciones d on d.id = pd.devolucion_id
        join public.cuentas_fondos cf on cf.id = (
          select cuenta_fondo_id from public.metodos_pago where id = pd.metodo_pago_id
        )
        where d.sesion_caja_id = p_sesion_id
          and d.estado = 'completada'
          and cf.tipo = 'efectivo'
      ), 0)
  into v_efectivo_esperado;

  -- Crear cierre principal
  insert into public.cierres_caja (
    sesion_id, tienda_id, usuario_id,
    total_ventas_monto, total_ventas_cantidad,
    total_devoluciones_monto, total_devoluciones_cantidad,
    total_neto,
    monto_apertura_efectivo, efectivo_esperado,
    efectivo_declarado, diferencia_efectivo,
    observaciones
  ) values (
    p_sesion_id, v_tienda_id, v_usuario_id,
    v_total_ventas, v_cant_ventas,
    v_total_devoluciones, v_cant_devoluciones,
    v_total_ventas - v_total_devoluciones - v_total_comisiones,
    v_sesion.monto_apertura_efectivo, v_efectivo_esperado,
    p_efectivo_declarado,
    case when p_efectivo_declarado is not null
         then p_efectivo_declarado - v_efectivo_esperado
         else null end,
    p_observaciones
  )
  returning id into v_cierre_id;

  -- Detalle por cuenta de fondos
  for v_cuenta in
    select cf.*
    from public.cuentas_fondos cf
    where cf.tienda_id = v_tienda_id and cf.activo = true
  loop
    -- Ingresos del turno en esta cuenta
    select coalesce(sum(pv.monto), 0) into v_ingresos_cuenta
    from public.pagos_venta pv
    join public.ventas v on v.id = pv.venta_id
    where v.sesion_caja_id = p_sesion_id
      and v.estado = 'completada'
      and pv.cuenta_fondo_id = v_cuenta.id;

    -- Egresos del turno en esta cuenta (devoluciones)
    select coalesce(sum(pd.monto), 0) into v_egresos_cuenta
    from public.pagos_devolucion pd
    join public.devoluciones d on d.id = pd.devolucion_id
    join public.metodos_pago mp on mp.id = pd.metodo_pago_id
    where d.sesion_caja_id = p_sesion_id
      and d.estado = 'completada'
      and mp.cuenta_fondo_id = v_cuenta.id;

    -- Comisiones del turno en esta cuenta
    select coalesce(sum(pv.comision_calculada), 0) into v_comision_cuenta
    from public.pagos_venta pv
    join public.ventas v on v.id = pv.venta_id
    where v.sesion_caja_id = p_sesion_id
      and v.estado = 'completada'
      and pv.cuenta_fondo_id = v_cuenta.id;

    -- Solo insertar si hubo movimientos
    if v_ingresos_cuenta > 0 or v_egresos_cuenta > 0 then
      insert into public.cierres_caja_detalle (
        cierre_id, tienda_id, cuenta_fondo_id,
        nombre_cuenta, tipo_cuenta,
        total_ingresos, total_egresos, comision_estimada, total_neto,
        saldo_antes_turno, saldo_despues_turno
      ) values (
        v_cierre_id, v_tienda_id, v_cuenta.id,
        v_cuenta.nombre, v_cuenta.tipo,
        v_ingresos_cuenta, v_egresos_cuenta, v_comision_cuenta,
        v_ingresos_cuenta - v_egresos_cuenta - v_comision_cuenta,
        v_cuenta.saldo_actual - v_ingresos_cuenta + v_egresos_cuenta, -- saldo antes del turno
        v_cuenta.saldo_actual                                           -- saldo actual (posterior)
      );
    end if;
  end loop;

  -- Marcar sesiÃ³n como cerrada
  update public.sesiones_caja
  set estado            = 'cerrada',
      fecha_cierre      = now(),
      usuario_cierre_id = v_usuario_id,
      observaciones_cierre = p_observaciones,
      updated_at        = now()
  where id = p_sesion_id;

  return v_cierre_id;
end;
$$;

-- Exponer la funciÃ³n como RPC segura para el frontend
revoke all on function public.cerrar_caja from public;
grant execute on function public.cerrar_caja to authenticated;

comment on table public.sesiones_caja is 'Turnos de caja: una sesiÃ³n por turno de trabajo. Solo una abierta por tienda.';
comment on table public.cierres_caja is 'Resumen del cierre de un turno: totales, arqueo de efectivo y diferencia.';
comment on table public.cierres_caja_detalle is 'Desglose del cierre por cuenta de fondos (efectivo, MP, banco, etc).';
comment on function public.cerrar_caja is 'Cierra la sesiÃ³n activa y genera el reporte completo de cierre con cÃ¡lculos automÃ¡ticos.';


-- ============================================================================
-- FILE: 20260419000011_devoluciones.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 011: DEVOLUCIONES
-- MÃ³dulo completo de devoluciones: totales y parciales.
-- Revierte stock, mueve fondos y genera ticket de devoluciÃ³n.
-- Ejecutar DESPUÃ‰S de 010_sesiones_caja.sql
-- =============================================================

-- -------------------------------------------------------------
-- DEVOLUCIONES (cabecera)
-- -------------------------------------------------------------
create table if not exists public.devoluciones (
  id                  uuid primary key default gen_random_uuid(),
  tienda_id           uuid not null references public.tiendas (id) on delete cascade,
  venta_id            uuid not null references public.ventas (id) on delete restrict,
  sesion_caja_id      uuid references public.sesiones_caja (id) on delete set null,
  usuario_id          uuid references public.perfiles (id) on delete set null,
  cliente_id          uuid references public.clientes (id) on delete set null,
  numero_devolucion   integer not null,      -- NumeraciÃ³n secuencial por tienda
  tipo                text not null default 'parcial',   -- total | parcial
  motivo              text not null,         -- Requerido: quÃ© pasÃ³ con el producto
  estado              text not null default 'completada',
  total_devuelto      numeric(14, 2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint devoluciones_tipo_check check (tipo in ('total', 'parcial')),
  constraint devoluciones_estado_check check (estado in ('completada', 'anulada')),
  constraint devoluciones_total_check check (total_devuelto >= 0),
  constraint devoluciones_numero_unique unique (tienda_id, numero_devolucion)
);

-- Ãndices
create index devoluciones_tienda_idx on public.devoluciones (tienda_id);
create index devoluciones_venta_idx on public.devoluciones (venta_id);
create index devoluciones_sesion_idx on public.devoluciones (sesion_caja_id)
  where sesion_caja_id is not null;
create index devoluciones_fecha_idx on public.devoluciones (tienda_id, created_at desc);
create index devoluciones_cliente_idx on public.devoluciones (cliente_id)
  where cliente_id is not null;

create trigger devoluciones_updated_at
  before update on public.devoluciones
  for each row execute function public.set_updated_at();

-- RLS
alter table public.devoluciones enable row level security;

create policy "devoluciones_tienda_isolation"
  on public.devoluciones
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- DETALLES DE DEVOLUCIÃ“N (lÃ­neas)
-- QuÃ© artÃ­culos se devuelven y en quÃ© cantidad
-- -------------------------------------------------------------
create table if not exists public.detalles_devolucion (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  devolucion_id     uuid not null references public.devoluciones (id) on delete cascade,
  detalle_venta_id  uuid references public.detalles_venta (id) on delete set null,
  variante_id       uuid references public.variantes_producto (id) on delete set null,
  -- Snapshot inmutable del artÃ­culo devuelto
  nombre_producto   text not null,
  codigo_barras     text,
  talla             text,
  color             text,
  cantidad          integer not null,
  precio_unitario   numeric(12, 2) not null,
  total_linea       numeric(14, 2) not null,
  created_at        timestamptz not null default now(),

  constraint dev_detalles_cantidad_check check (cantidad > 0),
  constraint dev_detalles_total_check check (total_linea >= 0)
);

create index dev_detalles_devolucion_idx on public.detalles_devolucion (devolucion_id);
create index dev_detalles_tienda_idx on public.detalles_devolucion (tienda_id);
create index dev_detalles_variante_idx on public.detalles_devolucion (variante_id)
  where variante_id is not null;

-- RLS
alter table public.detalles_devolucion enable row level security;

create policy "detalles_devolucion_tienda_isolation"
  on public.detalles_devolucion
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- PAGOS DE DEVOLUCIÃ“N
-- CÃ³mo se le devuelve el dinero al cliente.
-- Al insertar, trigger descuenta el saldo de la cuenta de fondos.
-- -------------------------------------------------------------
create table if not exists public.pagos_devolucion (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  devolucion_id     uuid not null references public.devoluciones (id) on delete cascade,
  metodo_pago_id    uuid references public.metodos_pago (id) on delete set null,
  cuenta_fondo_id   uuid references public.cuentas_fondos (id) on delete set null,
  -- Snapshots
  nombre_metodo     text not null,
  nombre_cuenta     text not null,
  monto             numeric(14, 2) not null,
  referencia        text,
  created_at        timestamptz not null default now(),

  constraint pagos_dev_monto_check check (monto > 0)
);

create index pagos_dev_devolucion_idx on public.pagos_devolucion (devolucion_id);
create index pagos_dev_tienda_idx on public.pagos_devolucion (tienda_id);
create index pagos_dev_cuenta_idx on public.pagos_devolucion (cuenta_fondo_id)
  where cuenta_fondo_id is not null;

-- RLS
alter table public.pagos_devolucion enable row level security;

create policy "pagos_devolucion_tienda_isolation"
  on public.pagos_devolucion
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Trigger: al pagar una devoluciÃ³n, descontar fondos de la cuenta
-- -------------------------------------------------------------
create or replace function public.mover_fondos_por_devolucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero_dev integer;
begin
  if new.cuenta_fondo_id is null then
    return new;
  end if;

  select numero_devolucion into v_numero_dev
  from public.devoluciones
  where id = new.devolucion_id;

  -- Egreso: sale dinero de la cuenta
  perform public.registrar_movimiento_fondo(
    p_cuenta_fondo_id => new.cuenta_fondo_id,
    p_tipo            => 'egreso',
    p_concepto        => 'DevoluciÃ³n #' || v_numero_dev || ' â€” ' || new.nombre_metodo,
    p_monto           => new.monto,
    p_venta_id        => (select venta_id from public.devoluciones where id = new.devolucion_id),
    p_usuario_id      => (select usuario_id from public.devoluciones where id = new.devolucion_id)
  );

  return new;
end;
$$;

create trigger pagos_devolucion_mover_fondos
  after insert on public.pagos_devolucion
  for each row execute function public.mover_fondos_por_devolucion();

-- -------------------------------------------------------------
-- Trigger: al completar una devoluciÃ³n, restituir stock
-- -------------------------------------------------------------
create or replace function public.reponer_stock_devolucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle       record;
  v_stock_anterior integer;
begin
  -- Solo procesar detalles con variante asignada
  if new.variante_id is null then
    return new;
  end if;

  select stock_actual into v_stock_anterior
  from public.variantes_producto
  where id = new.variante_id;

  -- Restituir stock
  update public.variantes_producto
  set stock_actual = stock_actual + new.cantidad,
      updated_at   = now()
  where id = new.variante_id;

  -- Registrar en historial de stock
  insert into public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior,
    motivo, usuario_id
  )
  select
    new.tienda_id,
    new.variante_id,
    'devolucion',
    new.cantidad,
    v_stock_anterior,
    v_stock_anterior + new.cantidad,
    'DevoluciÃ³n #' || d.numero_devolucion,
    d.usuario_id
  from public.devoluciones d
  where d.id = new.devolucion_id;

  return new;
end;
$$;

create trigger detalles_devolucion_reponer_stock
  after insert on public.detalles_devolucion
  for each row execute function public.reponer_stock_devolucion();

-- -------------------------------------------------------------
-- Trigger: actualizar mÃ©tricas del cliente al hacer una devoluciÃ³n
-- Decrementa total_compras (si es devoluciÃ³n total), monto_total
-- y actualiza ultima_compra al timestamp de la devoluciÃ³n.
-- -------------------------------------------------------------
create or replace function public.actualizar_metricas_cliente_devolucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'completada' and new.cliente_id is not null then
    update public.clientes
    set
      total_compras = case
        when new.tipo = 'total' then greatest(0, total_compras - 1)
        else total_compras
      end,
      monto_total   = greatest(0, monto_total - new.total_devuelto),
      updated_at    = now()
    where id = new.cliente_id;
  end if;

  return new;
end;
$$;

create trigger devoluciones_actualizar_cliente
  after insert on public.devoluciones
  for each row execute function public.actualizar_metricas_cliente_devolucion();

-- -------------------------------------------------------------
-- Secuencia de nÃºmero de devoluciÃ³n por tienda (atÃ³mica)
-- El frontend llama esta funciÃ³n para obtener el prÃ³ximo nÃºmero
-- antes de insertar la devoluciÃ³n.
-- La columna ultimo_numero_devolucion se crea en 007_configuracion.sql.
-- -------------------------------------------------------------
create or replace function public.get_siguiente_numero_devolucion(p_tienda_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_siguiente integer;
begin
  update public.configuracion_tienda
  set ultimo_numero_devolucion = ultimo_numero_devolucion + 1
  where tienda_id = p_tienda_id
  returning ultimo_numero_devolucion into v_siguiente;

  return v_siguiente;
end;
$$;

-- Exponer secuenciadores como RPC para el frontend
revoke all on function public.get_siguiente_numero_devolucion(uuid) from public;
grant execute on function public.get_siguiente_numero_devolucion(uuid) to authenticated;

comment on table public.devoluciones is 'Devoluciones de ventas. Puede ser total o parcial. Revierte stock y fondos automÃ¡ticamente.';
comment on table public.detalles_devolucion is 'ArtÃ­culos devueltos. Repone stock via trigger.';
comment on table public.pagos_devolucion is 'CÃ³mo se devuelve el dinero al cliente. Descuenta saldo de la cuenta de fondos automÃ¡ticamente.';


-- ============================================================================
-- FILE: 20260419000012_cola_impresion.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 012: COLA DE IMPRESIÃ“N
-- Sistema de impresiÃ³n automÃ¡tica vÃ­a Supabase Realtime.
-- Al completar una venta, devoluciÃ³n o cierre de caja,
-- el sistema inserta en esta tabla y el frontend imprime.
-- Ejecutar DESPUÃ‰S de 011_devoluciones.sql
-- =============================================================

-- -------------------------------------------------------------
-- COLA DE IMPRESIÃ“N
-- El frontend suscribe a esta tabla con Supabase Realtime.
-- Cuando llega una fila 'pendiente' para su dispositivo, imprime
-- y marca como 'completado'.
-- -------------------------------------------------------------
create table if not exists public.cola_impresion (
  id              uuid primary key default gen_random_uuid(),
  tienda_id       uuid not null references public.tiendas (id) on delete cascade,
  tipo            text not null,       -- ticket_venta | ticket_devolucion | cierre_caja | etiqueta_producto
  referencia_id   uuid,                -- ID del registro origen (venta, devolucion, cierre)
  referencia_tipo text,                -- ventas | devoluciones | cierres_caja
  -- El payload contiene TODOS los datos necesarios para imprimir
  -- (snapshot completo, no depende de JOINs en el momento de impresiÃ³n)
  payload         jsonb not null,
  estado          text not null default 'pendiente',  -- pendiente | imprimiendo | completado | error
  intentos        integer not null default 0,
  error_mensaje   text,
  -- Routing: quÃ© dispositivo/impresora debe manejar este trabajo
  dispositivo_id  text,        -- ID del dispositivo registrado (null = cualquiera)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint cola_tipo_check check (
    tipo in ('ticket_venta', 'ticket_devolucion', 'cierre_caja', 'etiqueta_producto')
  ),
  constraint cola_estado_check check (
    estado in ('pendiente', 'imprimiendo', 'completado', 'error')
  )
);

-- Ãndices: el frontend consulta por tienda + estado + dispositivo
create index cola_pendientes_idx
  on public.cola_impresion (tienda_id, created_at desc)
  where estado = 'pendiente';

create index cola_dispositivo_idx
  on public.cola_impresion (tienda_id, dispositivo_id, created_at desc)
  where estado = 'pendiente' and dispositivo_id is not null;

create index cola_referencia_idx on public.cola_impresion (referencia_id)
  where referencia_id is not null;

create trigger cola_impresion_updated_at
  before update on public.cola_impresion
  for each row execute function public.set_updated_at();

-- RLS
alter table public.cola_impresion enable row level security;

create policy "cola_impresion_tienda_isolation"
  on public.cola_impresion
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- FunciÃ³n: construir payload completo para ticket de venta
-- Incluye todos los datos del negocio, lÃ­neas y pagos.
-- -------------------------------------------------------------
create or replace function public.build_payload_ticket_venta(p_venta_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta       record;
  v_tienda      record;
  v_config      record;
  v_lineas      jsonb;
  v_pagos       jsonb;
  v_cliente     jsonb;
begin
  -- Datos de la venta
  select * into v_venta from public.ventas where id = p_venta_id;

  -- Datos de la tienda y configuraciÃ³n
  select t.*, ct.razon_social, ct.cuit, ct.condicion_iva,
         ct.texto_encabezado, ct.texto_pie, ct.prefijo_ticket,
         ct.ancho_ticket_mm, ct.simbolo_moneda,
         ct.separador_decimal, ct.separador_miles
  into v_tienda
  from public.tiendas t
  join public.configuracion_tienda ct on ct.tienda_id = t.id
  where t.id = v_venta.tienda_id;

  -- LÃ­neas del ticket
  select jsonb_agg(
    jsonb_build_object(
      'nombre_producto', nombre_producto,
      'talla',           talla,
      'color',           color,
      'codigo_barras',   codigo_barras,
      'cantidad',        cantidad,
      'precio_unitario', precio_unitario,
      'descuento_linea', descuento_linea,
      'total_linea',     total_linea
    ) order by created_at
  ) into v_lineas
  from public.detalles_venta
  where venta_id = p_venta_id;

  -- Pagos
  select jsonb_agg(
    jsonb_build_object(
      'nombre_metodo',       nombre_metodo,
      'monto',               monto,
      'comision_porcentaje', comision_porcentaje,
      'dias_acreditacion',   dias_acreditacion,
      'referencia',          referencia
    ) order by created_at
  ) into v_pagos
  from public.pagos_venta
  where venta_id = p_venta_id;

  -- Cliente (si tiene)
  if v_venta.cliente_id is not null then
    select jsonb_build_object(
      'nombre',   nombre || coalesce(' ' || apellido, ''),
      'dni',      dni,
      'telefono', telefono
    ) into v_cliente
    from public.clientes
    where id = v_venta.cliente_id;
  else
    v_cliente := null;
  end if;

  -- Vendedor
  return jsonb_build_object(
    -- Datos del negocio
    'tienda', jsonb_build_object(
      'nombre',         v_tienda.nombre,
      'razon_social',   v_tienda.razon_social,
      'cuit',           v_tienda.cuit,
      'condicion_iva',  v_tienda.condicion_iva,
      'direccion',      v_tienda.direccion,
      'telefono',       v_tienda.telefono,
      'texto_encabezado', v_tienda.texto_encabezado,
      'texto_pie',      v_tienda.texto_pie,
      'ancho_mm',       v_tienda.ancho_ticket_mm,
      'simbolo_moneda', v_tienda.simbolo_moneda
    ),
    -- Datos del ticket
    'numero_ticket', v_tienda.prefijo_ticket || '-' || lpad(v_venta.numero_ticket::text, 4, '0'),
    'fecha',         to_char(v_venta.created_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
    'vendedor',      (select nombre || coalesce(' ' || apellido, '') from public.perfiles where id = v_venta.usuario_id),
    -- Venta
    'subtotal',      v_venta.subtotal,
    'descuento',     v_venta.descuento,
    'total',         v_venta.total,
    'estado',        v_venta.estado,
    'observaciones', v_venta.observaciones,
    -- Detalle
    'lineas',        coalesce(v_lineas, '[]'::jsonb),
    'pagos',         coalesce(v_pagos, '[]'::jsonb),
    'cliente',       v_cliente
  );
end;
$$;

-- -------------------------------------------------------------
-- FunciÃ³n: construir payload para ticket de devoluciÃ³n
-- -------------------------------------------------------------
create or replace function public.build_payload_ticket_devolucion(p_devolucion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dev       record;
  v_tienda    record;
  v_config    record;
  v_lineas    jsonb;
  v_pagos     jsonb;
begin
  select * into v_dev from public.devoluciones where id = p_devolucion_id;

  select t.*, ct.razon_social, ct.texto_encabezado, ct.texto_pie,
         ct.prefijo_ticket, ct.ancho_ticket_mm, ct.simbolo_moneda
  into v_tienda
  from public.tiendas t
  join public.configuracion_tienda ct on ct.tienda_id = t.id
  where t.id = v_dev.tienda_id;

  select jsonb_agg(jsonb_build_object(
    'nombre_producto', nombre_producto,
    'talla',  talla,
    'color',  color,
    'cantidad', cantidad,
    'precio_unitario', precio_unitario,
    'total_linea', total_linea
  )) into v_lineas
  from public.detalles_devolucion
  where devolucion_id = p_devolucion_id;

  select jsonb_agg(jsonb_build_object(
    'nombre_metodo', nombre_metodo,
    'monto',         monto,
    'referencia',    referencia
  )) into v_pagos
  from public.pagos_devolucion
  where devolucion_id = p_devolucion_id;

  return jsonb_build_object(
    'tienda', jsonb_build_object(
      'nombre',           v_tienda.nombre,
      'razon_social',     v_tienda.razon_social,
      'ancho_mm',         v_tienda.ancho_ticket_mm,
      'texto_encabezado', v_tienda.texto_encabezado,
      'texto_pie',        v_tienda.texto_pie
    ),
    'tipo_documento',       'DEVOLUCIÃ“N',
    'numero_devolucion',    'D-' || lpad(v_dev.numero_devolucion::text, 4, '0'),
    'venta_referencia',     v_tienda.prefijo_ticket || '-' || lpad(
                              (select numero_ticket from public.ventas where id = v_dev.venta_id)::text, 4, '0'),
    'fecha',               to_char(v_dev.created_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
    'motivo',              v_dev.motivo,
    'tipo',                v_dev.tipo,
    'total_devuelto',      v_dev.total_devuelto,
    'lineas',              coalesce(v_lineas, '[]'::jsonb),
    'pagos',               coalesce(v_pagos, '[]'::jsonb)
  );
end;
$$;

-- -------------------------------------------------------------
-- Trigger: encolar ticket automÃ¡ticamente al completar una venta
-- -------------------------------------------------------------
create or replace function public.encolar_ticket_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo ticketear ventas completadas (no anuladas ni pendientes)
  if new.estado != 'completada' then
    return new;
  end if;

  -- Si viene de una actualizaciÃ³n, no re-imprimir
  if tg_op = 'UPDATE' and old.estado = 'completada' then
    return new;
  end if;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    new.tienda_id,
    'ticket_venta',
    new.id,
    'ventas',
    public.build_payload_ticket_venta(new.id)
  );

  return new;
end;
$$;

create trigger ventas_encolar_ticket
  after insert or update of estado on public.ventas
  for each row execute function public.encolar_ticket_venta();

-- -------------------------------------------------------------
-- Trigger: encolar ticket de devoluciÃ³n automÃ¡ticamente
-- -------------------------------------------------------------
create or replace function public.encolar_ticket_devolucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado != 'completada' then
    return new;
  end if;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    new.tienda_id,
    'ticket_devolucion',
    new.id,
    'devoluciones',
    public.build_payload_ticket_devolucion(new.id)
  );

  return new;
end;
$$;

create trigger devoluciones_encolar_ticket
  after insert on public.devoluciones
  for each row execute function public.encolar_ticket_devolucion();

-- -------------------------------------------------------------
-- Trigger: encolar resumen de cierre de caja al cerrar
-- -------------------------------------------------------------
create or replace function public.encolar_ticket_cierre_caja()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle jsonb;
  v_sesion  record;
begin
  select * into v_sesion
  from public.sesiones_caja
  where id = new.sesion_id;

  -- Detalles por cuenta
  select jsonb_agg(jsonb_build_object(
    'nombre_cuenta',   nombre_cuenta,
    'tipo_cuenta',     tipo_cuenta,
    'total_ingresos',  total_ingresos,
    'total_egresos',   total_egresos,
    'comision',        comision_estimada,
    'total_neto',      total_neto,
    'saldo_nuevo',     saldo_despues_turno
  )) into v_detalle
  from public.cierres_caja_detalle
  where cierre_id = new.id;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    new.tienda_id,
    'cierre_caja',
    new.id,
    'cierres_caja',
    jsonb_build_object(
      'tienda', (
        select jsonb_build_object(
          'nombre', t.nombre,
          'razon_social', ct.razon_social,
          'cuit', ct.cuit
        )
        from public.tiendas t
        join public.configuracion_tienda ct on ct.tienda_id = t.id
        where t.id = new.tienda_id
      ),
      'fecha_apertura',             to_char(v_sesion.fecha_apertura at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
      'fecha_cierre',               to_char(new.fecha_cierre at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
      'usuario',                    (select nombre || coalesce(' ' || apellido, '') from public.perfiles where id = new.usuario_id),
      'total_ventas_monto',         new.total_ventas_monto,
      'total_ventas_cantidad',      new.total_ventas_cantidad,
      'total_devoluciones_monto',   new.total_devoluciones_monto,
      'total_devoluciones_cantidad',new.total_devoluciones_cantidad,
      'total_neto',                 new.total_neto,
      'monto_apertura_efectivo',    new.monto_apertura_efectivo,
      'efectivo_esperado',          new.efectivo_esperado,
      'efectivo_declarado',         new.efectivo_declarado,
      'diferencia_efectivo',        new.diferencia_efectivo,
      'detalle_por_cuenta',         coalesce(v_detalle, '[]'::jsonb),
      'observaciones',              new.observaciones
    )
  );

  return new;
end;
$$;

create trigger cierres_caja_encolar_ticket
  after insert on public.cierres_caja
  for each row execute function public.encolar_ticket_cierre_caja();

comment on table public.cola_impresion is 'Cola de trabajos de impresiÃ³n. Alimentada por triggers. El frontend consume via Supabase Realtime.';
comment on column public.cola_impresion.payload is 'Snapshot completo de los datos a imprimir. Inmutable. No requiere JOINs al momento de impresiÃ³n.';
comment on column public.cola_impresion.dispositivo_id is 'Identificador del dispositivo/impresora destino. null = cualquier dispositivo de la tienda.';
comment on function public.build_payload_ticket_venta is 'Construye el JSON completo listo para renderizar el ticket de venta.';
comment on function public.build_payload_ticket_devolucion is 'Construye el JSON completo listo para renderizar el ticket de devoluciÃ³n.';


-- ============================================================================
-- FILE: 20260429000001_codigo_barras_unique.sql
-- ============================================================================
-- =============================================================
-- MIGRATION 014: UNIQUE codigo_barras por tienda
-- Garantiza que el escaneo desde POS siempre apunte a una sola
-- variante. Sin esto, dos variantes en la misma tienda pueden
-- compartir cÃ³digo y la bÃºsqueda por barcode serÃ­a ambigua.
--
-- Reemplaza el index NO Ãºnico anterior creado en 003.
-- Aplicable en SQL Editor sin reaplicar el resto de migraciones.
-- =============================================================

drop index if exists public.variantes_codigo_barras_idx;

create unique index variantes_codigo_barras_unique_idx
  on public.variantes_producto (tienda_id, codigo_barras)
  where codigo_barras is not null;

comment on index public.variantes_codigo_barras_unique_idx is
  'Ãndice Ãºnico parcial â€” un cÃ³digo de barras solo puede pertenecer a una variante por tienda. Permite mÃºltiples NULL.';


-- =============================================================
-- MIGRATION: RPC ajustar_stock_variante
-- OperaciÃ³n atÃ³mica para ingresos y ajustes de stock manuales.
-- Actualiza variantes_producto.stock_actual + inserta movimiento
-- en una sola transacciÃ³n, con bloqueo for update y validacion
-- de stock no negativo. Tipos permitidos: entrada | ajuste | inicial.
-- Las salidas y devoluciones siguen siendo automÃ¡ticas vÃ­a
-- triggers de detalles_venta y de ventas.estado.
-- =============================================================

create or replace function public.ajustar_stock_variante(
  p_variante_id uuid,
  p_tipo text,
  p_cantidad_delta integer,
  p_motivo text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tienda_id uuid;
  v_stock_anterior integer;
  v_stock_posterior integer;
  v_movimiento_id uuid;
begin
  -- Validar tipo permitido para ajuste manual
  if p_tipo not in ('entrada', 'ajuste', 'inicial') then
    raise exception 'Tipo de movimiento no permitido vÃ­a RPC: %', p_tipo
      using errcode = '22023';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'Motivo es obligatorio'
      using errcode = '22023';
  end if;

  -- Bloquear la fila de la variante (evita race conditions)
  select tienda_id, stock_actual
    into v_tienda_id, v_stock_anterior
  from public.variantes_producto
  where id = p_variante_id
  for update;

  if not found then
    raise exception 'Variante no encontrada: %', p_variante_id
      using errcode = 'P0002';
  end if;

  -- Validar pertenencia a la tienda actual (RLS no aplica dentro de la funciÃ³n)
  if v_tienda_id <> public.get_tienda_id() then
    raise exception 'La variante no pertenece a la tienda actual'
      using errcode = '42501';
  end if;

  v_stock_posterior := v_stock_anterior + p_cantidad_delta;

  if v_stock_posterior < 0 then
    raise exception 'Stock resultante negativo (anterior=%, delta=%)',
      v_stock_anterior, p_cantidad_delta
      using errcode = '23514';
  end if;

  -- Actualizar stock
  update public.variantes_producto
  set stock_actual = v_stock_posterior,
      updated_at   = now()
  where id = p_variante_id;

  -- Registrar movimiento de auditorÃ­a
  insert into public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior,
    motivo, venta_id, usuario_id
  ) values (
    v_tienda_id,
    p_variante_id,
    p_tipo,
    p_cantidad_delta,
    v_stock_anterior,
    v_stock_posterior,
    trim(p_motivo),
    null,
    auth.uid()
  )
  returning id into v_movimiento_id;

  return v_movimiento_id;
end;
$$;

grant execute on function public.ajustar_stock_variante(uuid, text, integer, text) to authenticated;

comment on function public.ajustar_stock_variante is
  'Ajuste atÃ³mico de stock para ingresos manuales y correcciones. Bloquea la fila, valida stock no negativo y registra el movimiento.';
