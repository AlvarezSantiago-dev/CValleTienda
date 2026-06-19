# Plan: Módulo Reportes — gráficos avanzados mes a mes

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Gráficos avanzados en Reportes — finanzas, stock, ventas y métricas de alto impacto para resumen visual mensual del negocio

---

## Descripción General

### Qué Logra Este Plan

Transforma `/reportes` de una **tabla financiera estática** en un **centro de inteligencia visual** con pestañas (Finanzas · Ventas · Stock · Operación), gráficos SVG lime/black (sin librerías pesadas), selector de mes/período y KPIs de alto impacto. El dueño puede ver en 30 segundos: cómo cerró el mes en plata, qué vendió más, cómo evolucionó el stock y qué alertas operativas requieren acción.

### Por Qué Importa

El dashboard responde **“¿cómo va hoy?”**; Reportes debe responder **“¿cómo va el negocio mes a mes?”** — la pregunta que hace un dueño de tienda de ropa, despensa o ferretería al cerrar mes. Hoy existe la RPC `get_reporte_historico_meses` y una tabla HTML, pero:

- No hay gráficos de tendencia ni comparación visual mes vs mes.
- Faltan dimensiones críticas: mix de pagos, tops históricos, inventario, rotación.
- `comisiones` ya se calculan en la RPC pero **no se muestran** en la UI.
- Stock y movimientos tienen datos en DB pero **cero visualización** en reportes.

Este plan cierra esa brecha sin duplicar el dashboard ni instalar chart libraries (patrón `VentasChart`).

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/app/(dashboard)/reportes/page.tsx` | Única página — tabla P&L mensual inline (sin componentes separados) |
| `app/lib/reportes/queries.ts` | `obtenerReporteHistorico(meses)` → RPC `get_reporte_historico_meses` |
| `supabase/migrations/20260523000001_reporte_historico_rpc.sql` | RPC financiera mensual (12 métricas por mes) |
| `supabase/migrations/20260510000001_ganancia_bruta_rpc.sql` | RPC `get_ganancia_bruta_mes` (dashboard) |
| `app/lib/dashboard/queries.ts` | KPIs día/mes, serie 14 días, tops, ganancia bruta |
| `app/components/dashboard/VentasChart.tsx` | Gráfico SVG barras — **patrón a replicar** |
| `app/components/dashboard/GananciaBrutaCard.tsx` | Barra margen visual, resultado neto |
| `app/components/dashboard/KpiCard.tsx` | Tile KPI reutilizable |
| `app/lib/rubro/config.ts` | Labels var1/var2, flags remitos/devoluciones/balanza |
| `app/components/layout/Sidebar.tsx` | `/reportes` solo owner/admin |
| `planes/2026-05-23-reportes-resultado-neto.md` | Tabla base — **implementada** (estado plan desactualizado) |
| `planes/2026-04-29-modulo-dashboard.md` | Decisión: **sin recharts/chart.js** por bundle |

### Datos ya disponibles en DB (subutilizados en reportes)

| Fuente | Métricas posibles |
|--------|-------------------|
| `ventas` + `detalles_venta` | Tops producto/categoría/var1, ticket promedio, unidades vendidas |
| `pagos_venta` + `metodos_pago` | Mix % por método, comisiones, neto vs bruto |
| `devoluciones` + `detalles_devolucion` | Tasa devolución, monto, cambio vs reembolso |
| `movimientos_fondos` | Egresos/ingresos manuales mensuales |
| `movimientos_stock` | Entradas, salidas, ajustes por mes |
| `variantes_producto` + `productos` | Valor inventario, bajo stock, unidades en depósito |
| `ventas.usuario_id` | Ventas por cajero/vendedor |
| `remitos` | Pendientes de cobro (rubros con remitos) |
| `cierres_caja` | Arqueo por turno (P2) |

### Brechas o Problemas que se Abordan

| # | Brecha | Impacto |
|---|--------|---------|
| B1 | Solo tabla — sin gráficos de tendencia | Difícil ver si el negocio crece o cae |
| B2 | Sin pestañas por dominio (finanzas/ventas/stock) | Todo mezclado o ausente |
| B3 | Comisiones en RPC pero no en UI | Resultado neto opaco |
| B4 | Dashboard vs reportes: devoluciones `cambio` excluidas en KPIs día pero no en RPC histórica | Números pueden divergir |
| B5 | Sin drill-down por mes seleccionado | Solo vista agregada 3/6/12 meses |
| B6 | Stock/inventario invisible en reportes | Dueño no ve valor atado en mercadería |
| B7 | Sin export CSV/PDF | No puede llevar datos a contador |
| B8 | Sin `loading.tsx` en `/reportes` | Percepción de lentitud |
| B9 | Componentes inline en `page.tsx` (~225 líneas) | Imposible mantener gráficos nuevos |

---

## Cambios Propuestos

### Resumen de Cambios

**P0 — Fundación visual + Finanzas (alto impacto inmediato)**
- Refactor `/reportes` → layout con tabs URL `?tab=finanzas|ventas|stock|operacion`
- Biblioteca interna `components/reportes/charts/*` (SVG, lime palette)
- KPI strip mes actual: ventas netas, ganancia, margen, resultado neto, tickets
- Gráficos Finanzas: barras ventas netas 12m, línea resultado neto, stacked costos/egresos/comisiones, columna comisiones en tabla
- Selector mes específico `?mes=2026-05` para drill-down del tab activo
- `loading.tsx` + skeleton

**P1 — Ventas + Stock**
- RPC `get_reporte_ventas_mes`, `get_reporte_stock_mes`
- Tab Ventas: top productos (bar horizontal), top var1 rubro-aware, ticket promedio trend, mix pagos (donut SVG), tasa devoluciones
- Tab Stock: valor inventario, movimientos por tipo, evolución bajo stock, top ingresos mercadería
- Alinear filtro devoluciones `cambio` con dashboard (migración RPC)

**P2 — Operación + export**
- Tab Operación: ventas por vendedor, remitos pendientes (si rubro), comparación mes vs mes anterior (%)
- Export CSV por tab
- Gráfico estacionalidad día de semana (opcional)
- Comparación YoY si hay ≥13 meses de datos

### Catálogo de Gráficos Recomendados (por tab)

#### Tab Finanzas 💰

| Gráfico | Tipo | Datos | Pregunta que responde |
|---------|------|-------|----------------------|
| Ventas netas mensuales | Barras verticales | RPC histórica | ¿Vendo más que el mes pasado? |
| Resultado neto mensual | Línea sobre barras | RPC histórica | ¿Me queda plata al final? |
| Composición del resultado | Barras apiladas | ganancia − comisiones − egresos | ¿Qué me come la ganancia? |
| Margen % mensual | Línea + zona 20%/40% | RPC histórica | ¿Mantengo rentabilidad? |
| KPI cards mes | 4–6 tiles | mes seleccionado | Resumen ejecutivo |
| Tabla P&L (existente) | Tabla | RPC histórica | Detalle contable |

#### Tab Ventas 🛒

| Gráfico | Tipo | Datos | Pregunta que responde |
|---------|------|-------|----------------------|
| Tickets + ticket promedio | Combo bar + línea | ventas/mes | ¿Vendo más unidades o subí precios? |
| Top 10 productos del mes | Barras horizontales | detalles_venta | ¿Qué llevar al mostrador? |
| Top var1 (Talla/Medida/…) | Barras horizontales | detalles_venta.talla | ¿Qué talle/medida rota? (rubro) |
| Mix métodos de pago | Donut SVG | pagos_venta | ¿Cuánto es efectivo vs MP? |
| Devoluciones vs ventas | % + monto | devoluciones | ¿Hay problema de calidad/talle? |
| Ventas por categoría | Barras | producto→categoria | ¿Qué rubro del catálogo empuja? |

#### Tab Stock 📦

| Gráfico | Tipo | Datos | Pregunta que responde |
|---------|------|-------|----------------------|
| Valor inventario actual | KPI grande | Σ stock × precio_compra | ¿Cuánta plata tengo en el depósito? |
| Movimientos por tipo/mes | Barras apiladas | movimientos_stock | ¿Cuánto ingresé vs vendí? |
| Evolución ítems bajo stock | Línea | snapshot mensual o aprox | ¿Mejora la reposición? |
| Top ingresos de mercadería | Tabla top 5 | mov. tipo entrada | ¿Qué reponemos más? |
| Unidades vendidas vs ingresadas | Barras agrupadas | mov. entrada/salida | ¿Hay faltante/merma? |

#### Tab Operación ⚙️

| Gráfico | Tipo | Datos | Pregunta que responde |
|---------|------|-------|----------------------|
| Ventas por vendedor | Barras horizontales | ventas.usuario_id | ¿Quién vende más? |
| Comparación vs mes anterior | % badges en KPIs | mes N vs N-1 | ¿Crecimos o caímos? |
| Remitos pendientes cobro | KPI + lista | remitos (si rubro) | ¿Cuánto me deben? |
| Comisiones acumuladas | KPI | pagos_venta | ¿Cuánto pierdo en MP? |

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260608100001_reportes_ventas_stock_rpc.sql` | RPCs `get_reporte_ventas_mes`, `get_reporte_stock_resumen`, `get_mix_pagos_mes` |
| `supabase/migrations/20260608100002_reporte_historico_fix_devoluciones.sql` | Excluir `tipo_resolucion = 'cambio'` en RPC histórica (alinear dashboard) |
| `app/lib/reportes/types.ts` | Tipos compartidos de reportes |
| `app/lib/reportes/queries-finanzas.ts` | Wrappers financieros (re-export histórico + mes actual) |
| `app/lib/reportes/queries-ventas.ts` | Tops, tickets, mix pagos, devoluciones |
| `app/lib/reportes/queries-stock.ts` | Inventario, movimientos, bajo stock |
| `app/lib/reportes/queries-operacion.ts` | Vendedores, remitos, comparaciones |
| `app/lib/reportes/format-chart.ts` | `formatARSCompact`, escalas, colores lime palette |
| `app/lib/reportes/queries-finanzas.test.ts` | Tests mapeo y % delta |
| `app/components/reportes/ReportesLayout.tsx` | Header, tabs, selector período/mes |
| `app/components/reportes/ReportesKpiStrip.tsx` | Fila KPIs reutilizable |
| `app/components/reportes/ReportesSkeleton.tsx` | Loading skeleton |
| `app/components/reportes/charts/BarChart.tsx` | Barras verticales genérico SVG |
| `app/components/reportes/charts/HorizontalBarChart.tsx` | Tops productos/vendedores |
| `app/components/reportes/charts/LineChart.tsx` | Tendencias margen/resultado |
| `app/components/reportes/charts/StackedBarChart.tsx` | Composición resultado |
| `app/components/reportes/charts/DonutChart.tsx` | Mix pagos |
| `app/components/reportes/charts/ChartEmpty.tsx` | Estado vacío unificado |
| `app/components/reportes/finanzas/FinanzasTab.tsx` | Tab finanzas completo |
| `app/components/reportes/finanzas/TablaPLMensual.tsx` | Tabla P&L extraída de page.tsx |
| `app/components/reportes/finanzas/GraficoVentasNetas.tsx` | Barras 12 meses |
| `app/components/reportes/finanzas/GraficoResultadoNeto.tsx` | Línea resultado |
| `app/components/reportes/ventas/VentasTab.tsx` | Tab ventas |
| `app/components/reportes/stock/StockTab.tsx` | Tab stock |
| `app/components/reportes/operacion/OperacionTab.tsx` | Tab operación |
| `app/app/(dashboard)/reportes/loading.tsx` | Suspense boundary |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/(dashboard)/reportes/page.tsx` | Orquestador delgado: auth, parse params, `ReportesLayout`, lazy tabs |
| `app/lib/reportes/queries.ts` | Re-export desde submódulos; mantener `obtenerReporteHistorico` |
| `app/components/layout/Sidebar.tsx` | Opcional: badge “Reportes” sin cambio de ruta |
| `planes/2026-05-23-reportes-resultado-neto.md` | Nota: extendido por este plan |

### Archivos a Eliminar (si aplica)

Ninguno — refactor incremental. Lógica inline de `page.tsx` migra a componentes, no se borra funcionalidad.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **SVG puro, sin recharts/chart.js** — Consistente con `VentasChart` y plan dashboard. Bundle liviano, control total del tema lime. Componentes genéricos reutilizables en `charts/`.

2. **Tabs por URL (`?tab=`)** — Permite compartir link “reportes de stock de mayo”. Default `finanzas`. Compatible con selector `?meses=12` existente.

3. **Selector dual: período (3/6/12) + mes puntual (`?mes=YYYY-MM`)** — Período alimenta gráficos de tendencia; mes alimenta tops y KPIs del tab. Si no hay `?mes`, usar mes actual.

4. **RPCs en Postgres para agregaciones mensuales** — Evita traer miles de `detalles_venta` al servidor Next. Mismo patrón que `get_reporte_historico_meses`.

5. **Rubro-aware solo donde aporta** — `TopVar1` usa `labelVar1` del rubro; tab remitos solo si `usarRemitos`; devoluciones charts solo si `usarDevoluciones`. Finanzas es universal.

6. **Admin-only sin cambios** — Reportes con ganancia/márgenes sigue restringido a owner/admin (middleware existente).

7. **Fases P0→P2** — Finanzas visual primero (datos ya existen); ventas/stock requieren RPCs nuevas.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Recharts / Chart.js | +80KB bundle; decisión previa del proyecto |
| Una sola página scroll infinito | Difícil de navegar; tabs segmentan mejor |
| Client-side aggregation | No escala; N+1 y payloads grandes |
| PDF automático en P0 | Complejidad alta; CSV en P2 suficiente para contador |
| Materialized views | Overkill para MVP; RPCs STABLE alcanzan |

### Preguntas Abiertas

1. **¿Incluir gráfico de flujo de caja (saldos cuentas_fondos) en Finanzas?** (Recomendación: P2 — requiere serie histórica de saldos no guardada hoy.)

2. **¿Ventas por vendedor visible para admin pero no owner?** (Recomendación: mismo rol admin/owner ven todo.)

3. **¿Export PDF además de CSV?** (Recomendación: solo CSV en P2; PDF si el usuario lo pide.)

4. **¿Comparación año anterior (YoY)?** (Recomendación: P2 — útil desde mes 13+ de operación.)

5. **¿Snapshot mensual de valor inventario en DB?** Para gráfico “evolución valor stock” histórico hace falta guardar cierre mensual o recalcular retroactivo (costoso). (Recomendación: P1 solo valor **actual**; P2 job nocturno `inventario_cierre_mes` si se necesita tendencia.)

---

## Tareas Paso a Paso

### Paso 1: Infraestructura charts + layout

Crear utilidades y componentes base SVG.

**`app/lib/reportes/format-chart.ts`:**
```typescript
export const CHART_COLORS = {
  primary: '#84CC16',    // lime-500
  primaryDark: '#4D7C0F', // lime-700
  negative: '#EF4444',
  neutral: '#9CA3AF',
  grid: '#F3F4F6',
}
export function formatARSCompact(n: number): string { /* igual VentasChart */ }
export function maxWithPadding(values: number[], pct = 0.1): number
```

**`app/components/reportes/charts/BarChart.tsx`:**
- Props: `data: { label: string; value: number; highlight?: boolean }[]`, `height?`, `formatValue?`
- SVG responsive `viewBox`, tooltips `<title>`, grilla Y

Replicar patrón de `VentasChart.tsx` (padLeft 48, padBottom 28).

**`ReportesLayout.tsx`:**
- Header: título, subtítulo, selector 3/6/12 meses
- Tabs: Finanzas | Ventas | Stock | Operación
- Selector mes: dropdown últimos N meses del período
- `children` por tab

**Archivos afectados:**
- `app/lib/reportes/format-chart.ts` (nuevo)
- `app/components/reportes/charts/*.tsx` (nuevos)
- `app/components/reportes/ReportesLayout.tsx` (nuevo)

---

### Paso 2: Refactor página reportes + loading

**`page.tsx` simplificado:**
```typescript
export default async function ReportesPage({ searchParams }) {
  // auth...
  const tab = sp.tab ?? 'finanzas'
  const meses = parseMeses(sp.meses)
  const mesSeleccionado = sp.mes ?? mesActualISO()

  return (
    <ReportesLayout tab={tab} meses={meses} mesSeleccionado={mesSeleccionado}>
      {tab === 'finanzas' && <FinanzasTab meses={meses} mes={mesSeleccionado} />}
      {tab === 'ventas' && <VentasTab mes={mesSeleccionado} />}
      {tab === 'stock' && <StockTab mes={mesSeleccionado} />}
      {tab === 'operacion' && <OperacionTab mes={mesSeleccionado} />}
    </ReportesLayout>
  )
}
```

Extraer `TablaPLMensual`, `FilaReporte`, `MargenBadge` de `page.tsx` → `finanzas/TablaPLMensual.tsx`.

**`loading.tsx`:** usar `ReportesSkeleton`.

**Archivos afectados:**
- `app/app/(dashboard)/reportes/page.tsx`
- `app/app/(dashboard)/reportes/loading.tsx` (nuevo)
- `app/components/reportes/finanzas/TablaPLMensual.tsx` (nuevo)

---

### Paso 3: Tab Finanzas — gráficos desde datos existentes (P0)

Sin migración nueva — solo UI sobre `obtenerReporteHistorico`.

**`FinanzasTab.tsx`:**
1. `ReportesKpiStrip` — mes seleccionado: ventas netas, ganancia bruta, margen %, comisiones, egresos, resultado neto, delta vs mes anterior (%).
2. `GraficoVentasNetas` — `BarChart` con `filas.map(f => ({ label: f.mesLabel corto, value: f.ventasNetas }))`.
3. `GraficoResultadoNeto` — `LineChart` sobre `resultadoNeto`.
4. `StackedBarChart` — por mes: `[gananciaBruta, -comisiones, -egresosManuales]` → visual waterfall simplificado.
5. `TablaPLMensual` — tabla existente + **columna Comisiones** entre Egresos y Resultado.

**Cálculo delta mes anterior:**
```typescript
function deltaPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((actual - anterior) / anterior) * 1000) / 10
}
```

**Archivos afectados:**
- `app/components/reportes/finanzas/FinanzasTab.tsx` (nuevo)
- `app/components/reportes/finanzas/GraficoVentasNetas.tsx` (nuevo)
- `app/components/reportes/finanzas/GraficoResultadoNeto.tsx` (nuevo)
- `app/components/reportes/ReportesKpiStrip.tsx` (nuevo)
- `app/lib/reportes/queries-finanzas.ts` (nuevo — helpers delta, mes actual)

---

### Paso 4: Migración — RPCs ventas y stock

**`20260608100001_reportes_ventas_stock_rpc.sql`:**

```sql
-- Top productos del mes
CREATE OR REPLACE FUNCTION get_top_productos_mes(
  p_tienda_id uuid, p_anio int, p_mes int, p_limit int DEFAULT 10
) RETURNS TABLE (nombre text, cantidad numeric, monto numeric) ...

-- Ticket promedio + cantidad ventas del mes
CREATE OR REPLACE FUNCTION get_kpis_ventas_mes(
  p_tienda_id uuid, p_anio int, p_mes int
) RETURNS TABLE (cantidad_ventas int, ventas_netas numeric, ticket_promedio numeric) ...

-- Mix pagos del mes
CREATE OR REPLACE FUNCTION get_mix_pagos_mes(
  p_tienda_id uuid, p_anio int, p_mes int
) RETURNS TABLE (metodo_nombre text, monto numeric, porcentaje numeric) ...

-- Stock: valor inventario + conteos
CREATE OR REPLACE FUNCTION get_stock_resumen(
  p_tienda_id uuid
) RETURNS TABLE (
  valor_inventario numeric,
  total_variantes int,
  bajo_stock int,
  sin_stock int
) ...

-- Movimientos stock por tipo en un mes
CREATE OR REPLACE FUNCTION get_movimientos_stock_mes(
  p_tienda_id uuid, p_anio int, p_mes int
) RETURNS TABLE (tipo text, cantidad_total numeric, cantidad_movs int) ...
```

**`20260608100002_reporte_historico_fix_devoluciones.sql`:**
- En CTE `devs_mes`, agregar `AND (d.tipo_resolucion IS NULL OR d.tipo_resolucion != 'cambio')` para alinear con dashboard.

**Archivos afectados:**
- `supabase/migrations/20260608100001_reportes_ventas_stock_rpc.sql` (nuevo)
- `supabase/migrations/20260608100002_reporte_historico_fix_devoluciones.sql` (nuevo)

---

### Paso 5: Queries TypeScript ventas y stock

**`queries-ventas.ts`:**
- `obtenerTopProductosMes(anio, mes, limit)`
- `obtenerTopVar1Mes(anio, mes, limit)` — reutilizar lógica dashboard adaptada a mes fijo
- `obtenerKpisVentasMes(anio, mes)`
- `obtenerMixPagosMes(anio, mes)`
- `obtenerTasaDevolucionesMes(anio, mes)` — ventas vs devoluciones

**`queries-stock.ts`:**
- `obtenerStockResumen()`
- `obtenerMovimientosStockMes(anio, mes)`
- `obtenerTopIngresosMes(anio, mes, limit)` — movimientos tipo `entrada`

**Archivos afectados:**
- `app/lib/reportes/queries-ventas.ts` (nuevo)
- `app/lib/reportes/queries-stock.ts` (nuevo)
- `app/lib/reportes/types.ts` (nuevo)

---

### Paso 6: Tab Ventas (P1)

**`VentasTab.tsx` layout (grid responsive):**
```
[KPI tickets] [KPI ticket promedio] [KPI unidades] [KPI tasa devolución]
[ Top 10 productos — HorizontalBarChart    ] [ Mix pagos — DonutChart ]
[ Top var1 (label rubro) — HorizontalBarChart (full width si rubro) ]
```

- `DonutChart.tsx`: arcos SVG, leyenda lateral, colores lime + grises.
- Empty states si mes sin ventas.
- Rubro: ocultar bloque devoluciones si `!usarDevoluciones`.

**Archivos afectados:**
- `app/components/reportes/ventas/VentasTab.tsx` (nuevo)
- `app/components/reportes/charts/DonutChart.tsx` (nuevo)
- `app/components/reportes/charts/HorizontalBarChart.tsx` (nuevo)

---

### Paso 7: Tab Stock (P1)

**`StockTab.tsx`:**
```
[ KPI valor inventario ] [ KPI variantes ] [ KPI bajo stock ] [ KPI sin stock ]
[ Movimientos del mes — StackedBarChart: entrada/salida/ajuste/devolución ]
[ Top ingresos mercadería — tabla compacta ]
```

Nota UX: si `valor_inventario = 0` por falta de precios de costo, mostrar banner igual que tabla P&L (“cargá precio de costo”).

**Archivos afectados:**
- `app/components/reportes/stock/StockTab.tsx` (nuevo)

---

### Paso 8: Tab Operación (P2)

**`queries-operacion.ts`:**
- `obtenerVentasPorVendedorMes(anio, mes)` — join `ventas` + `perfiles`
- `obtenerRemitosPendientes()` — si `usarRemitos`
- `obtenerComparacionMes(anio, mes)` — % vs mes anterior en ventas, tickets, resultado

**`OperacionTab.tsx`:**
- Barras vendedores
- KPI remitos pendientes (condicional)
- Cards comparación MoM con flechas ↑↓ lime/red

**Archivos afectados:**
- `app/lib/reportes/queries-operacion.ts` (nuevo)
- `app/components/reportes/operacion/OperacionTab.tsx` (nuevo)

---

### Paso 9: Export CSV (P2)

**`app/app/api/reportes/export/route.ts`:**
- Query params: `tab`, `mes`, `meses`
- Genera CSV según tab (finanzas → filas P&L; ventas → tops; etc.)
- Auth admin + `tienda_id` check
- Botón “Exportar CSV” en `ReportesLayout` (solo owner/admin)

**Archivos afectados:**
- `app/app/api/reportes/export/route.ts` (nuevo)
- `app/components/reportes/ReportesLayout.tsx`

---

### Paso 10: Tests y validación

**Tests (`queries-finanzas.test.ts`):**
- `deltaPct` con cero, negativo, positivo
- Mapeo `FilaMesReporte` desde RPC mock

**Checklist manual (tienda ropa con ≥3 meses de ventas):**
1. `/reportes` → tab Finanzas: gráficos + tabla con comisiones
2. Cambiar a 6/12 meses — gráficos actualizan
3. Seleccionar mes mayo → KPIs de mayo
4. Tab Ventas: top productos + mix pagos
5. Tab Stock: valor inventario + movimientos
6. Tab Operación: ventas por vendedor
7. Mobile 375px — grids en 1 columna, gráficos legibles
8. `npm run build`
9. Números finanzas alineados con dashboard del mismo mes

**Archivos afectados:**
- `app/lib/reportes/queries-finanzas.test.ts` (nuevo)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/app/(dashboard)/dashboard/page.tsx` | KPIs diarios — no duplicar, complementar |
| `app/components/dashboard/VentasChart.tsx` | Patrón SVG a copiar |
| `app/components/dashboard/GananciaBrutaCard.tsx` | Misma lógica margen/resultado |
| `app/lib/supabase/middleware.ts` | Guard admin en `/reportes` |
| `planes/2026-05-23-reportes-resultado-neto.md` | Antecedente tabla P&L |
| `planes/2026-06-08-optimizar-stock-velocidad-ux.md` | Stock bajo stock — datos alimentan tab Stock |

### Actualizaciones Necesarias para Consistencia

- Marcar `planes/2026-05-23-reportes-resultado-neto.md` como **Implementado** + nota “extendido por 2026-06-08-reportes-graficos-avanzados”.
- No requiere CLAUDE.md (ruta `/reportes` ya existe).

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Cierre de mes del dueño | **Centralizado** en /reportes con gráficos |
| Dashboard diario | Sin cambio — sigue siendo operativo |
| Contador / export | **Nuevo** CSV en P2 |
| POS / ventas | Sin cambio en transacciones |
| Roles vendedor | Sin acceso a reportes (igual que hoy) |

---

## Lista de Validación

- [x] Tabs Finanzas/Ventas/Stock/Operación navegables por URL
- [x] Gráficos SVG renderizan en mobile y desktop
- [x] KPI strip muestra mes seleccionado con delta vs mes anterior
- [x] Tabla P&L incluye columna Comisiones
- [x] Gráfico ventas netas 12 meses coherente con tabla
- [x] RPC ventas/stock desplegadas y tipadas
- [x] Tab Ventas: tops + mix pagos
- [x] Tab Stock: valor inventario + movimientos
- [x] Devoluciones `cambio` excluidas en RPC histórica (alineado dashboard)
- [x] `loading.tsx` muestra skeleton
- [x] Admin-only preservado
- [x] Tests unitarios pasan
- [x] `npm run build` OK

---

## Criterios de Éxito

1. Un dueño abre `/reportes` y en **≤ 60 segundos** entiende si el mes fue rentable (gráfico resultado + KPIs) sin leer la tabla completa.
2. Puede comparar **visualmente** los últimos 12 meses de ventas netas y margen en un solo vistazo.
3. Tab Ventas responde “¿qué vendí más este mes?” y “¿cómo me pagan?” sin ir al dashboard ni al listado de ventas.
4. Tab Stock muestra **valor de inventario** y movimientos del mes (antes invisible).
5. La página carga con **skeleton inmediato**; gráficos no bloquean navegación del resto del sistema.

---

## Notas

- **Prioridad de implementación:** P0 Pasos 1–3 (finanzas visual) → deploy/test → P1 Pasos 4–7 → P2 Pasos 8–9.
- Los gráficos SVG son mantenibles: si en el futuro se necesitan tooltips ricos o zoom, evaluar `recharts` solo en `/reportes` (code-split).
- **Inventario histórico:** sin tabla de cierres, el gráfico “valor stock en el tiempo” es P2+; no bloquear P0/P1.
- Rubros con balanza (corralón, carnicería): agregar KPI “kg vendidos” en P2 usando `detalles_venta.cantidad` + `unidad_de_medida` — fuera de scope inicial.
- Ejecutar con: `/implementar planes/2026-06-08-reportes-graficos-avanzados.md`

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se transformó `/reportes` en un centro visual con 4 tabs (Finanzas, Ventas, Stock, Operación), gráficos SVG lime/black sin librerías externas, KPI strip con delta MoM, selector de período 3/6/12 meses y drill-down por mes. Tab Finanzas incluye barras ventas netas, línea resultado neto, barras apiladas de composición y tabla P&L con columna Comisiones. Tabs Ventas/Stock/Operación con RPCs Postgres + fallback JS. Export CSV por tab vía `/api/reportes/export`. Skeleton en `loading.tsx`.

### Desviaciones del Plan

- `ReportesMesSelector` como componente client separado (no inline en layout) para el dropdown de mes.
- Queries con fallback JS permiten funcionar antes de aplicar migraciones en Supabase.

### Problemas Encontrados

Ninguno — `npm run build` y tests unitarios pasan.

> **Auditoría devoluciones (2026-06-20):** corrección de ganancia bruta/resultado neto en P&L, dashboard y caja. Ver `planes/2026-06-20-auditoria-reportes-finanzas-csv-devoluciones.md` y `referencia/reportes-definiciones-metricas.md`.
