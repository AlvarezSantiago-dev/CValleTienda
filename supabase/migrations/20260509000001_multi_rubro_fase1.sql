-- =============================================================
-- MIGRATION: MULTI-RUBRO FASE 1
-- Agrega soporte para múltiples rubros de negocio.
-- 1. Campo rubro en tiendas
-- 2. Campo unidad_de_medida en productos
-- 3. Decimales en stock_actual (variantes) y cantidad (detalles_venta)
-- Ejecutar DESPUÉS de todas las migraciones existentes.
-- =============================================================

-- -------------------------------------------------------------
-- 1. RUBRO EN TIENDAS
-- -------------------------------------------------------------
alter table public.tiendas
  add column if not exists rubro text not null default 'ropa';

alter table public.tiendas
  add constraint tiendas_rubro_check
  check (rubro in ('ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico'));

comment on column public.tiendas.rubro is 'Tipo de negocio: ropa, ferreteria, corralon, despensa, libreria, generico';

-- -------------------------------------------------------------
-- 2. UNIDAD DE MEDIDA EN PRODUCTOS
-- -------------------------------------------------------------
alter table public.productos
  add column if not exists unidad_de_medida text not null default 'unidad';

alter table public.productos
  add constraint productos_unidad_check
  check (unidad_de_medida in ('unidad', 'kg', 'gramo', 'tonelada', 'litro', 'metro', 'm2', 'm3', 'bolsa', 'pack', 'caja'));

comment on column public.productos.unidad_de_medida is 'Unidad en la que se vende el producto: unidad, kg, litro, metro, etc.';

-- -------------------------------------------------------------
-- 3. DECIMALES EN STOCK — variantes_producto
-- El constraint stock_actual >= 0 sigue siendo válido con numeric
-- -------------------------------------------------------------
alter table public.variantes_producto
  drop constraint if exists variantes_stock_check;

alter table public.variantes_producto
  alter column stock_actual type numeric(10,3) using stock_actual::numeric(10,3),
  alter column stock_minimo type numeric(10,3) using stock_minimo::numeric(10,3);

alter table public.variantes_producto
  add constraint variantes_stock_check check (stock_actual >= 0);

comment on column public.variantes_producto.stock_actual is 'Stock actual. Acepta decimales para productos vendidos por peso o medida (kg, litro, metro, etc.)';

-- -------------------------------------------------------------
-- 4. DECIMALES EN CANTIDAD — detalles_venta
-- El constraint cantidad > 0 sigue siendo válido con numeric
-- -------------------------------------------------------------
alter table public.detalles_venta
  drop constraint if exists detalles_cantidad_check;

alter table public.detalles_venta
  alter column cantidad type numeric(10,3) using cantidad::numeric(10,3);

alter table public.detalles_venta
  add constraint detalles_cantidad_check check (cantidad > 0);

comment on column public.detalles_venta.cantidad is 'Cantidad vendida. Acepta decimales para kg, litros, metros, etc.';

-- -------------------------------------------------------------
-- 5. DECIMALES EN CANTIDAD — movimientos_stock
-- Necesario porque los triggers insertan stock_actual (ahora
-- numeric) en estas columnas. Sin este cambio, la inserción
-- falla al vender/ajustar cantidades con decimales.
-- -------------------------------------------------------------
alter table public.movimientos_stock
  alter column cantidad       type numeric(10,3) using cantidad::numeric(10,3),
  alter column stock_anterior type numeric(10,3) using stock_anterior::numeric(10,3),
  alter column stock_posterior type numeric(10,3) using stock_posterior::numeric(10,3);

comment on column public.movimientos_stock.cantidad is 'Positivo = entrada. Negativo = salida. Acepta decimales para kg, litros, metros, etc.';

-- -------------------------------------------------------------
-- 6. DECIMALES EN CANTIDAD — detalles_devolucion
-- -------------------------------------------------------------
alter table public.detalles_devolucion
  drop constraint if exists dev_detalles_cantidad_check;

alter table public.detalles_devolucion
  alter column cantidad type numeric(10,3) using cantidad::numeric(10,3);

alter table public.detalles_devolucion
  add constraint dev_detalles_cantidad_check check (cantidad > 0);

comment on column public.detalles_devolucion.cantidad is 'Cantidad devuelta. Acepta decimales para kg, litros, metros, etc.';

-- -------------------------------------------------------------
-- 7. RECREAR TRIGGERS CON VARIABLES NUMÉRICAS
-- Los triggers de stock tenían variables locales declaradas como
-- INTEGER. Ahora que stock_actual y cantidad son numeric(10,3),
-- deben usar numeric para evitar truncación o error de casting.
-- -------------------------------------------------------------

-- Trigger: salida de stock al registrar una línea de venta
create or replace function public.registrar_salida_stock_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_anterior numeric;
begin
  if new.variante_id is null then
    return new;
  end if;

  select stock_actual into v_stock_anterior
  from public.variantes_producto
  where id = new.variante_id;

  if v_stock_anterior < new.cantidad then
    raise exception 'Stock insuficiente para la variante %. Stock actual: %, requerido: %',
      new.variante_id, v_stock_anterior, new.cantidad;
  end if;

  update public.variantes_producto
  set stock_actual = stock_actual - new.cantidad,
      updated_at   = now()
  where id = new.variante_id;

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

-- Trigger: revertir stock al anular una venta
create or replace function public.revertir_stock_anulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle        record;
  v_stock_anterior numeric;
begin
  if new.estado != 'anulada' or old.estado = 'anulada' then
    return new;
  end if;

  for v_detalle in
    select * from public.detalles_venta
    where venta_id = new.id and variante_id is not null
  loop
    select stock_actual into v_stock_anterior
    from public.variantes_producto
    where id = v_detalle.variante_id;

    update public.variantes_producto
    set stock_actual = stock_actual + v_detalle.cantidad,
        updated_at   = now()
    where id = v_detalle.variante_id;

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
      'Anulación venta #' || new.numero_ticket,
      new.id,
      new.usuario_id
    );
  end loop;

  return new;
end;
$$;

-- Trigger: reponer stock al registrar una línea de devolución
create or replace function public.reponer_stock_devolucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_anterior numeric;
begin
  if new.variante_id is null then
    return new;
  end if;

  select stock_actual into v_stock_anterior
  from public.variantes_producto
  where id = new.variante_id;

  update public.variantes_producto
  set stock_actual = stock_actual + new.cantidad,
      updated_at   = now()
  where id = new.variante_id;

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

-- -------------------------------------------------------------
-- 8. RECREAR ajustar_stock_variante CON PARÁMETRO NUMERIC
-- El RPC original acepta INTEGER para p_cantidad_delta.
-- Ahora debe aceptar numeric para soportar 25.500 kg, 1.750 m³.
-- Se elimina la función anterior (firma diferente = función distinta
-- en Postgres) y se crea la nueva con el tipo correcto.
-- -------------------------------------------------------------
drop function if exists public.ajustar_stock_variante(uuid, text, integer, text);

create or replace function public.ajustar_stock_variante(
  p_variante_id    uuid,
  p_tipo           text,
  p_cantidad_delta numeric,
  p_motivo         text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tienda_id      uuid;
  v_stock_anterior numeric;
  v_stock_posterior numeric;
  v_movimiento_id  uuid;
begin
  if p_tipo not in ('entrada', 'ajuste', 'inicial') then
    raise exception 'Tipo de movimiento no permitido vía RPC: %', p_tipo
      using errcode = '22023';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'Motivo es obligatorio'
      using errcode = '22023';
  end if;

  select tienda_id, stock_actual
    into v_tienda_id, v_stock_anterior
  from public.variantes_producto
  where id = p_variante_id
  for update;

  if not found then
    raise exception 'Variante no encontrada: %', p_variante_id
      using errcode = 'P0002';
  end if;

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

  update public.variantes_producto
  set stock_actual = v_stock_posterior,
      updated_at   = now()
  where id = p_variante_id;

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

grant execute on function public.ajustar_stock_variante(uuid, text, numeric, text) to authenticated;

comment on function public.ajustar_stock_variante is
  'Ajuste atómico de stock. Acepta cantidades decimales (kg, litros, metros, etc.). Bloquea la fila, valida stock no negativo y registra el movimiento.';
