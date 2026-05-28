-- =============================================================
-- MIGRATION: Agregar ancho_mm y simbolo_moneda al payload tienda
-- del trigger de cierre de caja.
-- Necesario para que CierreCajaRenderer use el ancho configurado
-- en lugar del fallback hardcodeado de 80mm.
-- =============================================================

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
          'nombre',          t.nombre,
          'razon_social',    ct.razon_social,
          'cuit',            ct.cuit,
          'ancho_mm',        ct.ancho_ticket_mm,
          'simbolo_moneda',  ct.simbolo_moneda
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
