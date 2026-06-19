# Plan: Fix KPIs y gráficos responsive — Reportes y Gráficos

**Creado:** 2026-06-10
**Estado:** Implementado
**Pedido:** fix reportes graficos — KPIs con números grandes se rompen; arreglar todos los gráficos 100% responsive en todos los formatos de reportes

---

## Descripción General

### Qué Logra Este Plan

Corrige el desbordamiento visual de **KPI cards** cuando los montos son grandes (millones de ARS) y hace que **todos los gráficos SVG** de `/graficos` y la **tabla P&L** de `/reportes` se adapten correctamente a mobile (375px), tablet (~768px) y desktop (≥1024px con sidebar). Los números grandes se muestran compactos en pantalla con valor completo accesible (tooltip/`title`), y los gráficos ajustan padding, densidad de etiquetas y layout según el ancho disponible.

### Por Qué Importa

Un dueño de tienda en Argentina maneja montos de 6–9 dígitos habitualmente. Hoy `$ 12.345.678,90` en una KPI de ~150px de ancho se trunca feo (`truncate`), el donut central desborda el círculo, y las barras horizontales superponen el monto sobre la barra. Eso hace que Reportes/Gráficos — la herramienta de cierre de mes — se vea rota justo cuando más importa.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/components/dashboard/KpiCard.tsx` | Tile KPI compartido — `truncate` + `text-[20px] sm:text-[24px]` fijo |
| `app/components/reportes/ReportesKpiStrip.tsx` | Grid `xl:grid-cols-6` — 6 KPIs en una fila en pantallas grandes |
| `app/lib/format.ts` | `formatARS()` — siempre 2 decimales, formato completo es-AR |
| `app/lib/reportes/format-chart.ts` | `formatARSCompact`, `formatARSFull`, `CHART_PAD` estático |
| `app/components/reportes/charts/BarChart.tsx` | SVG 700×220, `padLeft: 48` fijo, barras estrechas con 12 meses |
| `app/components/reportes/charts/LineChart.tsx` | Mismo padding fijo |
| `app/components/reportes/charts/StackedBarChart.tsx` | Mismo padding fijo |
| `app/components/reportes/charts/HorizontalBarChart.tsx` | `formatARSFull` en etiqueta de valor; `padLeft: 120`, `padRight: 72` fijos |
| `app/components/reportes/charts/DonutChart.tsx` | `formatARSFull(total)` en centro; tamaño fijo 200px |
| `app/components/reportes/finanzas/TablaPLMensual.tsx` | Tabla P&L 10–13 columnas, solo `overflow-x-auto` |
| `app/app/(dashboard)/reportes/page.tsx` | Tabla P&L |
| `app/app/(dashboard)/graficos/page.tsx` | Tabs Finanzas/Ventas/Stock/Operación |
| `app/components/reportes/finanzas/FinanzasTab.tsx` | 6 KPIs monetarios con `formatARS()` completo |
| `app/components/reportes/ventas/VentasTab.tsx` | 4–5 KPIs |
| `app/components/reportes/stock/StockTab.tsx` | KPI valor inventario (puede ser millones) |
| `app/components/reportes/operacion/OperacionTab.tsx` | KPIs con `formatARS()` directo |
| `app/components/dashboard/VentasChart.tsx` | Patrón SVG de referencia (ya responsive con viewBox) |
| `planes/2026-05-13-responsive-completo-sin-overflow.md` | Plan global responsive — patrones reutilizables |

### Brechas o Problemas que se Abordan

| # | Problema | Síntoma |
|---|----------|---------|
| B1 | `KpiCard` usa `truncate` + font fijo | Montos largos cortados (`$ 12.345.6…`) sin ver valor completo |
| B2 | `formatARS()` siempre con 2 decimales en KPIs | Strings de 15–20 caracteres en cards estrechas |
| B3 | `ReportesKpiStrip` → `xl:grid-cols-6` | Con sidebar (~856px útil) cada card ≈140px — imposible para ARS |
| B4 | `HorizontalBarChart` pinta monto al lado de barra con `formatARSFull` | Overflow y solapamiento con barras cortas o labels largos |
| B5 | `DonutChart` centro con monto completo | Texto desborda el agujero central en totales >$1M |
| B6 | `CHART_PAD.left = 48` estático | Etiquetas Y de eje pueden clippear si escala compacta falla |
| B7 | 12 barras mensuales en 700px viewBox | Barras <8px y labels X superpuestos en mobile |
| B8 | Sin wrapper `min-w-0` en grids de charts | Grids Tailwind no encogen SVG y empujan layout |
| B9 | Tabla P&L sin vista alternativa mobile | Scroll horizontal de 13 columnas — usable pero no ideal |
| B10 | Finanzas/Operación/Stock pasan strings ya formateados | No hay capa única de formato responsive |

---

## Cambios Propuestos

### Resumen de Cambios

- **Nueva capa de formato KPI:** `formatARSKpi()` compacto + `formatARSTooltip()` completo
- **`KpiCard` mejorado:** tipografía fluida (`clamp`), sin `truncate`, `title` con valor completo, prop opcional `valorCompleto`
- **`ReportesKpiStrip`:** grid `auto-fit minmax(160px, 1fr)` max 3 columnas en desktop; 2 en tablet; 1 en mobile
- **Utilidades chart compartidas:** `chart-layout.ts` — padding dinámico según labels, skip de ticks X en mobile, altura mínima
- **`ChartContainer`:** wrapper con `min-w-0`, scroll horizontal *contenido* solo cuando el chart lo necesita (12 meses)
- **Refactor 5 charts:** padding dinámico, compact en ejes, layout adaptativo en HorizontalBar y Donut
- **Tabs:** pasar montos numéricos a KPI strip; formatear dentro del componente
- **Tabla P&L mobile:** filas tipo card en `< sm` (mes + métricas clave), tabla completa en `≥ sm`
- **Tests unitarios** para helpers de formato y padding

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/reportes/format-kpi.ts` | `formatARSKpi`, `formatARSTooltip`, umbrales de compactación |
| `app/lib/reportes/chart-layout.ts` | `computePadLeft`, `shouldSkipXLabel`, `barSlotWidth`, estimación ancho label |
| `app/lib/reportes/format-kpi.test.ts` | Tests formato KPI y edge cases millones |
| `app/lib/reportes/chart-layout.test.ts` | Tests padding dinámico y skip labels |
| `app/components/reportes/charts/ChartContainer.tsx` | Wrapper responsive con overflow contenido |
| `app/components/reportes/finanzas/TablaPLMensualMobile.tsx` | Vista card de P&L para mobile |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/dashboard/KpiCard.tsx` | Tipografía fluida, quitar truncate, `title` tooltip, props `valorCompleto`/`compacto` |
| `app/components/reportes/ReportesKpiStrip.tsx` | Grid auto-fit; pasar `valorCompleto`; variant `columns` opcional |
| `app/lib/reportes/format-chart.ts` | Re-export format-kpi; `formatARSCompact` soporta B/M; helper `estimateLabelWidth` |
| `app/components/reportes/charts/BarChart.tsx` | Usar chart-layout; ChartContainer; skip labels X adaptativo |
| `app/components/reportes/charts/LineChart.tsx` | Ídem |
| `app/components/reportes/charts/StackedBarChart.tsx` | Ídem |
| `app/components/reportes/charts/HorizontalBarChart.tsx` | Layout dual: desktop inline value / mobile value debajo; compact format |
| `app/components/reportes/charts/DonutChart.tsx` | Centro compact; SVG `width="100%"` max-w; fontSize adaptativo |
| `app/components/reportes/finanzas/FinanzasTab.tsx` | KPIs con `valor` numérico + formateo en strip/card |
| `app/components/reportes/ventas/VentasTab.tsx` | Ídem para montos |
| `app/components/reportes/stock/StockTab.tsx` | Ídem valor inventario |
| `app/components/reportes/operacion/OperacionTab.tsx` | Ídem montos |
| `app/components/reportes/finanzas/TablaPLMensual.tsx` | Integrar vista mobile + tabular-nums consistente |
| `app/components/reportes/finanzas/GraficoVentasNetas.tsx` | Envolver en ChartContainer |
| `app/components/reportes/finanzas/GraficoResultadoNeto.tsx` | Ídem |
| `app/app/(dashboard)/reportes/page.tsx` | `min-w-0` en contenedor si hace falta |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Formato compacto solo en KPIs/gráficos, no global:** `formatARS()` en POS/caja sigue con 2 decimales. Nuevo `formatARSKpi()` para display visual.

2. **Valor completo siempre accesible:** `title` HTML nativo en KPI y `<title>` SVG en charts — sin librería de tooltips (consistente con patrón actual).

3. **Grid KPI max 3 columnas en desktop:** 6 KPIs de Finanzas = 2 filas × 3 cols. Mejor legibilidad que 6 en fila.

4. **Scroll horizontal contenido en chart, no en página:** `ChartContainer` con `overflow-x-auto` + `min-width` mínima del SVG solo cuando hay 9+ puntos. La página `/graficos` no debe tener scroll X.

5. **HorizontalBarChart — mobile stacked row:** En `< sm`, cada fila = label arriba, barra full-width, monto debajo alineado a la derecha (sin pintar monto sobre la barra).

6. **Donut centro siempre compact:** `$2.5M` en centro; leyenda lateral con % ; monto completo en `<title>`.

7. **Tabla P&L mobile — cards resumidas:** Mostrar mes, ventas netas, resultado neto, comisiones; link "ver detalle" expande o scroll a tabla desktop-only hidden block — preferir cards apiladas sin duplicar toda la tabla.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Reducir decimales en `formatARS()` global | Rompe POS, caja, tickets |
| `recharts` responsive | Decisión previa del proyecto — bundle y consistencia SVG |
| Solo `truncate` + tooltip custom | No resuelve gráficos SVG ni donut |
| Ocultar KPIs en mobile | Pierde valor del módulo en celular |
| Tabla P&L siempre scroll horizontal | Aceptable como fallback; cards mejoran UX |

### Preguntas Abiertas

1. **¿KPIs muestran siempre formato compacto o solo cuando superan X caracteres?** (Recomendación: umbral automático — si `formatARS(n).length > 12` usar compact.)

2. **¿Tabla P&L mobile muestra todas las columnas en cards expandibles o solo resumen?** (Recomendación: resumen 4 métricas + scroll horizontal opcional "ver tabla completa".)

---

## Tareas Paso a Paso

### Paso 1: Helpers de formato KPI

Crear `app/lib/reportes/format-kpi.ts`:

```typescript
/** Display en card — compacto si el monto es largo */
export function formatARSKpi(n: number): string

/** Siempre compacto para ejes de gráficos */
export function formatARSAxis(n: number): string  // alias mejorado de formatARSCompact

/** Valor completo para title/tooltip */
export function formatARSTooltip(n: number): string

/** true si conviene compactar en KPI */
export function shouldCompactKpi(n: number): boolean
```

Reglas `formatARSKpi`:
- `< 1_000_000` → `$ 850k` o formato corto sin decimales: `$ 850.000` (sin centavos)
- `≥ 1_000_000` → `$ 2,5M` (1 decimal en M)
- `≥ 1_000_000_000` → `$ 1,2B`
- Negativos con prefijo `−`

Extender `format-chart.ts`:
- `formatARSCompact` agregar tier `B` (billones)
- Export re-exports desde `format-kpi.ts`

**Tests (`format-kpi.test.ts`):**
- 500 → `$500` o `$ 500`
- 1_500_000 → `$1,5M`
- 12_345_678 → compacto ≤8 chars visuales
- -500_000 → `−$500k`

**Archivos afectados:**
- `app/lib/reportes/format-kpi.ts` (nuevo)
- `app/lib/reportes/format-kpi.test.ts` (nuevo)
- `app/lib/reportes/format-chart.ts`

---

### Paso 2: Refactor KpiCard + ReportesKpiStrip

**`KpiCard.tsx` cambios:**

```tsx
interface KpiCardProps {
  label: string
  valor: string           // display (puede ser compacto)
  valorCompleto?: string  // para title; default = valor
  ...
}

// Reemplazar:
// className="... truncate text-[20px] sm:text-[24px] ..."
// Por:
// className="... text-[clamp(1rem,4vw,1.5rem)] leading-tight break-words ..."
// title={valorCompleto ?? valor}
// tabular-nums
```

- Footer delta/sub: `flex-wrap` para que no desborde
- `min-w-0` en contenedor interno

**`ReportesKpiStrip.tsx` cambios:**

```tsx
// Antes: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6
// Después:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
```

Opcional: aceptar `items: KpiItem[]` donde `KpiItem` incluye `valorNumero?: number` y el strip formatea con `formatARSKpi` + `formatARSTooltip`.

**Archivos afectados:**
- `app/components/dashboard/KpiCard.tsx`
- `app/components/reportes/ReportesKpiStrip.tsx`

---

### Paso 3: Utilidades chart-layout + ChartContainer

**`chart-layout.ts`:**

```typescript
export const CHART_VIEW_WIDTH = 700

export function computePadLeft(yLabels: string[], min = 40, max = 80): number
export function computePadRight(valueLabels: string[], min = 8, max = 72): number
export function xLabelInterval(count: number, slotWidth: number): number
  // count=12, slotWidth<40 → show every 3rd label
export function minChartWidth(barCount: number, minBarSlot = 28): number
  // 12 * 28 = 336 inner + pads → ~400 min scroll width
```

**`ChartContainer.tsx`:**

```tsx
interface ChartContainerProps {
  children: React.ReactNode
  minWidth?: number  // activa scroll interno si viewport < minWidth
  className?: string
}
// className="min-w-0 w-full overflow-x-auto"
// inner div style={{ minWidth: minWidth ?? 'auto' }}
```

**Archivos afectados:**
- `app/lib/reportes/chart-layout.ts` (nuevo)
- `app/lib/reportes/chart-layout.test.ts` (nuevo)
- `app/components/reportes/charts/ChartContainer.tsx` (nuevo)

---

### Paso 4: Refactor BarChart, LineChart, StackedBarChart

Patrón común para los tres:

1. Calcular `yMarks` labels con `formatARSAxis`
2. `padLeft = computePadLeft(yMarks.map(formatARSAxis))`
3. `slot = innerW / n`; `interval = xLabelInterval(n, slot)`
4. Mostrar label X solo si `i % interval === 0 || i === n-1`
5. Envolver SVG en `<ChartContainer minWidth={minChartWidth(n)}>`
6. Rotar labels X 45° opcional si `slot < 24` (fallback)

**BarChart específico:**
- `barW = Math.max(4, slot - 4)` en mobile-dense mode (slot < 20)

**LineChart específico:**
- Círculos con `<title>` siempre con `formatARSTooltip`

**StackedBarChart:**
- Misma lógica de interval en X

**Archivos afectados:**
- `app/components/reportes/charts/BarChart.tsx`
- `app/components/reportes/charts/LineChart.tsx`
- `app/components/reportes/charts/StackedBarChart.tsx`

---

### Paso 5: Refactor HorizontalBarChart (crítico para tops)

Rediseño layout:

**Desktop (`≥ sm`):**
- Label izquierda (max 30% width, truncate + title)
- Barra centro
- Valor derecha con `formatARSKpi` (no full)

**Mobile (`< sm`):**
- Bloque vertical por fila:
  ```
  [Nombre producto truncate]
  [████████ barra 100% width]
  [$ 1,2M · 45 u.]  alineado derecha
  ```

Implementación: componente puede ser `'use client'` con `useMediaQuery` **o** CSS puro con dos SVG/HTML blocks (`hidden sm:block` / `sm:hidden`). **Preferir CSS dual** para evitar hydration mismatch — lista HTML en mobile, SVG en desktop.

Alternativa más simple: abandonar SVG en mobile para horizontal bars → usar divs con `width: ${pct}%` (Tailwind) en mobile list. Más mantenible y 100% responsive.

**Archivos afectados:**
- `app/components/reportes/charts/HorizontalBarChart.tsx`
- Opcional: `HorizontalBarList.tsx` para variante mobile en divs

---

### Paso 6: Refactor DonutChart

1. Centro: `formatARSKpi(total)` siempre
2. `fontSize` en SVG text: calcular según string length (11→9 si >8 chars)
3. Contenedor: `className="w-full max-w-xs mx-auto sm:max-w-none"`
4. SVG: `width="100%" height="auto" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"`
5. Leyenda: en mobile full-width debajo; `%` + compact monto en tooltip

**Archivos afectados:**
- `app/components/reportes/charts/DonutChart.tsx`

---

### Paso 7: Actualizar tabs para usar formato KPI

En cada tab, cambiar de:
```typescript
valor: formatARS(actual.ventasNetas)
```
A:
```typescript
valor: formatARSKpi(actual.ventasNetas),
valorCompleto: formatARSTooltip(actual.ventasNetas),
```

O pasar `valorNumero` al strip y formatear centralizado.

**Archivos afectados:**
- `app/components/reportes/finanzas/FinanzasTab.tsx`
- `app/components/reportes/ventas/VentasTab.tsx`
- `app/components/reportes/stock/StockTab.tsx`
- `app/components/reportes/operacion/OperacionTab.tsx`

---

### Paso 8: Tabla P&L responsive (/reportes)

**`TablaPLMensualMobile.tsx`:**
- Por cada `FilaMesReporte`, card con:
  - Header: mesLabel
  - Grid 2×2: Ventas netas | Resultado neto | Comisiones | Tickets
  - Badge margen si aplica
- `hidden sm:block` en tabla existente
- `sm:hidden` en cards

Montos en cards: `formatARSKpi` con `title={formatARSTooltip(...)}`

**Tabla desktop:**
- Mantener `overflow-x-auto`
- Celdas monetarias: `whitespace-nowrap tabular-nums text-[12px] sm:text-[13px]`
- Opcional: en columnas muy anchas usar `formatARSKpi` en `< sm` dentro de tabla — **no**, tabla solo desktop

**Archivos afectados:**
- `app/components/reportes/finanzas/TablaPLMensualMobile.tsx` (nuevo)
- `app/components/reportes/finanzas/TablaPLMensual.tsx`

---

### Paso 9: Grids y layouts contenedores

Asegurar en todos los tabs y graficos layout:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
  <div className="min-w-0">...</div>
</div>
```

**GraficosLayout.tsx / reportes page:**
- Contenedor principal: `min-w-0 overflow-x-hidden`
- Header buttons: `flex-wrap`

**Archivos afectados:**
- `app/components/reportes/GraficosLayout.tsx`
- `app/app/(dashboard)/reportes/page.tsx`
- Wrappers en `GraficoVentasNetas.tsx`, `GraficoResultadoNeto.tsx`, tabs ventas/stock

---

### Paso 10: Tests y validación manual

**Automated:**
```bash
npx tsx --test lib/reportes/format-kpi.test.ts
npx tsx --test lib/reportes/chart-layout.test.ts
npm run build
```

**Manual — breakpoints:**

| Viewport | Qué verificar |
|----------|---------------|
| 375×812 | KPIs 1 col, sin truncate feo, donut legible, P&L cards |
| 768×1024 | KPIs 2 col, charts 1 col, horizontal bars legibles |
| 1280×800 | KPIs 3 col, charts 2 col, tabla P&L sin scroll página |
| 1920×1080 | Sin regresión desktop |

**Datos de prueba:** tienda con ventas netas >$10M/mes, inventario >$5M, 12 meses de historia.

**Archivos afectados:**
- Tests nuevos
- Checklist en este plan

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/components/dashboard/KpiCard.tsx` | Usado en dashboard + gráficos — cambio debe no romper dashboard |
| `app/components/dashboard/VentasChart.tsx` | Patrón SVG — no modificar salvo alinear format compact |
| `planes/2026-06-08-reportes-graficos-avanzados.md` | Plan padre — extensión UX |
| `planes/2026-05-13-responsive-completo-sin-overflow.md` | Patrones overflow globales |

### Actualizaciones Necesarias para Consistencia

- Nota en `planes/2026-06-08-reportes-graficos-avanzados.md`: "extendido por fix responsive KPI/charts"
- No requiere CLAUDE.md (sin nueva ruta)

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Dashboard KPIs | Mejora tipografía fluida en `KpiCard` — positivo |
| POS / Caja | Sin cambio en `formatARS()` |
| Export CSV | Sin cambio — datos numéricos completos |
| `/graficos` tabs | Visual mejorado, misma data |

---

## Lista de Validación

- [x] KPI Finanzas con monto >$10M se lee completo (compact) sin truncar feo
- [x] Hover/long-press muestra valor exacto en `title`
- [x] Grid KPI nunca más de 3 columnas en desktop
- [x] Donut centro no desborda con total >$5M
- [x] HorizontalBarChart sin solapamiento monto/barra en 375px
- [x] BarChart 12 meses legible (scroll contenido o labels skip)
- [x] `/reportes` mobile muestra cards P&L sin scroll horizontal de página
- [x] `/graficos` sin scroll horizontal a nivel página en 375px
- [x] Dashboard KpiCard no regresiona visualmente
- [x] Tests unitarios pasan
- [x] `npm run build` OK

---

## Criterios de Éxito

1. Con ventas netas de **$15.432.890**, la KPI "Ventas netas" muestra un valor legible en **≤1.5 segundos** sin caracteres cortados en mobile y desktop.
2. Todos los gráficos de `/graficos` son usables en **375px** sin overflow horizontal de la ventana.
3. La tabla P&L en `/reportes` tiene alternativa mobile clara; desktop conserva detalle completo.
4. Cero regresiones en dashboard POS/caja por cambios de formato.

---

## Notas

- Prioridad: **Paso 1–2 (KPIs)** → deploy visual inmediato → **Paso 4–6 (charts)** → **Paso 8 (tabla mobile)**.
- Si `HorizontalBarChart` dual SVG/HTML es muy costoso, la variante mobile en divs Tailwind es aceptable y recomendada.
- Considerar alinear `VentasChart` del dashboard con `formatARSAxis` en paso futuro (fuera de scope — solo si hay tiempo).
- Ejecutar con: `/implementar planes/2026-06-10-fix-graficos-kpi-responsive.md`

---

## Notas de Implementación

**Implementado:** 2026-06-10

### Resumen

Se agregó capa `format-kpi.ts` con formato compacto automático para montos grandes (`formatARSKpi`, `formatARSTooltip`). `KpiCard` usa tipografía fluida (`clamp`), sin `truncate`, y `title` con valor completo. Grid KPI limitado a 3 columnas. Charts refactorizados con `chart-layout.ts` (padding dinámico, skip labels X) y `ChartContainer` (scroll contenido para 12 meses). `HorizontalBarChart` dual: divs en mobile, grid en desktop. `DonutChart` con total compacto en centro. Tabla P&L con cards mobile (`TablaPLMensualMobile`). Layouts con `min-w-0 overflow-x-hidden`.

### Desviaciones del Plan

- `HorizontalBarChart` desktop usa grid CSS con divs en lugar de SVG (más mantenible y responsive).
- `formatARSAxis` implementado como alias de la lógica compact en `format-kpi.ts`.

### Problemas Encontrados

Ninguno — 14 tests unitarios OK, `npm run build` OK.
