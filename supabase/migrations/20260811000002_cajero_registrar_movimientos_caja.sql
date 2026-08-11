-- =============================================================
-- Cajero puede registrar movimientos manuales; edit/delete
-- solo owner/admin (gate de rol en RPCs SECURITY DEFINER)
-- =============================================================

comment on function public.registrar_movimiento_caja_manual is
  'Registra ingreso/egreso manual. Requiere sesión abierta. Permitido a owner, admin y vendedor (cajero). Atómico con lock de cuenta.';

-- -------------------------------------------------------------
-- Editar: solo owner/admin
-- -------------------------------------------------------------
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

  -- Lock cuentas en orden de id para evitar deadlocks
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

    -- Lock ambas
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

comment on function public.editar_movimiento_caja_manual is
  'Edita un movimiento manual del turno abierto. Solo owner/admin. Requiere caja abierta. Conserva usuario_id original.';

-- -------------------------------------------------------------
-- Eliminar: solo owner/admin
-- -------------------------------------------------------------
create or replace function public.eliminar_movimiento_caja_manual(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id       uuid;
  v_sesion_id       uuid;
  v_sesion_apertura timestamptz;
  v_mov             public.movimientos_fondos%rowtype;
  v_saldo           numeric;
  v_saldo_nuevo     numeric;
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
    raise exception 'Solo se pueden eliminar movimientos manuales';
  end if;

  if not (
    v_mov.sesion_caja_id = v_sesion_id
    or (v_mov.sesion_caja_id is null and v_mov.created_at >= v_sesion_apertura)
  ) then
    raise exception 'El movimiento no pertenece al turno abierto';
  end if;

  select saldo_actual into v_saldo
  from public.cuentas_fondos
  where id = v_mov.cuenta_fondo_id
    and tienda_id = v_tienda_id
  for update;

  if not found then
    raise exception 'La cuenta del movimiento no existe';
  end if;

  v_saldo_nuevo := v_saldo - public._delta_movimiento_fondo(v_mov.tipo, v_mov.monto);

  if v_saldo_nuevo < 0 then
    raise exception 'No se puede eliminar: dejaría saldo negativo en la cuenta';
  end if;

  update public.cuentas_fondos
  set saldo_actual = v_saldo_nuevo,
      updated_at = now()
  where id = v_mov.cuenta_fondo_id;

  delete from public.movimientos_fondos where id = p_id;
end;
$$;

comment on function public.eliminar_movimiento_caja_manual is
  'Elimina un movimiento manual del turno abierto y revierte el saldo. Solo owner/admin. Requiere caja abierta.';

grant execute on function public.editar_movimiento_caja_manual(uuid, uuid, text, text, numeric) to authenticated;
grant execute on function public.eliminar_movimiento_caja_manual(uuid) to authenticated;
