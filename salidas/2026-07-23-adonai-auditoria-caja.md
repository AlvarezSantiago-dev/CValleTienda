# Auditoría caja — Provisiones ADONAI

**Fecha:** 2026-07-23  
**tienda_id:** `97d8103b-75c0-4944-a6b7-bf76231500a0`  
**Nombre:** Provisiones ADONAI  
**Nota:** el UUID `e0a9c8c7-...` es un **usuario** (quien cargó el tacho), no la tienda.

---

## Diagnóstico

| Cuenta | saldo_actual | último posterior (roto) | diff |
| ------ | ------------ | ----------------------- | ---- |
| EFECTIVO | 187530.50 | 170531.50 | +16999 |
| MERCADO PAGO | 488593.90 | 505592.90 | −16999 |

**Causa:** egreso manual `COMPRA DE TACHO DE BASURA` ($16999) editado de EFECTIVO → MERCADO PAGO.  
`saldo_actual` quedó correcto; la cadena `saldo_anterior`/`saldo_posterior` no se recalculó en orden cronológico.

**Ventas pago↔total:** 0 con diff (sin drift de centavos).

**Sesión abierta:** `d067c843-d059-4a95-b1d4-7f0c5adff713` (hoy).

---

## Qué NO hacer

No correr un `UPDATE cuentas_fondos SET saldo_actual = último_posterior`. Eso desharía el edit del tacho y desalinearíá el físico.

---

## Qué sí hacer

Rebuild del ledger: `salidas/2026-07-23-adonai-repair-saldos.sql`  
(7 movimientos EFECTIVO + 5 MERCADO PAGO; no toca `saldo_actual`).

Tras aplicar: último posterior EF = 187530.50, MP = 488593.90.

---

## Qué se ajustó

_Pendiente de OK del usuario para aplicar el SQL en prod._
