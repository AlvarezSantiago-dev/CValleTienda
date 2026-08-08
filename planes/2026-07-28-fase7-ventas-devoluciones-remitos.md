# Plan: Fase 7 — Ventas, Devoluciones y Remitos (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Listados DataTable, detalle venta, devoluciones, remitos con DS v2. No tocar print.css / impresion/ salvo wrappers.
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md` (Paso 8)

## Inventario
- ventas: pages + Anular*/Print*/EmitirFactura
- devoluciones: Tabla, Filtros, Form, Cambio*
- remitos: pages + NuevoRemitoForm, RemitoAcciones, RegistrarCobroModal (+ imprimibles — no tocar)

## Cambios
1. TablaVentas + TablaRemitos + TablaDevoluciones → DataTable + Badge
2. Pages → PageHeader; filtros tokens (Drawer mobile donde aporte)
3. RegistrarCobroModal → Modal v2; Anular* confirm → Modal
4. Detalle venta / devolución / remito: tokens + timeline visual simple
5. No tocar RemitoImprimible*

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

- DataTable en listados de ventas, remitos y devoluciones con Badge semántico.
- PageHeader en listados, detalles y flujos “nueva”.
- Modal v2 en anular venta, registrar cobro y emitir factura.
- Detalle de venta con timeline (completada/anulada → factura → devoluciones).
- Token sweep en forms y detalle; impresión y RemitoImprimible* intactos.
- Build OK.

### Desviaciones del Plan

- Filtros sin Drawer mobile (inline suficiente).
- Link remito→venta por `venta_numero` sin cambiar (preexistente).

### Problemas Encontrados

Ninguno.
