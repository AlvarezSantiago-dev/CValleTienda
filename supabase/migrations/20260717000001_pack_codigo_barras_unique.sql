-- Garantiza que los códigos de unidad y pack sean únicos dentro de cada tienda.
-- El advisory lock evita carreras entre escrituras concurrentes del mismo código.

do $$
begin
  if exists (
    select 1
    from public.variantes_producto a
    join public.variantes_producto b
      on b.tienda_id = a.tienda_id
     and b.id <> a.id
     and b.codigo_barras = a.pack_codigo_barras
    where a.pack_codigo_barras is not null
  ) then
    raise exception
      'Hay códigos de pack que ya coinciden con códigos de unidad. Corregilos antes de aplicar la migración.';
  end if;
end;
$$;

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
        and (vp.codigo_barras = codigo or vp.pack_codigo_barras = codigo)
    ) then
      raise exception 'El código de barras % ya está asociado a otra variante', codigo
        using errcode = '23505';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validar_codigos_barras_variante_trigger
  on public.variantes_producto;

create trigger validar_codigos_barras_variante_trigger
before insert or update of codigo_barras, pack_codigo_barras, tienda_id
on public.variantes_producto
for each row
execute function public.validar_codigos_barras_variante();

create unique index if not exists variantes_pack_codigo_barras_unique_idx
  on public.variantes_producto (tienda_id, pack_codigo_barras)
  where pack_codigo_barras is not null;

comment on index public.variantes_pack_codigo_barras_unique_idx is
  'Un código de pack solo puede pertenecer a una variante por tienda.';

comment on column public.variantes_producto.pack_codigo_barras is
  'Código único del pack dentro de la tienda; no puede coincidir con un código de unidad.';
