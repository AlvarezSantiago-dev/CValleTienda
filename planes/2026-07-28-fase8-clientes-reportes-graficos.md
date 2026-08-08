# Plan: Fase 8 — Clientes, Reportes y Gráficos (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Clientes listado+ficha; Reportes tabs/tablas; Gráficos SVG paleta v2. Sin tocar Server Actions/queries.
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md` (Paso 9)

## Inventario
- clientes: pages + Tabla, Filtros, Form, Historial, Acciones, Selector, NuevoClienteModal
- reportes: page + TablaPLMensual(+Mobile), GraficosLayout, tabs Finanzas/Ventas/Stock/Operacion, charts SVG, KPI strip
- graficos: page + loading

## Cambios
1. TablaClientes + ClienteHistorial → DataTable + Badge
2. Pages clientes → PageHeader + StatCard; ficha tokens (saldo/datos)
3. Reportes/Gráficos → PageHeader; período pills tokens; Tabs v2 en gráficos
4. CHART_COLORS + charts/tabs token sweep
5. No tocar actions/queries

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

- Clientes rediseñados (DataTable, PageHeader, StatCard, Modal desactivar).
- Reportes y gráficos con PageHeader, Tabs v2, CHART_COLORS v2 y token sweep.
- Build OK.

### Desviaciones del Plan

- Pills Link para período (no SegmentedControl).
- TablaPLMensualMobile conservada (densidad financiera).

### Problemas Encontrados

Ninguno.
