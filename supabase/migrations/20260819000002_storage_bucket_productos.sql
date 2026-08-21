-- =============================================================
-- Imágenes de producto: bucket Storage + foto por variante
-- Path cover:  {tienda_id}/{producto_id}/cover.{jpg|png|webp}
-- Path color:  {tienda_id}/{producto_id}/color/{color_id}/cover.{ext}
-- Path var:    {tienda_id}/{producto_id}/var/{variante_id}/cover.{ext}
-- El primer segmento es el tenant (RLS de escritura).
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "productos_imagenes_select_public" on storage.objects;
drop policy if exists "productos_imagenes_insert" on storage.objects;
drop policy if exists "productos_imagenes_update" on storage.objects;
drop policy if exists "productos_imagenes_delete" on storage.objects;

create policy "productos_imagenes_select_public"
  on storage.objects
  for select
  using (bucket_id = 'productos');

create policy "productos_imagenes_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = (select public.get_tienda_id())::text
  );

create policy "productos_imagenes_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = (select public.get_tienda_id())::text
  )
  with check (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = (select public.get_tienda_id())::text
  );

create policy "productos_imagenes_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = (select public.get_tienda_id())::text
  );

alter table public.variantes_producto
  add column if not exists imagen_url text;

comment on column public.variantes_producto.imagen_url is
  'Foto de la variante (típicamente por color). Si es null, el POS/catálogo usa productos.imagen_url.';
