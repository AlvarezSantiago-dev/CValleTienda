-- Publicar notificaciones en Realtime para la campana in-app
-- (push por INSERT/UPDATE en vez de poll cada N segundos).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
exception when undefined_object then
  null;
end$$;
