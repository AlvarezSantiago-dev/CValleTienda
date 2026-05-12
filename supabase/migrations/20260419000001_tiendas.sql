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

-- Índice para búsquedas por nombre
create index tiendas_nombre_idx on public.tiendas (nombre);

-- Trigger para actualizar updated_at automáticamente
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

-- RLS (habilitado aquí, policies se crean en 002_perfiles.sql
-- una vez que la tabla perfiles existe)
alter table public.tiendas enable row level security;

comment on table public.tiendas is 'Tabla de tenants — cada fila es una tienda del sistema SaaS CValleTienda';
