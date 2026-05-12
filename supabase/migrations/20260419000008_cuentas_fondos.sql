-- =============================================================
-- MIGRATION 008: CUENTAS DE FONDOS
-- Representa los "lugares" donde va el dinero: caja efectivo,
-- billetera Mercado Pago, cuenta bancaria, etc.
-- Cada tienda configura las suyas y ve el saldo en tiempo real.
-- Ejecutar DESPUÉS de 007_configuracion.sql
-- =============================================================

create table if not exists public.cuentas_fondos (
  id            uuid primary key default gen_random_uuid(),
  tienda_id     uuid not null references public.tiendas (id) on delete cascade,
  nombre        text not null,    -- "Efectivo en caja", "Mercado Pago", "Cuenta Banco Nación"
  tipo          text not null,    -- efectivo | mercado_pago | banco | otro
  descripcion   text,             -- Descripción libre: "CBU 123...", "Alias: mitienda"
  saldo_actual  numeric(14, 2) not null default 0,
  -- Visual en UI
  color         text default '#6366f1',  -- Color hex para tarjeta/badge
  icono         text default 'wallet',   -- Nombre de ícono (Lucide/Heroicons)
  activo        boolean not null default true,
  orden         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint cuentas_tipo_check check (tipo in ('efectivo', 'mercado_pago', 'banco', 'otro'))
);

-- Índices
create index cuentas_fondos_tienda_id_idx on public.cuentas_fondos (tienda_id);
create index cuentas_fondos_tipo_idx on public.cuentas_fondos (tienda_id, tipo);
create index cuentas_fondos_activas_idx on public.cuentas_fondos (tienda_id, orden)
  where activo = true;

create trigger cuentas_fondos_updated_at
  before update on public.cuentas_fondos
  for each row execute function public.set_updated_at();

-- RLS
alter table public.cuentas_fondos enable row level security;

-- Todos los usuarios de la tienda pueden ver los saldos
create policy "cuentas_fondos_select"
  on public.cuentas_fondos
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo owner/admin pueden crear/modificar cuentas
create policy "cuentas_fondos_write"
  on public.cuentas_fondos
  for insert
  with check (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

create policy "cuentas_fondos_update"
  on public.cuentas_fondos
  for update
  using (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

-- -------------------------------------------------------------
-- HISTORIAL DE MOVIMIENTOS DE FONDOS
-- Cada ingreso o egreso de una cuenta queda registrado.
-- Alimentado por triggers de pagos_venta, pagos_devolucion
-- y movimientos manuales.
-- -------------------------------------------------------------
create table if not exists public.movimientos_fondos (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas (id) on delete cascade,
  cuenta_fondo_id   uuid not null references public.cuentas_fondos (id) on delete cascade,
  tipo              text not null,           -- ingreso | egreso | ajuste
  concepto          text not null,           -- "Venta #42", "Devolución #3", "Ajuste manual"
  monto             numeric(14, 2) not null, -- Siempre positivo
  saldo_anterior    numeric(14, 2) not null,
  saldo_posterior   numeric(14, 2) not null,
  -- Referencias opcionales al origen del movimiento
  venta_id          uuid references public.ventas (id) on delete set null,
  usuario_id        uuid references public.perfiles (id) on delete set null,
  created_at        timestamptz not null default now(),

  constraint movimientos_fondos_tipo_check check (tipo in ('ingreso', 'egreso', 'ajuste')),
  constraint movimientos_fondos_monto_check check (monto > 0)
);

-- Índices para reportes por cuenta y período
create index movimientos_fondos_cuenta_idx on public.movimientos_fondos (cuenta_fondo_id, created_at desc);
create index movimientos_fondos_tienda_idx on public.movimientos_fondos (tienda_id, created_at desc);
create index movimientos_fondos_venta_idx on public.movimientos_fondos (venta_id)
  where venta_id is not null;

-- RLS
alter table public.movimientos_fondos enable row level security;

create policy "movimientos_fondos_select"
  on public.movimientos_fondos
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo el sistema (security definer functions) y admin/owner pueden insertar
create policy "movimientos_fondos_insert"
  on public.movimientos_fondos
  for insert
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Función helper: registrar movimiento de fondos y actualizar saldo
-- Usada por triggers de pagos_venta y pagos_devolucion
-- -------------------------------------------------------------
create or replace function public.registrar_movimiento_fondo(
  p_cuenta_fondo_id uuid,
  p_tipo            text,         -- ingreso | egreso | ajuste
  p_concepto        text,
  p_monto           numeric,
  p_venta_id        uuid default null,
  p_usuario_id      uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo_anterior  numeric;
  v_saldo_nuevo     numeric;
  v_tienda_id       uuid;
begin
  -- Obtener saldo actual y tienda con lock de fila para evitar race condition
  select saldo_actual, tienda_id
  into v_saldo_anterior, v_tienda_id
  from public.cuentas_fondos
  where id = p_cuenta_fondo_id
  for update;

  -- Calcular nuevo saldo
  if p_tipo = 'ingreso' then
    v_saldo_nuevo := v_saldo_anterior + p_monto;
  elsif p_tipo = 'egreso' then
    v_saldo_nuevo := v_saldo_anterior - p_monto;
  else
    -- ajuste: el monto puede ser positivo o negativo según concepto
    v_saldo_nuevo := p_monto;
  end if;

  -- Actualizar saldo en la cuenta
  update public.cuentas_fondos
  set saldo_actual = v_saldo_nuevo,
      updated_at   = now()
  where id = p_cuenta_fondo_id;

  -- Registrar en historial
  insert into public.movimientos_fondos (
    tienda_id, cuenta_fondo_id, tipo, concepto, monto,
    saldo_anterior, saldo_posterior, venta_id, usuario_id
  ) values (
    v_tienda_id, p_cuenta_fondo_id, p_tipo, p_concepto, p_monto,
    v_saldo_anterior, v_saldo_nuevo, p_venta_id, p_usuario_id
  );
end;
$$;

-- -------------------------------------------------------------
-- Seed de cuentas de fondos por defecto
-- Llamado desde 009_metodos_pago.sql al registrar una tienda nueva
-- -------------------------------------------------------------
create or replace function public.seed_cuentas_fondos(p_tienda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cuentas_fondos (tienda_id, nombre, tipo, descripcion, color, icono, orden) values
    (p_tienda_id, 'Efectivo en caja', 'efectivo',    'Dinero físico en el mostrador',             '#22c55e', 'banknotes',      1),
    (p_tienda_id, 'Mercado Pago',     'mercado_pago', 'Billetera virtual de Mercado Pago',         '#009ee3', 'qr-code',        2),
    (p_tienda_id, 'Cuenta bancaria',  'banco',        'Cuenta corriente / caja de ahorro bancaria','#6366f1', 'building-library',3);
end;
$$;

comment on table public.cuentas_fondos is 'Destinos de fondos configurados por la tienda: efectivo, MP, banco. Refleja el saldo real disponible.';
comment on table public.movimientos_fondos is 'Log inmutable de cada movimiento de dinero por cuenta. Alimentado automáticamente por triggers.';
comment on column public.cuentas_fondos.saldo_actual is 'Saldo calculado en tiempo real. Actualizado atómicamente por registrar_movimiento_fondo().';
