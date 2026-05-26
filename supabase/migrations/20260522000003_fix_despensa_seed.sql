-- =============================================================
-- Fix seed de despensa: los tamaños estaban en tallas (Marcas)
-- cuando deben estar en colores (Presentaciones).
-- 1. Agrega columna colores_sugeridas a config_rubro
-- 2. Corrige el seed de despensa (y otros rubros con colores)
-- 3. Actualiza inicializar_tienda() para seedear colores también
-- 4. Migra datos existentes en tiendas despensa
-- =============================================================

-- -------------------------------------------------------------
-- 1. Agregar colores_sugeridas a config_rubro
-- -------------------------------------------------------------
alter table public.config_rubro
  add column if not exists colores_sugeridas text[] default null;

-- -------------------------------------------------------------
-- 2. Actualizar seeds por rubro
-- -------------------------------------------------------------

-- Ropa: colores ya estaban bien en la tabla colores de la UI
--       pero ahora los definimos en config_rubro también
update public.config_rubro
  set colores_sugeridas = array['Rojo', 'Azul', 'Negro', 'Blanco', 'Gris', 'Verde', 'Amarillo', 'Rosa', 'Naranja', 'Marrón']
  where rubro = 'ropa';

-- Despensa: mover tamaños de tallas_sugeridas → colores_sugeridas
--           y poner marcas reales en tallas_sugeridas
update public.config_rubro
  set
    tallas_sugeridas  = array['Sancor', 'La Serenísima', 'Quilmes', 'Coca-Cola', 'Pepsi', 'Arcor', 'Marolio', 'Molinos', 'Knorr', 'Luchetti'],
    colores_sugeridas = array['250g', '500g', '1kg', '2kg', '5kg', '250ml', '500ml', '1L', '2L', '5L']
  where rubro = 'despensa';

-- Librería: seed de colores (modelos/medidas)
update public.config_rubro
  set colores_sugeridas = array['Chico', 'Mediano', 'Grande', 'A4', 'A5', 'Oficio', 'Standard']
  where rubro = 'libreria';

-- Ferretería: seed de colores (materiales)
update public.config_rubro
  set colores_sugeridas = array['Acero', 'Galvanizado', 'Inoxidable', 'Aluminio', 'PVC', 'Hierro', 'Latón', 'Cobre']
  where rubro = 'ferreteria';

-- -------------------------------------------------------------
-- 3. Actualizar inicializar_tienda() para seedear colores también
-- -------------------------------------------------------------
create or replace function public.inicializar_tienda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Configuración general
  insert into public.configuracion_tienda (tienda_id, razon_social)
  values (new.id, new.nombre);

  -- Etiqueta predeterminada (50x30mm, la más común en retail)
  insert into public.configuracion_etiquetas (
    tienda_id, nombre, es_predeterminado,
    formato, ancho_mm, alto_mm
  ) values (
    new.id, 'Etiqueta estándar', true,
    '50x30', 50, 30
  );

  -- Categorías sugeridas del rubro
  insert into public.categorias (tienda_id, nombre)
  select new.id, unnest(categorias_sugeridas)
  from public.config_rubro
  where rubro = new.rubro and categorias_sugeridas is not null;

  -- Var1 (tallas/marcas) sugeridas del rubro
  insert into public.tallas (tienda_id, nombre, orden)
  select new.id, val, (ord - 1)::integer
  from public.config_rubro cr,
       unnest(cr.tallas_sugeridas) with ordinality as t(val, ord)
  where cr.rubro = new.rubro
    and cr.tallas_sugeridas is not null
    and cr.usar_var1 = true;

  -- Var2 (colores/presentaciones) sugeridas del rubro
  insert into public.colores (tienda_id, nombre)
  select new.id, unnest(colores_sugeridas)
  from public.config_rubro
  where rubro = new.rubro
    and colores_sugeridas is not null
    and usar_var2 = true;

  return new;
end;
$$;

-- -------------------------------------------------------------
-- 4. Migrar datos existentes en tiendas despensa
--    Condición: solo actuar si las tallas actuales coinciden
--    con el seed antiguo (son tamaños, no marcas reales).
--    Seguro para tiendas sin productos aún.
-- -------------------------------------------------------------
do $$
declare
  tid uuid;
  old_talla_ids uuid[];
begin
  for tid in
    select t.id
    from public.tiendas t
    where t.rubro = 'despensa'
  loop
    -- Identificar tallas que son tamaños del seed viejo
    select array_agg(id) into old_talla_ids
    from public.tallas
    where tienda_id = tid
      and nombre = any(array['250g','500g','1kg','2kg','5kg','250ml','500ml','1L','2L','5L'])
      and activo = true;

    if old_talla_ids is not null and array_length(old_talla_ids, 1) > 0 then

      -- Solo migrar si ninguna variante usa esas tallas
      if not exists (
        select 1 from public.variantes_producto vp
        join public.productos p on p.id = vp.producto_id
        where p.tienda_id = tid
          and vp.talla_id = any(old_talla_ids)
      ) then

        -- Insertar los tamaños como colores (presentaciones)
        insert into public.colores (tienda_id, nombre)
        select tid, nombre
        from public.tallas
        where id = any(old_talla_ids)
        on conflict do nothing;

        -- Eliminar los tamaños de tallas
        delete from public.tallas
        where id = any(old_talla_ids);

        -- Insertar marcas reales en tallas
        insert into public.tallas (tienda_id, nombre, orden)
        values
          (tid, 'Sancor',          0),
          (tid, 'La Serenísima',   1),
          (tid, 'Quilmes',         2),
          (tid, 'Coca-Cola',       3),
          (tid, 'Pepsi',           4),
          (tid, 'Arcor',           5),
          (tid, 'Marolio',         6),
          (tid, 'Molinos',         7),
          (tid, 'Knorr',           8),
          (tid, 'Luchetti',        9)
        on conflict do nothing;

      end if;
    end if;
  end loop;
end;
$$;
