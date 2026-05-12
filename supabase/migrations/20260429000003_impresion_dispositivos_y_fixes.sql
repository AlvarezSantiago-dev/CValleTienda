-- =============================================================
-- MIGRATION 20260429000003: Impresión — dispositivos y fixes
-- Aditiva. NO destructiva.
-- - Índice extra para jobs sin dispositivo asignado.
-- - Fix de payload de devolución (incluir vendedor y cliente).
-- - RPCs: cancelar_job_impresion, reencolar_ticket_*.
-- =============================================================

-- -------------------------------------------------------------
-- Índice complementario: jobs pendientes sin dispositivo asignado
-- (la estación los puede tomar sin filtro de dispositivo).
-- -------------------------------------------------------------
create index if not exists cola_pendientes_global_idx
  on public.cola_impresion (created_at desc)
  where estado = 'pendiente' and dispositivo_id is null;

-- -------------------------------------------------------------
-- Fix: build_payload_ticket_devolucion ahora incluye vendedor y cliente
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
  v_lineas    jsonb;
  v_pagos     jsonb;
  v_cliente   jsonb;
  v_vendedor  text;
begin
  select * into v_dev from public.devoluciones where id = p_devolucion_id;

  select t.*, ct.razon_social, ct.cuit, ct.condicion_iva, ct.direccion_legal,
         ct.texto_encabezado, ct.texto_pie, ct.prefijo_ticket,
         ct.ancho_ticket_mm, ct.simbolo_moneda
  into v_tienda
  from public.tiendas t
  join public.configuracion_tienda ct on ct.tienda_id = t.id
  where t.id = v_dev.tienda_id;

  select jsonb_agg(jsonb_build_object(
    'nombre_producto', nombre_producto,
    'codigo_barras',   codigo_barras,
    'talla',           talla,
    'color',           color,
    'cantidad',        cantidad,
    'precio_unitario', precio_unitario,
    'total_linea',     total_linea
  ) order by created_at) into v_lineas
  from public.detalles_devolucion
  where devolucion_id = p_devolucion_id;

  select jsonb_agg(jsonb_build_object(
    'nombre_metodo', nombre_metodo,
    'monto',         monto,
    'referencia',    referencia
  ) order by created_at) into v_pagos
  from public.pagos_devolucion
  where devolucion_id = p_devolucion_id;

  if v_dev.cliente_id is not null then
    select jsonb_build_object(
      'nombre',   nombre || coalesce(' ' || apellido, ''),
      'dni',      dni,
      'telefono', telefono
    ) into v_cliente
    from public.clientes
    where id = v_dev.cliente_id;
  else
    v_cliente := null;
  end if;

  select nombre || coalesce(' ' || apellido, '') into v_vendedor
  from public.perfiles
  where id = v_dev.usuario_id;

  return jsonb_build_object(
    'tienda', jsonb_build_object(
      'nombre',           v_tienda.nombre,
      'razon_social',     v_tienda.razon_social,
      'cuit',             v_tienda.cuit,
      'condicion_iva',    v_tienda.condicion_iva,
      'direccion_legal',  v_tienda.direccion_legal,
      'ancho_mm',         v_tienda.ancho_ticket_mm,
      'simbolo_moneda',   v_tienda.simbolo_moneda,
      'texto_encabezado', v_tienda.texto_encabezado,
      'texto_pie',        v_tienda.texto_pie
    ),
    'tipo_documento',    'DEVOLUCIÓN',
    'numero_devolucion', 'D-' || lpad(v_dev.numero_devolucion::text, 4, '0'),
    'venta_referencia',  v_tienda.prefijo_ticket || '-' || lpad(
                           (select numero_ticket from public.ventas where id = v_dev.venta_id)::text, 4, '0'),
    'fecha',             to_char(v_dev.created_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
    'vendedor',          v_vendedor,
    'cliente',           v_cliente,
    'motivo',            v_dev.motivo,
    'tipo',              v_dev.tipo,
    'total_devuelto',    v_dev.total_devuelto,
    'lineas',            coalesce(v_lineas, '[]'::jsonb),
    'pagos',             coalesce(v_pagos, '[]'::jsonb)
  );
end;
$$;

-- -------------------------------------------------------------
-- RPC: cancelar_job_impresion
-- Marca un job como error con mensaje "cancelado por usuario".
-- Restringe a la tienda activa vía RLS implícita en el SELECT/UPDATE.
-- -------------------------------------------------------------
create or replace function public.cancelar_job_impresion(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id uuid;
begin
  v_tienda_id := public.get_tienda_id();

  update public.cola_impresion
     set estado = 'error',
         error_mensaje = 'cancelado por usuario',
         updated_at = now()
   where id = p_job_id
     and tienda_id = v_tienda_id
     and estado in ('pendiente', 'imprimiendo', 'error');

  if not found then
    raise exception 'Job no encontrado o no cancelable';
  end if;
end;
$$;

-- -------------------------------------------------------------
-- RPC: reencolar_ticket_venta — reimprimir
-- Inserta un nuevo job con payload regenerado del estado actual.
-- -------------------------------------------------------------
create or replace function public.reencolar_ticket_venta(p_venta_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id uuid;
  v_venta_tienda uuid;
  v_job_id uuid;
begin
  v_tienda_id := public.get_tienda_id();

  select tienda_id into v_venta_tienda
  from public.ventas where id = p_venta_id;

  if v_venta_tienda is null then
    raise exception 'Venta no encontrada';
  end if;
  if v_venta_tienda <> v_tienda_id then
    raise exception 'No autorizado';
  end if;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    v_tienda_id,
    'ticket_venta',
    p_venta_id,
    'ventas',
    public.build_payload_ticket_venta(p_venta_id)
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

-- -------------------------------------------------------------
-- RPC: reencolar_ticket_devolucion — reimprimir
-- -------------------------------------------------------------
create or replace function public.reencolar_ticket_devolucion(p_devolucion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tienda_id uuid;
  v_dev_tienda uuid;
  v_job_id uuid;
begin
  v_tienda_id := public.get_tienda_id();

  select tienda_id into v_dev_tienda
  from public.devoluciones where id = p_devolucion_id;

  if v_dev_tienda is null then
    raise exception 'Devolución no encontrada';
  end if;
  if v_dev_tienda <> v_tienda_id then
    raise exception 'No autorizado';
  end if;

  insert into public.cola_impresion (
    tienda_id, tipo, referencia_id, referencia_tipo, payload
  ) values (
    v_tienda_id,
    'ticket_devolucion',
    p_devolucion_id,
    'devoluciones',
    public.build_payload_ticket_devolucion(p_devolucion_id)
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

comment on function public.cancelar_job_impresion is 'Cancela un job de la cola marcándolo como error. Respeta tienda activa.';
comment on function public.reencolar_ticket_venta is 'Inserta un nuevo job de impresión para reimprimir el ticket de una venta existente. Devuelve el job_id.';
comment on function public.reencolar_ticket_devolucion is 'Inserta un nuevo job de impresión para reimprimir el comprobante de una devolución existente. Devuelve el job_id.';

-- -------------------------------------------------------------
-- Realtime: asegurar que cola_impresion publica cambios
-- (idempotente: usa DO block para evitar error si ya está agregada)
-- -------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cola_impresion'
  ) then
    alter publication supabase_realtime add table public.cola_impresion;
  end if;
exception when undefined_object then
  -- la publicación supabase_realtime no existe (entorno no-Supabase): ignorar
  null;
end$$;

