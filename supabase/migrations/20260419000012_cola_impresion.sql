-- =============================================================
-- MIGRATION 012: COLA DE IMPRESIÓN
-- Sistema de impresión automática vía Supabase Realtime.
-- Al completar una venta, devolución o cierre de caja,
-- el sistema inserta en esta tabla y el frontend imprime.
-- Ejecutar DESPUÉS de 011_devoluciones.sql
-- =============================================================

-- -------------------------------------------------------------
-- COLA DE IMPRESIÓN
-- El frontend suscribe a esta tabla con Supabase Realtime.
-- Cuando llega una fila 'pendiente' para su dispositivo, imprime
-- y marca como 'completado'.
-- -------------------------------------------------------------
create table if not exists public.cola_impresion (
  id              uuid primary key default gen_random_uuid(),
  tienda_id       uuid not null references public.tiendas (id) on delete cascade,
  tipo            text not null,       -- ticket_venta | ticket_devolucion | cierre_caja | etiqueta_producto
  referencia_id   uuid,                -- ID del registro origen (venta, devolucion, cierre)
  referencia_tipo text,                -- ventas | devoluciones | cierres_caja
  -- El payload contiene TODOS los datos necesarios para imprimir
  -- (snapshot completo, no depende de JOINs en el momento de impresión)
  payload         jsonb not null,
  estado          text not null default 'pendiente',  -- pendiente | imprimiendo | completado | error
  intentos        integer not null default 0,
  error_mensaje   text,
  -- Routing: qué dispositivo/impresora debe manejar este trabajo
  dispositivo_id  text,        -- ID del dispositivo registrado (null = cualquiera)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint cola_tipo_check check (
    tipo in ('ticket_venta', 'ticket_devolucion', 'cierre_caja', 'etiqueta_producto')
  ),
  constraint cola_estado_check check (
    estado in ('pendiente', 'imprimiendo', 'completado', 'error')
  )
);

-- Índices: el frontend consulta por tienda + estado + dispositivo
create index cola_pendientes_idx
  on public.cola_impresion (tienda_id, created_at desc)
  where estado = 'pendiente';

create index cola_dispositivo_idx
  on public.cola_impresion (tienda_id, dispositivo_id, created_at desc)
  where estado = 'pendiente' and dispositivo_id is not null;

create index cola_referencia_idx on public.cola_impresion (referencia_id)
  where referencia_id is not null;

create trigger cola_impresion_updated_at
  before update on public.cola_impresion
  for each row execute function public.set_updated_at();

-- RLS
alter table public.cola_impresion enable row level security;

create policy "cola_impresion_tienda_isolation"
  on public.cola_impresion
  for all
  using (tienda_id = public.get_tienda_id())
  with check (tienda_id = public.get_tienda_id());

-- -------------------------------------------------------------
-- Función: construir payload completo para ticket de venta
-- Incluye todos los datos del negocio, líneas y pagos.
-- -------------------------------------------------------------
create or replace function public.build_payload_ticket_venta(p_venta_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta       record;
  v_tienda      record;
  v_config      record;
  v_lineas      jsonb;
  v_pagos       jsonb;
  v_cliente     jsonb;
begin
  -- Datos de la venta
  select * into v_venta from public.ventas where id = p_venta_id;

  -- Datos de la tienda y configuración
  select t.*, ct.razon_social, ct.cuit, ct.condicion_iva,
         ct.texto_encabezado, ct.texto_pie, ct.prefijo_ticket,
         ct.ancho_ticket_mm, ct.simbolo_moneda,
         ct.separador_decimal, ct.separador_miles
  into v_tienda
  from public.tiendas t
  join public.configuracion_tienda ct on ct.tienda_id = t.id
  where t.id = v_venta.tienda_id;

  -- Líneas del ticket
  select jsonb_agg(
    jsonb_build_object(
      'nombre_producto', nombre_producto,
      'talla',           talla,
      'color',           color,
      'codigo_barras',   codigo_barras,
      'cantidad',        cantidad,
      'precio_unitario', precio_unitario,
      'descuento_linea', descuento_linea,
      'total_linea',     total_linea
    ) order by created_at
  ) into v_lineas
  from public.detalles_venta
  where venta_id = p_venta_id;

  -- Pagos
  select jsonb_agg(
    jsonb_build_object(
      'nombre_metodo',       nombre_metodo,
      'monto',               monto,
      'comision_porcentaje', comision_porcentaje,
      'dias_acreditacion',   dias_acreditacion,
      'referencia',          referencia
    ) order by created_at
  ) into v_pagos
  from public.pagos_venta
  where venta_id = p_venta_id;

  -- Cliente (si tiene)
  if v_venta.cliente_id is not null then
    select jsonb_build_object(
      'nombre',   nombre || coalesce(' ' || apellido, ''),
      'dni',      dni,
      'telefono', telefono
    ) into v_cliente
    from public.clientes
    where id = v_venta.cliente_id;
  else
    v_cliente := null;
  end if;

  -- Vendedor
  return jsonb_build_object(
    -- Datos del negocio
    'tienda', jsonb_build_object(
      'nombre',         v_tienda.nombre,
      'razon_social',   v_tienda.razon_social,
      'cuit',           v_tienda.cuit,
      'condicion_iva',  v_tienda.condicion_iva,
      'direccion',      v_tienda.direccion,
      'telefono',       v_tienda.telefono,
      'texto_encabezado', v_tienda.texto_encabezado,
      'texto_pie',      v_tienda.texto_pie,
      'ancho_mm',       v_tienda.ancho_ticket_mm,
      'simbolo_moneda', v_tienda.simbolo_moneda
    ),
    -- Datos del ticket
    'numero_ticket', v_tienda.prefijo_ticket || '-' || lpad(v_venta.numero_ticket::text, 4, '0'),
    'fecha',         to_char(v_venta.created_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
    'vendedor',      (select nombre || coalesce(' ' || apellido, '') from public.perfiles where id = v_venta.usuario_id),
    -- Venta
    'subtotal',      v_venta.subtotal,
    'descuento',     v_venta.descuento,
    'total',         v_venta.total,
    'estado',        v_venta.estado,
    'observaciones', v_venta.observaciones,
    -- Detalle
    'lineas',        coalesce(v_lineas, '[]'::jsonb),
    'pagos',         coalesce(v_pagos, '[]'::jsonb),
    'cliente',       v_cliente
  );
end;
$$;

-- -------------------------------------------------------------
-- Función: construir payload para ticket de devolución
-- -------------------------------------------------------------
create or replace function public.build_payload_ticket_devolucion(p_devolucion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dev       record;
  v_tienda    record;
  v_config    record;
  v_lineas    jsonb;
  v_pagos     jsonb;
begin
  select * into v_dev from public.devoluciones where id = p_devolucion_id;

  select t.*, ct.razon_social, ct.texto_encabezado, ct.texto_pie,
         ct.prefijo_ticket, ct.ancho_ticket_mm, ct.simbolo_moneda
  into v_tienda
  from public.tiendas t
  join public.configuracion_tienda ct on ct.tienda_id = t.id
  where t.id = v_dev.tienda_id;

  select jsonb_agg(jsonb_build_object(
    'nombre_producto', nombre_producto,
    'talla',  talla,
    'color',  color,
    'cantidad', cantidad,
    'precio_unitario', precio_unitario,
    'total_linea', total_linea
  )) into v_lineas
  from public.detalles_devolucion
  where devolucion_id = p_devolucion_id;

  select jsonb_agg(jsonb_build_object(
    'nombre_metodo', nombre_metodo,
    'monto',         monto,
    'referencia',    referencia
  )) into v_pagos
  from public.pagos_devolucion
  where devolucion_id = p_devolucion_id;

  return jsonb_build_object(
    'tienda', jsonb_build_object(
      'nombre',           v_tienda.nombre,
      'razon_social',     v_tienda.razon_social,
      'ancho_mm',         v_tienda.ancho_ticket_mm,
      'texto_encabezado', v_tienda.texto_encabezado,
      'texto_pie',        v_tienda.texto_pie
    ),
    'tipo_documento',       'DEVOLUCIÓN',
    'numero_devolucion',    'D-' || lpad(v_dev.numero_devolucion::text, 4, '0'),
    'venta_referencia',     v_tienda.prefijo_ticket || '-' || lpad(
                              (select numero_ticket from public.ventas where id = v_dev.venta_id)::text, 4, '0'),
    'fecha',               to_char(v_dev.created_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
    'motivo',              v_dev.motivo,
    'tipo',                v_dev.tipo,
    'total_devuelto',      v_dev.total_devuelto,
    'lineas',              coalesce(v_lineas, '[]'::jsonb),
    'pagos',               coalesce(v_pagos, '[]'::jsonb)
  );
end;
$$;

-- -------------------------------------------------------------
-- Trigger: encolar ticket automáticamente al completar una venta
-- -------------------------------------------------------------
create or replace function public.encolar_ticket_venta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo ticketear ventas completadas (no anuladas ni pendientes)
  if new.estado != 'completada' then
    return new;
  end if;

  -- Si viene de una actualización, no re-imprimir
  if tg_op = 'UPDATE' and old.estado = 'completada' then
    return new;
  end if;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    new.tienda_id,
    'ticket_venta',
    new.id,
    'ventas',
    public.build_payload_ticket_venta(new.id)
  );

  return new;
end;
$$;

create trigger ventas_encolar_ticket
  after insert or update of estado on public.ventas
  for each row execute function public.encolar_ticket_venta();

-- -------------------------------------------------------------
-- Trigger: encolar ticket de devolución automáticamente
-- -------------------------------------------------------------
create or replace function public.encolar_ticket_devolucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado != 'completada' then
    return new;
  end if;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    new.tienda_id,
    'ticket_devolucion',
    new.id,
    'devoluciones',
    public.build_payload_ticket_devolucion(new.id)
  );

  return new;
end;
$$;

create trigger devoluciones_encolar_ticket
  after insert on public.devoluciones
  for each row execute function public.encolar_ticket_devolucion();

-- -------------------------------------------------------------
-- Trigger: encolar resumen de cierre de caja al cerrar
-- -------------------------------------------------------------
create or replace function public.encolar_ticket_cierre_caja()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle jsonb;
  v_sesion  record;
begin
  select * into v_sesion
  from public.sesiones_caja
  where id = new.sesion_id;

  -- Detalles por cuenta
  select jsonb_agg(jsonb_build_object(
    'nombre_cuenta',   nombre_cuenta,
    'tipo_cuenta',     tipo_cuenta,
    'total_ingresos',  total_ingresos,
    'total_egresos',   total_egresos,
    'comision',        comision_estimada,
    'total_neto',      total_neto,
    'saldo_nuevo',     saldo_despues_turno
  )) into v_detalle
  from public.cierres_caja_detalle
  where cierre_id = new.id;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    new.tienda_id,
    'cierre_caja',
    new.id,
    'cierres_caja',
    jsonb_build_object(
      'tienda', (
        select jsonb_build_object(
          'nombre', t.nombre,
          'razon_social', ct.razon_social,
          'cuit', ct.cuit
        )
        from public.tiendas t
        join public.configuracion_tienda ct on ct.tienda_id = t.id
        where t.id = new.tienda_id
      ),
      'fecha_apertura',             to_char(v_sesion.fecha_apertura at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
      'fecha_cierre',               to_char(new.fecha_cierre at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
      'usuario',                    (select nombre || coalesce(' ' || apellido, '') from public.perfiles where id = new.usuario_id),
      'total_ventas_monto',         new.total_ventas_monto,
      'total_ventas_cantidad',      new.total_ventas_cantidad,
      'total_devoluciones_monto',   new.total_devoluciones_monto,
      'total_devoluciones_cantidad',new.total_devoluciones_cantidad,
      'total_neto',                 new.total_neto,
      'monto_apertura_efectivo',    new.monto_apertura_efectivo,
      'efectivo_esperado',          new.efectivo_esperado,
      'efectivo_declarado',         new.efectivo_declarado,
      'diferencia_efectivo',        new.diferencia_efectivo,
      'detalle_por_cuenta',         coalesce(v_detalle, '[]'::jsonb),
      'observaciones',              new.observaciones
    )
  );

  return new;
end;
$$;

create trigger cierres_caja_encolar_ticket
  after insert on public.cierres_caja
  for each row execute function public.encolar_ticket_cierre_caja();

comment on table public.cola_impresion is 'Cola de trabajos de impresión. Alimentada por triggers. El frontend consume via Supabase Realtime.';
comment on column public.cola_impresion.payload is 'Snapshot completo de los datos a imprimir. Inmutable. No requiere JOINs al momento de impresión.';
comment on column public.cola_impresion.dispositivo_id is 'Identificador del dispositivo/impresora destino. null = cualquier dispositivo de la tienda.';
comment on function public.build_payload_ticket_venta is 'Construye el JSON completo listo para renderizar el ticket de venta.';
comment on function public.build_payload_ticket_devolucion is 'Construye el JSON completo listo para renderizar el ticket de devolución.';
