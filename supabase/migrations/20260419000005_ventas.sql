-- =============================================================
-- MIGRATION 005: VENTAS Y POS (cabecera y líneas)
-- Módulo de punto de venta: ventas y sus líneas de detalle.
-- NOTA: metodos_pago y pagos_venta están en 009_metodos_pago.sql
--       para poder referenciar cuentas_fondos (008).
--       sesion_caja_id se agrega en 010_sesiones_caja.sql.
-- Ejecutar DESPUÉS de 004_clientes.sql
-- =============================================================

-- -------------------------------------------------------------
-- VENTAS (cabecera)
-- -------------------------------------------------------------
create table if not exists public.ventas (
  id              uuid primary key default gen_random_uuid(),
  tienda_id       uuid not null references public.tiendas (id) on delete cascade,
  cliente_id      uuid references public.clientes (id) on delete set null,
  usuario_id      uuid references public.perfiles (id) on delete set null,
  -- sesion_caja_id se añade via ALTER en 010_sesiones_caja.sql
  -- Numeración legible del ticket (por tienda)
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

-- Índices críticos para rendimiento del POS y reportes
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
-- Secuencia de número de ticket por tienda (atómica)
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

-- Exponer la función como RPC segura para el frontend
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
-- DETALLES DE VENTA (líneas del ticket)
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
-- Trigger: actualizar métricas del cliente al completar una venta
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

comment on table public.ventas is 'Cabecera de cada transacción de venta en el POS.';
comment on table public.detalles_venta is 'Líneas del ticket. Snapshot inmutable del producto para trazabilidad histórica.';
comment on column public.detalles_venta.nombre_producto is 'Snapshot inmutable — no cambia si el producto se modifica luego.';
