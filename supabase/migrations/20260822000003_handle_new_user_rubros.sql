-- El trigger de alta solo aceptaba los 6 rubros originales.
-- Distribuidora (y carnicería / farmacia / verdulería) caían a 'generico'.
-- Validar contra config_rubro para no volver a olvidar un rubro nuevo.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tienda_id     uuid;
  v_nombre_tienda text;
  v_rubro         text;
  v_rol           text;
BEGIN
  v_nombre_tienda := new.raw_user_meta_data ->> 'nombre_tienda';
  v_rubro         := coalesce(nullif(trim(new.raw_user_meta_data ->> 'rubro'), ''), 'generico');

  IF NOT EXISTS (
    SELECT 1 FROM public.config_rubro WHERE rubro = v_rubro
  ) THEN
    v_rubro := 'generico';
  END IF;

  IF (new.raw_user_meta_data ->> 'tienda_id') IS NOT NULL THEN
    v_tienda_id := (new.raw_user_meta_data ->> 'tienda_id')::uuid;
    v_rol       := coalesce(new.raw_user_meta_data ->> 'rol', 'vendedor');
  ELSE
    INSERT INTO public.tiendas (nombre, rubro)
    VALUES (coalesce(v_nombre_tienda, 'Mi Tienda'), v_rubro)
    RETURNING id INTO v_tienda_id;
    v_rol := 'owner';
  END IF;

  INSERT INTO public.perfiles (id, tienda_id, nombre, apellido, rol)
  VALUES (
    new.id,
    v_tienda_id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'apellido',
    v_rol
  );

  RETURN new;
END;
$$;
