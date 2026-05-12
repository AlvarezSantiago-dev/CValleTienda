-- =============================================================
-- MIGRATION 002: PERFILES DE USUARIO
-- Extiende auth.users con datos del rol y la tienda a la que pertenece.
-- Ejecutar DESPUÉS de 001_tiendas.sql
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

-- Índices
create index perfiles_tienda_id_idx on public.perfiles (tienda_id);
create index perfiles_rol_idx on public.perfiles (rol);

-- Partial index: solo usuarios activos (los más consultados)
create index perfiles_activos_idx on public.perfiles (tienda_id)
  where activo = true;

create trigger perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------
-- Helper: get_tienda_id()
-- Función SECURITY DEFINER que retorna el tienda_id del usuario
-- autenticado. Se usa en TODAS las políticas RLS para evitar
-- recursión al consultar la tabla perfiles desde sus propias
-- políticas (Postgres bloquea recursión de RLS).
-- Se define aquí (no en 003) porque las policies de perfiles
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
-- Trigger: crear perfil automáticamente cuando se registra
-- un nuevo usuario en auth.users.
--
-- Comportamiento:
--  - Si raw_user_meta_data trae 'tienda_id': el usuario se une a una
--    tienda existente con el rol indicado (default 'vendedor').
--  - Si NO trae 'tienda_id': es un registro nuevo de dueño — se crea
--    una tienda automáticamente usando 'nombre_tienda' de la metadata
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

-- Cada usuario puede ver SU propio perfil (sin recursión)
create policy "usuario_ve_su_propio_perfil"
  on public.perfiles
  for select
  using (id = auth.uid());

-- Y los perfiles de su misma tienda (usa helper SECURITY DEFINER
-- para evitar recursión de RLS)
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
comment on column public.perfiles.rol is 'owner: dueño de la tienda | admin: administrador | vendedor: operador de caja';

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
