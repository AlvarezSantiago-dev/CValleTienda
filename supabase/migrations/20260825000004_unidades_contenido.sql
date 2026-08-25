-- Contenido informativo de pack/caja. El stock se cuenta en presentaciones
-- (vender 1 pack descuenta 1, no N unidades internas).

alter table public.productos
  add column if not exists unidades_contenido integer;

comment on column public.productos.unidades_contenido is
  'Cuando unidad_de_medida es pack o caja: cuántas unidades van adentro (ej. 6). Informativo; el stock y el POS descuentan 1 por pack vendido.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'productos_unidades_contenido_chk'
  ) then
    alter table public.productos
      add constraint productos_unidades_contenido_chk
      check (unidades_contenido is null or unidades_contenido >= 1);
  end if;
end $$;
