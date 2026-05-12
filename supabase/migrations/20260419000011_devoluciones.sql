-- =============================================================
-- MIGRATION 011: DEVOLUCIONES
-- Módulo completo de devoluciones: totales y parciales.
-- Revierte stock, mueve fondos y genera ticket de devolución.
-- Ejecutar DESPUÉS de 010_sesiones_caja.sql
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
  numero_devolucion   integer not null,      -- Numeración secuencial por tienda
  tipo                text not null default 'parcial',   -- total | parcial
  motivo              text not null,         -- Requerido: qué pasó con el producto
  estado              text not null default 'completada',
  total_devuelto      numeric(14, 2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint devoluciones_tipo_check check (tipo in ('total', 'parcial')),
  constraint devoluciones_estado_check check (estado in ('completada', 'anulada')),
  constraint devoluciones_total_check check (total_devuelto >= 0),
  constraint devoluciones_numero_unique unique (tienda_id, numero_devolucion)
);

-- Índices
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
-- DETALLES DE DEVOLUCIÓN (líneas)
-- Qué artículos se devuelven y en qué cantidad
-- -------------------------------------------------------------
create table if not exists public.detalles_devolucion (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  devolucion_id     uuid not null references public.devoluciones (id) on delete cascade,
  detalle_venta_id  uuid references public.detalles_venta (id) on delete set null,
  variante_id       uuid references public.variantes_producto (id) on delete set null,
  -- Snapshot inmutable del artículo devuelto
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
-- PAGOS DE DEVOLUCIÓN
-- Cómo se le devuelve el dinero al cliente.
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
-- Trigger: al pagar una devolución, descontar fondos de la cuenta
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
    p_concepto        => 'Devolución #' || v_numero_dev || ' — ' || new.nombre_metodo,
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
-- Trigger: al completar una devolución, restituir stock
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
    'Devolución #' || d.numero_devolucion,
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
-- Trigger: actualizar métricas del cliente al hacer una devolución
-- Decrementa total_compras (si es devolución total), monto_total
-- y actualiza ultima_compra al timestamp de la devolución.
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
-- Secuencia de número de devolución por tienda (atómica)
-- El frontend llama esta función para obtener el próximo número
-- antes de insertar la devolución.
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

comment on table public.devoluciones is 'Devoluciones de ventas. Puede ser total o parcial. Revierte stock y fondos automáticamente.';
comment on table public.detalles_devolucion is 'Artículos devueltos. Repone stock via trigger.';
comment on table public.pagos_devolucion is 'Cómo se devuelve el dinero al cliente. Descuenta saldo de la cuenta de fondos automáticamente.';
