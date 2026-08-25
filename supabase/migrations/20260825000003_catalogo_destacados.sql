-- Destacados en catálogo público (coverflow).

alter table public.productos
  add column if not exists destacado_en_catalogo boolean not null default false;

comment on column public.productos.destacado_en_catalogo is
  'Si true y visible_en_catalogo, aparece en el coverflow del catálogo público.';

create index if not exists productos_destacados_catalogo_idx
  on public.productos (tienda_id)
  where destacado_en_catalogo = true and visible_en_catalogo = true and activo = true;
