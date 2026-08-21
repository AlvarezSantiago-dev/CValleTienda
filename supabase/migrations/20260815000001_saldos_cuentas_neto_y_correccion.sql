-- =============================================================
-- Saldos al momento: ventas acreditan neto, corrección histórica
-- de comisiones, anulación revierte neto, egresos validan contra
-- saldo ya acreditado (no contra plata pendiente).
-- =============================================================

-- 1) Corrección histórica ANTES de cambiar el trigger.
--    Resta comisiones de ventas completadas que nunca se descontaron.
--    No usa registrar_movimiento_fondo(ajuste) porque esa rama
--    reemplaza saldo_actual por p_monto (absoluto).
do $$
declare
  r record;
  v_saldo numeric;
  v_nuevo numeric;
begin
  for r in
    select
      c.id,
      c.tienda_id,
      coalesce((
        select sum(pv.comision_calculada)
        from public.pagos_venta pv
        inner join public.ventas v on v.id = pv.venta_id
        where pv.cuenta_fondo_id = c.id
          and v.estado = 'completada'
      ), 0) as comisiones
    from public.cuentas_fondos c
  loop
    if r.comisiones <= 0 then
      continue;
    end if;

    select saldo_actual into v_saldo
    from public.cuentas_fondos
    where id = r.id
    for update;

    v_nuevo := v_saldo - r.comisiones;

    update public.cuentas_fondos
    set saldo_actual = v_nuevo,
        updated_at = now()
    where id = r.id;

    insert into public.movimientos_fondos (
      tienda_id, cuenta_fondo_id, tipo, concepto, monto,
      saldo_anterior, saldo_posterior, venta_id, usuario_id
    ) values (
      r.tienda_id,
      r.id,
      'ajuste',
      'Ajuste: comisiones históricas no descontadas',
      r.comisiones,
      v_saldo,
      v_nuevo,
      null,
      null
    );
  end loop;
end;
$$;

-- 2) Ventas nuevas: acreditar monto_neto
create or replace function public.mover_fondos_por_pago_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero_ticket integer;
begin
  if new.cuenta_fondo_id is null then
    return new;
  end if;

  if coalesce(new.monto_neto, 0) <= 0 then
    return new;
  end if;

  select numero_ticket into v_numero_ticket
  from public.ventas
  where id = new.venta_id;

  perform public.registrar_movimiento_fondo(
    p_cuenta_fondo_id => new.cuenta_fondo_id,
    p_tipo            => 'ingreso',
    p_concepto        => 'Venta #' || v_numero_ticket || ' — ' || new.nombre_metodo,
    p_monto           => new.monto_neto,
    p_venta_id        => new.venta_id,
    p_usuario_id      => (select usuario_id from public.ventas where id = new.venta_id)
  );

  return new;
end;
$$;

-- 3) Anulación: revertir el neto (alineado al alta)
create or replace function public.revertir_fondos_anulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago record;
begin
  if new.estado <> 'anulada' or old.estado = 'anulada' then
    return new;
  end if;

  for v_pago in
    select cuenta_fondo_id, monto_neto, nombre_metodo
    from public.pagos_venta
    where venta_id = new.id
      and cuenta_fondo_id is not null
      and coalesce(monto_neto, 0) > 0
  loop
    perform public.registrar_movimiento_fondo(
      p_cuenta_fondo_id => v_pago.cuenta_fondo_id,
      p_tipo            => 'egreso',
      p_concepto        => 'Anulación Venta #' || new.numero_ticket || ' — ' || v_pago.nombre_metodo,
      p_monto           => v_pago.monto_neto,
      p_venta_id        => new.id,
      p_usuario_id      => new.usuario_id
    );
  end loop;

  return new;
end;
$$;

-- 4) Pendiente + saldo al momento (días corridos ART)
create or replace function public.monto_pendiente_acreditar(p_cuenta_fondo_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(pv.monto_neto), 0)
  from public.pagos_venta pv
  inner join public.ventas v on v.id = pv.venta_id
  where pv.cuenta_fondo_id = p_cuenta_fondo_id
    and v.estado = 'completada'
    and coalesce(pv.dias_acreditacion, 0) > 0
    and (
      ((pv.created_at at time zone 'America/Argentina/Buenos_Aires')::date
        + pv.dias_acreditacion)
      > (timezone('America/Argentina/Buenos_Aires', now()))::date
    );
$$;

create or replace function public.saldo_al_momento(p_cuenta_fondo_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select c.saldo_actual - public.monto_pendiente_acreditar(c.id)
  from public.cuentas_fondos c
  where c.id = p_cuenta_fondo_id;
$$;

-- 5) Egresos manuales: validar contra saldo al momento
create or replace function public.registrar_movimiento_caja_manual(
  p_cuenta_fondo_id uuid,
  p_tipo            text,
  p_concepto        text,
  p_monto           numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id       uuid;
  v_usuario_id      uuid;
  v_sesion_id       uuid;
  v_saldo_anterior  numeric;
  v_saldo_nuevo     numeric;
  v_activo          boolean;
  v_cuenta_tienda   uuid;
  v_mov_id          uuid;
  v_concepto        text;
  v_al_momento      numeric;
begin
  v_usuario_id := auth.uid();
  if v_usuario_id is null then
    raise exception 'No autenticado';
  end if;

  v_tienda_id := public.get_tienda_id();
  if v_tienda_id is null then
    raise exception 'Tienda no encontrada';
  end if;

  if p_tipo not in ('ingreso', 'egreso') then
    raise exception 'Tipo inválido: solo ingreso o egreso';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  v_concepto := trim(coalesce(p_concepto, ''));
  if v_concepto = '' then
    raise exception 'El concepto no puede estar vacío';
  end if;

  select id into v_sesion_id
  from public.sesiones_caja
  where tienda_id = v_tienda_id
    and estado = 'abierta'
  limit 1;

  if v_sesion_id is null then
    raise exception 'La caja debe estar abierta';
  end if;

  select saldo_actual, activo, tienda_id
  into v_saldo_anterior, v_activo, v_cuenta_tienda
  from public.cuentas_fondos
  where id = p_cuenta_fondo_id
  for update;

  if not found or v_cuenta_tienda is distinct from v_tienda_id then
    raise exception 'La cuenta seleccionada no existe';
  end if;

  if not coalesce(v_activo, false) then
    raise exception 'La cuenta seleccionada no está activa';
  end if;

  v_saldo_nuevo := v_saldo_anterior + public._delta_movimiento_fondo(p_tipo, p_monto);

  if v_saldo_nuevo < 0 then
    raise exception 'Saldo insuficiente para este egreso';
  end if;

  if p_tipo = 'egreso' then
    v_al_momento := coalesce(public.saldo_al_momento(p_cuenta_fondo_id), 0);
    if p_monto > greatest(0, v_al_momento) then
      raise exception 'Saldo al momento insuficiente para este egreso';
    end if;
  end if;

  update public.cuentas_fondos
  set saldo_actual = v_saldo_nuevo,
      updated_at = now()
  where id = p_cuenta_fondo_id;

  insert into public.movimientos_fondos (
    tienda_id, cuenta_fondo_id, tipo, concepto, monto,
    saldo_anterior, saldo_posterior, venta_id, usuario_id, sesion_caja_id
  ) values (
    v_tienda_id, p_cuenta_fondo_id, p_tipo, v_concepto, p_monto,
    v_saldo_anterior, v_saldo_nuevo, null, v_usuario_id, v_sesion_id
  )
  returning id into v_mov_id;

  return v_mov_id;
end;
$$;

create or replace function public.editar_movimiento_caja_manual(
  p_id              uuid,
  p_cuenta_fondo_id uuid,
  p_tipo            text,
  p_concepto        text,
  p_monto           numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id         uuid;
  v_sesion_id         uuid;
  v_sesion_apertura   timestamptz;
  v_mov               public.movimientos_fondos%rowtype;
  v_cuenta_orig_id    uuid;
  v_cuenta_dest_id    uuid;
  v_saldo_orig        numeric;
  v_saldo_dest        numeric;
  v_activo_dest       boolean;
  v_tienda_dest       uuid;
  v_saldo_despues_rev numeric;
  v_saldo_nuevo       numeric;
  v_concepto          text;
  v_id_a              uuid;
  v_id_b              uuid;
  v_al_momento        numeric;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  v_tienda_id := public.get_tienda_id();
  if v_tienda_id is null then
    raise exception 'Tienda no encontrada';
  end if;

  if public.get_rol() is distinct from 'owner'
     and public.get_rol() is distinct from 'admin' then
    raise exception 'Sin permiso para modificar movimientos de caja';
  end if;

  if p_tipo not in ('ingreso', 'egreso') then
    raise exception 'Tipo inválido: solo ingreso o egreso';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  v_concepto := trim(coalesce(p_concepto, ''));
  if v_concepto = '' then
    raise exception 'El concepto no puede estar vacío';
  end if;

  select id, fecha_apertura
  into v_sesion_id, v_sesion_apertura
  from public.sesiones_caja
  where tienda_id = v_tienda_id
    and estado = 'abierta'
  limit 1;

  if v_sesion_id is null then
    raise exception 'La caja debe estar abierta';
  end if;

  select * into v_mov
  from public.movimientos_fondos
  where id = p_id
    and tienda_id = v_tienda_id
  for update;

  if not found then
    raise exception 'Movimiento no encontrado';
  end if;

  if v_mov.venta_id is not null then
    raise exception 'Solo se pueden editar movimientos manuales';
  end if;

  if not (
    v_mov.sesion_caja_id = v_sesion_id
    or (v_mov.sesion_caja_id is null and v_mov.created_at >= v_sesion_apertura)
  ) then
    raise exception 'El movimiento no pertenece al turno abierto';
  end if;

  v_cuenta_orig_id := v_mov.cuenta_fondo_id;
  v_cuenta_dest_id := p_cuenta_fondo_id;

  if v_cuenta_orig_id = v_cuenta_dest_id then
    select saldo_actual into v_saldo_orig
    from public.cuentas_fondos
    where id = v_cuenta_orig_id
      and tienda_id = v_tienda_id
    for update;

    if not found then
      raise exception 'La cuenta seleccionada no existe';
    end if;

    v_saldo_despues_rev := v_saldo_orig - public._delta_movimiento_fondo(v_mov.tipo, v_mov.monto);
    v_saldo_nuevo := v_saldo_despues_rev + public._delta_movimiento_fondo(p_tipo, p_monto);

    if v_saldo_nuevo < 0 then
      raise exception 'Saldo insuficiente para este egreso';
    end if;

    if p_tipo = 'egreso' then
      v_al_momento := coalesce(public.saldo_al_momento(v_cuenta_dest_id), 0)
        - public._delta_movimiento_fondo(v_mov.tipo, v_mov.monto);
      if p_monto > greatest(0, v_al_momento) then
        raise exception 'Saldo al momento insuficiente para este egreso';
      end if;
    end if;

    update public.cuentas_fondos
    set saldo_actual = v_saldo_nuevo,
        updated_at = now()
    where id = v_cuenta_orig_id;

    update public.movimientos_fondos
    set cuenta_fondo_id = v_cuenta_dest_id,
        tipo = p_tipo,
        concepto = v_concepto,
        monto = p_monto,
        saldo_anterior = v_saldo_despues_rev,
        saldo_posterior = v_saldo_nuevo,
        sesion_caja_id = v_sesion_id
    where id = p_id;
  else
    if v_cuenta_orig_id < v_cuenta_dest_id then
      v_id_a := v_cuenta_orig_id;
      v_id_b := v_cuenta_dest_id;
    else
      v_id_a := v_cuenta_dest_id;
      v_id_b := v_cuenta_orig_id;
    end if;

    perform 1 from public.cuentas_fondos where id = v_id_a for update;
    perform 1 from public.cuentas_fondos where id = v_id_b for update;

    select saldo_actual into v_saldo_orig
    from public.cuentas_fondos
    where id = v_cuenta_orig_id
      and tienda_id = v_tienda_id;

    if not found then
      raise exception 'La cuenta original no existe';
    end if;

    select saldo_actual, activo, tienda_id
    into v_saldo_dest, v_activo_dest, v_tienda_dest
    from public.cuentas_fondos
    where id = v_cuenta_dest_id;

    if not found or v_tienda_dest is distinct from v_tienda_id then
      raise exception 'La cuenta seleccionada no existe';
    end if;

    if not coalesce(v_activo_dest, false) then
      raise exception 'La cuenta seleccionada no está activa';
    end if;

    v_saldo_despues_rev := v_saldo_orig - public._delta_movimiento_fondo(v_mov.tipo, v_mov.monto);
    v_saldo_nuevo := v_saldo_dest + public._delta_movimiento_fondo(p_tipo, p_monto);

    if v_saldo_nuevo < 0 then
      raise exception 'Saldo insuficiente para este egreso';
    end if;

    if p_tipo = 'egreso' then
      v_al_momento := coalesce(public.saldo_al_momento(v_cuenta_dest_id), 0);
      if p_monto > greatest(0, v_al_momento) then
        raise exception 'Saldo al momento insuficiente para este egreso';
      end if;
    end if;

    update public.cuentas_fondos
    set saldo_actual = v_saldo_despues_rev,
        updated_at = now()
    where id = v_cuenta_orig_id;

    update public.cuentas_fondos
    set saldo_actual = v_saldo_nuevo,
        updated_at = now()
    where id = v_cuenta_dest_id;

    update public.movimientos_fondos
    set cuenta_fondo_id = v_cuenta_dest_id,
        tipo = p_tipo,
        concepto = v_concepto,
        monto = p_monto,
        saldo_anterior = v_saldo_dest,
        saldo_posterior = v_saldo_nuevo,
        sesion_caja_id = v_sesion_id
    where id = p_id;
  end if;

  return p_id;
end;
$$;

comment on column public.cuentas_fondos.saldo_actual is
  'Saldo proyectado neto (acreditado + por acreditar, comisión ya descontada). El al momento se calcula restando pendientes.';

comment on column public.metodos_pago.dias_acreditacion is
  'Días corridos de calendario ART hasta que el dinero debería estar en la cuenta. 0 = inmediato. No son días hábiles.';

comment on function public.saldo_al_momento(uuid) is
  'Saldo proyectado menos cobros aún no acreditados (días corridos ART).';

comment on function public.registrar_movimiento_caja_manual is
  'Registra ingreso/egreso manual. Requiere sesión abierta. Permitido a owner, admin y vendedor (cajero). Egreso valida saldo al momento.';

comment on function public.editar_movimiento_caja_manual is
  'Edita un movimiento manual del turno abierto. Solo owner/admin. Egreso valida saldo al momento.';

grant execute on function public.monto_pendiente_acreditar(uuid) to authenticated;
grant execute on function public.saldo_al_momento(uuid) to authenticated;
grant execute on function public.registrar_movimiento_caja_manual(uuid, text, text, numeric) to authenticated;
grant execute on function public.editar_movimiento_caja_manual(uuid, uuid, text, text, numeric) to authenticated;
