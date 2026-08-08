# Plan: Fase 3 — Dashboard Redesign (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Rediseño presentacional del módulo Dashboard usando Design System v2 / primitives, sin tocar queries ni Server Actions.
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md`

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen
Dashboard completo migrado a Design System v2: section cards unificadas, KPIs, chart con período 7/14d, turnos responsive, saldos con Modal, loading skeletons reales.

### Desviaciones del Plan
SegmentedControl de período opera por slice client-side de la serie 14d (sin query nueva).

### Problemas Encontrados
Ninguno.


---

## Inventario de componentes (`app/components/dashboard/`)

| Archivo | Rol | Estado previo a Fase 3 |
|---|---|---|
| `KpiCard.tsx` | KPI metric card | Parcial tokens; `text-[10px]` |
| `EstadoCajaBanner.tsx` | Banner caja abierta/cerrada | Ya tokens v2 |
| `TurnosHoyCard.tsx` | Tabla turnos del día | Legacy gray/lime |
| `VentasChart.tsx` | Chart SVG 14 días | Ya tokens v2 |
| `StockBajoCard.tsx` | Alerta stock | Ya tokens v2 |
| `TopProductosCard.tsx` | Ranking productos | Parcial tokens; `text-[13px]` |
| `TopClientesCard.tsx` | Ranking clientes | Parcial tokens |
| `TopVar1Card.tsx` | Ranking var1 | Ya tokens v2 |
| `UltimasVentasCard.tsx` | Lista ventas hoy | Legacy |
| `UltimasDevolucionesCard.tsx` | Lista devoluciones | Legacy |
| `SaldosCard.tsx` | Saldos + modal acreditación | Legacy + modal ad-hoc |
| `GananciaBrutaCard.tsx` | Margen / resultado neto | Legacy + emoji |
| `DashboardIcons.tsx` | SVG inline | Reemplazar por lucide |

Páginas: `app/(dashboard)/dashboard/page.tsx`, `loading.tsx`

---

## Cambios

1. Shell `DashboardSectionCard` (Card v2 + header/actions).
2. Migrar cards legacy a tokens + Badge/Modal/EmptyState.
3. Page: `PageHeader`, KPIs con lucide, trial banner tokens, chart con `SegmentedControl` 7d/14d (slice client-side).
4. `loading.tsx` alineado al layout real.
5. Eliminar dependencia de `DashboardIcons` en page (lucide).

**No se tocan:** `lib/dashboard/queries*`, Server Actions, rutas.
