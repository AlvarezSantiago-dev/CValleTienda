-- =============================================================
-- MIGRATION: fix constraint ancho_ticket_mm para incluir 76mm
-- El form ya ofrecía 76mm pero el constraint lo rechazaba.
-- =============================================================

alter table public.configuracion_tienda
  drop constraint if exists config_ancho_ticket_check;

alter table public.configuracion_tienda
  add constraint config_ancho_ticket_check
  check (ancho_ticket_mm in (58, 76, 80));
