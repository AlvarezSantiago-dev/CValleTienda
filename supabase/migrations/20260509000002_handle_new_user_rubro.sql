-- =============================================================
-- MIGRATION: HANDLE_NEW_USER CON RUBRO
-- Actualiza el trigger de creación de usuario para leer el
-- campo 'rubro' de los metadatos y guardarlo en la tienda.
-- Ejecutar DESPUÉS de 20260509000001_multi_rubro_fase1.sql
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id     uuid;
  v_nombre_tienda text;
  v_rubro         text;
  v_rol           text;
begin
  v_nombre_tienda := new.raw_user_meta_data ->> 'nombre_tienda';
  v_rubro         := coalesce(new.raw_user_meta_data ->> 'rubro', 'generico');

  -- Validar que el rubro sea uno de los permitidos; caer a 'generico' si no lo es
  if v_rubro not in ('ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico') then
    v_rubro := 'generico';
  end if;

  if (new.raw_user_meta_data ->> 'tienda_id') is not null then
    -- Se une a una tienda existente
    v_tienda_id := (new.raw_user_meta_data ->> 'tienda_id')::uuid;
    v_rol       := coalesce(new.raw_user_meta_data ->> 'rol', 'vendedor');
  else
    -- Nuevo registro: crear la tienda primero
    insert into public.tiendas (nombre, rubro)
    values (coalesce(v_nombre_tienda, 'Mi Tienda'), v_rubro)
    returning id into v_tienda_id;
    v_rol := 'owner';
  end if;

  insert into public.perfiles (id, tienda_id, nombre, apellido, rol)
  values (
    new.id,
    v_tienda_id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'apellido',
    v_rol
  );

  return new;
end;
$$;
