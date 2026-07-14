-- =============================================================
-- MIGRATION: acceso_hasta — suscripción mensual / mes vencido
-- =============================================================

alter table public.tiendas
  add column if not exists acceso_hasta timestamptz,
  add column if not exists ultimo_pago_at timestamptz;

comment on column public.tiendas.acceso_hasta is
  'Último instante hasta el cual la tienda puede usar el sistema (pago mensual). Null o fecha pasada = sin acceso (salvo trial activo).';

comment on column public.tiendas.ultimo_pago_at is
  'Timestamp del último registro de pago/renovación hecho por superadmin.';

-- Backfill: margen de 30 días a tiendas existentes para no cortar al deploy
update public.tiendas
set acceso_hasta = now() + interval '30 days'
where acceso_hasta is null;

-- Extender trigger de alta: alinear acceso_hasta con trial
create or replace function public.set_trial_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.trial_hasta       := coalesce(new.trial_hasta, now() + interval '14 days');
  new.plan_activo_desde := coalesce(new.plan_activo_desde, now());
  new.acceso_hasta      := coalesce(new.acceso_hasta, new.trial_hasta);
  return new;
end;
$$;
