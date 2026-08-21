# Modelo de saldos de cuentas

Glosario de la posición de caja. Plan: `planes/2026-08-15-saldos-al-momento-cuentas.md`.

Cada cuenta de fondos (efectivo, Mercado Pago, banco) se lee con **tres números**:

| Número | Significado |
| ------ | ----------- |
| **Saldo al momento** | Plata que ya debería estar en esa cuenta (neto de comisión, ya acreditada). Es el número grande en dashboard, caja y egresos. |
| **Por acreditar** | Cobros registrados cuyo dinero todavía no entra (neto). |
| **Saldo proyectado** | Al momento + por acreditar. Es `cuentas_fondos.saldo_actual` (post-migración: neto). Lo que va a quedar cuando todo acredite. |

`saldo_al_momento = saldo_proyectado − por_acreditar`.

## Ejemplo: Mercado Pago $10.000 / 3,99 % / 1 día

Venta de $10.000, comisión 3,99 % ($399), `dias_acreditacion = 1`. Cuenta partía en $0.

| Concepto | Antes (mal) | Después |
| -------- | ----------- | ------- |
| Entra a MP (mañana) | — | $9.601 |
| `saldo_actual` (proyectado) | $10.000 (bruto) | **$9.601** (neto) |
| Número grande | $10.000 “disponibles” | **$0 al momento** |
| Por acreditar | $9.601 | $9.601 |
| “Disponible estimado” | $399 (la comisión) | no se usa |

Al día siguiente (ya acreditó): al momento = proyectado = $9.601. Un egreso se valida contra el al momento, no contra el bruto.

## Qué no es un saldo de cuenta

| Número en pantalla | Qué es |
| ------------------ | ------ |
| Ventas de hoy (neto) | P&L del **día calendario** ART (ventas − reembolsos). No es plata en una cuenta. |
| Ganancia bruta (mes) | Precio − costo del mes. No es caja. |
| Total neto del turno | Resultado del **turno de caja** (ventas − devoluciones − comisiones). No es el stock de dinero. |

## Acreditación

- `metodos_pago.dias_acreditacion` / snapshot en `pagos_venta` son **días corridos** en calendario `America/Argentina/Buenos_Aires`, no días hábiles ni feriados.
- `dias = 0` (efectivo típico): al momento = proyectado; no hay overlay.
- El crédito al ledger ocurre **al vender** (neto). El “todavía no está” es overlay, no un cron.

## Ganancia vs disponible

Son dos preguntas distintas. Un egreso las mueve a las dos.

| Pregunta | Dónde se ve | Qué es |
| -------- | ----------- | ------ |
| ¿Cuánto puedo gastar de esta cuenta? | Inicio (Disponible para gastar) y Caja | Saldo al momento de esa cuenta |
| ¿Cuánto ganó el negocio este mes? | Reportes → Resultado neto, y tarjeta “Ganancia del mes” | P&L del período: ganancia bruta − comisiones − egresos |

El resultado neto de agosto **no** es el saldo de Mercado Pago ni de efectivo. El disponible de una cuenta incluye plata de meses anteriores, apertura, ingresos y egresos.

En Inicio, abajo, cada cuenta muestra solo el **disponible** (saldo al momento), con el color configurado en Cobros. La ganancia neta al día está junto a las ventas, no mezclada con las billeteras.

## Egresos

Solo se puede egresar hasta el **saldo al momento**. La plata por acreditar no se puede gastar. Al registrar el egreso: baja el disponible de la cuenta y baja el resultado neto del mes.
