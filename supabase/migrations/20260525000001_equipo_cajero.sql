-- =============================================================
-- MIGRATION: Equipo y rol cajero
-- Agrega cajero_id a ventas para auditoría por cajero.
-- Retrocompatible: la columna es nullable.
-- =============================================================

-- 1. Columna cajero_id en ventas
alter table public.ventas
  add column if not exists cajero_id uuid references auth.users(id) on delete set null;

create index if not exists ventas_cajero_id_idx on public.ventas (cajero_id)
  where cajero_id is not null;

-- 2. Índice compuesto para "mis ventas de hoy" (cajero + fecha)
create index if not exists ventas_cajero_fecha_idx on public.ventas (cajero_id, created_at desc)
  where cajero_id is not null;

-- 3. RLS: los perfiles de la tienda con onboarding no completado
--    por el cajero se pueden ver por el owner/admin
--    (la policy existente ya permite ver perfiles de la misma tienda)

-- 4. Policy INSERT en perfiles para permitir que el trigger handle_new_user
--    cree perfiles de nuevos cajeros (ya existe como SECURITY DEFINER — no necesita cambios)

-- NOTA: No se necesita modificar las policies de ventas.
-- La política RLS existente de ventas filtra por tienda_id = get_tienda_id()
-- lo cual ya cubre correctamente el acceso multi-usuario dentro de una tienda.
