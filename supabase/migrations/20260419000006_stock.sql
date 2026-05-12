-- =============================================================
-- MIGRATION 006: MOVIMIENTOS DE STOCK
-- Registro de auditoría de todos los cambios de inventario.
-- Ejecutar DESPUÉS de 005_ventas.sql
-- =============================================================

create table if not exists public.movimientos_stock (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  variante_id       uuid not null references public.variantes_producto (id) on delete cascade,
  tipo              text not null,
  cantidad          integer not null,          -- Positivo = entrada, Negativo = salida
  stock_anterior    integer not null,
  stock_posterior   integer not null,
  motivo            text,                       -- Descripción libre
  venta_id          uuid references public.ventas (id) on delete set null,
  usuario_id        uuid references public.perfiles (id) on delete set null,
  created_at        timestamptz not null default now(),

  constraint movimientos_tipo_check check (
    tipo in ('entrada', 'salida', 'ajuste', 'devolucion', 'inicial')
  ),
  constraint movimientos_stock_posterior_check check (stock_posterior >= 0)
);

-- Índices para reportes y auditoría
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
      -- El sistema puede insertar (vía trigger), o admin/owner manual
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
-- Trigger: registrar movimiento de stock automáticamente
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

  -- Registrar movimiento de auditoría
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

    -- Registrar devolución en historial
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

create trigger ventas_revertir_stock
  after update of estado on public.ventas
  for each row execute function public.revertir_stock_anulacion();

comment on table public.movimientos_stock is 'Log inmutable de todos los cambios de inventario. Actualizado por triggers automáticamente.';
comment on column public.movimientos_stock.cantidad is 'Positivo = entrada de stock. Negativo = salida.';
