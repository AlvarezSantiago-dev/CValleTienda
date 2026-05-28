-- Etiquetas: agregar campo mostrar_nombre_tienda y ajustar default alto_mm a 25

alter table public.configuracion_etiquetas
  add column if not exists mostrar_nombre_tienda boolean not null default false;

-- El DEFAULT de alto_mm pasa de 30 a 25 (rollo estándar de góndola 50×25)
alter table public.configuracion_etiquetas
  alter column alto_mm set default 25;

comment on column public.configuracion_etiquetas.mostrar_nombre_tienda
  is 'Si true, imprime el nombre de la tienda al tope de la etiqueta';
