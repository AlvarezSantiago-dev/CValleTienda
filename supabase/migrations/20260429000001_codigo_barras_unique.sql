-- =============================================================
-- MIGRATION 014: UNIQUE codigo_barras por tienda
-- Garantiza que el escaneo desde POS siempre apunte a una sola
-- variante. Sin esto, dos variantes en la misma tienda pueden
-- compartir código y la búsqueda por barcode sería ambigua.
--
-- Reemplaza el index NO único anterior creado en 003.
-- Aplicable en SQL Editor sin reaplicar el resto de migraciones.
-- =============================================================

drop index if exists public.variantes_codigo_barras_idx;

create unique index variantes_codigo_barras_unique_idx
  on public.variantes_producto (tienda_id, codigo_barras)
  where codigo_barras is not null;

comment on index public.variantes_codigo_barras_unique_idx is
  'Índice único parcial — un código de barras solo puede pertenecer a una variante por tienda. Permite múltiples NULL.';
