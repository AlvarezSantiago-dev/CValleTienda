-- Libera códigos de variantes inactivas y limita unicidad/trigger a filas activas.
-- Evita que un código "eliminado" (soft delete o baja sin limpiar) bloquee reasociarlo.

update public.variantes_producto
set
  codigo_barras = null,
  pack_codigo_barras = null,
  updated_at = now()
where activo = false
  and (codigo_barras is not null or pack_codigo_barras is not null);

create or replace function public.validar_codigos_barras_variante()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  codigo text;
begin
  if new.codigo_barras is not null
     and new.pack_codigo_barras is not null
     and new.codigo_barras = new.pack_codigo_barras then
    raise exception 'El código de unidad y el código de pack deben ser diferentes'
      using errcode = '23505';
  end if;

  if coalesce(new.activo, true) = false then
    return new;
  end if;

  foreach codigo in array array[new.codigo_barras, new.pack_codigo_barras]
  loop
    if codigo is null then
      continue;
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(new.tienda_id::text || ':' || codigo, 0)
    );

    if exists (
      select 1
      from public.variantes_producto vp
      where vp.tienda_id = new.tienda_id
        and vp.id <> new.id
        and vp.activo = true
        and (vp.codigo_barras = codigo or vp.pack_codigo_barras = codigo)
    ) then
      raise exception 'El código de barras % ya está asociado a otra variante', codigo
        using errcode = '23505';
    end if;
  end loop;

  return new;
end;
$$;

drop index if exists public.variantes_codigo_barras_unique_idx;

create unique index variantes_codigo_barras_unique_idx
  on public.variantes_producto (tienda_id, codigo_barras)
  where codigo_barras is not null and activo = true;

drop index if exists public.variantes_pack_codigo_barras_unique_idx;

create unique index variantes_pack_codigo_barras_unique_idx
  on public.variantes_producto (tienda_id, pack_codigo_barras)
  where pack_codigo_barras is not null and activo = true;

comment on index public.variantes_codigo_barras_unique_idx is
  'Código de unidad único por tienda entre variantes activas.';

comment on index public.variantes_pack_codigo_barras_unique_idx is
  'Código de pack único por tienda entre variantes activas.';
