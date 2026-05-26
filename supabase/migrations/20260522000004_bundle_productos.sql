-- =============================================================
-- Bundle / Pack products
-- Un bundle es un producto virtual cuyo stock se calcula a partir
-- de sus componentes. Al vender un bundle, el stock de los
-- componentes se descuenta en cascada. El bundle no tiene stock
-- propio (stock_actual = 0 siempre).
-- =============================================================

-- -------------------------------------------------------------
-- 1. Columna es_bundle en productos
-- -------------------------------------------------------------
alter table public.productos
  add column if not exists es_bundle boolean not null default false;

-- -------------------------------------------------------------
-- 2. Tabla producto_componentes
-- -------------------------------------------------------------
create table if not exists public.producto_componentes (
  id                     uuid primary key default gen_random_uuid(),
  tienda_id              uuid not null references public.tiendas(id) on delete cascade,
  variante_bundle_id     uuid not null references public.variantes_producto(id) on delete cascade,
  componente_variante_id uuid not null references public.variantes_producto(id) on delete cascade,
  cantidad               numeric(10,3) not null check (cantidad > 0),
  created_at             timestamptz not null default now(),
  unique (variante_bundle_id, componente_variante_id)
);

alter table public.producto_componentes enable row level security;

create policy "bundle_componentes_tienda"
  on public.producto_componentes
  for all
  using (get_tienda_id() = tienda_id)
  with check (get_tienda_id() = tienda_id);

create index if not exists idx_pc_bundle  on public.producto_componentes (variante_bundle_id);
create index if not exists idx_pc_comp    on public.producto_componentes (componente_variante_id);
create index if not exists idx_pc_tienda  on public.producto_componentes (tienda_id);

-- -------------------------------------------------------------
-- 3. Recrear registrar_salida_stock_venta() con soporte bundle
-- -------------------------------------------------------------
create or replace function public.registrar_salida_stock_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_es_bundle       boolean;
  v_stock_anterior  numeric;
  v_comp            record;
  v_comp_anterior   numeric;
  v_cantidad_total  numeric;
begin
  if new.variante_id is null then return new; end if;

  -- ¿Es bundle?
  select p.es_bundle into v_es_bundle
  from variantes_producto vp
  join productos p on p.id = vp.producto_id
  where vp.id = new.variante_id;

  if v_es_bundle then
    -- Bundle: descontar stock de cada componente
    for v_comp in
      select pc.componente_variante_id,
             pc.cantidad,
             vp2.stock_actual as comp_stock_actual
      from producto_componentes pc
      join variantes_producto vp2 on vp2.id = pc.componente_variante_id
      where pc.variante_bundle_id = new.variante_id
        and pc.tienda_id = new.tienda_id
    loop
      v_cantidad_total := v_comp.cantidad * new.cantidad;
      v_comp_anterior  := v_comp.comp_stock_actual;

      if v_comp_anterior < v_cantidad_total then
        raise exception 'Stock insuficiente del componente de bundle. Stock actual: %, requerido: %',
          v_comp_anterior, v_cantidad_total;
      end if;

      update variantes_producto
        set stock_actual = stock_actual - v_cantidad_total,
            updated_at   = now()
        where id = v_comp.componente_variante_id;

      insert into movimientos_stock (
        tienda_id, variante_id, tipo, cantidad,
        stock_anterior, stock_posterior, motivo, venta_id, usuario_id
      )
      select
        new.tienda_id,
        v_comp.componente_variante_id,
        'salida',
        -v_cantidad_total,
        v_comp_anterior,
        v_comp_anterior - v_cantidad_total,
        'Venta #' || v.numero_ticket || ' (bundle)',
        new.venta_id,
        v.usuario_id
      from ventas v where v.id = new.venta_id;
    end loop;

    -- El bundle no tiene stock propio — no tocamos su stock_actual
    return new;
  end if;

  -- Producto normal: lógica original
  select stock_actual into v_stock_anterior
  from variantes_producto
  where id = new.variante_id;

  if v_stock_anterior < new.cantidad then
    raise exception 'Stock insuficiente para la variante %. Stock actual: %, requerido: %',
      new.variante_id, v_stock_anterior, new.cantidad;
  end if;

  update variantes_producto
    set stock_actual = stock_actual - new.cantidad,
        updated_at   = now()
    where id = new.variante_id;

  insert into movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior, motivo, venta_id, usuario_id
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
  from ventas v where v.id = new.venta_id;

  return new;
end;
$$;

-- -------------------------------------------------------------
-- 4. Recrear revertir_stock_anulacion() con soporte bundle
-- -------------------------------------------------------------
create or replace function public.revertir_stock_anulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle         record;
  v_stock_anterior  numeric;
  v_es_bundle       boolean;
  v_comp            record;
  v_comp_anterior   numeric;
  v_cantidad_total  numeric;
begin
  if new.estado != 'anulada' or old.estado = 'anulada' then
    return new;
  end if;

  for v_detalle in
    select * from detalles_venta
    where venta_id = new.id and variante_id is not null
  loop
    select p.es_bundle into v_es_bundle
    from variantes_producto vp
    join productos p on p.id = vp.producto_id
    where vp.id = v_detalle.variante_id;

    if v_es_bundle then
      -- Bundle: restaurar stock de cada componente
      for v_comp in
        select pc.componente_variante_id,
               pc.cantidad,
               vp2.stock_actual as comp_stock_actual
        from producto_componentes pc
        join variantes_producto vp2 on vp2.id = pc.componente_variante_id
        where pc.variante_bundle_id = v_detalle.variante_id
          and pc.tienda_id = new.tienda_id
      loop
        v_cantidad_total := v_comp.cantidad * v_detalle.cantidad;
        v_comp_anterior  := v_comp.comp_stock_actual;

        update variantes_producto
          set stock_actual = stock_actual + v_cantidad_total,
              updated_at   = now()
          where id = v_comp.componente_variante_id;

        insert into movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior, motivo, venta_id, usuario_id
        ) values (
          new.tienda_id,
          v_comp.componente_variante_id,
          'devolucion',
          v_cantidad_total,
          v_comp_anterior,
          v_comp_anterior + v_cantidad_total,
          'Anulación venta #' || new.numero_ticket || ' (bundle)',
          new.id,
          new.usuario_id
        );
      end loop;
      -- El bundle no tiene stock propio — nada que restaurar

    else
      -- Producto normal: lógica original
      select stock_actual into v_stock_anterior
      from variantes_producto
      where id = v_detalle.variante_id;

      update variantes_producto
        set stock_actual = stock_actual + v_detalle.cantidad,
            updated_at   = now()
        where id = v_detalle.variante_id;

      insert into movimientos_stock (
        tienda_id, variante_id, tipo, cantidad,
        stock_anterior, stock_posterior, motivo, venta_id, usuario_id
      ) values (
        new.tienda_id,
        v_detalle.variante_id,
        'devolucion',
        v_detalle.cantidad,
        v_stock_anterior,
        v_stock_anterior + v_detalle.cantidad,
        'Anulación venta #' || new.numero_ticket,
        new.id,
        new.usuario_id
      );
    end if;
  end loop;

  return new;
end;
$$;
