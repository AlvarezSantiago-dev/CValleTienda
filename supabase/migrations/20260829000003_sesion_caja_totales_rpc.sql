-- Totales de turno sin bajar N filas de ventas a la app.

create or replace function public.totales_sesion_caja(p_sesion_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'monto', coalesce(sum(total), 0),
    'cantidad', count(*)::int
  )
  from public.ventas
  where sesion_caja_id = p_sesion_id
    and estado = 'completada'
    and tienda_id = (select public.get_tienda_id());
$$;

comment on function public.totales_sesion_caja(uuid) is
  'Suma monto y cuenta ventas completadas de una sesión de caja (tenant del JWT).';

grant execute on function public.totales_sesion_caja(uuid) to authenticated;
