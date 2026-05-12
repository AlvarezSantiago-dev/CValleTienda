-- =============================================================
-- MIGRATION: RPC ajustar_stock_variante
-- Operación atómica para ingresos y ajustes de stock manuales.
-- Actualiza variantes_producto.stock_actual + inserta movimiento
-- en una sola transacción, con bloqueo for update y validacion
-- de stock no negativo. Tipos permitidos: entrada | ajuste | inicial.
-- Las salidas y devoluciones siguen siendo automáticas vía
-- triggers de detalles_venta y de ventas.estado.
-- =============================================================

create or replace function public.ajustar_stock_variante(
  p_variante_id uuid,
  p_tipo text,
  p_cantidad_delta integer,
  p_motivo text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tienda_id uuid;
  v_stock_anterior integer;
  v_stock_posterior integer;
  v_movimiento_id uuid;
begin
  -- Validar tipo permitido para ajuste manual
  if p_tipo not in ('entrada', 'ajuste', 'inicial') then
    raise exception 'Tipo de movimiento no permitido vía RPC: %', p_tipo
      using errcode = '22023';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'Motivo es obligatorio'
      using errcode = '22023';
  end if;

  -- Bloquear la fila de la variante (evita race conditions)
  select tienda_id, stock_actual
    into v_tienda_id, v_stock_anterior
  from public.variantes_producto
  where id = p_variante_id
  for update;

  if not found then
    raise exception 'Variante no encontrada: %', p_variante_id
      using errcode = 'P0002';
  end if;

  -- Validar pertenencia a la tienda actual (RLS no aplica dentro de la función)
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

  -- Actualizar stock
  update public.variantes_producto
  set stock_actual = v_stock_posterior,
      updated_at   = now()
  where id = p_variante_id;

  -- Registrar movimiento de auditoría
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

grant execute on function public.ajustar_stock_variante(uuid, text, integer, text) to authenticated;

comment on function public.ajustar_stock_variante is
  'Ajuste atómico de stock para ingresos manuales y correcciones. Bloquea la fila, valida stock no negativo y registra el movimiento.';
