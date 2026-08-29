-- RLS: wrap get_tienda_id()/auth.uid() en (select …) + índices trigram para ILIKE.

-- -------------------------------------------------------
-- Helpers (auth.uid() una sola vez por statement)
-- -------------------------------------------------------
create or replace function public.get_tienda_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tienda_id from public.perfiles where id = (select auth.uid())
$$;

create or replace function public.get_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = (select auth.uid())
$$;

-- -------------------------------------------------------
-- Políticas tenant — aislamiento simple (FOR ALL)
-- -------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('categorias', 'categorias_tienda_isolation'),
      ('tallas', 'tallas_tienda_isolation'),
      ('colores', 'colores_tienda_isolation'),
      ('productos', 'productos_tienda_isolation'),
      ('variantes_producto', 'variantes_tienda_isolation'),
      ('clientes', 'clientes_tienda_isolation'),
      ('ventas', 'ventas_tienda_isolation'),
      ('detalles_venta', 'detalles_venta_tienda_isolation'),
      ('pagos_venta', 'pagos_venta_tienda_isolation'),
      ('sesiones_caja', 'sesiones_caja_tienda_isolation'),
      ('cierres_caja', 'cierres_caja_tienda_isolation'),
      ('cierres_caja_detalle', 'cierres_detalle_tienda_isolation'),
      ('devoluciones', 'devoluciones_tienda_isolation'),
      ('detalles_devolucion', 'detalles_devolucion_tienda_isolation'),
      ('pagos_devolucion', 'pagos_devolucion_tienda_isolation'),
      ('configuracion_etiquetas', 'etiquetas_tienda_isolation'),
      ('producto_packs', 'producto_packs_tienda_isolation'),
      ('producto_pack_tramos', 'producto_pack_tramos_tienda_isolation'),
      ('producto_tramos_cantidad', 'producto_tramos_cantidad_tienda_isolation')
    ) as t(tbl, pol)
  loop
    execute format('drop policy if exists %I on public.%I', r.pol, r.tbl);
    execute format(
      'create policy %I on public.%I for all
         using (tienda_id = (select public.get_tienda_id()))
         with check (tienda_id = (select public.get_tienda_id()))',
      r.pol, r.tbl
    );
  end loop;
end $$;

-- Catálogo / pedidos (authenticated)
drop policy if exists pedidos_catalogo_tienda_isolation on public.pedidos_catalogo;
create policy pedidos_catalogo_tienda_isolation
  on public.pedidos_catalogo for all to authenticated
  using (tienda_id = (select public.get_tienda_id()))
  with check (tienda_id = (select public.get_tienda_id()));

drop policy if exists pedido_catalogo_items_tienda_isolation on public.pedido_catalogo_items;
create policy pedido_catalogo_items_tienda_isolation
  on public.pedido_catalogo_items for all to authenticated
  using (tienda_id = (select public.get_tienda_id()))
  with check (tienda_id = (select public.get_tienda_id()));

drop policy if exists notificaciones_tienda_isolation on public.notificaciones;
create policy notificaciones_tienda_isolation
  on public.notificaciones for all to authenticated
  using (tienda_id = (select public.get_tienda_id()))
  with check (tienda_id = (select public.get_tienda_id()));

-- Kits / bundles / historial
drop policy if exists kit_componentes_tienda_rw on public.kit_componentes;
create policy kit_componentes_tienda_rw on public.kit_componentes
  for all
  using (tienda_id = (select public.get_tienda_id()))
  with check (tienda_id = (select public.get_tienda_id()));

drop policy if exists bundle_componentes_tienda on public.producto_componentes;
create policy bundle_componentes_tienda on public.producto_componentes
  for all
  using (tienda_id = (select public.get_tienda_id()))
  with check (tienda_id = (select public.get_tienda_id()));

drop policy if exists historial_precios_select on public.historial_precios;
create policy historial_precios_select on public.historial_precios
  for select using (tienda_id = (select public.get_tienda_id()));

drop policy if exists historial_precios_insert on public.historial_precios;
create policy historial_precios_insert on public.historial_precios
  for insert with check (tienda_id = (select public.get_tienda_id()));

-- Perfiles
drop policy if exists usuario_ve_su_propio_perfil on public.perfiles;
create policy usuario_ve_su_propio_perfil on public.perfiles
  for select using (id = (select auth.uid()));

drop policy if exists usuarios_ven_perfiles_de_su_tienda on public.perfiles;
create policy usuarios_ven_perfiles_de_su_tienda on public.perfiles
  for select using (tienda_id = (select public.get_tienda_id()));

drop policy if exists usuario_actualiza_su_perfil on public.perfiles;
create policy usuario_actualiza_su_perfil on public.perfiles
  for update using (id = (select auth.uid()));

drop policy if exists admin_crea_perfiles on public.perfiles;
create policy admin_crea_perfiles on public.perfiles
  for insert with check (
    tienda_id = (select public.get_tienda_id())
    and (select public.get_rol()) in ('owner', 'admin')
  );

drop policy if exists admin_desactiva_perfiles on public.perfiles;
create policy admin_desactiva_perfiles on public.perfiles
  for update using (
    tienda_id = (select public.get_tienda_id())
    and (select public.get_rol()) in ('owner', 'admin')
  );

-- Tiendas
drop policy if exists usuarios_ven_su_tienda on public.tiendas;
create policy usuarios_ven_su_tienda on public.tiendas
  for select using (id = (select public.get_tienda_id()));

drop policy if exists owner_actualiza_tienda on public.tiendas;
create policy owner_actualiza_tienda on public.tiendas
  for update using (
    id = (select public.get_tienda_id())
    and (select public.get_rol()) = 'owner'
  );

-- Movimientos stock
drop policy if exists movimientos_select_tienda on public.movimientos_stock;
create policy movimientos_select_tienda on public.movimientos_stock
  for select using (tienda_id = (select public.get_tienda_id()));

drop policy if exists admin_inserta_movimientos on public.movimientos_stock;
create policy admin_inserta_movimientos on public.movimientos_stock
  for insert with check (
    tienda_id = (select public.get_tienda_id())
    and (
      tipo in ('entrada', 'ajuste', 'inicial')
      or exists (
        select 1 from public.perfiles
        where id = (select auth.uid())
          and tienda_id = (select public.get_tienda_id())
          and rol in ('owner', 'admin')
      )
    )
  );

-- Config tienda
drop policy if exists config_tienda_select on public.configuracion_tienda;
create policy config_tienda_select on public.configuracion_tienda
  for select using (tienda_id = (select public.get_tienda_id()));

drop policy if exists config_tienda_update on public.configuracion_tienda;
create policy config_tienda_update on public.configuracion_tienda
  for update using (
    tienda_id = (select public.get_tienda_id())
    and exists (
      select 1 from public.perfiles
      where id = (select auth.uid()) and rol in ('owner', 'admin')
    )
  );

drop policy if exists config_tienda_insert on public.configuracion_tienda;
create policy config_tienda_insert on public.configuracion_tienda
  for insert with check (tienda_id = (select public.get_tienda_id()));

-- Métodos de pago
drop policy if exists metodos_pago_select on public.metodos_pago;
create policy metodos_pago_select on public.metodos_pago
  for select using (tienda_id = (select public.get_tienda_id()));

drop policy if exists metodos_pago_write on public.metodos_pago;
create policy metodos_pago_write on public.metodos_pago
  for insert with check (
    tienda_id = (select public.get_tienda_id())
    and exists (
      select 1 from public.perfiles
      where id = (select auth.uid()) and rol in ('owner', 'admin')
    )
  );

drop policy if exists metodos_pago_update on public.metodos_pago;
create policy metodos_pago_update on public.metodos_pago
  for update using (
    tienda_id = (select public.get_tienda_id())
    and exists (
      select 1 from public.perfiles
      where id = (select auth.uid()) and rol in ('owner', 'admin')
    )
  );

-- Cuentas fondos
drop policy if exists cuentas_fondos_select on public.cuentas_fondos;
create policy cuentas_fondos_select on public.cuentas_fondos
  for select using (tienda_id = (select public.get_tienda_id()));

drop policy if exists cuentas_fondos_write on public.cuentas_fondos;
create policy cuentas_fondos_write on public.cuentas_fondos
  for insert with check (
    tienda_id = (select public.get_tienda_id())
    and exists (
      select 1 from public.perfiles
      where id = (select auth.uid()) and rol in ('owner', 'admin')
    )
  );

drop policy if exists cuentas_fondos_update on public.cuentas_fondos;
create policy cuentas_fondos_update on public.cuentas_fondos
  for update using (
    tienda_id = (select public.get_tienda_id())
    and exists (
      select 1 from public.perfiles
      where id = (select auth.uid()) and rol in ('owner', 'admin')
    )
  );

-- Movimientos fondos
drop policy if exists movimientos_fondos_select on public.movimientos_fondos;
create policy movimientos_fondos_select on public.movimientos_fondos
  for select using (tienda_id = (select public.get_tienda_id()));

drop policy if exists movimientos_fondos_insert on public.movimientos_fondos;
create policy movimientos_fondos_insert on public.movimientos_fondos
  for insert with check (tienda_id = (select public.get_tienda_id()));

-- -------------------------------------------------------
-- pg_trgm + índices parciales
-- -------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists productos_nombre_trgm_idx
  on public.productos using gin (nombre gin_trgm_ops);

create index if not exists productos_codigo_base_trgm_idx
  on public.productos using gin (codigo_base gin_trgm_ops)
  where codigo_base is not null;

create index if not exists variantes_codigo_barras_trgm_idx
  on public.variantes_producto using gin (codigo_barras gin_trgm_ops)
  where codigo_barras is not null;

create index if not exists productos_catalogo_visible_idx
  on public.productos (tienda_id, categoria_id)
  where visible_en_catalogo = true and activo = true;

create index if not exists variantes_bajo_stock_idx
  on public.variantes_producto (tienda_id)
  where activo = true and stock_minimo > 0 and stock_actual <> -1;
