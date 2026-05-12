-- =============================================================
-- FIX RLS RECURSIVO en perfiles y tiendas
-- Aplicar en el SQL Editor de Supabase para arreglar el loop de
-- redirección 307 en /dashboard sin reaplicar todas las migraciones.
--
-- Causa: las políticas originales hacían SELECT a perfiles desde
-- las propias políticas de perfiles → recursión infinita → la
-- query devolvía null silenciosamente → loop de redirect.
--
-- Solución: helper SECURITY DEFINER que bypassea RLS.
-- =============================================================

-- 1. Helpers SECURITY DEFINER
create or replace function public.get_tienda_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tienda_id from public.perfiles where id = auth.uid()
$$;

create or replace function public.get_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid()
$$;

-- 2. Drop policies recursivas existentes
drop policy if exists "usuarios_ven_perfiles_de_su_tienda" on public.perfiles;
drop policy if exists "usuario_actualiza_su_perfil"        on public.perfiles;
drop policy if exists "admin_crea_perfiles"                on public.perfiles;
drop policy if exists "admin_desactiva_perfiles"           on public.perfiles;
drop policy if exists "usuario_ve_su_propio_perfil"        on public.perfiles;

drop policy if exists "usuarios_ven_su_tienda"   on public.tiendas;
drop policy if exists "owner_actualiza_tienda"   on public.tiendas;

-- 3. Recrear policies sin recursión
create policy "usuario_ve_su_propio_perfil"
  on public.perfiles
  for select
  using (id = auth.uid());

create policy "usuarios_ven_perfiles_de_su_tienda"
  on public.perfiles
  for select
  using (tienda_id = public.get_tienda_id());

create policy "usuario_actualiza_su_perfil"
  on public.perfiles
  for update
  using (id = auth.uid());

create policy "admin_crea_perfiles"
  on public.perfiles
  for insert
  with check (
    tienda_id = public.get_tienda_id()
    and public.get_rol() in ('owner', 'admin')
  );

create policy "admin_desactiva_perfiles"
  on public.perfiles
  for update
  using (
    tienda_id = public.get_tienda_id()
    and public.get_rol() in ('owner', 'admin')
  );

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
