# Plan: Reestructuración Pack/Bundle — modelo "pack por variante"

**Creado:** 2026-05-23  
**Estado:** Borrador  
**Pedido:** Reemplazar el sistema bundle/componentes por un modelo simple: cada variante puede configurarse para venderse también en pack (cantidad fija + precio pack). Sin productos separados, sin "linking". Todo en un solo formulario.

---

## Descripción General

### Qué Logra Este Plan

Reemplaza el sistema actual de bundles (producto separado → vincular componentes → guardar y volver) por un modelo donde cada variante lleva directamente sus datos de pack: ¿se vende en pack?, ¿de cuántos?, ¿a qué precio? El formulario de producto queda completo en una sola pasada. En el POS, cada variante con pack habilitado aparece como dos opciones de venta: individual y pack.

### Por Qué Importa

El flujo actual requiere 3 pasos independientes con guardados intermedios, lo que confunde al usuario y genera errores (ej. bundle que muestra stock 0 porque se guardó mal). El nuevo modelo es natural para el caso de uso real: una distribuidora que vende la misma cerveza suelta y en six-pack, no un "producto compuesto" de múltiples productos distintos.

---

## Estado Actual

### Estructura Existente Relevante

- `productos.es_bundle` (boolean) — flag en el producto
- `producto_componentes(variante_bundle_id, componente_variante_id, cantidad)` — tabla de componentes
- `enrichirBundles()` en `lib/pos/queries.ts` — calcula stock de bundles desde componentes
- `guardarTodosComponentesBundle()` en `actions/productos.ts` — guarda componentes atomicamente
- `buscarVariantesParaBundle()` — búsqueda para el editor de componentes
- Sección "Bundle / Pack" en `ProductoForm.tsx` — buscador + pills de variantes
- Props `variantesBundleOpciones`, `componentesInitMap` en `ProductoForm`
- `[id]/page.tsx` carga componentes de todas las variantes con Promise.all

### Brechas o Problemas que se Abordan

- Flujo de 3 pasos con guardados intermedios para crear un pack
- Variante nueva no aparece en pills hasta guardar y recargar
- Bundle muestra stock 0 en POS si se guarda incorrectamente
- Modelo "producto componente" es overkill para packs del mismo SKU
- UI confusa: sección bundle desconectada del editor de variantes

---

## Cambios Propuestos

### Resumen de Cambios

- **Nueva migración**: agrega `pack_habilitado`, `pack_cantidad`, `pack_precio` a `variantes_producto`
- **`VarianteInput`**: agrega `pack_habilitado?`, `pack_cantidad?`, `pack_precio?`
- **`VariantesEditor`**: agrega fila expandible "Pack" inline en cada variante row
- **`crearProducto` / `actualizarProducto`**: persiste los campos pack al insertar/actualizar variantes
- **`lib/pos/queries.ts`**: reemplaza `enrichirBundles` con lógica pack directa; una variante con pack genera DOS entradas en resultados POS
- **`ProductoForm.tsx`**: elimina la sección Bundle/Pack del bottom, elimina props bundle, elimina estado `esBundle`/`componentesMap`
- **`[id]/page.tsx`**: elimina carga de `variantesBundleOpciones` y `componentesInitMap`
- **`actions/productos.ts`**: elimina `guardarTodosComponentesBundle`, `buscarVariantesParaBundle`, `ComponenteBundleInput`, `ComponenteBundleItem` (o deprecar con JSDoc)
- **DB**: mantener `producto_componentes` y `productos.es_bundle` sin borrar (safe), solo dejar de usarlos

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `supabase/migrations/20260523000001_pack_por_variante.sql` | Agrega columnas pack a variantes_producto |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/actions/productos.ts` | VarianteInput + pack en insert/update variantes. Deprecar bundle actions |
| `app/components/productos/VariantesEditor.tsx` | Fila expandible pack por variante |
| `app/components/productos/ProductoForm.tsx` | Eliminar sección bundle, eliminar props/estado bundle |
| `app/app/(dashboard)/productos/[id]/page.tsx` | Eliminar carga de bundle props |
| `app/lib/pos/queries.ts` | Reemplazar enrichirBundles, duplicar variante como pack en resultados |
| `app/components/pos/POSContainer.tsx` | Manejar `es_pack` en CartItem para deducción correcta de stock |
| `app/types/database.ts` | Agregar campos pack a tipo VarianteProducto si existe |

### Archivos a Eliminar (si aplica)

Ninguno. El código bundle en actions puede marcarse como `@deprecated` y removerse en sprint siguiente.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Pack fields en variante, no en producto**: El pack es una propiedad de la variante específica (Quilmes 473ml puede tener pack x6, Quilmes 1L no). Poner todo en la variante evita relaciones extra.

2. **DOS entradas en POS para variante con pack**: `listarProductosPOS` y `buscarVariantes` retornan la variante individual + una entrada virtual `{...variante, id: variante.id + '_pack', es_pack: true, precio_venta: pack_precio, stock_efectivo: floor(stock/pack_cantidad)}`. Así el POS no cambia de UX — el vendedor simplemente elige cuál agregar al carrito.

3. **Stock se deduce multiplicado**: Al agregar `n packs` al carrito, la venta registra `cantidad_real = n * pack_cantidad` en `ventas_items`. Esto mantiene la coherencia del stock sin cambiar la tabla `ventas_items`.

4. **`VariantesEditor` inline, no columnas extra**: Agregar 3 columnas a la tabla ya ancha sería malo en mobile. La configuración pack se muestra como un toggle que expande una fila extra debajo de la variante (como un accordion).

5. **`es_bundle` en productos queda en DB pero se ignora**: Safe, sin migración destructiva.

6. **`producto_componentes` queda en DB pero se ignora**: Ídem. Si en el futuro se quiere soportar packs multi-producto, la infraestructura ya existe.

7. **`pack_precio` es obligatorio si `pack_habilitado = true`**: Validar en `validarProducto` y en el constraint de DB.

### Alternativas Consideradas

- **Mantener producto_componentes con mejor UX**: Descartado porque el modelo es conceptualmente incorrecto para el caso de uso (mismo producto, no composición).
- **Pack como variante adicional en el mismo producto**: Descartado porque confunde el atributo "variante" (marca/talla/color) con el modo de venta (individual/pack).
- **Tabla `packs` separada**: Overkill para el caso de uso.

### Preguntas Abiertas

- ❓ ¿El código de barras del pack es diferente al individual? (ej. caja tiene su propio EAN). → Por ahora: sin campo extra, se escanea como individual y el POS pregunta. Se puede agregar `pack_codigo_barras` después.
- ❓ ¿Se puede vender fracción de pack (ej. 0.5 packs)? → No, pack_cantidad es entero.
- ❓ ¿Informes / historial de ventas muestran "N packs" o "N×pack_cantidad unidades"? → Se guarda `cantidad * pack_cantidad` como cantidad real + `es_pack=true` para poder mostrar ambas representaciones.

---

## Tareas Paso a Paso

### Paso 1: Migración DB — agregar campos pack a variantes

Crear `supabase/migrations/20260523000001_pack_por_variante.sql`:

```sql
-- Agrega soporte de pack/bulto por variante
ALTER TABLE public.variantes_producto
  ADD COLUMN IF NOT EXISTS pack_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_cantidad   integer,
  ADD COLUMN IF NOT EXISTS pack_precio     numeric(12, 2);

-- Constraint: si pack_habilitado, los otros campos son obligatorios y válidos
ALTER TABLE public.variantes_producto
  ADD CONSTRAINT variantes_pack_coherencia CHECK (
    (pack_habilitado = false)
    OR (
      pack_cantidad IS NOT NULL
      AND pack_cantidad > 1
      AND pack_precio IS NOT NULL
      AND pack_precio > 0
    )
  );

COMMENT ON COLUMN public.variantes_producto.pack_habilitado IS 'Si true, la variante también se vende en pack/bulto';
COMMENT ON COLUMN public.variantes_producto.pack_cantidad   IS 'Cantidad de unidades que incluye el pack (ej: 6 para un six-pack)';
COMMENT ON COLUMN public.variantes_producto.pack_precio     IS 'Precio de venta del pack completo';
```

**Acciones:**
- Crear el archivo SQL con el contenido de arriba
- Aplicar en Supabase Dashboard → SQL Editor (o `supabase db push` si está configurado localmente)

**Archivos afectados:**
- `supabase/migrations/20260523000001_pack_por_variante.sql` (nuevo)

---

### Paso 2: Actualizar `VarianteInput` y acciones de productos

En `app/app/actions/productos.ts`:

**a) Actualizar `VarianteInput`:**
```typescript
export interface VarianteInput {
  id?: string
  talla_id: string | null
  color_id: string | null
  codigo_barras: string | null
  precio_venta: number | null
  stock_inicial: number
  stock_minimo: number
  eliminar?: boolean
  // Pack / bulto
  pack_habilitado?: boolean
  pack_cantidad?: number | null   // requerido si pack_habilitado=true
  pack_precio?: number | null     // requerido si pack_habilitado=true
}
```

**b) En `validarProducto`**, agregar al loop de variantes activas:
```typescript
if (v.pack_habilitado) {
  if (!v.pack_cantidad || v.pack_cantidad <= 1)
    return 'La cantidad del pack debe ser mayor a 1'
  if (!v.pack_precio || v.pack_precio <= 0)
    return 'El precio del pack es obligatorio'
}
```

**c) En `crearProducto`** — al hacer `.insert()` de variantes (donde se mapea `VarianteInput[]` a rows de DB), agregar:
```typescript
pack_habilitado: v.pack_habilitado ?? false,
pack_cantidad:   v.pack_habilitado ? v.pack_cantidad : null,
pack_precio:     v.pack_habilitado ? v.pack_precio   : null,
```

**d) En `actualizarProducto`** — mismo cambio en el upsert de variantes.

**e) Deprecar (no borrar) las funciones bundle:**
```typescript
/** @deprecated Usar pack_habilitado en variante. Mantenido por compatibilidad. */
export async function guardarTodosComponentesBundle(...) { ... }

/** @deprecated */
export async function buscarVariantesParaBundle(...) { ... }
```

**Archivos afectados:**
- `app/app/actions/productos.ts`

---

### Paso 3: Actualizar `VariantesEditor` — toggle pack inline

En `app/components/productos/VariantesEditor.tsx`:

**a) Agregar `pack_habilitado`, `pack_cantidad`, `pack_precio` al estado interno de cada variante** (ya manejado por `VarianteInput`).

**b) En `emptyVariante()`:**
```typescript
function emptyVariante(): VarianteInput {
  return {
    talla_id: null, color_id: null, codigo_barras: null,
    precio_venta: null, stock_inicial: 0, stock_minimo: 0,
    pack_habilitado: false, pack_cantidad: null, pack_precio: null,
  }
}
```

**c) Agregar columna "Pack" al `<thead>`** (última columna, ancho fijo):
```tsx
<th className="text-center w-16">Pack</th>
```

**d) En cada fila de variante**, en la celda Pack:
```tsx
<td className="text-center">
  <button
    type="button"
    onClick={() => update(idx, { 
      pack_habilitado: !v.pack_habilitado,
      pack_cantidad: !v.pack_habilitado ? (v.pack_cantidad ?? 6) : null,
      pack_precio: !v.pack_habilitado ? (v.pack_precio ?? null) : null,
    })}
    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
      v.pack_habilitado 
        ? 'bg-lime-100 text-lime-700 border border-lime-300' 
        : 'bg-gray-100 text-gray-400 border border-gray-200 hover:border-gray-300'
    }`}
  >
    {v.pack_habilitado ? `×${v.pack_cantidad}` : 'Pack'}
  </button>
</td>
```

**e) Cuando `pack_habilitado = true`, mostrar una fila extra expandida debajo** (usando `<tr>` adicional en el mismo `tbody`):
```tsx
{v.pack_habilitado && (
  <tr className="bg-lime-50">
    <td colSpan={totalCols} className="px-3 py-2">
      <div className="flex items-center gap-4 text-sm">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pack de</label>
        <input
          type="number" min="2" max="999"
          value={v.pack_cantidad ?? ''}
          onChange={(e) => update(idx, { pack_cantidad: Number(e.target.value) || null })}
          className="w-20 border border-lime-300 rounded px-2 py-1 text-sm text-center bg-white"
          placeholder="6"
        />
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">unidades • Precio pack $</label>
        <input
          type="number" min="0" step="0.01"
          value={v.pack_precio ?? ''}
          onChange={(e) => update(idx, { pack_precio: Number(e.target.value) || null })}
          className="w-28 border border-lime-300 rounded px-2 py-1 text-sm bg-white"
          placeholder="11000"
        />
        <span className="text-xs text-gray-400">
          {v.pack_cantidad && v.pack_precio 
            ? `≈ $${(v.pack_precio / v.pack_cantidad).toFixed(0)}/u`
            : ''}
        </span>
      </div>
    </td>
  </tr>
)}
```

**Archivos afectados:**
- `app/components/productos/VariantesEditor.tsx`

---

### Paso 4: Limpiar `ProductoForm.tsx` — eliminar sección bundle

**Remover:**
- Todo el bloque JSX `{/* Bundle / Pack */}` (la sección con toggle, pills, buscador de componentes)
- Estados: `esBundle`, `selectedBundleVarianteId`, `componentesMap`, `bundleQuery`, `bundleResults`, `bundleSearching`
- Variable derivada `savedBundleIdSet`, `dynamicBundleOpciones`, `componentes`
- Función `setComponentes`
- Props del form: `esBundleInit?`, `variantesBundleOpciones?`, `componentesInitMap?`
- Import de `guardarTodosComponentesBundle`, `buscarVariantesParaBundle`, `ComponenteBundleItem`
- El bloque `if (modo === 'editar' && variantesBundleOpciones.length > 0)` con el call a `guardarTodosComponentesBundle` en `handleSubmit`
- Campo `es_bundle` de `ProductoInput` en el submit (ya no es responsabilidad del form)
- El `precio_compra` ahora vuelve a ser siempre editable (quitar el `{esBundle ? ... : <Input />}`)

**Archivos afectados:**
- `app/components/productos/ProductoForm.tsx`

---

### Paso 5: Limpiar `[id]/page.tsx` — eliminar carga de bundle props

En `app/app/(dashboard)/productos/[id]/page.tsx`:

**Remover:**
- El `Promise.all` que carga componentes de todas las variantes
- Las variables `variantesBundleOpciones`, `componentesInitMap`, `esBundleInit`
- El import de `ComponenteBundleItem` si ya no se usa
- Los props que pasan estos datos a `<ProductoForm />`

**Archivos afectados:**
- `app/app/(dashboard)/productos/[id]/page.tsx`

---

### Paso 6: Actualizar POS — `lib/pos/queries.ts`

**a) Agregar `pack_habilitado`, `pack_cantidad`, `pack_precio` a `VarianteResultado`:**
```typescript
export interface VarianteResultado {
  // ... campos existentes ...
  pack_habilitado: boolean
  pack_cantidad: number | null
  pack_precio: number | null
  es_pack: boolean        // true si esta entrada es la versión pack (virtual)
}
```

**b) Actualizar la query `.select(...)` en `listarProductosPOS` y `buscarVariantes`** para incluir los nuevos campos de la tabla:
```
vp.pack_habilitado, vp.pack_cantidad, vp.pack_precio
```

**c) En la función `mapVariante`** (que transforma row a `VarianteResultado`):
```typescript
function mapVariante(row: ...): VarianteResultado {
  return {
    // ... campos existentes ...
    stock_efectivo: stockActual,  // para individual, siempre = stock_actual
    pack_habilitado: row.pack_habilitado ?? false,
    pack_cantidad: row.pack_cantidad ?? null,
    pack_precio: row.pack_precio ?? null,
    es_pack: false,
  }
}
```

**d) Después de mapear todas las variantes**, generar entradas virtuales para los packs:
```typescript
const packVariantes: VarianteResultado[] = variantes
  .filter(v => v.pack_habilitado && v.pack_cantidad && v.pack_precio)
  .map(v => ({
    ...v,
    // ID virtual para el carrito (no existe en DB)
    id: v.id + '__pack',
    precio_venta: v.pack_precio!,
    stock_efectivo: Math.floor(v.stock_actual / v.pack_cantidad!),
    es_pack: true,
    // El carrito necesita el id real de la variante para la venta
    variante_id_real: v.id,
  }))

return [...variantes, ...packVariantes].filter(v => v.stock_efectivo > 0)
```

**e) Eliminar `enrichirBundles`** (ya no se usa) y su llamada en `listarProductosPOS`/`buscarVariantes`.

**Archivos afectados:**
- `app/lib/pos/queries.ts`

---

### Paso 7: Actualizar `POSContainer.tsx` — carrito y venta

**a) Actualizar `CartItem`** para soportar packs:
```typescript
interface CartItem {
  // ... campos existentes ...
  variante_id: string      // para pack, es el id real (sin __pack)
  es_pack: boolean
  pack_cantidad: number | null  // cuántas unidades "reales" por pack
}
```

**b) En `agregarVariante`**, cuando `v.es_pack = true`:
```typescript
{
  id: v.id,
  variante_id: v.es_pack ? (v as any).variante_id_real ?? v.id.replace('__pack','') : v.id,
  es_pack: v.es_pack,
  pack_cantidad: v.es_pack ? v.pack_cantidad : null,
  // ... resto igual
  stock_actual: v.stock_efectivo,
}
```

**c) En la función de procesamiento de venta** (donde se registra `ventas_items`), calcular la cantidad real:
```typescript
// Si es pack, la cantidad real a descontar = cantidad_en_carrito * pack_cantidad
const cantidadReal = item.es_pack && item.pack_cantidad
  ? item.cantidad * item.pack_cantidad
  : item.cantidad

// Insertar en ventas_items con cantidadReal
// (o agregar campo es_pack + pack_cantidad a ventas_items si se quiere historial de packs)
```

**d) En `Carrito.tsx`**, mostrar pack apropiadamente:
```tsx
{item.es_pack && item.pack_cantidad && (
  <span className="text-xs text-lime-700 bg-lime-50 px-1.5 py-0.5 rounded ml-1">
    Pack ×{item.pack_cantidad}
  </span>
)}
```

**Archivos afectados:**
- `app/components/pos/POSContainer.tsx`
- `app/components/pos/Carrito.tsx` (si existe por separado)

---

### Paso 8: Verificar TypeScript y testing manual

**Acciones:**
- Correr `npx tsc --noEmit` en `app/`
- Verificar flujo completo: crear producto → agregar variante → activar pack → guardar → ver en POS (individual + pack)
- Verificar que stock individual y pack se calculan correctamente
- Verificar que una venta de N packs descuenta N×pack_cantidad del stock

**Archivos afectados:**
- Ninguno nuevo

---

## Notas de Implementación

### Orden crítico
Paso 1 (migración DB) DEBE ejecutarse antes de Pasos 2-7, ya que los campos nuevos no existen en DB hasta entonces.

### Sobre `variante_id_real` en el POS
Para que la venta se registre con el `variante_id` correcto (no el virtual `__pack`), la entrada virtual del pack necesita llevar el `variante_id_real`. Esto puede ser un campo extra en `VarianteResultado` o simplemente parsear el ID (`id.replace('__pack', '')`). Documentar en el código cuál se usa.

### Sobre `ventas_items`
La decisión más conservadora es guardar `cantidad * pack_cantidad` como cantidad en `ventas_items` sin cambio de schema. Si se quiere historial de "cuántos packs se vendieron", agregar columnas `es_pack` y `pack_cantidad` a `ventas_items` en una migración futura.

### Sobre el precio_compra de bundles
El campo `precio_compra` de un producto cuyo pack se vende vuelve a ser editable (es el costo por unidad individual). Esto es correcto — el usuario ingresa el costo unitario como siempre.
