# Plan: Renovación UX/UI de /stock y stock por producto

**Creado:** 2026-08-25
**Estado:** Implementado
**Pedido:** Renovar `/stock` y el stock de cada producto — mucho por mejorar (claridad, móvil, flujo operativo).

---

## Descripción General

### Qué Logra Este Plan

Hace el inventario usable en el día a día: listado con KPIs y filtros touch-friendly, **vista de stock a nivel producto** (todas las variantes juntas), detalle de variante más claro, y corrección de bugs que hoy mienten (filtro “bajo stock”, display de ∞). Sin tocar PrintBridge ni el motor de consumo POS.

### Por Qué Importa

Después del POS, stock es el módulo que evita “vendí algo que no había”. Hoy es variante-céntrico, denso en mobile, con filtros frágiles y sin panorama del producto (ropa: talle×color). Fase 6 solo aplicó tokens/DataTable; el plan `2026-06-08-optimizar-stock-velocidad-ux.md` quedó en borrador — este plan lo **absorbe y actualiza** con IA de producto.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/app/(dashboard)/stock/page.tsx` | Listado flat por variante |
| `app/app/(dashboard)/stock/[varianteId]/page.tsx` | Detalle variante: KPIs + ingreso + ajuste + movs |
| `app/app/(dashboard)/stock/movimientos/page.tsx` | Auditoría global |
| `app/components/stock/*` | TablaStock, FiltrosStock, Ingreso/Ajuste, MovimientosTabla, AlertaStockBajo |
| `app/lib/stock/{queries,infinito,consumo}.ts` | Datos + sentinel -1 |
| `app/app/actions/stock.ts` | RPC `ajustar_stock_variante` |
| Producto | Link “Ajustar” → una variante; stock no editable en edición |

### Brechas o Problemas que se Abordan

1. **Filtro `bajo=1`**: se pagina y luego se filtra en JS → totales/páginas incorrectos (`queries.ts`).
2. **`formatStockDisplay` sin `permiteInfinito`** en list/detail → ∞ se ve como `0`.
3. **Sin vista producto**: no hay matriz/hermanos; hay que saltar variante por variante.
4. **Listado denso** en mobile (código, precio, mín en cards); sin KPI strip.
5. **Filtros**: panel completo sin Drawer; talla siempre visible (ignora `usarVar1`).
6. **Detalle variante**: dos forms con autofocus pelean; stats raw; poco contexto de producto.
7. **Movimientos**: tabla custom + selects raw (no DataTable / primitives).
8. `IngresoForm` con `text-blue-600` (anti-DS).

---

## Cambios Propuestos

### Resumen de Cambios

- Fix bugs: bajo-stock en SQL/RPC + ∞ display en todo el módulo.
- List `/stock`: KPI strip, filtros Drawer mobile + chips, cards priorizadas, quick actions.
- Nueva ruta **`/stock/producto/[productoId]`** (matriz de variantes + sheet ingreso/ajuste).
- Detalle variante: tabs Ingreso | Ajuste | Movimientos; navegación a hermanos / producto.
- Movimientos: DataTable + filtros DS.
- Links desde producto (“Ver stock”) y dashboard alineados.

### Nuevos Archivos a Crear

| Ruta | Propósito |
|------|-----------|
| `app/app/(dashboard)/stock/producto/[productoId]/page.tsx` | Stock del producto (variantes + acciones) |
| `app/components/stock/StockKpiStrip.tsx` | Bajo / sin stock / total variantes (links a filtros) |
| `app/components/stock/FiltrosStockDrawer.tsx` | Drawer mobile de filtros (o extender FiltrosStock) |
| `app/components/stock/ProductoStockPanel.tsx` | Matriz/lista variantes del producto + selección |
| `app/components/stock/StockAccionSheet.tsx` | Bottom sheet / Modal: ingreso o ajuste de una variante |
| `app/lib/stock/queries-producto.ts` (o funciones en queries.ts) | `obtenerProductoStock(productoId)` |
| `supabase/migrations/YYYYMMDD_stock_bajo_filtro.sql` | RPC o vista para filtrar `stock_actual <= stock_minimo` con count real (si hace falta) |

### Archivos a Modificar

| Ruta | Cambios |
|------|---------|
| `app/lib/stock/queries.ts` | Fix `soloBajoStock` (filtro server-side + total correcto) |
| `app/components/stock/TablaStock.tsx` | Cards hero stock; `permiteInfinito`; quick actions; link a producto |
| `app/components/stock/FiltrosStock.tsx` | Drawer mobile; chips; respetar `usarVar1`/`usarVar2` |
| `app/app/(dashboard)/stock/page.tsx` | KPI strip; pasar rubro/flags |
| `app/app/(dashboard)/stock/[varianteId]/page.tsx` | Tabs; Card KPIs; link a `/stock/producto/...` |
| `app/components/stock/IngresoForm.tsx` / `AjusteForm.tsx` | Un autofocus; tokens; sticky submit mobile |
| `app/components/stock/MovimientosTabla.tsx` + `movimientos/page.tsx` | DataTable + filtros primitives |
| `app/components/productos/VarianteFila.tsx` (o ProductoForm) | CTA “Ver stock del producto” |
| `contexto/proyectos.md` | Registrar entrega |

### Archivos a Eliminar (si aplica)

Ninguno. El plan viejo `2026-06-08-optimizar-stock-velocidad-ux.md` se marca **Superseded** al implementar este (nota al final).

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Producto = centro de inventario multi-variante**; la URL de variante se mantiene como deep-link (selección o redirect suave a producto + `?v=`).
2. **Quick actions en listado** vía Modal/Sheet reutilizando `ingresarStock` / `ajustarStock` (sin nuevas RPCs de negocio).
3. **Bajo stock**: filtro real en DB (`.filter('stock_actual', 'lte', 'stock_minimo')` no funciona en PostgREST column-to-column → **RPC** `listar_stock_bajo` o fetch filtrado con comparación en SQL).
4. **∞**: siempre pasar `permiteInfinito` desde contexto de rubro/tienda.
5. **Primitives-first**: Card, Drawer, DataTable, Tabs, Badge, PageHeader; sin `blue-600` / amber hardcode.
6. **No tocar** consumo POS/catálogo ni `styles/print.css`.

### Alternativas Consideradas

| Alternativa | Por qué no |
|-------------|------------|
| Solo cosmético (Fase 6 bis) | No resuelve bugs ni IA producto |
| Agrupar en listado sin ruta producto | Expandibles ayudan, pero falta “ficha inventario” con historial/acciones |
| Editar stock_minimo en stock | Mejor en producto; este plan solo enlaza |

### Preguntas Abiertas

1. ¿La ruta canónica de detalle pasa a ser **producto** (variante como query), o se mantienen **ambas** páginas al mismo nivel?
2. ¿Quick ingreso desde listado es prioridad v1 o alcanza con link a producto/variante?
3. ¿Incluir KPI de “valor de inventario” (stock × costo) en el strip? (recomendación: **no** en v1 — costo sensible / incompleto).

**Defaults si no hay respuesta:** ambas rutas; quick actions en v1 (Modal); sin valor $ en KPI strip.

---

## Tareas Paso a Paso

### Paso 1 — Bugs de confianza

1. Corregir `listarStock({ soloBajoStock })`: RPC SQL o query que filtre `stock_minimo > 0 AND stock_actual <= stock_minimo AND stock_actual <> -1`, con `count` real y paginación.
2. Pasar `permiteInfinito` a `formatStockDisplay` / `AlertaStockBajo` en list, detail, movimientos.
3. Tests unitarios del filtro / display ∞.

**Archivos:** `queries.ts`, migración si RPC, `TablaStock`, detalle, `infinito.ts` si hace falta API.

---

### Paso 2 — Listado `/stock`

1. `StockKpiStrip`: counts (bajo, sin stock, total) + links `?bajo=1` / etc.
2. Refactor `FiltrosStock`: desktop inline; mobile **Drawer**; chips activos; debounce `q`; toggle bajo inmediato; ocultar talla/color según rubro.
3. `TablaStock`: card mobile = nombre + variante + stock grande + badge; demote código/precio; acción “Ingresar/Ajustar” + link “Producto”.
4. Loading: `loading.tsx` skeleton opcional.

**Archivos:** `page.tsx`, `FiltrosStock`, `TablaStock`, `StockKpiStrip`.

---

### Paso 3 — Vista producto

1. Query `obtenerProductoStock(productoId)` → producto + variantes (stock, mín, talla, color, código).
2. Página `/stock/producto/[productoId]`: header, matriz (ropa) o lista, selección de variante, `StockAccionSheet` (ingreso/ajuste), últimos movimientos del producto (o de la variante seleccionada).
3. Desde `/stock/[varianteId]`: banner “Ver todas las variantes del producto →”.
4. Desde producto CRM: botón “Ver stock”.

**Archivos:** nueva page + `ProductoStockPanel` + `StockAccionSheet` + queries + VarianteFila/ProductoForm.

---

### Paso 4 — Detalle variante

1. Layout: PageHeader → Card KPIs (`StatCard` o Card) → **Tabs** Ingreso | Ajuste | Movimientos.
2. Un solo autofocus (tab activo).
3. Sticky submit en mobile.
4. Quitar `text-blue-600`.

**Archivos:** `[varianteId]/page.tsx`, forms.

---

### Paso 5 — Movimientos

1. Filtros con `Select`/`Input` DS + URL.
2. `MovimientosTabla` → `DataTable` (o alinear cards `md` breakpoint con list).
3. EmptyState + labels de tipo con Badge.

**Archivos:** `movimientos/page.tsx`, `MovimientosTabla.tsx`.

---

### Paso 6 — Docs + validación

1. `contexto/proyectos.md`.
2. Nota en plan 2026-06-08: Superseded by this.
3. `npm run build`.
4. Checklist 390 / 768 / 1280: list, producto, variante, movimientos.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `StockBajoCard` (dashboard) → debe seguir `?bajo=1` con totals correctos.
- POS / catálogo / pedidos: solo lectura de stock; no cambiar contratos.
- Reportes `StockTab`: fuera de alcance salvo links.

### Actualizaciones Necesarias para Consistencia

- `contexto/proyectos.md`
- Opcional: una línea en CLAUDE.md App CValleTienda sobre `/stock/producto/[id]`

### Impacto en Flujos de Trabajo Existentes

- URLs `/stock` y `/stock/[varianteId]` se mantienen.
- Nueva URL producto; deep-links viejos siguen válidos.
- RPCs de ajuste/ingreso sin cambio de firma.

---

## Lista de Validación

- [x] `?bajo=1` pagina y cuenta bien (sin páginas vacías falsas)
- [x] Stock ∞ se muestra “∞” (o “Ilimitado”) cuando el rubro lo permite
- [x] `/stock` usable en 390px (filtros Drawer, cards claras, KPIs)
- [x] `/stock/producto/[id]` muestra todas las variantes y permite ingresar/ajustar
- [x] Detalle variante: tabs sin pelea de autofocus; CTA a producto
- [x] Movimientos legibles en mobile
- [x] Sin colores anti-DS (`blue-600`, amber hardcode)
- [x] PrintBridge / POS stock no rotos
- [x] `npm run build` OK

---

## Criterios de Éxito

1. Operador encuentra y corrige stock bajo en &lt; 30 s desde el listado.
2. En ropa, se ve el stock de **todo el producto** sin abrir N páginas de variante.
3. No hay totales mentirosos en filtro bajo stock.
4. UI alineada a DS v2 y patrones de Caja (tabs, drawer, cards).

---

## Notas

- Absorbe y supersede `planes/2026-06-08-optimizar-stock-velocidad-ux.md`.
- Relacionado: Fase 6 Fable stock (`2026-07-28-fase6-productos-stock-redesign.md`) — ya implementado (tokens).
- Hydration dashboard (`formatTime`) corregido en paralelo a este plan (fuera de alcance stock).
- Implementar con: `/implementar planes/2026-08-25-stock-ux-renovacion.md` tras OK.

---

## Notas de Implementación

**Implementado:** 2026-08-25

### Resumen

- RPC `listar_stock_bajo_ids` + `listarStock({ soloBajoStock })` con paginación real.
- Display ∞ con `permiteInfinito` en listado, detalle, producto y movimientos.
- `/stock`: KPI strip, filtros Drawer mobile + chips, cards hero + quick actions (`StockAccionSheet`).
- Nueva ruta `/stock/producto/[productoId]` + `ProductoStockPanel`.
- Detalle variante: tabs Ingreso | Ajuste | Movimientos; CTA a ficha producto.
- Movimientos: Select/Input DS + DataTable + Badge.
- Docs: `contexto/proyectos.md`, CLAUDE.md; plan 2026-06-08 marcado Superseded.

### Desviaciones del Plan

- Filtros Drawer integrado en `FiltrosStock.tsx` (no archivo `FiltrosStockDrawer.tsx` separado).
- Queries de producto en `queries.ts` (no `queries-producto.ts` aparte).
- KPI “Sin stock” reutiliza `?bajo=1` (sin filtro `sin=1` dedicado en v1).

### Problemas Encontrados

- Ninguno bloqueante. Aplicar migración `20260825000002_listar_stock_bajo.sql` en Supabase para que `?bajo=1` funcione en producción.
