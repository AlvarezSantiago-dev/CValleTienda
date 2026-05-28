-- Agrega configuración de política de devoluciones al ticket de venta
alter table public.configuracion_tienda
  add column if not exists dias_cambio integer null;

comment on column public.configuracion_tienda.dias_cambio is
  '0 o null = no emitir vale de cambio. > 0 = dias validos para cambios desde la fecha de venta.';
