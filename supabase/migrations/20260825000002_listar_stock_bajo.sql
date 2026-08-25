-- Filtro bajo stock con comparación columna-vs-columna + paginación real.
-- PostgREST no puede expresar stock_actual <= stock_minimo en el client.

create or replace function public.listar_stock_bajo_ids(
  p_limit int default 25,
  p_offset int default 0,
  p_categoria_id uuid default null,
  p_talla_id uuid default null,
  p_color_id uuid default null,
  p_search text default null
)
returns table (variante_id uuid, total_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_tienda uuid := public.get_tienda_id();
  v_total bigint;
  v_term text;
begin
  if v_tienda is null then
    raise exception 'Sin tienda en contexto'
      using errcode = '42501';
  end if;

  v_term := nullif(trim(coalesce(p_search, '')), '');

  select count(*)::bigint into v_total
  from public.variantes_producto v
  inner join public.productos p on p.id = v.producto_id
  where v.tienda_id = v_tienda
    and v.activo = true
    and coalesce(p.activo, true) = true
    and v.stock_minimo > 0
    and v.stock_actual <> -1
    and v.stock_actual <= v.stock_minimo
    and (p_categoria_id is null or p.categoria_id = p_categoria_id)
    and (p_talla_id is null or v.talla_id = p_talla_id)
    and (p_color_id is null or v.color_id = p_color_id)
    and (
      v_term is null
      or (
        case
          when v_term ~ '^\d+$' then v.codigo_barras = v_term
          else (
            p.nombre ilike '%' || replace(replace(v_term, '%', '\%'), '_', '\_') || '%' escape '\'
            or coalesce(p.codigo_base, '') ilike '%' || replace(replace(v_term, '%', '\%'), '_', '\_') || '%' escape '\'
          )
        end
      )
    );

  return query
  select v.id, v_total
  from public.variantes_producto v
  inner join public.productos p on p.id = v.producto_id
  where v.tienda_id = v_tienda
    and v.activo = true
    and coalesce(p.activo, true) = true
    and v.stock_minimo > 0
    and v.stock_actual <> -1
    and v.stock_actual <= v.stock_minimo
    and (p_categoria_id is null or p.categoria_id = p_categoria_id)
    and (p_talla_id is null or v.talla_id = p_talla_id)
    and (p_color_id is null or v.color_id = p_color_id)
    and (
      v_term is null
      or (
        case
          when v_term ~ '^\d+$' then v.codigo_barras = v_term
          else (
            p.nombre ilike '%' || replace(replace(v_term, '%', '\%'), '_', '\_') || '%' escape '\'
            or coalesce(p.codigo_base, '') ilike '%' || replace(replace(v_term, '%', '\%'), '_', '\_') || '%' escape '\'
          )
        end
      )
    )
  order by v.stock_actual asc, p.nombre asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

revoke all on function public.listar_stock_bajo_ids(int, int, uuid, uuid, uuid, text) from public;
grant execute on function public.listar_stock_bajo_ids(int, int, uuid, uuid, uuid, text) to authenticated;

comment on function public.listar_stock_bajo_ids is
  'IDs de variantes con stock bajo (stock_actual <= stock_minimo, no ∞) + total para paginar.';
