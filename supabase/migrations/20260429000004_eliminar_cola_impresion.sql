-- =============================================================
-- MIGRATION 20260429000004: Refactor impresión cliente-puro
-- DESTRUCTIVA: elimina la cola de impresión y sus triggers/RPCs.
-- Razón: la impresión ahora se dispara client-side directamente
-- desde la pestaña que ejecuta la acción (POS, Productos), sin
-- cola intermedia. Los builders de payload se mantienen porque
-- siguen siendo útiles para armar el JSONB de tickets/devoluciones.
-- =============================================================

-- 1) Quitar la tabla de la publicación de Realtime (idempotente)
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cola_impresion'
  ) then
    alter publication supabase_realtime drop table public.cola_impresion;
  end if;
exception when undefined_object then
  null;
end$$;

-- 2) Drop de la tabla cola_impresion en CASCADE
--    Esto elimina automáticamente los triggers que insertaban en ella:
--      - ventas_encolar_ticket
--      - devoluciones_encolar_ticket
--      - cierres_caja_encolar_ticket
--    y cualquier dependencia (índices, FKs, etc).
drop table if exists public.cola_impresion cascade;

-- 3) Drop de RPCs específicos de la cola
drop function if exists public.cancelar_job_impresion(uuid);
drop function if exists public.reencolar_ticket_venta(uuid);
drop function if exists public.reencolar_ticket_devolucion(uuid);

-- NOTA: las funciones `build_payload_ticket_venta(uuid)` y
-- `build_payload_ticket_devolucion(uuid)` se mantienen — se usan
-- ahora desde server actions para construir el payload antes
-- de imprimir client-side.

-- 4) Drop también de los trigger functions que ya no tienen tabla destino
drop function if exists public.encolar_ticket_venta() cascade;
drop function if exists public.encolar_ticket_devolucion() cascade;
drop function if exists public.encolar_ticket_cierre_caja() cascade;
