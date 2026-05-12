-- =============================================================
-- MIGRATION 009: MÉTODOS DE PAGO Y PAGOS DE VENTA
-- Métodos de pago completamente configurables: nombre, destino
-- de fondos, comisión y días de acreditación.
-- Ejecutar DESPUÉS de 008_cuentas_fondos.sql
-- =============================================================

-- -------------------------------------------------------------
-- MÉTODOS DE PAGO
-- Cada tienda define los suyos con nombre propio y vinculación
-- a una cuenta de fondos específica.
-- Ej: "QR Mercado Pago" → cuenta MP, 3% comisión, 1 día
--     "Efectivo"        → cuenta Efectivo, 0% comisión, 0 días
-- -------------------------------------------------------------
create table if not exists public.metodos_pago (
  id                    uuid primary key default gen_random_uuid(),
  tienda_id             uuid not null references public.tiendas (id) on delete cascade,
  cuenta_fondo_id       uuid not null references public.cuentas_fondos (id) on delete restrict,
  nombre                text not null,              -- Nombre visible en POS: "QR Mercado Pago"
  descripcion           text,
  comision_porcentaje   numeric(5, 2) not null default 0,  -- Ej: 3.99 = 3.99%
  dias_acreditacion     integer not null default 0,        -- 0 = inmediato
  activo                boolean not null default true,
  orden                 integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint metodos_comision_check check (comision_porcentaje >= 0 and comision_porcentaje < 100),
  constraint metodos_dias_check check (dias_acreditacion >= 0)
);

-- Índices
create index metodos_pago_tienda_id_idx on public.metodos_pago (tienda_id);
create index metodos_pago_cuenta_idx on public.metodos_pago (cuenta_fondo_id);
create index metodos_pago_activos_idx on public.metodos_pago (tienda_id, orden)
  where activo = true;

create trigger metodos_pago_updated_at
  before update on public.metodos_pago
  for each row execute function public.set_updated_at();

-- RLS
alter table public.metodos_pago enable row level security;

-- Todos ven los métodos de pago de su tienda
create policy "metodos_pago_select"
  on public.metodos_pago
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo owner/admin pueden crear o modificar métodos
create policy "metodos_pago_write"
  on public.metodos_pago
  for insert
  with check (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

create policy "metodos_pago_update"
  on public.metodos_pago
  for update
  using (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

-- -------------------------------------------------------------
-- PAGOS DE VENTA
-- Una venta puede tener múltiples pagos (split de métodos).
-- Al insertar, un trigger actualiza el saldo de la cuenta de fondos.
-- -------------------------------------------------------------
create table if not exists public.pagos_venta (
  id                    uuid primary key default gen_random_uuid(),
  tienda_id             uuid not null references public.tiendas (id) on delete cascade,
  venta_id              uuid not null references public.ventas (id) on delete cascade,
  metodo_pago_id        uuid references public.metodos_pago (id) on delete set null,
  cuenta_fondo_id       uuid references public.cuentas_fondos (id) on delete set null,
  -- Snapshots al momento del pago (inmutables)
  nombre_metodo         text not null,
  nombre_cuenta_fondo   text not null,
  comision_porcentaje   numeric(5, 2) not null default 0,
  dias_acreditacion     integer not null default 0,
  -- Montos
  monto                 numeric(14, 2) not null,
  comision_calculada    numeric(14, 2) not null default 0,  -- monto * comision / 100
  monto_neto            numeric(14, 2) not null,            -- monto - comision_calculada
  referencia            text,    -- Nro. de transferencia, voucher, código MP, etc.
  created_at            timestamptz not null default now(),

  constraint pagos_monto_check check (monto > 0),
  constraint pagos_neto_check check (monto_neto >= 0)
);

-- Índices
create index pagos_venta_id_idx on public.pagos_venta (venta_id);
create index pagos_tienda_id_idx on public.pagos_venta (tienda_id);
create index pagos_metodo_id_idx on public.pagos_venta (metodo_pago_id)
  where metodo_pago_id is not null;
create index pagos_cuenta_fondo_idx on public.pagos_venta (cuenta_fondo_id)
  where cuenta_fondo_id is not null;

-- RLS
alter table public.pagos_venta enable row level security;

create policy "pagos_venta_tienda_isolation"
  on public.pagos_venta
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Trigger: al registrar un pago, mover los fondos a la cuenta
-- correspondiente y registrar en el historial de movimientos
-- -------------------------------------------------------------
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

  -- Obtener número de ticket de la venta para el concepto
  select numero_ticket into v_numero_ticket
  from public.ventas
  where id = new.venta_id;

  -- Registrar ingreso en la cuenta de fondos
  perform public.registrar_movimiento_fondo(
    p_cuenta_fondo_id => new.cuenta_fondo_id,
    p_tipo            => 'ingreso',
    p_concepto        => 'Venta #' || v_numero_ticket || ' — ' || new.nombre_metodo,
    p_monto           => new.monto,
    p_venta_id        => new.venta_id,
    p_usuario_id      => (select usuario_id from public.ventas where id = new.venta_id)
  );

  return new;
end;
$$;

create trigger pagos_venta_mover_fondos
  after insert on public.pagos_venta
  for each row execute function public.mover_fondos_por_pago_venta();

-- -------------------------------------------------------------
-- Seed: cuentas de fondos + métodos de pago por defecto
-- Llamado desde el trigger de inicialización de tienda
-- -------------------------------------------------------------
create or replace function public.seed_metodos_pago(p_tienda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_efectivo   uuid;
  v_id_mp         uuid;
  v_id_banco      uuid;
begin
  -- 1. Crear cuentas de fondos
  perform public.seed_cuentas_fondos(p_tienda_id);

  -- 2. Obtener IDs recién creadas
  select id into v_id_efectivo from public.cuentas_fondos
    where tienda_id = p_tienda_id and tipo = 'efectivo' limit 1;
  select id into v_id_mp from public.cuentas_fondos
    where tienda_id = p_tienda_id and tipo = 'mercado_pago' limit 1;
  select id into v_id_banco from public.cuentas_fondos
    where tienda_id = p_tienda_id and tipo = 'banco' limit 1;

  -- 3. Crear métodos de pago vinculados a cada cuenta
  insert into public.metodos_pago
    (tienda_id, cuenta_fondo_id, nombre, descripcion, comision_porcentaje, dias_acreditacion, orden)
  values
    (p_tienda_id, v_id_efectivo, 'Efectivo',
      'Pago en efectivo al contado', 0, 0, 1),
    (p_tienda_id, v_id_mp, 'QR Mercado Pago',
      'Escaneás el QR con la app de Mercado Pago', 3.99, 1, 2),
    (p_tienda_id, v_id_mp, 'Link de pago MP',
      'Pago por link generado desde Mercado Pago', 3.99, 1, 3),
    (p_tienda_id, v_id_banco, 'Transferencia bancaria',
      'Transferencia / CBU directo a cuenta bancaria', 0, 1, 4),
    (p_tienda_id, v_id_efectivo, 'Tarjeta débito',
      'Posnet — fondos al efectivo de caja', 1.10, 1, 5),
    (p_tienda_id, v_id_efectivo, 'Tarjeta crédito',
      'Posnet — fondos al efectivo de caja', 3.67, 14, 6);
end;
$$;

-- -------------------------------------------------------------
-- Actualizar trigger inicializar_tienda para que incluya el seed
-- de cuentas y métodos de pago (reemplaza la función en 007)
-- -------------------------------------------------------------
create or replace function public.inicializar_tienda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Configuración general
  insert into public.configuracion_tienda (tienda_id, razon_social)
  values (new.id, new.nombre);

  -- Etiqueta predeterminada (50x30mm, la más común en retail)
  insert into public.configuracion_etiquetas (
    tienda_id, nombre, es_predeterminado,
    formato, ancho_mm, alto_mm
  ) values (
    new.id, 'Etiqueta estándar', true,
    '50x30', 50, 30
  );

  -- Cuentas de fondos + métodos de pago por defecto
  perform public.seed_metodos_pago(new.id);

  return new;
end;
$$;

comment on table public.metodos_pago is 'Métodos de pago configurados por la tienda. Cada uno dirige fondos a una cuenta específica.';
comment on column public.metodos_pago.comision_porcentaje is 'Comisión que cobra el procesador (ej: 3.99 para MP QR). Se descuenta del monto neto.';
comment on column public.metodos_pago.dias_acreditacion is 'Días hábiles que tarda en acreditarse el dinero en la cuenta. 0 = inmediato.';
comment on table public.pagos_venta is 'Pagos de una venta. Permite split entre múltiples métodos. Actualiza saldos automáticamente.';
comment on column public.pagos_venta.comision_calculada is 'Comisión en pesos calculada al momento del pago: monto × comisión% / 100.';
comment on column public.pagos_venta.monto_neto is 'Monto que efectivamente ingresa a la cuenta luego de descontar la comisión.';
