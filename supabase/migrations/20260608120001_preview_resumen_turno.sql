-- Preview del resumen de turno (misma lógica que cerrar_caja, solo lectura).
-- Usado en UI antes del cierre y para auditoría de sesiones cerradas.

create or replace function public.preview_resumen_turno(p_sesion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesion              record;
  v_tienda_id           uuid;
  v_total_ventas        numeric := 0;
  v_cant_ventas         integer := 0;
  v_total_devoluciones  numeric := 0;
  v_cant_devoluciones   integer := 0;
  v_total_comisiones    numeric := 0;
  v_efectivo_esperado   numeric := 0;
  v_total_neto          numeric := 0;
  v_cuenta              record;
  v_ingresos_cuenta     numeric;
  v_egresos_cuenta      numeric;
  v_comision_cuenta     numeric;
  v_detalle             jsonb := '[]'::jsonb;
  v_pagos               jsonb := '[]'::jsonb;
begin
  select * into v_sesion
  from public.sesiones_caja
  where id = p_sesion_id
    and tienda_id = public.get_tienda_id();

  if not found then
    raise exception 'Sesión de caja no encontrada.';
  end if;

  v_tienda_id := v_sesion.tienda_id;

  select
    coalesce(sum(total), 0),
    count(*)::integer
  into v_total_ventas, v_cant_ventas
  from public.ventas
  where sesion_caja_id = p_sesion_id
    and estado = 'completada';

  select
    coalesce(sum(total_devuelto), 0),
    count(*)::integer
  into v_total_devoluciones, v_cant_devoluciones
  from public.devoluciones
  where sesion_caja_id = p_sesion_id
    and estado = 'completada';

  select coalesce(sum(pv.comision_calculada), 0)
  into v_total_comisiones
  from public.pagos_venta pv
  join public.ventas v on v.id = pv.venta_id
  where v.sesion_caja_id = p_sesion_id
    and v.estado = 'completada';

  v_total_neto := v_total_ventas - v_total_devoluciones - v_total_comisiones;

  -- Misma fórmula que cerrar_caja
  select
    v_sesion.monto_apertura_efectivo
    + coalesce((
        select sum(case when mf.tipo = 'ingreso' then mf.monto else 0 end)
        from public.movimientos_fondos mf
        join public.cuentas_fondos cf on cf.id = mf.cuenta_fondo_id
        where mf.tienda_id = v_tienda_id
          and cf.tipo = 'efectivo'
          and mf.created_at >= v_sesion.fecha_apertura
      ), 0)
    - coalesce((
        select sum(case when mf.tipo = 'egreso' then mf.monto else 0 end)
        from public.movimientos_fondos mf
        join public.cuentas_fondos cf on cf.id = mf.cuenta_fondo_id
        where mf.tienda_id = v_tienda_id
          and cf.tipo = 'efectivo'
          and mf.created_at >= v_sesion.fecha_apertura
      ), 0)
  into v_efectivo_esperado;

  for v_cuenta in
    select cf.*
    from public.cuentas_fondos cf
    where cf.tienda_id = v_tienda_id and cf.activo = true
  loop
    select coalesce(sum(case when mf.tipo = 'ingreso' then mf.monto else 0 end), 0)
    into v_ingresos_cuenta
    from public.movimientos_fondos mf
    where mf.cuenta_fondo_id = v_cuenta.id
      and mf.created_at >= v_sesion.fecha_apertura;

    select coalesce(sum(case when mf.tipo = 'egreso' then mf.monto else 0 end), 0)
    into v_egresos_cuenta
    from public.movimientos_fondos mf
    where mf.cuenta_fondo_id = v_cuenta.id
      and mf.created_at >= v_sesion.fecha_apertura;

    select coalesce(sum(pv.comision_calculada), 0) into v_comision_cuenta
    from public.pagos_venta pv
    join public.ventas v on v.id = pv.venta_id
    where v.sesion_caja_id = p_sesion_id
      and v.estado = 'completada'
      and pv.cuenta_fondo_id = v_cuenta.id;

    if v_ingresos_cuenta > 0 or v_egresos_cuenta > 0 then
      v_detalle := v_detalle || jsonb_build_array(jsonb_build_object(
        'cuenta_fondo_id',     v_cuenta.id,
        'nombre_cuenta',       v_cuenta.nombre,
        'tipo_cuenta',         v_cuenta.tipo,
        'total_ingresos',      v_ingresos_cuenta,
        'total_egresos',       v_egresos_cuenta,
        'comision_estimada',   v_comision_cuenta,
        'total_neto',          v_ingresos_cuenta - v_egresos_cuenta - v_comision_cuenta,
        'saldo_antes_turno',   v_cuenta.saldo_actual - v_ingresos_cuenta + v_egresos_cuenta,
        'saldo_despues_turno', v_cuenta.saldo_actual
      ));
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'nombre_cuenta',   sub.nombre_cuenta,
    'cantidad_pagos',  sub.cantidad_pagos,
    'monto_bruto',     sub.monto_bruto,
    'comision',        sub.comision,
    'monto_neto',      sub.monto_neto
  ) order by sub.nombre_cuenta), '[]'::jsonb)
  into v_pagos
  from (
    select
      pv.nombre_cuenta_fondo as nombre_cuenta,
      count(*)::integer as cantidad_pagos,
      coalesce(sum(pv.monto), 0) as monto_bruto,
      coalesce(sum(pv.comision_calculada), 0) as comision,
      coalesce(sum(pv.monto_neto), 0) as monto_neto
    from public.pagos_venta pv
    join public.ventas v on v.id = pv.venta_id
    where v.sesion_caja_id = p_sesion_id
      and v.estado = 'completada'
    group by pv.cuenta_fondo_id, pv.nombre_cuenta_fondo
  ) sub;

  return jsonb_build_object(
    'total_ventas_monto',         v_total_ventas,
    'total_ventas_cantidad',      v_cant_ventas,
    'total_devoluciones_monto',   v_total_devoluciones,
    'total_devoluciones_cantidad', v_cant_devoluciones,
    'total_comisiones',           v_total_comisiones,
    'total_neto',                 v_total_neto,
    'monto_apertura_efectivo',    v_sesion.monto_apertura_efectivo,
    'efectivo_esperado',          v_efectivo_esperado,
    'detalle_por_cuenta',         v_detalle,
    'pagos_por_cuenta',           v_pagos
  );
end;
$$;

revoke all on function public.preview_resumen_turno(uuid) from public;
grant execute on function public.preview_resumen_turno(uuid) to authenticated;

comment on function public.preview_resumen_turno is
  'Calcula el resumen del turno sin cerrar la sesión. Misma lógica que cerrar_caja.';
