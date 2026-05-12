-- =============================================================
-- MIGRATION: PLANES Y BILLING
-- Agrega campos de plan/trial a tiendas y tabla de solicitudes upgrade.
-- =============================================================

-- 1. Campos de plan en tiendas
alter table public.tiendas
  add column if not exists plan               text not null default 'basico'
    check (plan in ('basico', 'pro')),
  add column if not exists trial_hasta        timestamptz,
  add column if not exists plan_activo_desde  timestamptz;

-- 2. Trigger: al crear tienda, activar trial de 14 días automáticamente
create or replace function public.set_trial_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.trial_hasta      := now() + interval '14 days';
  new.plan_activo_desde := now();
  return new;
end;
$$;

drop trigger if exists tiendas_set_trial on public.tiendas;

create trigger tiendas_set_trial
  before insert on public.tiendas
  for each row execute function public.set_trial_on_insert();

-- 3. Tabla de solicitudes de upgrade
create table if not exists public.solicitudes_upgrade (
  id          uuid primary key default gen_random_uuid(),
  tienda_id   uuid not null references public.tiendas(id) on delete cascade,
  plan_pedido text not null default 'pro' check (plan_pedido in ('basico', 'pro')),
  mensaje     text,
  atendida    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists solicitudes_upgrade_tienda_idx
  on public.solicitudes_upgrade (tienda_id);

create index if not exists solicitudes_upgrade_atendida_idx
  on public.solicitudes_upgrade (atendida);

alter table public.solicitudes_upgrade enable row level security;

-- Solo el owner de la tienda puede insertar solicitudes
create policy "tenant_insert_solicitud"
  on public.solicitudes_upgrade
  for insert
  with check (
    tienda_id in (
      select tienda_id from public.perfiles where id = auth.uid()
    )
  );

-- Solo puede ver sus propias solicitudes
create policy "tenant_select_solicitud"
  on public.solicitudes_upgrade
  for select
  using (
    tienda_id in (
      select tienda_id from public.perfiles where id = auth.uid()
    )
  );

comment on table public.solicitudes_upgrade is
  'Solicitudes manuales de upgrade de plan. El superadmin las gestiona desde /superadmin.';

comment on column public.tiendas.plan is
  'Plan activo: basico (hasta 300 productos, sin remitos/devoluciones/CRM) o pro (sin límites).';
comment on column public.tiendas.trial_hasta is
  'Fecha de fin del período de prueba gratuito. Mientras sea futuro, el plan efectivo es pro.';
comment on column public.tiendas.plan_activo_desde is
  'Fecha en que se activó el plan actual (o se creó la tienda).';
