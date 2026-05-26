# Plan: Bundle/Pack — Productos compuestos con stock en cascada

**Creado:** 2026-05-22
**Estado:** Borrador
**Pedido:** Producto "pack" que al venderse descuenta automáticamente los componentes (ej: Pack x6 descuenta 6 unidades del individual). Funcionar correctamente en ticket, ganancia, stock, movimientos y anulación.

---

## Modelo elegido: Virtual Bundle

El bundle **no tiene stock propio**. El stock disponible se calcula en tiempo real como:

```
stock_disponible_packs = min(floor(componente.stock_actual / cantidad_por_pack))
```

### ¿Por qué virtual y no con stock propio?

- **Una sola fuente de verdad**: solo los individuales tienen stock real. No hay riesgo de desincronización entre "packs disponibles" y unidades reales.
- **Recepción simple**: cuando comprás 24 unidades, siempre sumás al individual. Los packs derivados se actualizan automáticamente.
- **Soporte multi-componente**: un pack puede tener múltiples ingredientes con cantidades distintas (ej: Pack combo = 4 cervezas + 2 papas fritas).
- **Packs de 4, 6, 12**: el campo `cantidad` en `producto_componentes` es `numeric(10,3)` — cualquier número.

### Restricciones de diseño

- Un bundle **no puede ser componente de otro bundle** (sin anidamiento).
- Los bundles **no reciben stock** (bloqueado en la UI de ingreso).
- El `stock_actual` del bundle en `variantes_producto` siempre = 0 (ignorado).
- La validación de stock disponible ocurre en **dos capas**: TypeScript (pre-chequeo con mensaje claro) y trigger de DB (salvaguarda final).

---

## Impacto en cada área del sistema

### Venta y ticket
- El ticket muestra el bundle normalmente: "Quilmes Pack x6 × 1 — $4.200"
- No muestra los componentes en el ticket (el cliente compró el pack)
- `detalles_venta` registra el pack normalmente (1 fila, variante_id del pack)

### Costo y ganancia
- `costo_unitario` del pack en `detalles_venta` = suma de (componente.precio_compra × cantidad)
- Calculado en TypeScript al momento de registrar la venta
- Si el componente tiene precio_compra = $600 y el pack tiene 6 → costo = $3.600
- Margen = ($4.200 − $3.600) / $4.200 = **14,3%** — correcto ✅

### Movimientos de stock
- Al vender 1 pack x6 → se generan movimientos en el **componente** (no en el pack):
  ```
  movimientos_stock: variante="Quilmes 473ml", tipo=salida, cantidad=−6, motivo="Venta #42 (bundle)"
  ```
- El pack mismo NO genera movimiento de stock (stock_actual=0 siempre)

### Anulación de venta
- Al anular una venta con pack → trigger restaura el stock del **componente** (+6 al individual)
- Genera movimientos de auditoría: `motivo="Anulación venta #42 (bundle)"`

### POS búsqueda
- Los bundles tienen `stock_actual = 0`, por lo tanto son excluidos del filtro `.gt('stock_actual', 0)`
- Fix: bundles se incluyen siempre en la búsqueda; el stock_efectivo se calcula en TypeScript y se muestra en la UI

### Recepción de stock
- La página de ingreso de stock debe **bloquear** el ingreso para productos bundle

---

## Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260522000004_bundle_productos.sql` | Tabla + triggers |
| `app/types/database.ts` | Interfaz `ProductoComponente` + `es_bundle` en `Producto` |
| `app/lib/pos/queries.ts` | Incluir bundles en búsqueda + calcular stock efectivo |
| `app/app/actions/ventas.ts` | Validar stock componentes + calcular costo bundle |
| `app/app/actions/productos.ts` | Nueva action `guardarComponentesBundle` |
| `app/components/productos/ProductoForm.tsx` | UI para definir bundle (toggle + componentes) |
| `app/app/(dashboard)/productos/[id]/page.tsx` | Panel de componentes en detalle del producto |
| `app/app/(dashboard)/stock/[varianteId]/page.tsx` | Bloquear ingreso para bundles |

---

## Paso a paso de implementación

---

### Paso 1: Migración DB

**Archivo:** `supabase/migrations/20260522000004_bundle_productos.sql`

#### 1a — Columna `es_bundle` en `productos`
```sql
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS es_bundle boolean NOT NULL DEFAULT false;
```

#### 1b — Tabla `producto_componentes`
```sql
CREATE TABLE IF NOT EXISTS public.producto_componentes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id             uuid NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  variante_bundle_id    uuid NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  componente_variante_id uuid NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  cantidad              numeric(10,3) NOT NULL CHECK (cantidad > 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variante_bundle_id, componente_variante_id)
);

ALTER TABLE public.producto_componentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "producto_componentes_tienda"
  ON public.producto_componentes
  FOR ALL
  USING (get_tienda_id() = tienda_id)
  WITH CHECK (get_tienda_id() = tienda_id);

CREATE INDEX idx_pc_bundle   ON public.producto_componentes (variante_bundle_id);
CREATE INDEX idx_pc_comp     ON public.producto_componentes (componente_variante_id);
CREATE INDEX idx_pc_tienda   ON public.producto_componentes (tienda_id);
```

#### 1c — Recrear `registrar_salida_stock_venta()` con soporte bundle

```sql
CREATE OR REPLACE FUNCTION public.registrar_salida_stock_venta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_es_bundle        boolean;
  v_stock_anterior   numeric;
  v_comp             RECORD;
  v_comp_anterior    numeric;
  v_cantidad_total   numeric;
BEGIN
  IF new.variante_id IS NULL THEN RETURN new; END IF;

  -- ¿Es bundle?
  SELECT p.es_bundle INTO v_es_bundle
  FROM variantes_producto vp
  JOIN productos p ON p.id = vp.producto_id
  WHERE vp.id = new.variante_id;

  IF v_es_bundle THEN
    -- Bundle: descontar stock de cada componente
    FOR v_comp IN
      SELECT pc.componente_variante_id,
             pc.cantidad,
             vp2.stock_actual AS comp_stock_actual
      FROM producto_componentes pc
      JOIN variantes_producto vp2 ON vp2.id = pc.componente_variante_id
      WHERE pc.variante_bundle_id = new.variante_id
        AND pc.tienda_id = new.tienda_id
    LOOP
      v_cantidad_total := v_comp.cantidad * new.cantidad;
      v_comp_anterior  := v_comp.comp_stock_actual;

      -- Validar stock del componente
      IF v_comp_anterior < v_cantidad_total THEN
        RAISE EXCEPTION 'Stock insuficiente del componente. Stock actual: %, requerido: %',
          v_comp_anterior, v_cantidad_total;
      END IF;

      -- Descontar
      UPDATE variantes_producto
        SET stock_actual = stock_actual - v_cantidad_total,
            updated_at   = now()
        WHERE id = v_comp.componente_variante_id;

      -- Registrar movimiento del componente
      INSERT INTO movimientos_stock (
        tienda_id, variante_id, tipo, cantidad,
        stock_anterior, stock_posterior, motivo, venta_id, usuario_id
      )
      SELECT
        new.tienda_id,
        v_comp.componente_variante_id,
        'salida',
        -v_cantidad_total,
        v_comp_anterior,
        v_comp_anterior - v_cantidad_total,
        'Venta #' || v.numero_ticket || ' (bundle)',
        new.venta_id,
        v.usuario_id
      FROM ventas v WHERE v.id = new.venta_id;
    END LOOP;

    -- El bundle no tiene stock propio, no se modifica
    RETURN new;
  END IF;

  -- Producto normal: lógica existente sin cambios
  SELECT stock_actual INTO v_stock_anterior
  FROM variantes_producto WHERE id = new.variante_id;

  IF v_stock_anterior < new.cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para la variante %. Stock actual: %, requerido: %',
      new.variante_id, v_stock_anterior, new.cantidad;
  END IF;

  UPDATE variantes_producto
    SET stock_actual = stock_actual - new.cantidad, updated_at = now()
    WHERE id = new.variante_id;

  INSERT INTO movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior, motivo, venta_id, usuario_id
  )
  SELECT new.tienda_id, new.variante_id, 'salida', -new.cantidad,
         v_stock_anterior, v_stock_anterior - new.cantidad,
         'Venta #' || v.numero_ticket, new.venta_id, v.usuario_id
  FROM ventas v WHERE v.id = new.venta_id;

  RETURN new;
END;
$$;
```

#### 1d — Recrear `revertir_stock_anulacion()` con soporte bundle

```sql
CREATE OR REPLACE FUNCTION public.revertir_stock_anulacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_detalle          RECORD;
  v_stock_anterior   numeric;
  v_es_bundle        boolean;
  v_comp             RECORD;
  v_comp_anterior    numeric;
  v_cantidad_total   numeric;
BEGIN
  IF new.estado != 'anulada' OR old.estado = 'anulada' THEN RETURN new; END IF;

  FOR v_detalle IN
    SELECT * FROM detalles_venta
    WHERE venta_id = new.id AND variante_id IS NOT NULL
  LOOP
    SELECT p.es_bundle INTO v_es_bundle
    FROM variantes_producto vp
    JOIN productos p ON p.id = vp.producto_id
    WHERE vp.id = v_detalle.variante_id;

    IF v_es_bundle THEN
      -- Bundle: restaurar stock de cada componente
      FOR v_comp IN
        SELECT pc.componente_variante_id, pc.cantidad,
               vp2.stock_actual AS comp_stock_actual
        FROM producto_componentes pc
        JOIN variantes_producto vp2 ON vp2.id = pc.componente_variante_id
        WHERE pc.variante_bundle_id = v_detalle.variante_id
          AND pc.tienda_id = new.tienda_id
      LOOP
        v_cantidad_total := v_comp.cantidad * v_detalle.cantidad;
        v_comp_anterior  := v_comp.comp_stock_actual;

        UPDATE variantes_producto
          SET stock_actual = stock_actual + v_cantidad_total, updated_at = now()
          WHERE id = v_comp.componente_variante_id;

        INSERT INTO movimientos_stock (
          tienda_id, variante_id, tipo, cantidad,
          stock_anterior, stock_posterior, motivo, venta_id, usuario_id
        ) VALUES (
          new.tienda_id, v_comp.componente_variante_id,
          'devolucion', v_cantidad_total,
          v_comp_anterior, v_comp_anterior + v_cantidad_total,
          'Anulación venta #' || new.numero_ticket || ' (bundle)',
          new.id, new.usuario_id
        );
      END LOOP;
      -- El bundle no tiene stock propio

    ELSE
      -- Producto normal: lógica existente sin cambios
      SELECT stock_actual INTO v_stock_anterior
      FROM variantes_producto WHERE id = v_detalle.variante_id;

      UPDATE variantes_producto
        SET stock_actual = stock_actual + v_detalle.cantidad, updated_at = now()
        WHERE id = v_detalle.variante_id;

      INSERT INTO movimientos_stock (
        tienda_id, variante_id, tipo, cantidad,
        stock_anterior, stock_posterior, motivo, venta_id, usuario_id
      ) VALUES (
        new.tienda_id, v_detalle.variante_id, 'devolucion', v_detalle.cantidad,
        v_stock_anterior, v_stock_anterior + v_detalle.cantidad,
        'Anulación venta #' || new.numero_ticket, new.id, new.usuario_id
      );
    END IF;
  END LOOP;

  RETURN new;
END;
$$;
```

---

### Paso 2: `app/types/database.ts`

Agregar a la interface `Producto`:
```ts
es_bundle: boolean
```

Nueva interface:
```ts
export interface ProductoComponente {
  id: string
  tienda_id: string
  variante_bundle_id: string
  componente_variante_id: string
  cantidad: number
  created_at: string
  // Joins opcionales:
  componente_variante?: {
    id: string
    codigo_barras: string | null
    precio_venta: number | null
    stock_actual: number
    producto: { nombre: string; precio_compra: number }
    talla: { nombre: string } | null
    color: { nombre: string } | null
  }
}
```

---

### Paso 3: `app/app/actions/productos.ts`

Nueva action al final del archivo:

```ts
export async function guardarComponentesBundle(
  productoId: string,
  varianteBundleId: string,
  componentes: Array<{ componente_variante_id: string; cantidad: number }>
): Promise<ActionResult> {
  const { supabase, tiendaId } = await requireCtx()
  // 1. Marcar producto como bundle
  await supabase.from('productos')
    .update({ es_bundle: true })
    .eq('id', productoId)
    .eq('tienda_id', tiendaId)
  // 2. Eliminar componentes anteriores para la variante
  await supabase.from('producto_componentes')
    .delete()
    .eq('variante_bundle_id', varianteBundleId)
    .eq('tienda_id', tiendaId)
  // 3. Insertar nuevos
  if (componentes.length > 0) {
    const rows = componentes.map(c => ({
      tienda_id: tiendaId,
      variante_bundle_id: varianteBundleId,
      componente_variante_id: c.componente_variante_id,
      cantidad: c.cantidad,
    }))
    const { error } = await supabase.from('producto_componentes').insert(rows)
    if (error) return { ok: false, error: error.message }
  } else {
    // Sin componentes → ya no es bundle
    await supabase.from('productos').update({ es_bundle: false })
      .eq('id', productoId).eq('tienda_id', tiendaId)
  }
  revalidatePath(`/productos/${productoId}`)
  return { ok: true }
}
```

---

### Paso 4: `app/lib/pos/queries.ts`

**4a — Agregar `es_bundle` a `VarianteResultado`:**
```ts
export interface VarianteResultado {
  // ... campos existentes ...
  es_bundle: boolean
  stock_efectivo: number   // = stock_actual para normales; calculado para bundles
}
```

**4b — Modificar `SELECT_VARIANTE`:** incluir `es_bundle` del producto:
```ts
const SELECT_VARIANTE =
  'id, producto_id, codigo_barras, precio_venta, stock_actual, activo, ' +
  'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo, es_bundle), ' +
  'talla:tallas(id, nombre), color:colores(id, nombre, hex_color)'
```

**4c — Modificar `buscarVariantes`:**
- Cambiar `.gt('stock_actual', 0)` → filter usando `OR (stock_actual > 0 OR producto.es_bundle = true)`
- En la Supabase query: `.or('stock_actual.gt.0,producto.es_bundle.eq.true')` — pero como `producto` es un join, hay que hacer un approach diferente
- Alternativa más simple: quitar el filtro de stock del query y aplicarlo en TypeScript después de calcular `stock_efectivo`

**4d — Post-procesamiento: calcular `stock_efectivo` para bundles:**
```ts
// Después de mapear variantes, si hay bundles cargar sus componentes
const bundleIds = resultado.filter(v => v.es_bundle).map(v => v.id)
if (bundleIds.length > 0) {
  const { data: componentes } = await supabase
    .from('producto_componentes')
    .select('variante_bundle_id, cantidad, componente:componente_variante_id(stock_actual)')
    .in('variante_bundle_id', bundleIds)
    .eq('tienda_id', tiendaId)
  
  for (const bundle of resultado.filter(v => v.es_bundle)) {
    const comps = (componentes ?? []).filter(c => c.variante_bundle_id === bundle.id)
    if (comps.length === 0) { bundle.stock_efectivo = 0; continue }
    bundle.stock_efectivo = Math.floor(
      Math.min(...comps.map(c => 
        (c.componente as {stock_actual:number}).stock_actual / c.cantidad
      ))
    )
  }
}
// Filtrar fuera bundles sin stock efectivo
return resultado.filter(v => v.stock_efectivo > 0)
```

---

### Paso 5: `app/app/actions/ventas.ts`

**5a — `cargarVariantes`: incluir `es_bundle` y datos de componentes**

Modificar la función para que también retorne `es_bundle` en `VarianteRow`:
```ts
interface VarianteRow {
  // ... campos existentes ...
  es_bundle: boolean
  componentes?: Array<{
    componente_variante_id: string
    cantidad: number
    comp_stock_actual: number
    comp_precio_compra: number
  }>
}
```

Cargar componentes para bundles en una segunda query después del SELECT inicial.

**5b — Validación de stock en `registrarVenta`:**
```ts
for (const it of input.items) {
  const v = variantes.get(it.variante_id)
  if (!v) return { ok: false, error: 'Variante no disponible' }
  
  if (v.es_bundle) {
    // Validar contra componentes
    for (const comp of v.componentes ?? []) {
      const needed = comp.cantidad * Number(it.cantidad)
      if (comp.comp_stock_actual < needed) {
        return {
          ok: false,
          error: `Stock insuficiente del componente de "${v.producto_nombre}". Disponible: ${Math.floor(comp.comp_stock_actual / comp.cantidad)} packs`
        }
      }
    }
  } else {
    // Validación normal existente
    if (v.stock_actual < Number(it.cantidad)) { ... }
  }
}
```

**5c — Cálculo de `costo_unitario` para bundles:**
```ts
// Al construir lineas[]
costo_unitario: v.es_bundle
  ? round2((v.componentes ?? []).reduce((acc, c) => acc + c.comp_precio_compra * c.cantidad, 0))
  : round2(v.costo_unitario),
```

---

### Paso 6: `app/components/productos/ProductoForm.tsx`

**Solo en modo EDITAR** (el bundle se define después de crear el producto y su variante).

En el form de edición, cuando `modo === 'editar'`:
1. Leer `producto.es_bundle` del initial prop
2. Mostrar sección "Bundle / Pack" con toggle
3. Cuando está activo: mostrar `BundleComponentesEditor` (componente nuevo)
4. El componente editor permite:
   - Buscar variante existente (campo de búsqueda con `buscarVariantesAction`)
   - Ingresar cantidad (número, ej: 6)
   - Agregar múltiples componentes
   - Eliminar componentes existentes
5. Al guardar: llamar `guardarComponentesBundle(productoId, varianteBundleId, componentes)`

**Restricciones en UI:**
- Solo permite seleccionar variantes que NO sean bundles (validar `es_bundle === false`)
- Máximo recomendado: 5 componentes distintos (no hay límite técnico)

**Nota sobre modo CREAR:** No se ofrece la opción bundle al crear. El flujo es: crear el producto primero → luego ir al detalle → definir como bundle ahí. Esto simplifica el form y evita crear un bundle sin variante.

---

### Paso 7: `app/app/(dashboard)/productos/[id]/page.tsx`

Agregar panel "Componentes del bundle" si `producto.es_bundle`:
- Lista los componentes con: nombre, talla, presentación, cantidad por pack
- Badge "BUNDLE" en el header del producto
- Link a editar para gestionar los componentes
- Si no es bundle pero podría serlo: botón "Configurar como bundle" (lleva al form de edición)

---

### Paso 8: `app/app/(dashboard)/stock/[varianteId]/page.tsx`

Si la variante pertenece a un producto bundle:
- Bloquear el formulario de ingreso de stock
- Mostrar mensaje: "Este producto es un bundle. El stock se gestiona a través de sus componentes."
- Mostrar lista de componentes con sus stocks actuales y cuántos packs quedan disponibles

---

## Orden de implementación

1. **Migración DB** — base de todo; aplicar antes que cualquier código
2. **`types/database.ts`** — interfaces
3. **`actions/productos.ts`** — action de guardar componentes
4. **`lib/pos/queries.ts`** — búsqueda con bundles
5. **`actions/ventas.ts`** — validación + costo
6. **`ProductoForm.tsx`** — UI del editor de componentes
7. **`productos/[id]/page.tsx`** — panel informativo
8. **`stock/[varianteId]/page.tsx`** — bloqueo de ingreso

---

## QA / Verificación

- [ ] Crear producto "Quilmes Pack x6" — definir componente "Quilmes 473ml" × 6
- [ ] Stock individual = 24 → POS muestra "Pack x6: 4 disponibles"
- [ ] Vender 2 packs → stock individual baja a 12 ✓
- [ ] Movimientos de stock del individual muestran 2 salidas de 6 con motivo "Venta #X (bundle)"
- [ ] Ticket de venta muestra "Quilmes Pack x6 × 2 — $8.400" (no muestra componentes)
- [ ] Ganancia = precio_pack × 2 − costo_componente × 6 × 2 ✓
- [ ] Anular venta → stock individual vuelve a 24 ✓
- [ ] Intentar ingresar stock al pack → pantalla bloqueada con mensaje claro ✓
- [ ] Pack x4 (diferente cantidad) funciona igual ✓
- [ ] Bundle sin componentes definidos → no aparece en POS (stock_efectivo = 0) ✓
- [ ] Crear pack con componente que sea bundle → UI no lo permite ✓
