-- Migración: Trazabilidad del saldo a favor usado en ventas
-- Una venta pagada (total o parcialmente) con crédito de devoluciones
-- no genera ingreso de caja por esa parte. Sin esta columna, la venta
-- aparece sin forma de pago y al anularla no se puede restituir el crédito.

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS saldo_favor_usado numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.ventas
  DROP CONSTRAINT IF EXISTS ventas_saldo_favor_usado_nonneg;

ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_saldo_favor_usado_nonneg CHECK (saldo_favor_usado >= 0);

COMMENT ON COLUMN public.ventas.saldo_favor_usado IS
  'Parte del total cubierta con crédito de devoluciones (saldo a favor). No genera ingreso de caja.';
