-- Actualiza build_payload_ticket_venta y build_payload_ticket_devolucion
-- para incluir dias_cambio en el objeto tienda del payload JSON.

-- ─── Ticket de venta ─────────────────────────────────────────────────────────
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
         ct.separador_decimal, ct.separador_miles, ct.dias_cambio
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
      'simbolo_moneda', v_tienda.simbolo_moneda,
      'dias_cambio',    v_tienda.dias_cambio
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

-- ─── Ticket de devolución ─────────────────────────────────────────────────────
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
         ct.prefijo_ticket, ct.ancho_ticket_mm, ct.simbolo_moneda, ct.dias_cambio
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
      'texto_pie',        v_tienda.texto_pie,
      'dias_cambio',      v_tienda.dias_cambio
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
