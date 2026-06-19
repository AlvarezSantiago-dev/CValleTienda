-- Modo de cobro en POS: clasico (panel lateral) o guiado (wizard modal)
alter table public.configuracion_tienda
  add column if not exists pos_modo_cobro text not null default 'clasico';

alter table public.configuracion_tienda
  drop constraint if exists configuracion_tienda_pos_modo_cobro_check;

alter table public.configuracion_tienda
  add constraint configuracion_tienda_pos_modo_cobro_check
  check (pos_modo_cobro in ('clasico', 'guiado'));

comment on column public.configuracion_tienda.pos_modo_cobro is
  'Modo de cobro en POS: clasico (panel lateral) o guiado (wizard modal con F2)';
