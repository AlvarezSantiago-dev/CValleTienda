-- Reparación Adonai (Provisiones ADONAI)
-- tienda: 97d8103b-75c0-4944-a6b7-bf76231500a0
--
-- DIAGNÓSTICO (2026-07-23):
-- El egreso "COMPRA DE TACHO DE BASURA" ($16999) se editó de EFECTIVO → MERCADO PAGO.
-- Los saldo_actual quedaron BIEN (reversa en efectivo, aplicación en MP).
-- Se rompió la cadena saldo_anterior/posterior del ledger (el edit usó el saldo
-- vivo del momento, no la posición cronológica del movimiento).
--
-- NO alinear saldo_actual al último posterior (eso DESHARÍA el edit correcto).
-- SÍ recalcular saldo_anterior/posterior en orden cronológico.
-- Tras el rebuild, ultimo_posterior == saldo_actual en ambas cuentas.

begin;

-- ─── EFECTIVO: +16999 en la cadena desde Venta #74 (el egreso ya no está acá) ───
update public.movimientos_fondos set saldo_anterior = 114507.9, saldo_posterior = 120607.9
where id = '253f500d-07b1-46b5-9979-891edd1908ad'; -- Venta #74

update public.movimientos_fondos set saldo_anterior = 120607.9, saldo_posterior = 135041.9
where id = '14bc7947-1979-4ebc-a318-bceb4558f0e2'; -- Venta #75

update public.movimientos_fondos set saldo_anterior = 135041.9, saldo_posterior = 151575.5
where id = '6bb57244-faac-43a8-bab8-7d1c6282bca7'; -- Venta #76

update public.movimientos_fondos set saldo_anterior = 151575.5, saldo_posterior = 172830.5
where id = '83dacf13-263a-4be5-b70c-8cc856902142'; -- Venta #77

update public.movimientos_fondos set saldo_anterior = 172830.5, saldo_posterior = 180330.5
where id = '906a754d-9395-4f91-a9ae-fd5f45f089e2'; -- Venta #79

update public.movimientos_fondos set saldo_anterior = 180330.5, saldo_posterior = 182530.5
where id = 'd078fb02-7513-44cd-834e-24dcc4d45c33'; -- Venta #80

update public.movimientos_fondos set saldo_anterior = 182530.5, saldo_posterior = 187530.5
where id = 'e1bc3c55-9d73-4abd-b48c-c466b8ea4a70'; -- Venta #83

-- ─── MERCADO PAGO: insertar el tacho en su lugar cronológico (−16999 desde ahí) ───
update public.movimientos_fondos set saldo_anterior = 420426.9, saldo_posterior = 403427.9
where id = '2ab9cd7f-717f-4eb9-83fa-6a7b3ba24d21'; -- COMPRA DE TACHO DE BASURA

update public.movimientos_fondos set saldo_anterior = 403427.9, saldo_posterior = 412027.9
where id = '56f55bd6-aa43-42fd-bfb2-c17e3d748490'; -- Venta #78

update public.movimientos_fondos set saldo_anterior = 412027.9, saldo_posterior = 458493.9
where id = '39a51128-ef46-4a34-af6c-86c48b639ae2'; -- Venta #81

update public.movimientos_fondos set saldo_anterior = 458493.9, saldo_posterior = 474209.9
where id = '54edb18a-5fb0-4d10-b798-4d961b464ee3'; -- Venta #82

update public.movimientos_fondos set saldo_anterior = 474209.9, saldo_posterior = 488593.9
where id = 'ba67076b-cf57-46ba-98bd-b5505abb20be'; -- Venta #84

-- Verificación esperada (correr después del commit):
-- EFECTIVO saldo_actual = 187530.5 = último posterior
-- MP       saldo_actual = 488593.9 = último posterior

commit;
