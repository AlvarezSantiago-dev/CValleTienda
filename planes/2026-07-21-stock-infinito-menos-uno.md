# Plan: Stock -1 como stock infinito (sistema completo)

**Creado:** 2026-07-21
**Estado:** Implementado
**Pedido:** Habilitar stock `-1` como stock infinito, limitado a despensa/carnicería para carga; semántica runtime global.

---

## Descripción General

### Qué Logra Este Plan

Permite marcar cualquier variante con `stock_actual = -1` para que el sistema la trate como **stock ilimitado**: se puede vender sin tope, no se descuenta al vender, no aparece como “sin stock” ni “bajo stock”, y en la UI se muestra como infinito (∞ / Ilimitado). El cliente de despensa/carnicería podrá cargar productos de surtido continuo sin inventariar unidad por unidad.

### Por Qué Importa

Despensas y carnicerías suelen tener productos de reposición constante (pan, fiambres, bebidas, etc.) donde el control estricto de unidades frena la operación. Hoy el sistema **bloquea** ventas si `stock_actual < cantidad` y el constraint DB `stock_actual >= 0` **impide** guardar `-1`. Sin esta convención, el operador debe inventar stocks altos o desactivar controles — frágil y engañoso. Un sentinel único (`-1`) es el patrón más simple, auditable y ya pedido explícitamente por el cliente.

---

## Estado Actual

### Estructura Existente Relevante

**Base de datos**

| Pieza | Ubicación | Comportamiento actual |
| ----- | --------- | --------------------- |
| Constraint `variantes_stock_check` | `supabase/migrations/20260419000003_productos.sql`, recreado en `20260509000001_multi_rubro_fase1.sql` | `stock_actual >= 0` — **bloquea -1** |
| Constraint `movimientos_stock_posterior_check` | `20260419000006_stock.sql` | `stock_posterior >= 0` — bloquearía movimientos con -1 |
| Índice parcial `variantes_con_stock_idx` | `20260419000003_productos.sql` | `WHERE activo AND stock_actual > 0` — **excluye -1** |
| Trigger venta `registrar_salida_stock_venta` | Última versión en `20260523000003_kits_armados.sql` (sobrescribe bundles de `20260522000004`) | Falla si `stock_anterior < cantidad`; descuenta siempre |
| Trigger anulación `revertir_stock_anulacion` | kits + bundles (última: kits) | Suma stock al anular |
| Trigger cambio devolución `descontar_stock_entrega_cambio` | `20260620110001_cambio_variante_devolucion.sql` | Valida stock suficiente y descuenta |
| RPC `ajustar_stock_variante` | `20260509000001_multi_rubro_fase1.sql` (numeric) | Rechaza `stock_posterior < 0` |
| RPC `get_stock_resumen` | `20260608100001_reportes_ventas_stock_rpc.sql` | `sin_stock` = `stock_actual <= 0` → **-1 contaría como sin stock**; `SUM(stock_actual * precio_compra)` → **-1 distorsiona valor inventario** |

**App — validaciones / filtros que asumen stock finito ≥ 0**

| Área | Archivo(s) | Problema con -1 |
| ---- | ---------- | --------------- |
| POS búsqueda / grilla | `app/lib/pos/queries.ts` | Filtros `.gt('stock_actual', 0)` y `stock_efectivo > 0` **ocultan** productos con -1 |
| POS carrito | `app/components/pos/Carrito.tsx` | `cantidad > stock_actual` → alerta falsa (-1 < cualquier cantidad positiva) |
| POS container | `app/components/pos/POSContainer.tsx` | Pasa `stock_efectivo` al carrito |
| Venta server | `app/app/actions/ventas.ts` | Validación pre-trigger + descuento manual de kits con `.gte('stock_actual', cantComp)` falla para -1 |
| Ajuste stock | `app/app/actions/stock.ts` | `nuevoStock < 0` → error “debe ser ≥ 0” |
| Form producto | `app/components/productos/ProductoForm.tsx` | inputs `min="0"` |
| Form ajuste | `app/components/stock/AjusteForm.tsx` | depende de la action ≥ 0 |
| Alertas / reportes | `AlertaStockBajo.tsx`, `queries-stock.ts`, `lib/stock/queries.ts` | `-1` cae en bajo/sin stock |
| Precios | `BuscadorPrecios.tsx` | `stock <= 0` → “Sin stock” |
| Devoluciones cambio | `devoluciones.ts`, `queries-cambio.ts` | rechaza si stock insuficiente |
| Voz | `VoiceProvider.tsx` | `stock < 0` → descarta el valor |

**Convención de rubros:** `despensa` y `carniceria` en `app/lib/rubro/config.ts` (con packs/balanza). El pedido nace ahí, pero la semántica pedida es global: *todo* `-1` = infinito en el sistema.

### Brechas o Problemas que se Abordan

1. No se puede persistir `stock_actual = -1` (CHECK DB).
2. Aunque se pudiera, POS/triggers/actions lo tratarían como “sin stock” o fallarían al vender.
3. No hay helper único de dominio (`esStockInfinito` / `formatStock`) → riesgo de inconsistencias.
4. Valor de inventario y métricas “sin stock” se romperían con el sentinel.

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva migración SQL: relajar constraints, actualizar índice, y hacer **no-op de inventario** en triggers/RPC cuando `stock_actual = -1` (mantener -1; no descontar ni devolver unidades).
- Helper de dominio TS compartido para “¿es infinito?” y formato de UI.
- Actualizar validaciones POS, ventas, kits/bundles, devoluciones, ajustes, reportes y alertas.
- UI: permitir cargar `-1` en creación/ajuste; mostrar **∞ / Ilimitado** en listados, POS, precios y stock.
- Documentar en import CSV que `-1` = stock infinito.
- Semántica **global** (cualquier rubro): si está en -1, es infinito. Motivación comercial: despensa/carnicería.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260721000001_stock_infinito.sql` | Constraints, índice, triggers, RPC y `get_stock_resumen` con soporte de stock infinito |
| `app/lib/stock/infinito.ts` | Helpers: `STOCK_INFINITO = -1`, `esStockInfinito(n)`, `tieneStockSuficiente(stock, qty)`, `stockEfectivoParaUi(n)`, `formatStockDisplay(n, unidad?)` |
| `app/lib/stock/infinito.test.ts` | Tests unitarios de los helpers |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/actions/stock.ts` | Permitir `nuevo_stock === -1`; mensaje de error actualizado; no permitir otros negativos |
| `app/app/actions/ventas.ts` | Skip validación de stock si infinito; en kits, no descontar componentes con stock -1; no insertar movimiento que deje posterior inválido |
| `app/app/actions/devoluciones.ts` | Tratar -1 como suficiente al validar variante de entrega |
| `app/app/actions/productos.ts` | Aceptar stock_inicial/stock_actual = -1 al crear/editar/importar (validar solo `-1` o `>= 0`) |
| `app/lib/pos/queries.ts` | Incluir variantes con `stock_actual = -1` en búsquedas; `stock_efectivo` infinito coherente (usar número grande o flag vía helper) |
| `app/components/pos/Carrito.tsx` | No marcar excedido si `esStockInfinito(stock)`; mostrar ∞ |
| `app/components/pos/GrillaProductos.tsx` | No tratar -1 como stock bajo / vacío |
| `app/components/pos/VarianteSelector.tsx` | Mostrar ∞; no alertar por “bajo” |
| `app/components/pos/POSContainer.tsx` | Pasar stock efectivo infinito de forma que el carrito no bloquee |
| `app/components/stock/AjusteForm.tsx` | Permitir `-1`; hint “-1 = stock ilimitado”; confirmar al pasar a/desde infinito |
| `app/components/stock/AlertaStockBajo.tsx` | Si infinito → no mostrar alerta |
| `app/components/stock/TablaStock.tsx` | Formatear -1 como ∞ |
| `app/components/productos/ProductoForm.tsx` | Quitar `min="0"` del stock (o `min="-1"`); hint breve |
| `app/components/productos/VarianteFila.tsx` | Permitir stock_inicial = -1 |
| `app/components/precios/BuscadorPrecios.tsx` | -1 → badge “Ilimitado”, no “Sin stock” |
| `app/lib/stock/queries.ts` | `bajo_stock` false si infinito; orden/filtros coherentes |
| `app/lib/reportes/queries-stock.ts` | Excluir -1 de `sinStock` / `bajoStock` |
| `app/lib/devoluciones/queries-cambio.ts` | Suficiente si infinito |
| `app/lib/devoluciones/cambio-variante.ts` | (si aplica lógica de stock) |
| `app/components/voz/VoiceProvider.tsx` | Aceptar stock === -1 como válido |
| `app/components/productos/ImportadorCSV.tsx` | Documentar `-1` = infinito |
| `app/lib/productos/variantes-estado.ts` | No contar -1 como “sin stock” |
| `contexto/proyectos.md` | Nota breve del comportamiento (opcional, si se actualiza contexto de producto) |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Sentinel `-1` (no boolean nuevo):** Cumple el pedido del cliente, evita migración de datos/columnas, es fácil de cargar por CSV/ajuste. Constraint final: `(stock_actual = -1 OR stock_actual >= 0)`.

2. **Semántica global, no gated por rubro:** “Todo el stock -1 que sea infinito en el sistema”. La UI hint puede mencionarse más en despensa/carnicería, pero la lógica no depende del rubro (evita bugs si el tenant cambia de rubro o usa genérico).

3. **Venta / anulación / cambio con stock infinito = no-op de inventario:** Si `stock_actual = -1`, no se modifica el stock (sigue en -1). Motivo: descontar o sumar rompería el sentinel y el CHECK.

4. **Movimientos de auditoría en ventas infinitas:** Registrar movimiento opcional con `stock_anterior = -1`, `stock_posterior = -1`, `cantidad = -qty` (trazabilidad de qué se vendió sin inventariar). Requiere relajar `movimientos_stock_posterior_check` a `(stock_posterior = -1 OR stock_posterior >= 0)`.

5. **Entradas manuales sobre infinito:** Si ya está en -1, un “ingreso” no suma (sigue -1) o se rechaza con mensaje claro “Producto con stock ilimitado; usá ajuste para salir de ∞”. Preferencia: **rechazar entradas** y **solo permitir salir de ∞ vía ajuste** a un número ≥ 0 (más seguro).

6. **Packs:** Si `stock_actual = -1`, `stock_efectivo` del pack = infinito (siempre vendible). No usar `floor(-1 / pack_cantidad)`.

7. **Kits / bundles:** Un componente con -1 **no limita** el stock efectivo del kit/bundle. Si **todos** los componentes son -1 → kit infinito. Si mixto → `min` solo entre componentes finitos.

8. **Valor de inventario:** Excluir variantes con `stock_actual = -1` del `SUM(stock * precio_compra)` (no aportan unidades inventariables).

9. **Reconstruir trigger de salida unificando kits + bundles + infinito:** La migración de kits sobrescribió la de bundles. La nueva migración debe partir de la lógica **combinada** (bundle → componentes; kit → skip en trigger / manejo en action; normal → descuento) **más** rama infinito.

### Alternativas Consideradas

| Alternativa | Por qué se rechaza |
| ----------- | ------------------ |
| Columna `stock_ilimitado boolean` | Más limpia en modelo, pero el cliente pidió `-1`; más archivos/UI/CSV; migración de datos |
| Stock “muy alto” (999999) | Sucio; distorsiona reportes; sigue descontando |
| Desactivar validación de stock solo en despensa/carnicería | Rompe control para el resto del catálogo del mismo tenant; no cumple “stock -1 = infinito” |
| Permitir cualquier stock negativo | Confunde mermas/errores con infinito; solo `-1` es sentinel |

### Preguntas Abiertas (si las hay)

1. **¿Registrar movimiento de stock en cada venta de producto infinito?** Recomendación del plan: **sí** (`anterior=posterior=-1`) para auditoría. Confirmar si preferís omitirlos para no “ensuciar” el historial.
2. **¿Mostrar el control “Ilimitado” solo en UI de despensa/carnicería** (checkbox que setea -1), o basta con poder tipear `-1` en el campo stock en todos los rubros? Recomendación: tipear `-1` + hint en todos; checkbox opcional después si hace falta UX.
3. **¿Al importar CSV, `-1` debe aceptarse sin confirmación extra?** Recomendación: sí, documentado en el helper del importador.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Helpers de dominio (TS)

Crear `app/lib/stock/infinito.ts` con:

```ts
export const STOCK_INFINITO = -1

export function esStockInfinito(stock: number | null | undefined): boolean {
  return Number(stock) === STOCK_INFINITO
}

/** true si se puede vender/entregar `cantidad` */
export function tieneStockSuficiente(stock: number, cantidad: number): boolean {
  if (esStockInfinito(stock)) return true
  return stock >= cantidad
}

/** Para comparaciones UI tipo “bajo stock” / filtros POS */
export function stockParaComparacion(stock: number): number {
  return esStockInfinito(stock) ? Number.POSITIVE_INFINITY : stock
}

export function formatStockDisplay(stock: number, opts?: { corto?: boolean }): string {
  if (esStockInfinito(stock)) return opts?.corto ? '∞' : 'Ilimitado'
  // reutilizar formatNumber del proyecto si aplica
  return String(stock)
}
```

Tests en `infinito.test.ts`: casos -1, 0, 5, packs/kits mentally via `tieneStockSuficiente`.

**Archivos afectados:**

- `app/lib/stock/infinito.ts` (nuevo)
- `app/lib/stock/infinito.test.ts` (nuevo)

---

### Paso 2: Migración SQL — constraints e índice

Archivo: `supabase/migrations/20260721000001_stock_infinito.sql`

**Acciones:**

1. Drop + recreate:
   - `variantes_producto_variantes_stock_check` → `CHECK (stock_actual = -1 OR stock_actual >= 0)`
   - `movimientos_stock_movimientos_stock_posterior_check` → `CHECK (stock_posterior = -1 OR stock_posterior >= 0)`
   - (También `stock_anterior` puede ser -1; si hay CHECK sobre anterior, relajar igual. Hoy solo hay sobre posterior.)
2. Recrear índice parcial:
   ```sql
   DROP INDEX IF EXISTS variantes_con_stock_idx;
   CREATE INDEX variantes_con_stock_idx
     ON public.variantes_producto (tienda_id)
     WHERE activo = true AND (stock_actual > 0 OR stock_actual = -1);
   ```
3. Comment on column: `' -1 = stock ilimitado (no se descuenta en ventas)'`.

**Archivos afectados:**

- `supabase/migrations/20260721000001_stock_infinito.sql`

---

### Paso 3: Migración SQL — triggers y RPC

En la misma migración (o inmediatamente después en el mismo archivo), redefinir:

#### 3.1 `registrar_salida_stock_venta`

Lógica objetivo (pseudo):

```
IF variante_id IS NULL → RETURN
IF es_kit → RETURN  -- (como hoy; action descuenta componentes)
IF es_bundle →
  FOR cada componente:
    IF comp.stock = -1 → skip update (opcional log -1/-1)
    ELSE validar + descontar
  RETURN
-- normal:
IF stock_anterior = -1 →
  INSERT movimiento salida con anterior=-1 posterior=-1 (si se confirma Q1)
  RETURN
ELSE validar stock_anterior >= cantidad; descontar; log
```

**Importante:** Fusionar lógica de bundles (`20260522000004`) + kits (`20260523000003`) + infinito. No perder el branch de bundles.

#### 3.2 `revertir_stock_anulacion`

Si stock actual del ítem/componente es `-1`, no sumar (queda -1). Si era finito, comportamiento actual. Para bundles/kits: misma regla por componente.

#### 3.3 `descontar_stock_entrega_cambio`

Si `v_stock_anterior = -1` → no descontar; log opcional -1/-1; RETURN.

#### 3.4 `ajustar_stock_variante`

- Permitir `v_stock_posterior = -1`.
- Si `v_stock_anterior = -1` y `p_tipo = 'entrada'`: RAISE con mensaje claro (usar ajuste para salir de ilimitado).
- Si `v_stock_anterior = -1` y `p_tipo = 'ajuste'` hacia un valor ≥ 0: OK.
- Si posterior no es -1 y es `< 0`: seguir rechazando.
- Validación: `IF v_stock_posterior < 0 AND v_stock_posterior <> -1 THEN RAISE`.

#### 3.5 `get_stock_resumen`

```sql
valor_inventario := SUM(CASE WHEN v.stock_actual = -1 THEN 0
                             ELSE v.stock_actual * COALESCE(p.precio_compra,0) END)
sin_stock := COUNT(*) FILTER (WHERE v.stock_actual = 0)  -- no <= 0
bajo_stock := ... AND v.stock_actual > 0 AND v.stock_actual <> -1 AND ...
```

**Archivos afectados:**

- `supabase/migrations/20260721000001_stock_infinito.sql`

---

### Paso 4: Server actions — stock, productos, ventas, devoluciones

**`app/app/actions/stock.ts`**

- Cambiar:
  ```ts
  if (!Number.isFinite(nuevoStock) || (nuevoStock < 0 && nuevoStock !== -1)) {
    return { ok: false, error: 'El stock debe ser ≥ 0, o -1 para ilimitado' }
  }
  ```
- Si stock actual es -1 y delta de “ingresarStock” > 0: devolver error amigable (alineado al RPC).

**`app/app/actions/productos.ts`**

- Validar cada `stock_inicial` / updates: solo `-1` o `>= 0`.
- Movimientos `inicial`: si stock = -1, insertar movimiento con anterior 0 / posterior -1 (o no insertar movimiento inicial — preferible **sí insertar** para auditoría de “marcado ilimitado”).

**`app/app/actions/ventas.ts`**

- En validación de consumo físico:
  ```ts
  if (!tieneStockSuficiente(variante.stock_actual, consumoFisico)) { ... }
  ```
- Bundles/kits: usar `tieneStockSuficiente` / al calcular `stockEfectivoKit`, ignorar componentes infinitos en el `Math.min` (si todos infinitos → OK cualquier cantidad).
- Descuento manual de kit:
  ```ts
  if (esStockInfinito(stockAntComp)) {
    // no update; opcional movimiento -1/-1
    continue
  }
  // update existente con .gte(...)
  ```

**`app/app/actions/devoluciones.ts` + `lib/devoluciones/queries-cambio.ts`**

- `tieneStockSuficiente(entrega.stock_actual, cantidad)`.

**Archivos afectados:**

- `app/app/actions/stock.ts`
- `app/app/actions/productos.ts`
- `app/app/actions/ventas.ts`
- `app/app/actions/devoluciones.ts`
- `app/lib/devoluciones/queries-cambio.ts`

---

### Paso 5: POS — queries y UI

**`app/lib/pos/queries.ts`**

- Reemplazar filtros que usan solo `.gt('stock_actual', 0)` por inclusión de `-1`. En PostgREST:
  ```ts
  .or('stock_actual.gt.0,stock_actual.eq.-1')
  ```
- En `mapVariante` / packs / kits:
  - Si `esStockInfinito(stockActual)` → `stock_efectivo` = `STOCK_INFINITO` (o `Infinity` — preferir **-1** para serialización JSON estable).
  - Packs: si base infinita → pack infinito.
  - Kits: `computarStockKits` — si algún componente es -1, no limitar por ese; si todos -1 → -1.
- Filtros finales `stock_efectivo > 0` → `tieneStockSuficiente(stock_efectivo, 1)` o `esStockInfinito || stock_efectivo > 0`.

**UI POS**

- `Carrito.tsx`: `stockExcedido = !tieneStockSuficiente(it.stock_actual, it.cantidad)`; display con `formatStockDisplay`.
- `GrillaProductos.tsx` / `VarianteSelector.tsx`: mismo criterio; no pintar “bajo” si infinito.

**Archivos afectados:**

- `app/lib/pos/queries.ts`
- `app/components/pos/Carrito.tsx`
- `app/components/pos/GrillaProductos.tsx`
- `app/components/pos/VarianteSelector.tsx`
- `app/components/pos/POSContainer.tsx` (si hace falta)

---

### Paso 6: Stock UI, productos, precios, reportes, voz

**Acciones:**

- `AjusteForm`: permitir `-1`; texto de ayuda: “Usá -1 para stock ilimitado (no se descuenta al vender)”.
- `ProductoForm` / `VarianteFila`: `min={-1}` o sin min; hint.
- `AlertaStockBajo`: early return si `esStockInfinito(stockActual)`.
- `TablaStock` + detalle stock: `formatStockDisplay`.
- `lib/stock/queries.ts`: `bajo_stock: !esStockInfinito && min > 0 && actual <= min`.
- `queries-stock.ts` (reportes JS fallback): `sinStock` solo `=== 0`; no contar -1.
- `BuscadorPrecios`: rama ilimitado.
- `VoiceProvider`: aceptar `stock === -1`.
- `variantes-estado.ts`: no contar infinito como sin stock.
- `ImportadorCSV`: documentar columna.

**Archivos afectados:** listados en “Archivos a Modificar”.

---

### Paso 7: Verificación y cierre del plan

**Acciones:**

- Correr tests de `infinito.test.ts` y cualquier test POS/stock existente afectado.
- Smoke manual (o checklist):
  1. Setear variante a -1 vía ajuste.
  2. Aparece en POS / scanner.
  3. Vender 10 unidades → stock sigue -1; venta OK.
  4. Anular venta → sigue -1.
  5. Reportes: no figura en “sin stock”; valor inventario no baja por -1.
  6. Volver a stock 5 vía ajuste → vuelve el control normal.
- Actualizar estado de este plan a **Implementado** + Notas de Implementación.
- Evaluar si `CLAUDE.md` / `contexto/proyectos.md` necesitan una línea sobre la convención `-1`.

**Archivos afectados:**

- `planes/2026-07-21-stock-infinito-menos-uno.md`
- `contexto/proyectos.md` (si aplica)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- Triggers de stock: venta, anulación, devolución, cambio de variante.
- POS (`lib/pos/queries`, Carrito, Grilla).
- Acciones: `ventas.ts`, `stock.ts`, `productos.ts`, `devoluciones.ts`.
- Reportes: `get_stock_resumen`, `queries-stock.ts`, export CSV gráficos.
- Kits/bundles: stock efectivo derivado de componentes.
- Import CSV / voz / impresión etiquetas (cantidad default = stock — para -1 usar `Math.max(1, …)` ya existente; no imprimir “-1” etiquetas por defecto: usar 1).

### Actualizaciones Necesarias para Consistencia

- Comentarios SQL en constraints/funciones.
- Texto de ayuda en formularios de stock/producto.
- Docs del importador CSV.
- Opcional: una línea en `contexto/proyectos.md` bajo Stock.

### Impacto en Flujos de Trabajo Existentes

- **Sin cambio** para productos con stock ≥ 0.
- Productos marcados `-1`: dejan de bloquear ventas y de entrar en alertas de quiebre.
- Historial de movimientos: puede incluir salidas con posterior -1 (si se confirma).
- Tenants ropa/otros: pueden usar la misma convención si quieren (no obligatorio).

---

## Lista de Validación

- [x] Migración SQL creada (aplicar en Supabase antes de usar en prod)
- [x] Helpers + tests unitarios verdes
- [x] Actions stock/productos/ventas/devoluciones actualizadas
- [x] POS queries + Carrito/Grilla/Selector
- [x] UI stock/producto/precios/alertas (carga -1 gated a despensa/carnicería)
- [x] Reportes / valor inventario excluyen -1
- [x] `contexto/proyectos.md` actualizado
- [x] Plan marcado Implementado

---

## Criterios de Éxito

1. Un cliente de despensa/carnicería puede poner stock `-1` en un producto y vender sin límite operativo.
2. En runtime, `stock_actual === -1` se interpreta de forma uniforme (DB + server + UI).
3. Otros rubros no pueden *cargar* `-1` (rechazo en actions); si existiera el valor, se trata como infinito.
4. Productos con stock normal (≥ 0) conservan el comportamiento actual.

---

## Notas

- **No usar otros negativos** (−2, −5): solo `-1` es válido como sentinel.
- Al ordenar listados de stock ASC, los `-1` aparecerán primero; mejora UX opcional post-MVP.
- Aplicar la migración en Supabase (local/staging/prod) antes de deploy de la app.
- La migración restaura el branch bundle en `registrar_salida_stock_venta` (perdido tras kits).

---

## Notas de Implementación

**Implementado:** 2026-07-21

### Resumen

Se habilitó `stock_actual = -1` como stock ilimitado. La **carga/ajuste a -1** está limitada a rubros `despensa` y `carnicería` (`rubroPermiteStockInfinito`). La semántica de venta/POS/triggers es global: si hay -1, no se descuenta. Migración SQL unifica kits+bundles+infinito, relaja CHECKs y actualiza reportes.

### Desviaciones del Plan

- Alcance de **carga** limitado a despensa/carnicería (pedido explícito del usuario en `/implementar`), no UI libre en todos los rubros.
- Movimientos de auditoría en ventas infinitas: sí se registran (`anterior=posterior=-1`).
- CSV: `-1` aceptado solo si el rubro lo permite.

### Problemas Encontrados

- Ninguno bloqueante. Tests de `infinito.test.ts` pasan vía `npx tsx`. La migración debe aplicarse manualmente en Supabase.
