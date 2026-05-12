-- =============================================================
-- MIGRATION 007: CONFIGURACIÓN DE TIENDA Y ETIQUETAS
-- Settings por tenant: datos fiscales, tickets y etiquetas.
-- Ejecutar DESPUÉS de 006_stock.sql
-- =============================================================

-- -------------------------------------------------------------
-- CONFIGURACIÓN GENERAL DE LA TIENDA
-- Una fila por tienda (1:1)
-- -------------------------------------------------------------
create table if not exists public.configuracion_tienda (
  id                    uuid primary key default gen_random_uuid(),
  tienda_id             uuid not null unique references public.tiendas (id) on delete cascade,
  -- Datos fiscales para ticket/factura
  razon_social          text,
  cuit                  text,
  condicion_iva         text default 'Monotributista',
  direccion_legal       text,
  -- Personalización del ticket impreso
  texto_encabezado      text,    -- Ej: "¡Gracias por tu compra!"
  texto_pie             text,    -- Ej: "No se aceptan cambios sin ticket"
  mostrar_logo          boolean not null default true,
  mostrar_iva           boolean not null default false,
  -- Numeración de tickets y devoluciones
  prefijo_ticket            text default 'T',       -- T-0001, V-0001, etc.
  ultimo_numero_ticket      integer not null default 0,
  ultimo_numero_devolucion  integer not null default 0,
  -- Impresora por defecto
  impresora_ticket      text,    -- Nombre de la impresora configurada
  ancho_ticket_mm       integer not null default 80,   -- 58mm o 80mm
  -- Moneda y región
  moneda                text not null default 'ARS',
  simbolo_moneda        text not null default '$',
  separador_decimal     text not null default ',',
  separador_miles       text not null default '.',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint config_ancho_ticket_check check (ancho_ticket_mm in (58, 80))
);

create trigger configuracion_tienda_updated_at
  before update on public.configuracion_tienda
  for each row execute function public.set_updated_at();

-- RLS
alter table public.configuracion_tienda enable row level security;

-- Todos los usuarios de la tienda pueden leer la configuración
create policy "config_tienda_select"
  on public.configuracion_tienda
  for select
  using (tienda_id = public.get_tienda_id());

-- Solo owner/admin pueden modificar la configuración
create policy "config_tienda_update"
  on public.configuracion_tienda
  for update
  using (
    tienda_id = public.get_tienda_id()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol in ('owner', 'admin')
    )
  );

create policy "config_tienda_insert"
  on public.configuracion_tienda
  for insert
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- CONFIGURACIÓN DE ETIQUETAS
-- Múltiples formatos por tienda (una tienda puede tener varios)
-- -------------------------------------------------------------
create table if not exists public.configuracion_etiquetas (
  id                  uuid primary key default gen_random_uuid(),
  tienda_id           uuid not null references public.tiendas (id) on delete cascade,
  nombre              text not null,        -- "Etiqueta chica", "Etiqueta grande"
  es_predeterminado   boolean not null default false,
  -- Dimensiones del papel
  formato             text not null default '50x30',   -- WxH en mm
  ancho_mm            integer not null default 50,
  alto_mm             integer not null default 30,
  -- Contenido a mostrar en la etiqueta
  mostrar_nombre      boolean not null default true,
  mostrar_precio      boolean not null default true,
  mostrar_talla       boolean not null default true,
  mostrar_color       boolean not null default false,
  mostrar_codigo      boolean not null default true,    -- Código legible
  mostrar_barcode     boolean not null default true,    -- Imagen de código de barras
  mostrar_logo        boolean not null default false,
  -- Tipografía
  tamano_fuente_nombre  integer not null default 10,
  tamano_fuente_precio  integer not null default 14,
  tamano_fuente_talla   integer not null default 8,
  -- Cantidad por hoja (para impresión en A4 con múltiples etiquetas)
  etiquetas_por_fila  integer not null default 3,
  etiquetas_por_col   integer not null default 8,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint etiquetas_ancho_check check (ancho_mm > 0),
  constraint etiquetas_alto_check check (alto_mm > 0)
);

create index etiquetas_tienda_id_idx on public.configuracion_etiquetas (tienda_id);

create trigger config_etiquetas_updated_at
  before update on public.configuracion_etiquetas
  for each row execute function public.set_updated_at();

-- Solo puede haber una etiqueta predeterminada por tienda
create unique index etiquetas_predeterminada_idx
  on public.configuracion_etiquetas (tienda_id)
  where es_predeterminado = true;

-- RLS
alter table public.configuracion_etiquetas enable row level security;

create policy "etiquetas_tienda_isolation"
  on public.configuracion_etiquetas
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Función y trigger: inicializar configuración al crear una tienda
-- NOTA: seed de cuentas_fondos y metodos_pago se hace en 009_metodos_pago.sql
--       ya que dependen de cuentas_fondos (008).
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

  return new;
end;
$$;

create trigger tiendas_inicializar
  after insert on public.tiendas
  for each row execute function public.inicializar_tienda();

comment on table public.configuracion_tienda is 'Configuración 1:1 con cada tienda. Datos fiscales, ticket, impresora y moneda.';
comment on table public.configuracion_etiquetas is 'Plantillas de etiquetas de producto. Una tienda puede tener múltiples formatos.';
comment on column public.configuracion_tienda.ultimo_numero_ticket is 'Contador atómico de tickets. Actualizado por get_siguiente_numero_ticket().';
