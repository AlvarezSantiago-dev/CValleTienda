-- =============================================================
-- MIGRATION: CONFIG RUBRO — Fase 2 multi-rubro
-- Tabla de configuración de variantes/etiquetas por tipo de negocio.
-- Ejecutar DESPUÉS de 20260509000002_handle_new_user_rubro.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABLA config_rubro
-- Una fila por tipo de negocio. Define labels de variantes,
-- unidades disponibles y datos de seed para nuevas tiendas.
-- Es una tabla de configuración global (sin tienda_id).
-- -------------------------------------------------------------
create table if not exists public.config_rubro (
  rubro                  text primary key,
  label_var1             text not null default 'Talla',
  label_var2             text not null default 'Color',
  usar_var1              boolean not null default true,
  usar_var2              boolean not null default true,
  unidades_disponibles   text[] not null default array['unidad'],
  categorias_sugeridas   text[] default null,
  tallas_sugeridas       text[] default null,
  descripcion            text
);

-- Todo el mundo puede leerla, nadie puede escribirla desde el cliente
alter table public.config_rubro enable row level security;

create policy "config_rubro_select_publico"
  on public.config_rubro
  for select
  using (true);

-- -------------------------------------------------------------
-- 2. SEED — datos iniciales para los 6 rubros
-- -------------------------------------------------------------
insert into public.config_rubro
  (rubro, label_var1, label_var2, usar_var1, usar_var2, unidades_disponibles, categorias_sugeridas, tallas_sugeridas, descripcion)
values
  (
    'ropa', 'Talla', 'Color', true, true,
    array['unidad'],
    array['Remeras', 'Pantalones', 'Vestidos', 'Calzado', 'Accesorios', 'Camperas'],
    array['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '36', '38', '40', '42', '44', '46', 'Único'],
    'Tienda de indumentaria y accesorios'
  ),
  (
    'ferreteria', 'Medida', 'Material', true, true,
    array['unidad', 'pack', 'caja'],
    array['Herramientas', 'Fijaciones', 'Pinturas', 'Electricidad', 'Plomería', 'Adhesivos'],
    array['M4', 'M6', 'M8', 'M10', 'M12', '1/4"', '3/8"', '1/2"', '3/4"', '1"', 'Universal'],
    'Ferretería y materiales de construcción menores'
  ),
  (
    'corralon', 'Tipo', 'Calidad', true, false,
    array['unidad', 'kg', 'tonelada', 'm3', 'metro', 'bolsa'],
    array['Áridos', 'Cementos', 'Hierros', 'Maderas', 'Cables', 'Cañerías', 'Ladrillos'],
    array['Fino', 'Medio', 'Grueso', 'H8', 'H10', 'H12', 'H16', 'H20', 'H25', 'Standard'],
    'Corralón de materiales de construcción'
  ),
  (
    'despensa', 'Marca', 'Presentación', true, true,
    array['unidad', 'kg', 'gramo', 'litro', 'pack'],
    array['Almacén', 'Bebidas', 'Lácteos', 'Limpieza', 'Golosinas', 'Panificados'],
    array['250g', '500g', '1kg', '2kg', '5kg', '250ml', '500ml', '1L', '2L', '5L'],
    'Despensa, kiosco o minimarket'
  ),
  (
    'libreria', 'Marca', 'Modelo', true, true,
    array['unidad', 'pack', 'caja'],
    array['Útiles', 'Papelería', 'Arte', 'Tecnología', 'Libros', 'Juguetes'],
    array['Chico', 'Mediano', 'Grande', 'A4', 'A5', 'Oficio', 'Standard'],
    'Librería y papelería'
  ),
  (
    'generico', 'Variante 1', 'Variante 2', true, true,
    array['unidad', 'kg', 'gramo', 'litro', 'metro', 'm2', 'm3', 'tonelada', 'bolsa', 'pack', 'caja'],
    null,
    null,
    'Negocio genérico — configurable'
  );

-- -------------------------------------------------------------
-- 3. mostrar_var1 / mostrar_var2 en configuracion_etiquetas
-- Reemplazo genérico de mostrar_talla / mostrar_color.
-- Se mantienen las columnas originales para no romper código
-- existente; las nuevas se copian de ellas.
-- -------------------------------------------------------------
alter table public.configuracion_etiquetas
  add column if not exists mostrar_var1 boolean not null default true,
  add column if not exists mostrar_var2 boolean not null default false;

update public.configuracion_etiquetas
  set mostrar_var1 = mostrar_talla,
      mostrar_var2 = mostrar_color;

-- -------------------------------------------------------------
-- 4. RECREAR inicializar_tienda para sembrar categorías y tallas
-- con los datos de config_rubro según el rubro de la nueva tienda.
-- Reemplaza la versión de 007_configuracion.sql.
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

  -- Tallas/atributos sugeridos del rubro (solo si var1 está activa)
  insert into public.tallas (tienda_id, nombre, orden)
  select new.id, val, (ord - 1)::integer
  from public.config_rubro cr,
       unnest(cr.tallas_sugeridas) with ordinality as t(val, ord)
  where cr.rubro = new.rubro
    and cr.tallas_sugeridas is not null
    and cr.usar_var1 = true;

  return new;
end;
$$;

comment on table public.config_rubro is 'Configuración de variantes por tipo de negocio (global, sin tienda_id). Define labels, unidades y datos de seed.';
