# Plan: Optimizar módulo Stock — velocidad de carga y calidad visual

**Creado:** 2026-06-08
**Estado:** Borrador
**Pedido:** Análisis del sistema de carga de stock — mejorar velocidad percibida/real y calidad visual del módulo de inventario

---

## Descripción General

### Qué Logra Este Plan

Corrige **cuellos de botella reales** en consultas y paginación del módulo Stock, reduce round-trips al servidor, y rediseña la experiencia visual para que sea **100% responsive**, más legible y alineada con el design system lime/black ya usado en POS y variantes de producto. El resultado: listado e ingreso/ajuste de stock que se sienten rápidos en notebook y móvil, con separación clara entre ítems y feedback inmediato al navegar y filtrar.

### Por Qué Importa

El stock es el **segundo módulo operativo** después del POS: sin reposición rápida, las variantes quedan en cero y se bloquean ventas. Hoy el módulo funciona pero tiene:

1. **Bugs de rendimiento** que empeoran con el catálogo (filtro “bajo stock” roto, conteo que trae todas las filas).
2. **Cero estados de carga** — cada filtro o navegación bloquea la página entera hasta que el servidor responde.
3. **UI funcional pero plana** — tabla densa en desktop, cards básicas en mobile, sin resumen global ni jerarquía visual entre variantes (problema similar al que se resolvió en `VarianteFila`).

Para una tienda de ropa con decenas/cientos de variantes, esto se traduce en “muy lento” aunque el servidor tarde solo 1–2 segundos.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/app/(dashboard)/stock/page.tsx` | Listado principal — 4 queries en paralelo + render RSC |
| `app/app/(dashboard)/stock/[varianteId]/page.tsx` | Detalle: stats, ingreso/ajuste, últimos 20 movimientos |
| `app/app/(dashboard)/stock/movimientos/page.tsx` | Auditoría completa paginada |
| `app/lib/stock/queries.ts` | `listarStock`, `obtenerVarianteStock`, `listarMovimientos`, `contarVariantesBajoStock` |
| `app/app/actions/stock.ts` | `ingresarStock`, `ajustarStock` vía RPC `ajustar_stock_variante` |
| `app/components/stock/TablaStock.tsx` | Tabla desktop + cards mobile (`sm:hidden` / `hidden sm:block`) |
| `app/components/stock/FiltrosStock.tsx` | Filtros URL-driven con botón “Aplicar” |
| `app/components/stock/IngresoForm.tsx` / `AjusteForm.tsx` | Formularios de carga/ajuste |
| `app/components/stock/MovimientosTabla.tsx` | Historial responsive |
| `app/components/stock/AlertaStockBajo.tsx` | Badge sin stock / bajo stock |
| `app/lib/dashboard/queries.ts` | `obtenerStockBajoCount()` → llama `contarVariantesBajoStock` en cada carga del dashboard |
| `app/components/ui/Skeleton.tsx` | Skeletons reutilizables (solo usados en `dashboard/loading.tsx`) |
| `supabase/migrations/20260429000002_stock_rpc.sql` | RPC atómica de stock |
| `planes/2026-04-29-modulo-stock.md` | Módulo base — **Implementado** |
| `planes/2026-05-10-productos-stock-caja-redesign.md` | Redesign visual parcial — **Borrador**, tokens definidos |

### Flujo de datos actual

```
/stock (RSC)
  ├─ listarStock(q, filtros, page)     ← variantes + joins producto/talla/color
  ├─ listarCategorias()
  ├─ listarTallas()
  └─ listarColores()
       ↓
  FiltrosStock (client) → router.push(?q&...) → full RSC reload
       ↓
  TablaStock (client) → link /stock/{id}

/stock/[id] (RSC)
  ├─ obtenerVarianteStock(id)
  └─ listarMovimientos(varianteId, pageSize: 20)
       ↓
  IngresoForm / AjusteForm → ingresarStock / ajustarStock → revalidatePath
```

### Brechas o Problemas que se Abordan

#### Rendimiento (crítico)

| # | Problema | Ubicación | Impacto |
|---|----------|-----------|---------|
| P1 | **Filtro `soloBajoStock` roto** — aplica `stock_actual <= stock_minimo` en JS **después** de `.range()`, pero `count` de PostgREST no refleja ese filtro | `queries.ts` L140–185 | Páginas vacías o con pocas filas; paginación incorrecta; sensación de “no encuentra nada” |
| P2 | **`contarVariantesBajoStock()` trae TODAS las variantes** con `stock_minimo > 0` y filtra en JS | `queries.ts` L325–337 | Dashboard lento con catálogo grande; O(n) por visita |
| P3 | **Sin `loading.tsx`** en rutas `/stock/*` | — | Navegación y filtros bloquean UI completa; percepción de lentitud |
| P4 | **4 round-trips** en cada carga de `/stock` (stock + 3 lookups) | `stock/page.tsx` | Latencia acumulada en cold load |
| P5 | **Sin índice** para comparación bajo-stock ni filtros frecuentes (`talla_id`, `color_id`, `producto.categoria_id`) | migraciones | Seq scan al crecer el catálogo |
| P6 | Comentario dice “productos activos” pero **no filtra `productos.activo`** | `queries.ts` L119–135 | Variantes de productos inactivos en listado |
| P7 | Orden documentado “bajo stock primero, luego nombre” pero solo ordena por `stock_actual ASC` | `queries.ts` L164 | Prioridad visual incorrecta |

#### UX / visual

| # | Problema | Impacto |
|---|----------|---------|
| U1 | Tabla desktop densa — muchas columnas, filas sin separación fuerte | Difícil escanear; “todo se ve igual” |
| U2 | Cards mobile básicas — sin numeración, sin zebra, sin barra stock/mínimo | Menos legible que el nuevo patrón de `VarianteFila` |
| U3 | **Sin barra de resumen** en listado (total variantes, cuántas bajo stock, filtros activos) | Usuario no sabe qué falta sin leer toda la lista |
| U4 | Filtros requieren clic “Aplicar” → **full page reload** | Lento e interrumpido vs debounce/Enter |
| U5 | Detalle: stats en grid plano; formularios sin jerarquía visual fuerte | Carga de mercadería no se siente “rápida” |
| U6 | Sin acción rápida de ingreso desde el listado (hay que entrar al detalle) | Más clics para operación frecuente |
| U7 | `FiltrosStock` muestra select de Talla aunque `usarVar1` sea false en algunos rubros | UI inconsistente |

---

## Cambios Propuestos

### Resumen de Cambios

**P0 — Performance y bugs (obligatorio)**
- Migración SQL: columna generada `bajo_stock` + índice parcial; función `contar_variantes_bajo_stock(tienda_id)`; filtro `productos.activo = true`.
- Reescribir `listarStock` y `contarVariantesBajoStock` para usar SQL nativo (sin filtro JS post-paginación).
- `loading.tsx` en `/stock`, `/stock/[varianteId]`, `/stock/movimientos`.
- Paralelizar queries en página de detalle.

**P1 — UX visual responsive (alto valor)**
- `StockResumenBar` — KPIs: total en página, bajo stock (del filtro o global), filtros activos.
- Refactor `TablaStock` → `StockVarianteCard` unificado (cards en **todos** los tamaños, como variantes de producto).
- Barra visual stock vs mínimo; zebra/alternancia; badge + número de fila.
- `FiltrosStock` colapsable en mobile; debounce en búsqueda; Enter para aplicar.
- Mejoras visuales en detalle: header sticky, stats más compactos, formularios con acento lime.

**P2 — Velocidad operativa (opcional)**
- Ingreso rápido inline desde card (modal o expand) sin ir al detalle.
- Prefetch de `/stock/[id]` en hover de filas.
- Cache de lookups (categorías/tallas/colores) con `unstable_cache` o React `cache()`.
- Export CSV del listado filtrado.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260608000001_stock_bajo_stock_column.sql` | Columna `bajo_stock` generada + índice + RPC conteo |
| `app/lib/stock/queries.test.ts` | Tests de mapeo y lógica de bajo stock |
| `app/components/stock/StockResumenBar.tsx` | Barra KPI + chips de filtros activos |
| `app/components/stock/StockVarianteCard.tsx` | Card unificada por variante (listado) |
| `app/components/stock/StockBarraNivel.tsx` | Barra visual stock actual vs mínimo |
| `app/components/stock/StockSkeleton.tsx` | Skeleton específico listado + filtros |
| `app/app/(dashboard)/stock/loading.tsx` | Loading boundary listado |
| `app/app/(dashboard)/stock/[varianteId]/loading.tsx` | Loading boundary detalle |
| `app/app/(dashboard)/stock/movimientos/loading.tsx` | Loading boundary movimientos |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/stock/queries.ts` | Filtro bajo stock en SQL; `productos.activo`; orden corregido; usar RPC conteo |
| `app/lib/dashboard/queries.ts` | `obtenerStockBajoCount` → RPC en lugar de fetch completo |
| `app/app/(dashboard)/stock/page.tsx` | Resumen bar; Suspense opcional para filtros; pasar metadata |
| `app/app/(dashboard)/stock/[varianteId]/page.tsx` | Parallel queries; layout visual mejorado |
| `app/components/stock/TablaStock.tsx` | Delegar a `StockVarianteCard` o reemplazar |
| `app/components/stock/FiltrosStock.tsx` | Colapsable, debounce, `usarVar1` gate, chips activos |
| `app/components/stock/IngresoForm.tsx` | Visual lime; feedback más visible; menos texto redundante |
| `app/components/stock/AjusteForm.tsx` | Idem |
| `app/components/stock/MovimientosTabla.tsx` | Cards unificadas + zebra (consistencia) |
| `app/components/stock/AlertaStockBajo.tsx` | Variantes de tamaño (compact para cards) |

### Archivos a Eliminar (si aplica)

Ninguno en P0/P1. `TablaStock.tsx` puede quedar como thin wrapper o eliminarse si `StockVarianteCard` lo reemplaza por completo.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Columna generada `bajo_stock` en DB** en lugar de filtrar en JS: Postgres puede indexar `(tienda_id, bajo_stock) WHERE bajo_stock = true` y paginar correctamente. PostgREST no compara columna vs columna, pero sí filtra booleanos.

2. **Cards unificadas en todos los breakpoints** (patrón `VarianteFila`): la tabla dual `sm:hidden` / `hidden sm:block` genera dos UX distintas y la tabla no escala bien en notebook 1366px. Una card por variante con grid interno responsive es más legible y coherente con el rediseño reciente de productos.

3. **P0 antes que P1**: arreglar paginación rota y conteo O(n) antes de pulir UI — sin eso, “bajo stock” seguirá fallando aunque se vea bonito.

4. **`loading.tsx` con skeletons** (no spinner global): el dashboard ya tiene el patrón en `dashboard/loading.tsx`; replicarlo da sensación de velocidad inmediata.

5. **No migrar a client-side data fetching en P0**: mantener RSC + URL params (SEO, simplicidad, cache de Next). La mejora de percepción viene de skeletons + queries más rápidas, no de React Query en esta fase.

6. **Ingreso rápido inline = P2**: requiere modal + validación + revalidate; alto valor pero más riesgo. El listado mejorado + detalle más claro cubren el 80% del dolor.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Vista materializada `stock_resumen` | Overkill para MVP; columna generada + índice alcanza |
| TanStack Query + API route `/api/stock` | Más código, duplica lógica de `queries.ts`, pierde RSC |
| Mantener tabla en desktop | Usuario reportó desorganización visual; cards resuelven en todos los tamaños |
| Infinite scroll | Paginación URL actual es correcta para compartir filtros; infinite scroll es P3 |

### Preguntas Abiertas

1. **¿Ingreso rápido desde listado en P1 o P2?** (Recomendación: P2 — primero arreglar velocidad base y cards.)

2. **¿Export CSV del stock filtrado?** Útil para inventario físico. (Recomendación: P2, opcional.)

3. **¿Orden por defecto?** Hoy: `stock_actual ASC` (menor numérico primero). ¿Preferís **bajo stock primero** (boolean) y luego nombre? (Recomendación: `bajo_stock DESC, producto.nombre ASC`.)

4. **¿Tamaño de página?** 25 actual. ¿50 para tiendas con muchas variantes? (Recomendación: mantener 25 + opción en URL `?pageSize=50` para power users.)

---

## Tareas Paso a Paso

### Paso 1: Migración SQL — `bajo_stock` + conteo eficiente

Crear `supabase/migrations/20260608000001_stock_bajo_stock_column.sql`:

```sql
-- Columna generada: true cuando stock_minimo > 0 AND stock_actual <= stock_minimo
ALTER TABLE variantes_producto
  ADD COLUMN IF NOT EXISTS bajo_stock boolean
  GENERATED ALWAYS AS (
    stock_minimo > 0 AND stock_actual <= stock_minimo
  ) STORED;

CREATE INDEX IF NOT EXISTS variantes_bajo_stock_idx
  ON variantes_producto (tienda_id, bajo_stock)
  WHERE activo = true AND bajo_stock = true;

-- Conteo O(1) con índice
CREATE OR REPLACE FUNCTION contar_variantes_bajo_stock(p_tienda_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM variantes_producto v
  JOIN productos p ON p.id = v.producto_id AND p.activo = true
  WHERE v.tienda_id = p_tienda_id
    AND v.activo = true
    AND v.bajo_stock = true;
$$;

GRANT EXECUTE ON FUNCTION contar_variantes_bajo_stock(uuid) TO authenticated;
```

**Archivos afectados:**
- `supabase/migrations/20260608000001_stock_bajo_stock_column.sql` (nuevo)

---

### Paso 2: Corregir `listarStock` y `contarVariantesBajoStock`

En `app/lib/stock/queries.ts`:

**Cambios en `listarStock`:**
- Agregar filtro embebido `producto.activo = true` (`.eq('producto.activo', true)`).
- Reemplazar bloque `soloBajoStock` JS por `.eq('bajo_stock', true)`.
- Eliminar filtro JS post-`.range()` (L179–183).
- Orden: `.order('bajo_stock', { ascending: false }).order('stock_actual', { ascending: true })` + orden por nombre vía foreign table si PostgREST lo permite, o aceptar orden secundario en JS solo para la página actual (25 filas max — aceptable).
- `total` del count será correcto.

**Cambios en `contarVariantesBajoStock`:**
```typescript
export async function contarVariantesBajoStock(): Promise<number> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase.rpc('contar_variantes_bajo_stock', {
    p_tienda_id: tiendaId,
  })
  if (error) { console.error('contarVariantesBajoStock', error); return 0 }
  return Number(data ?? 0)
}
```

**Tests** (`app/lib/stock/queries.test.ts`):
- `mapVarianteRow` calcula `bajo_stock` correctamente.
- Casos: stock 0 min 5 → bajo; stock 10 min 0 → no bajo; stock 5 min 5 → bajo.

**Archivos afectados:**
- `app/lib/stock/queries.ts`
- `app/lib/stock/queries.test.ts` (nuevo)

---

### Paso 3: Loading skeletons en rutas Stock

Crear skeletons siguiendo `dashboard/loading.tsx`:

**`app/components/stock/StockSkeleton.tsx`:**
- `StockListSkeleton` — header + filtros + 5 card placeholders
- `StockDetalleSkeleton` — back link + 4 stat cards + 2 form cards
- `MovimientosSkeleton` — filtros + tabla

**`app/app/(dashboard)/stock/loading.tsx`:**
```tsx
import { StockListSkeleton } from '@/components/stock/StockSkeleton'
export default function StockLoading() {
  return <StockListSkeleton />
}
```

Repetir para `[varianteId]/loading.tsx` y `movimientos/loading.tsx`.

**Archivos afectados:**
- `app/components/stock/StockSkeleton.tsx` (nuevo)
- `app/app/(dashboard)/stock/loading.tsx` (nuevo)
- `app/app/(dashboard)/stock/[varianteId]/loading.tsx` (nuevo)
- `app/app/(dashboard)/stock/movimientos/loading.tsx` (nuevo)

---

### Paso 4: `StockResumenBar` + integración en página listado

Crear `StockResumenBar.tsx`:

```
[ 142 variantes ] [ 8 bajo stock ] [ Filtro: Solo bajo stock ✕ ]
[████████░░░░░░░░░░] 6% bajo stock
```

Props: `total`, `bajoStockEnPagina`, `bajoStockGlobal?`, `filtrosActivos`, `modoEdicion?`.

En `stock/page.tsx`:
- Llamar `contarVariantesBajoStock()` en paralelo con las otras 4 queries (ahora es barato).
- Pasar `bajoStockGlobal` al resumen.
- Contar `bajoStockEnPagina` desde `items.filter(i => i.bajo_stock).length`.

**Archivos afectados:**
- `app/components/stock/StockResumenBar.tsx` (nuevo)
- `app/app/(dashboard)/stock/page.tsx`

---

### Paso 5: `StockVarianteCard` — layout unificado responsive

Nuevo componente inspirado en `VarianteFila`:

**Estructura por card:**
```
┌─────────────────────────────────────────────┐
│ [1]  Remera básica · M / Negro    [Bajo] Quitar│  ← header
├─────────────────────────────────────────────┤
│ Código: 7790312345678                        │
│ [██████░░░░] 3 / mín 10  (−7)               │  ← StockBarraNivel
│ Precio $2.000                    [Ajustar →]  │
└─────────────────────────────────────────────┘
```

**`StockBarraNivel.tsx`:**
- Props: `stockActual`, `stockMinimo`
- Barra proporcional; rojo si `<= minimo`; gris si `minimo = 0`

**Reemplazar en `TablaStock.tsx`:**
- Eliminar dual table/cards.
- Mapear `items` a `StockVarianteCard` en `space-y-3`.
- `esAlternada={idx % 2 === 1}` para zebra.
- Link “Ajustar →” prominente (lime).

**Archivos afectados:**
- `app/components/stock/StockVarianteCard.tsx` (nuevo)
- `app/components/stock/StockBarraNivel.tsx` (nuevo)
- `app/components/stock/TablaStock.tsx` (refactor)
- `app/components/stock/AlertaStockBajo.tsx` (prop `size="compact"`)

---

### Paso 6: Mejorar `FiltrosStock` — velocidad percibida

- Envolver en `<details>` o toggle “Filtros” en `< md` para no ocupar pantalla.
- Debounce 400ms en campo búsqueda → auto-apply vía `router.push` (opcional: solo si `q.length >= 2` o vacío).
- Enter en búsqueda aplica filtro.
- Mostrar select Talla solo si `usarVar1`; Color solo si `usarVar2` (ya parcial).
- Chips de filtros activos debajo del form (reutilizar patrón de `VariantesResumenBar`).
- Mantener `useTransition` — skeleton del Paso 3 cubre el resto de la página.

**Archivos afectados:**
- `app/components/stock/FiltrosStock.tsx`

---

### Paso 7: Detalle `/stock/[varianteId]` — visual + parallel queries

En `[varianteId]/page.tsx`:

```typescript
const [variante, { items: movimientos }] = await Promise.all([
  obtenerVarianteStock(varianteId),
  listarMovimientos({ varianteId, pageSize: 20 }),
])
```

**Visual:**
- Stat cards más compactas; stock actual con número grande + `StockBarraNivel`.
- Formularios: borde lime sutil en `IngresoForm`; borde neutral en `AjusteForm`.
- Reducir texto explicativo redundante en `IngresoForm` (mover a tooltip).
- Header con badge de alerta si bajo stock.

**Archivos afectados:**
- `app/app/(dashboard)/stock/[varianteId]/page.tsx`
- `app/components/stock/IngresoForm.tsx`
- `app/components/stock/AjusteForm.tsx`

---

### Paso 8: Movimientos — consistencia visual

- Aplicar card layout unificado en `MovimientosTabla` (mismo patrón zebra).
- `movimientos/loading.tsx` ya creado en Paso 3.
- Badge de tipo con colores existentes (entrada=lime, salida=red, etc.).

**Archivos afectados:**
- `app/components/stock/MovimientosTabla.tsx`

---

### Paso 9 (P2 opcional): Ingreso rápido desde listado

- Botón “+ Ingreso” en `StockVarianteCard` → modal con `IngresoForm` embebido.
- Al éxito: `router.refresh()` + toast.
- No navegar al detalle.

**Archivos afectados:**
- `app/components/stock/StockVarianteCard.tsx`
- `app/components/stock/IngresoRapidoModal.tsx` (nuevo)

---

### Paso 10: Validación manual y build

**Checklist operativo:**

1. `/stock` carga con skeleton → contenido en < 2s (catálogo ~100 variantes local).
2. Filtro “Solo bajo stock” → páginas completas de 25 ítems; paginación coherente.
3. Dashboard `StockBajoCard` muestra mismo número que filtro bajo stock.
4. Cards legibles en 375px y 1366px — sin scroll horizontal.
5. Cada variante visualmente separada (zebra + borde).
6. Barra stock/mínimo roja cuando bajo.
7. Detalle: ingreso y ajuste funcionan; movimientos se listan.
8. `npx tsx --test lib/stock/queries.test.ts`
9. `npm run build`

**Archivos afectados:** ninguno (pruebas)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/components/dashboard/StockBajoCard.tsx` | Usa conteo bajo stock |
| `app/lib/dashboard/queries.ts` | `obtenerStockBajoCount` |
| `app/components/productos/VarianteFila.tsx` | Link “Ajustar stock →” |
| `app/app/actions/stock.ts` | Mutaciones + revalidate |
| `planes/2026-04-29-modulo-stock.md` | Módulo base |
| `planes/2026-05-10-productos-stock-caja-redesign.md` | Tokens visuales — complementar, no duplicar |
| `planes/2026-06-10-rediseno-tabla-variantes-3-capas.md` | Patrón card unificado a replicar |

### Actualizaciones Necesarias para Consistencia

- Nota en `planes/2026-05-10-productos-stock-caja-redesign.md` → sección Stock cubierta por este plan (P1 visual).
- No requiere cambios en CLAUDE.md.

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Revisar inventario diario | **Más rápido** — resumen + cards + bajo stock correcto |
| Reposición mercadería | **Más claro** — barra visual + forms mejorados |
| Dashboard alertas | **Más rápido** — RPC conteo |
| POS / ventas | Sin cambio — triggers intactos |
| Filtros compartibles por URL | Sin cambio — mismos query params |

---

## Lista de Validación

- [ ] Migración `bajo_stock` aplicada en Supabase local/prod
- [ ] `listarStock` con `soloBajoStock` pagina correctamente (count = items filtrados)
- [ ] `contarVariantesBajoStock` usa RPC (no full fetch)
- [ ] Solo productos activos en listado
- [ ] `loading.tsx` en las 3 rutas stock
- [ ] `StockResumenBar` visible con KPIs
- [ ] Cards unificadas responsive (sin tabla dual)
- [ ] Separación visual entre variantes (zebra + borde)
- [ ] `StockBarraNivel` muestra proporción stock/mínimo
- [ ] Filtros: debounce búsqueda o Enter; colapsable en mobile
- [ ] Detalle: queries en paralelo
- [ ] Tests unitarios pasan
- [ ] `npm run build` OK

---

## Criterios de Éxito

1. El listado `/stock` con filtro “bajo stock” muestra **páginas completas y paginación correcta** (sin páginas vacías con count > 0).
2. La carga del dashboard **no degrada** con 500+ variantes (conteo vía RPC/index, no full scan en JS).
3. En notebook 1366px y móvil 375px, cada variante es **visualmente distinguible** y el usuario identifica bajo stock en **≤ 2 segundos** sin leer todas las filas.
4. Navegar a `/stock` o cambiar filtros muestra **skeleton inmediato** (no pantalla en blanco).

---

## Notas

- La sensación de “muy lento” suele ser **50% bugs de query** (P1/P2 arriba) y **50% percepción** (sin skeleton, full reload). Este plan ataca ambos.
- Si después de P0/P1 sigue lento con 1000+ variantes, evaluar índice GIN/trigram en `productos.nombre` para búsqueda `ilike` (fuera de scope inicial).
- El patrón `StockVarianteCard` puede reutilizarse luego en un widget POS “stock bajo” o en reportes.
- Ejecutar con: `/implementar planes/2026-06-08-optimizar-stock-velocidad-ux.md`
