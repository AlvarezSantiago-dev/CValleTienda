-- =============================================================
-- MIGRATION 004: CLIENTES (CRM)
-- Gestión de clientes de la tienda con historial de compras.
-- Ejecutar DESPUÉS de 003_productos.sql
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
  -- Métricas calculadas / actualizadas por triggers
  total_compras    integer not null default 0,     -- Cantidad de ventas
  monto_total      numeric(14, 2) not null default 0, -- Suma histórica
  ultima_compra    timestamptz,
  activo           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Índices para búsquedas frecuentes en POS y CRM
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
comment on column public.clientes.total_compras is 'Contador actualizado automáticamente por trigger al cerrar una venta.';
comment on column public.clientes.monto_total is 'Suma histórica de compras. Actualizado por trigger.';
