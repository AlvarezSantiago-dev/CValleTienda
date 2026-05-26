# Módulo: Kits / Armados (Conjuntos de ropa y similares)

**Fecha:** 2026-05-23  
**Caso de uso principal:** Tiendas de ropa que venden prendas individuales Y conjuntos armados. El conjunto tiene su propio precio (distinto a la suma de partes), y su venta descuenta stock de cada prenda componente.

---

## Problema a resolver

| Escenario | Hoy | Con kits |
|-----------|-----|----------|
| Remera M suelta | ✅ Se vende a $8.000, descuenta stock remera | ✅ Igual |
| Jean M suelto | ✅ Se vende a $15.000, descuenta stock jean | ✅ Igual |
| Conjunto Verano M | ❌ Producto separado, stock manual desincronizado | ✅ Se vende a $22.000, descuenta 1 remera M + 1 jean M automáticamente |

---

## Diseño técnico

### Principios

1. **Stock en los componentes, no en el kit**: el kit no tiene `stock_actual` propio; su disponibilidad se calcula como `min(floor(comp.stock / comp.cantidad))` sobre todos sus componentes.
2. **Reutilizar infraestructura existente**: `ventas.ts` ya tiene la lógica de `es_bundle`/`componentes` (dead code tras la remoción de `producto_componentes`). La adaptamos para `es_kit`.
3. **No romper nada**: `es_bundle` queda en la DB como está. `es_kit` es un campo nuevo y separado.

### DB (nueva migración)

#### 1. Campo `es_kit` en `productos`
```sql
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS es_kit boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.productos.es_kit IS
  'True si el producto es un armado/kit cuyos componentes son otras variantes de la tienda';
```

#### 2. Tabla `kit_componentes`
```sql
CREATE TABLE IF NOT EXISTS public.kit_componentes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id              uuid NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  kit_variante_id        uuid NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  componente_variante_id uuid NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  cantidad               integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kit_variante_id, componente_variante_id)
);

ALTER TABLE public.kit_componentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kit_componentes_tienda_rw" ON public.kit_componentes
  USING  (tienda_id = get_tienda_id())
  WITH CHECK (tienda_id = get_tienda_id());
```

#### 3. Modificar trigger de stock para ignorar kits
El trigger que descuenta stock en `detalles_venta` debe saltear kits (cuyo stock se descuenta manualmente por componente en el server action).

```sql
-- Modificar la función del trigger para que no descuente si el producto es un kit
-- (el server action lo hace directamente en los componentes)
-- Exact function name: descontar_stock_venta (o el que exista en el proyecto)
```

> **Nota**: El nombre exacto del trigger se verifica antes de ejecutar la migración.

---

## Flujo completo

### Alta del kit (Formulario de producto)

1. Usuario crea producto "Conjunto Verano" → activa toggle **"Es un kit/armado"**.
2. Aparece el editor de variantes normal (talles: S / M / L).
3. Debajo de cada variante con talle definido, aparece **"Componentes del kit"**:
   - Buscador de variantes de la tienda.
   - Se asigna: `Remera Básica M → cantidad 1`, `Jean Slim M → cantidad 1`.
4. `precio_venta` de la variante = precio del conjunto ($22.000).
5. Guardar → inserta en `kit_componentes`.

### POS — Búsqueda y stock

En `lib/pos/queries.ts`:
- Cuando una variante pertenece a un kit (`es_kit=true`), su `stock_efectivo` se calcula como:
  ```ts
  stock_efectivo = min over componentes of floor(comp.stock_actual / comp.cantidad)
  ```
- Si cualquier componente tiene 0 stock → kit sin stock disponible.
- Aparece en la grilla del POS como cualquier otro producto.

### POS — Cobrar un kit

En `ventas.ts` `registrarVenta`:
1. Se detecta `v.es_kit = true`.
2. Validación de stock: `min(floor(comp.stock / comp.cantidad)) >= cantidad_kit`.
3. **Total financiero**: `kit.precio_venta × cantidad` → correcto, sin cambios en el cálculo.
4. **Deducción de stock** (manual, bypass trigger):
   - Para cada componente: `UPDATE variantes_producto SET stock_actual = stock_actual - (cantidad_kit × comp.cantidad) WHERE id = comp.id AND tienda_id = tienda_id`.
   - Se inserta un `movimientos_stock` por componente (tipo `'venta'`, `referencia_venta_id`).
5. **`detalles_venta`**: se inserta el kit normalmente (variante_id del kit, precio del conjunto). El trigger NO descuenta porque la función detecta `es_kit=true`.
6. **Costo unitario** del kit = suma de `(precio_compra_comp × cantidad_comp)`.

---

## Archivos a modificar/crear

### Migración DB
- **`supabase/migrations/20260523000003_kits_armados.sql`** ← NUEVA
  - `es_kit` en productos
  - Tabla `kit_componentes` + RLS
  - Modificar función del trigger de stock

### Backend

- **`app/types/database.ts`** — agregar `es_kit: boolean` a `Producto`, agregar interfaz `KitComponente`

- **`app/app/actions/productos.ts`** — 
  - Agregar `es_kit?: boolean` y `kit_componentes?: KitComponenteInput[]` a `ProductoInput`
  - En `crearProducto`: guardar `es_kit` + insertar en `kit_componentes`
  - En `actualizarProducto`: actualizar `es_kit` + reemplazar componentes del kit (delete+insert)
  - Nueva action `buscarVariantesParaKit(query)` — search de variantes para el selector

- **`app/lib/productos/queries.ts`** — 
  - En `listarProductos`: detectar si tiene kit (badge en lista)
  - En `obtenerProducto`: cargar `kit_componentes` con variante + producto info

- **`app/lib/pos/queries.ts`** —
  - Agregar `es_kit: boolean` + `kit_stock_efectivo: number` a `VarianteResultado`
  - En `SELECT_VARIANTE`: incluir `es_kit` vía join a productos
  - En `mapVariante`: calcular `stock_efectivo` = `kit_stock_efectivo` si `es_kit=true`
  - Nuevo helper `cargarStockKits(variantes)`: query a `kit_componentes` para calcular stock efectivo por kit

- **`app/app/actions/ventas.ts`** —
  - En `cargarVariantes`: cuando `es_kit=true`, cargar de `kit_componentes` (reemplaza el bloque de `bundleIds` / `producto_componentes`)
  - En `registrarVenta` stock validation: usar lógica de kit (ya existe la de bundle, adaptarla)
  - En `registrarVenta` costo: suma de componentes (ya existe)
  - En INSERT `detalles_venta`: trigger saltea kits (por cambio en función DB)
  - Nuevo bloque: UPDATE stock de cada componente + INSERT `movimientos_stock` por componente

### Frontend

- **`app/components/productos/ProductoForm.tsx`** —
  - Nuevo toggle "Es un kit/armado" (junto al checkbox de categoría o en la sección de variantes)
  - Cuando `es_kit=true`, pasar `initialKitComponentes` al `VariantesEditor`

- **`app/components/productos/VariantesEditor.tsx`** —
  - Cuando `es_kit=true` (prop nueva), mostrar por cada variante una sección expandible "Componentes"
  - Usa `KitComponentesEditor` embebido por variante

- **`app/components/productos/KitComponentesEditor.tsx`** ← NUEVO
  - Buscador de variantes (input + dropdown con resultados de `buscarVariantesParaKit`)
  - Tabla de componentes asignados: nombre | talle | color | cantidad | quitar
  - Sin componentes: mensaje "Agregá al menos un componente"

- **`app/components/productos/ListaProductos.tsx`** —
  - Badge "🧩 Kit" cuando el producto tiene `es_kit=true`

- **`app/app/(dashboard)/productos/[id]/page.tsx`** —
  - Mapear `es_kit` e `initialKitComponentes` al form

---

## UX del formulario

```
┌─────────────────────────────────────────┐
│ ✓ Es un kit/armado                      │
│   (la venta descuenta stock de cada     │
│    componente automáticamente)          │
└─────────────────────────────────────────┘

Variantes  [+ Agregar]
┌──────┬────────────┬──────────┬──────────────────────────────────────────────┐
│ Talle│ Cód.barras │  Precio  │                Pack  │                       │
├──────┼────────────┼──────────┼──────────────────────┤                       │
│  M   │            │ 22.000   │  Pack                │  Quitar               │
├──────┴────────────┴──────────┴──────────────────────┴───────────────────────┤
│ 🧩 Componentes del Conjunto M                                                │
│ ┌──────────────────────┬───────┬───────┬──────────┐                         │
│ │ Producto             │ Talle │ Color │ Cantidad │                         │
│ ├──────────────────────┼───────┼───────┼──────────┤                         │
│ │ Remera Básica        │ M     │ —     │  [1]  ×  │                         │
│ │ Jean Slim            │ M     │ —     │  [1]  ×  │                         │
│ └──────────────────────┴───────┴───────┴──────────┘                         │
│ [+ Buscar y agregar componente…]                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Consideraciones de negocio

| Situación | Comportamiento |
|-----------|---------------|
| Stock remera M = 3, jean M = 5 | Conjunto M disponible: 3 |
| Stock remera M = 0 | Conjunto M sin stock (aunque haya jean) |
| Venta 1 conjunto M | Remera M → 2, Jean M → 4, Conjunto M → no tiene stock propio |
| Venta 1 remera M suelta | Remera M → 1, Jean M → 4, Conjunto M disponible → 1 (automático) |
| Misma variante en 2 kits | Ambos kits ven el mismo stock → el más vendido deja sin stock al otro |

---

## Estado del plan

- [ ] **Paso 1**: Migración DB (`20260523000003_kits_armados.sql`)
- [ ] **Paso 2**: Types (`database.ts`)
- [ ] **Paso 3**: `ventas.ts` — reutilizar lógica bundle para kits
- [ ] **Paso 4**: `productos.ts` actions — CRUD de kit_componentes
- [ ] **Paso 5**: `lib/pos/queries.ts` — stock efectivo desde componentes
- [ ] **Paso 6**: `lib/productos/queries.ts` — cargar kit_componentes en obtenerProducto
- [ ] **Paso 7**: `KitComponentesEditor.tsx` — componente nuevo
- [ ] **Paso 8**: `VariantesEditor.tsx` — integrar KitComponentesEditor por variante
- [ ] **Paso 9**: `ProductoForm.tsx` — toggle es_kit
- [ ] **Paso 10**: `[id]/page.tsx` — mapear datos del kit
- [ ] **Paso 11**: `ListaProductos.tsx` — badge 🧩 Kit
- [ ] **Paso 12**: TypeScript check + pruebas
