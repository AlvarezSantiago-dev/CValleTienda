-- =============================================================
-- MIGRATION 010: SESIONES Y CIERRES DE CAJA
-- Control completo de apertura/cierre de caja con historial
-- detallado por método de pago y cuenta de fondos.
-- Ejecutar DESPUÉS de 009_metodos_pago.sql
-- =============================================================

-- -------------------------------------------------------------
-- SESIONES DE CAJA
-- Una sesión = un turno de trabajo (apertura → cierre).
-- Solo puede haber una sesión abierta por tienda a la vez.
-- -------------------------------------------------------------
create table if not exists public.sesiones_caja (
  id                      uuid primary key default gen_random_uuid(),
  tienda_id               uuid not null references public.tiendas (id) on delete cascade,
  usuario_apertura_id     uuid not null references public.perfiles (id) on delete restrict,
  usuario_cierre_id       uuid references public.perfiles (id) on delete set null,
  fecha_apertura          timestamptz not null default now(),
  fecha_cierre            timestamptz,
  -- Monto de efectivo con el que se inicia la caja (fondo de cambio)
  monto_apertura_efectivo numeric(14, 2) not null default 0,
  estado                  text not null default 'abierta',
  observaciones_apertura  text,
  observaciones_cierre    text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint sesiones_estado_check check (estado in ('abierta', 'cerrada'))
);

-- Solo puede haber una sesión abierta por tienda
create unique index sesiones_caja_unica_abierta_idx
  on public.sesiones_caja (tienda_id)
  where estado = 'abierta';

create index sesiones_caja_tienda_idx on public.sesiones_caja (tienda_id, fecha_apertura desc);
create index sesiones_caja_usuario_idx on public.sesiones_caja (usuario_apertura_id);

create trigger sesiones_caja_updated_at
  before update on public.sesiones_caja
  for each row execute function public.set_updated_at();

-- RLS
alter table public.sesiones_caja enable row level security;

create policy "sesiones_caja_tienda_isolation"
  on public.sesiones_caja
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- ALTER ventas: agregar referencia a sesión de caja
-- Cada venta queda asociada al turno en que fue realizada
-- -------------------------------------------------------------
alter table public.ventas
  add column if not exists sesion_caja_id uuid
    references public.sesiones_caja (id) on delete set null;

create index ventas_sesion_caja_idx on public.ventas (sesion_caja_id)
  where sesion_caja_id is not null;

-- -------------------------------------------------------------
-- CIERRES DE CAJA
-- Resumen ejecutivo generado al cerrar una sesión.
-- Incluye totales de venta, devoluciones y saldo por cuenta.
-- -------------------------------------------------------------
create table if not exists public.cierres_caja (
  id                          uuid primary key default gen_random_uuid(),
  sesion_id                   uuid not null unique references public.sesiones_caja (id) on delete cascade,
  tienda_id                   uuid not null references public.tiendas (id) on delete cascade,
  usuario_id                  uuid references public.perfiles (id) on delete set null,
  fecha_cierre                timestamptz not null default now(),
  -- Métricas del turno
  total_ventas_monto          numeric(14, 2) not null default 0,
  total_ventas_cantidad       integer not null default 0,
  total_devoluciones_monto    numeric(14, 2) not null default 0,
  total_devoluciones_cantidad integer not null default 0,
  total_neto                  numeric(14, 2) not null default 0,   -- ventas - devoluciones
  -- Arqueo de efectivo
  monto_apertura_efectivo     numeric(14, 2) not null default 0,
  efectivo_esperado            numeric(14, 2) not null default 0,  -- apertura + ventas efectivo - devoluciones efectivo
  efectivo_declarado           numeric(14, 2),                     -- lo que cuenta físicamente el cajero
  diferencia_efectivo          numeric(14, 2),                     -- declarado - esperado
  -- Notas
  observaciones               text,
  created_at                  timestamptz not null default now()
);

create index cierres_caja_sesion_idx on public.cierres_caja (sesion_id);
create index cierres_caja_tienda_idx on public.cierres_caja (tienda_id, fecha_cierre desc);

-- RLS
alter table public.cierres_caja enable row level security;

create policy "cierres_caja_tienda_isolation"
  on public.cierres_caja
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- DETALLE DE CIERRE POR CUENTA DE FONDOS
-- Desglosa cuánto dinero entró/salió de cada cuenta durante
-- el turno: Efectivo, Mercado Pago, Banco, etc.
-- -------------------------------------------------------------
create table if not exists public.cierres_caja_detalle (
  id                  uuid primary key default gen_random_uuid(),
  cierre_id           uuid not null references public.cierres_caja (id) on delete cascade,
  tienda_id           uuid not null references public.tiendas (id) on delete cascade,
  cuenta_fondo_id     uuid references public.cuentas_fondos (id) on delete set null,
  -- Snapshots
  nombre_cuenta       text not null,
  tipo_cuenta         text not null,
  -- Totales del turno en esta cuenta
  total_ingresos      numeric(14, 2) not null default 0,   -- pagos recibidos
  total_egresos       numeric(14, 2) not null default 0,   -- devoluciones pagadas
  comision_estimada   numeric(14, 2) not null default 0,   -- comisiones totales del turno
  total_neto          numeric(14, 2) not null default 0,   -- ingresos - egresos - comisiones
  -- Saldos globales de la cuenta (no solo del turno)
  saldo_antes_turno   numeric(14, 2) not null default 0,
  saldo_despues_turno numeric(14, 2) not null default 0
);

create index cierres_detalle_cierre_idx on public.cierres_caja_detalle (cierre_id);
create index cierres_detalle_tienda_idx on public.cierres_caja_detalle (tienda_id);

-- RLS
alter table public.cierres_caja_detalle enable row level security;

create policy "cierres_detalle_tienda_isolation"
  on public.cierres_caja_detalle
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Función: cerrar caja
-- Genera el cierre completo con todos los cálculos automáticos.
-- El frontend llama esta función desde RPC.
-- -------------------------------------------------------------
create or replace function public.cerrar_caja(
  p_sesion_id             uuid,
  p_efectivo_declarado    numeric default null,
  p_observaciones         text    default null
)
returns uuid    -- retorna el id del cierre generado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesion              record;
  v_tienda_id           uuid;
  v_usuario_id          uuid;
  v_cierre_id           uuid;
  v_total_ventas        numeric := 0;
  v_cant_ventas         integer := 0;
  v_total_devoluciones  numeric := 0;
  v_cant_devoluciones   integer := 0;
  v_efectivo_esperado   numeric := 0;
  v_cuenta              record;
  v_ingresos_cuenta     numeric;
  v_egresos_cuenta      numeric;
  v_comision_cuenta     numeric;
begin
  -- Validar que la sesión existe, está abierta y pertenece a la tienda del usuario
  select * into v_sesion
  from public.sesiones_caja
  where id = p_sesion_id
    and tienda_id = public.get_tienda_id()
    and estado = 'abierta';

  if not found then
    raise exception 'Sesión de caja no encontrada o ya cerrada.';
  end if;

  v_tienda_id  := v_sesion.tienda_id;
  v_usuario_id := auth.uid();

  -- Totales de ventas del turno
  select
    coalesce(sum(total), 0),
    count(*)
  into v_total_ventas, v_cant_ventas
  from public.ventas
  where sesion_caja_id = p_sesion_id
    and estado = 'completada';

  -- Totales de devoluciones del turno
  select
    coalesce(sum(total_devuelto), 0),
    count(*)
  into v_total_devoluciones, v_cant_devoluciones
  from public.devoluciones
  where sesion_caja_id = p_sesion_id
    and estado = 'completada';

  -- Efectivo esperado: fondo apertura + ventas en efectivo - devoluciones en efectivo
  select
    v_sesion.monto_apertura_efectivo
    + coalesce((
        select sum(pv.monto)
        from public.pagos_venta pv
        join public.ventas v on v.id = pv.venta_id
        join public.cuentas_fondos cf on cf.id = pv.cuenta_fondo_id
        where v.sesion_caja_id = p_sesion_id
          and v.estado = 'completada'
          and cf.tipo = 'efectivo'
      ), 0)
    - coalesce((
        select sum(pd.monto)
        from public.pagos_devolucion pd
        join public.devoluciones d on d.id = pd.devolucion_id
        join public.cuentas_fondos cf on cf.id = (
          select cuenta_fondo_id from public.metodos_pago where id = pd.metodo_pago_id
        )
        where d.sesion_caja_id = p_sesion_id
          and d.estado = 'completada'
          and cf.tipo = 'efectivo'
      ), 0)
  into v_efectivo_esperado;

  -- Crear cierre principal
  insert into public.cierres_caja (
    sesion_id, tienda_id, usuario_id,
    total_ventas_monto, total_ventas_cantidad,
    total_devoluciones_monto, total_devoluciones_cantidad,
    total_neto,
    monto_apertura_efectivo, efectivo_esperado,
    efectivo_declarado, diferencia_efectivo,
    observaciones
  ) values (
    p_sesion_id, v_tienda_id, v_usuario_id,
    v_total_ventas, v_cant_ventas,
    v_total_devoluciones, v_cant_devoluciones,
    v_total_ventas - v_total_devoluciones,
    v_sesion.monto_apertura_efectivo, v_efectivo_esperado,
    p_efectivo_declarado,
    case when p_efectivo_declarado is not null
         then p_efectivo_declarado - v_efectivo_esperado
         else null end,
    p_observaciones
  )
  returning id into v_cierre_id;

  -- Detalle por cuenta de fondos
  for v_cuenta in
    select cf.*
    from public.cuentas_fondos cf
    where cf.tienda_id = v_tienda_id and cf.activo = true
  loop
    -- Ingresos del turno en esta cuenta
    select coalesce(sum(pv.monto), 0) into v_ingresos_cuenta
    from public.pagos_venta pv
    join public.ventas v on v.id = pv.venta_id
    where v.sesion_caja_id = p_sesion_id
      and v.estado = 'completada'
      and pv.cuenta_fondo_id = v_cuenta.id;

    -- Egresos del turno en esta cuenta (devoluciones)
    select coalesce(sum(pd.monto), 0) into v_egresos_cuenta
    from public.pagos_devolucion pd
    join public.devoluciones d on d.id = pd.devolucion_id
    join public.metodos_pago mp on mp.id = pd.metodo_pago_id
    where d.sesion_caja_id = p_sesion_id
      and d.estado = 'completada'
      and mp.cuenta_fondo_id = v_cuenta.id;

    -- Comisiones del turno en esta cuenta
    select coalesce(sum(pv.comision_calculada), 0) into v_comision_cuenta
    from public.pagos_venta pv
    join public.ventas v on v.id = pv.venta_id
    where v.sesion_caja_id = p_sesion_id
      and v.estado = 'completada'
      and pv.cuenta_fondo_id = v_cuenta.id;

    -- Solo insertar si hubo movimientos
    if v_ingresos_cuenta > 0 or v_egresos_cuenta > 0 then
      insert into public.cierres_caja_detalle (
        cierre_id, tienda_id, cuenta_fondo_id,
        nombre_cuenta, tipo_cuenta,
        total_ingresos, total_egresos, comision_estimada, total_neto,
        saldo_antes_turno, saldo_despues_turno
      ) values (
        v_cierre_id, v_tienda_id, v_cuenta.id,
        v_cuenta.nombre, v_cuenta.tipo,
        v_ingresos_cuenta, v_egresos_cuenta, v_comision_cuenta,
        v_ingresos_cuenta - v_egresos_cuenta - v_comision_cuenta,
        v_cuenta.saldo_actual - v_ingresos_cuenta + v_egresos_cuenta, -- saldo antes del turno
        v_cuenta.saldo_actual                                           -- saldo actual (posterior)
      );
    end if;
  end loop;

  -- Marcar sesión como cerrada
  update public.sesiones_caja
  set estado            = 'cerrada',
      fecha_cierre      = now(),
      usuario_cierre_id = v_usuario_id,
      observaciones_cierre = p_observaciones,
      updated_at        = now()
  where id = p_sesion_id;

  return v_cierre_id;
end;
$$;

-- Exponer la función como RPC segura para el frontend
revoke all on function public.cerrar_caja from public;
grant execute on function public.cerrar_caja to authenticated;

comment on table public.sesiones_caja is 'Turnos de caja: una sesión por turno de trabajo. Solo una abierta por tienda.';
comment on table public.cierres_caja is 'Resumen del cierre de un turno: totales, arqueo de efectivo y diferencia.';
comment on table public.cierres_caja_detalle is 'Desglose del cierre por cuenta de fondos (efectivo, MP, banco, etc).';
comment on function public.cerrar_caja is 'Cierra la sesión activa y genera el reporte completo de cierre con cálculos automáticos.';
