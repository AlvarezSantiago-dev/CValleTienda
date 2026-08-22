# Plan: Packs múltiples por producto (x8, x24…) + tramos por pack

**Creado:** 2026-08-21
**Estado:** Implementado
**Pedido:** Distribuidora: en un producto (ej. Coca 2,25) crear N packs (x8, x24…), cada uno con precio, código, foto y descuento por cantidad de packs; elegir unidad o pack en POS y catálogo; dejar de confundir el auto-pack y el buscador.

---

## Descripción General

### Qué Logra Este Plan

En Coca Cola 2,25 se cargan **varios packs** (Pack x8, Caja x24, los que quieran). Cada pack tiene precio, código, foto para el catálogo y **tramos propios** (3 packs x8 → 10 %; 20 cajas x24 → X %). En POS y catálogo se elige **unidad o cualquiera de esos packs**. El buscador muestra `Pack x8` / `Pack x24` bien etiquetado. El auto-pack actual (al juntar unidades te convierte al único bulto) **deja de pisar** cuando hay más de un tamaño.

### Por Qué Importa

El piloto vende por unidad, por fardo y por caja sobre el mismo SKU. Un solo `pack_cantidad` por variante no alcanza; el auto-convertidor y el buscador mezclan unidad y pack. Sin esto el catálogo B2B y el mostrador no reflejan cómo factura la distribuidora.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Archivos | Qué hay |
| ---- | -------- | ------- |
| Pack 1:1 variante | `variantes_producto.pack_habilitado / pack_cantidad / pack_precio / pack_codigo_barras` | Un solo pack por variante. UI en `VarianteFila` / `VariantesEditor`. |
| POS virtual pack | `lib/pos/queries.ts` `generarPackVariantes` | Crea una entrada `id + '__pack'`. Stock = floor(unidades / pack_cantidad). |
| Auto-pack | `lib/pos/aplicarPrecioPack.ts` + `syncCarritoPrecios` | Si hay N unidades ≥ tamaño, **reemplaza** por packs automáticos (`__pack_auto`). Solo entiende **un** tamaño. |
| Buscador POS | `BuscadorVariantes.tsx` | Muestra el nombre del producto; el pack no dice “Pack xN” de forma clara (a veces solo el código). |
| Tramos | `producto_tramos_cantidad` + `lib/precios/tramos-cantidad.ts` | Tramos a **nivel producto**, qty de la **línea**. En POS se **saltan** si `es_pack`. |
| Catálogo | `CatalogoFicha`, `carrito.ts`, POST `/api/catalogo/[slug]/pedido` | Solo unidad. Foto de producto/variante. Sin selector pack. |
| Fotos | `/api/productos/imagen` kinds `cover` / `color` / `variante` | Path `{tienda}/{producto}/cover` o `.../color/{id}` o `.../var/{id}`. |
| Venta | `registrarVenta` `pack_size` | Descuenta `cantidad * pack_size` del stock de la variante unidad. |

### Brechas o Problemas que se Abordan

1. Un producto no puede tener Pack x8 **y** Caja x24.
2. Tramos de pack no existen (3 fardos ≠ 3 unidades sueltas).
3. Catálogo no vende packs ni muestra su foto.
4. Al llegar a N unidades el POS **inventa** un pack; con dos tamaños 24 u. podría ser 3×x8 o 1×x24.
5. El buscador no diferencia unidad vs pack.

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva tabla `producto_packs` (N packs por producto) + `producto_pack_tramos`.
- UI en `ProductoForm`: lista de packs (unidades, precio, código, foto, tramos). Independiente de la fila de variante.
- POS: una fila de búsqueda por unidad y **una por cada pack** (`Coca 2,25 · Pack x8`).
- POS: **no** auto-convertir si el producto tiene 2+ packs. Si hay 1 pack (carnicería / legado), se mantiene el auto actual.
- Desde una línea de **unidades**, acción “Pasar a pack…” para elegir x8 / x24 (convierte floor(qty/tamaño) + remanente).
- Catálogo: chips Unidad / Pack x8 / Pack x24; foto del pack; tramos del modo elegido; chip “Dto. −10 %” cuando aplica.
- Foto pack: Storage `{tienda_id}/{producto_id}/pack/{pack_id}/cover.{ext}`.
- Backfill: el pack 1:1 de la variante se copia a `producto_packs` si el producto aún no tiene filas.
- Columnas `pack_*` de la variante **siguen** para rubros de un solo bulto; si el producto ya tiene `producto_packs`, POS/catálogo usan esas y no el pack de la variante.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260822000001_producto_packs_multiples.sql` | Tablas packs + tramos pack; backfill desde variante; RLS. |
| `app/lib/packs/types.ts` | `ProductoPack`, `PackTramo`. |
| `app/lib/packs/virtual.ts` | `idVirtualPack(varianteId, packId)`, parse, label `Pack xN`. |
| `app/app/actions/packs.ts` | Guardar set de packs+tramos del producto (replace). |
| `app/components/productos/PacksProductoEditor.tsx` | Filas pack: unidades, precio, código, foto, tramos; agregar/quitar. |
| `app/components/pos/ElegirPackLinea.tsx` | Menú “Pasar a pack…” desde línea unidad. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/types/database.ts` | `ProductoPack`, `ProductoPackTramo`. |
| `app/components/productos/ProductoForm.tsx` | Montar `PacksProductoEditor` si `usarPack`. |
| `app/lib/productos/queries.ts` | Cargar packs+tramos en detalle. |
| `app/lib/pos/queries.ts` | `generarPacksProducto` (N virtuales); `pack_id`, `pack_label`, tramos del pack. |
| `app/lib/pos/aplicarPrecioPack.ts` | Auto-pack **solo** si hay exactamente 1 pack usable (legado). Si 2+, no tocar líneas unidad. |
| `app/lib/pos/precios-condicion.ts` | Tramo de pack sobre qty de packs (`tramos` del pack, no los de unidad). |
| `app/components/pos/POSContainer.tsx` | `pack_id` en cart; `pack_size` al vender; menú pasar-a-pack. |
| `app/components/pos/BuscadorVariantes.tsx` | Título `nombre · Pack x8`; badge Pack. |
| `app/components/pos/Carrito.tsx` | Label pack + chip dto aplicado. |
| `app/lib/catalogo/types.ts` | `packs[]` en producto público; `packId` en `CartItem`. |
| `app/lib/catalogo/queries-publico.ts` | Cargar packs+fotos+tramos. |
| `app/components/catalogo-publico/CatalogoFicha.tsx` | Selector presentación; foto pack; dto visible. |
| `app/components/catalogo-publico/CatalogoCarrito.tsx` | Líneas pack vs unidad; recálculo tramo pack. |
| `app/components/catalogo-publico/CatalogoGrilla.tsx` | Texto “Unidad y packs” si hay packs. |
| `app/app/api/catalogo/[slug]/pedido/route.ts` | Aceptar `pack_id`; precio servidor = pack lista + tramo pack; snapshot nombre `Pack x8`. |
| `app/app/actions/catalogo.ts` | Convertir/editar: `pack_size` desde pack; no duplicar remito (ya está). |
| `app/app/api/productos/imagen/route.ts` | Kind `pack` + `pack_id`. |
| `app/lib/productos/imagen-api.ts` | `kind: 'pack'`. |
| `app/app/actions/ventas.ts` | `pack_id` opcional (auditoría); `pack_size` como hoy. |
| `CLAUDE.md` / `contexto/proyectos.md` | Packs N por producto + tramos por pack. |

### Archivos a Eliminar (si aplica)

Ninguno. No borrar columnas `pack_*` de variante (carnicería / despensa un bulto).

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Packs a nivel producto, no variante.** Coca 2,25 tiene x8 y x24. Si hay sabores como variantes, **todos heredan los mismos packs**; el stock se descuenta de la **variante elegida** (`cantidad_packs * unidades_del_pack`).
2. **Tramos de unidad y de pack son independientes.** `producto_tramos_cantidad` sigue aplicando a líneas de unidad. Cada pack tiene sus tramos (qty = cantidad de **ese** pack, no se suman x8+x24 ni unidades sueltas).
3. **Un tramo gana, no se apilan** (mismo motor que ya existe).
4. **Auto-pack solo con 1 tamaño.** Con 2+ packs, jamás convertir unidades solas. El cajero elige pack en el buscador o “Pasar a pack…”.
5. **Pack explícito en el buscador nunca lo reescribe el auto.** Igual que hoy (`es_pack && !pack_automatico`).
6. **Foto del pack** para catálogo; si no hay, fallback tapa del producto.
7. **Máx. 8 packs** por producto y 12 tramos por pack (mismo tope que tramos de unidad).
8. **IDs virtuales POS:** `{varianteId}__pack_{packId}` (deja de usarse un único `__pack` cuando hay `producto_packs`).

### Alternativas Consideradas

- **N packs por variante:** duplica x8/x24 en cada sabor; más carga para el piloto. Se rechaza en v1.
- **Cada pack como producto aparte:** rompe stock único y el catálogo. No.
- **Siempre auto al pack más grande que entre:** 24 u. → 1×x24 sin preguntar. El usuario pidió elegir; se rechaza.
- **Sacar el auto-pack de todos los rubros:** rompe carnicería (six-pack). Se conserva si hay exactamente 1 pack.

### Preguntas Abiertas (si las hay)

1. ¿Confirmás packs **compartidos por todas las variantes** del producto (sabores distintos no tienen packs distintos)?
2. ¿Con 2+ packs, el auto-pack de unidades **se apaga** (recomendado) y solo se arma pack si lo eligen?

Si no hay respuesta, `/implementar` usa sí / sí (compartidos; sin auto si hay más de un pack).

---

## Tareas Paso a Paso

### Paso 1: Migración

**Acciones:**

- `producto_packs`:
  - `id uuid PK`, `tienda_id`, `producto_id` FK ON DELETE CASCADE
  - `unidades integer NOT NULL CHECK (unidades > 1)`
  - `precio numeric(12,2) NOT NULL CHECK (precio > 0)`
  - `codigo_barras text`
  - `imagen_url text`
  - `nombre text` (null → se muestra `Pack x{unidades}`)
  - `orden integer NOT NULL DEFAULT 0`
  - `UNIQUE (producto_id, unidades)`
  - index `(producto_id)`, index unique parcial `codigo_barras` por `tienda_id` donde not null
- `producto_pack_tramos`: igual forma que tramos de producto, FK `pack_id` ON DELETE CASCADE, `UNIQUE (pack_id, cantidad_desde)`
- RLS `tienda_id = get_tienda_id()`, grants authenticated
- Backfill: por cada variante con `pack_habilitado`, insertar pack del **producto** si no existe ya esa `unidades` (precio/código/imagen de la primera variante que lo tenga)

**Archivos afectados:**

- `supabase/migrations/20260822000001_producto_packs_multiples.sql`

### Paso 2: Motor + IDs virtuales + tests

**Acciones:**

- `idVirtualPack` / `parseIdVirtualPack`
- `labelPack(unidades, nombre)`
- Reusar `precioConTramo(precioPack, tramosPack, qtyPacks)`
- Tests: 3× pack x8 con 10 % → precio; 2 packs distintos no mezclan tramos; parse de id virtual

**Archivos afectados:**

- `app/lib/packs/virtual.ts` + test
- `app/lib/precios/tramos-cantidad.ts` (sin cambio de regla; solo consumo)

### Paso 3: CRUD packs en producto

**Acciones:**

- Editor: filas “Pack de [n] u. · precio · código · foto · tramos”. Vacío = solo se vende por unidad.
- Guardar replace del set (action `guardarPacksProducto`).
- Cargar en `obtenerProducto`.
- Si `usarPack`: mostrar el editor **arriba** (producto), no solo el toggle de un pack en la variante. El toggle 1:1 de variante se oculta cuando el producto ya usa `producto_packs` o siempre en rubro `distribuidora` (evitar dos UIs). **Regla:** en `distribuidora` solo editor N-packs; en otros rubros con `usarPack`, si no hay `producto_packs`, se mantiene el pack 1:1 de variante.

**Archivos afectados:**

- `PacksProductoEditor.tsx`, `ProductoForm.tsx`, `actions/packs.ts`, `lib/productos/queries.ts`
- `VarianteFila.tsx` (ocultar pack 1:1 en distribuidora)

### Paso 4: Fotos de pack

**Acciones:**

- API kind `pack` + `pack_id`; path `{tienda_id}/{producto_id}/pack/{pack_id}/cover.{ext}`
- Upload en el editor (producto ya persistido; en alta: igual que colores, subir tras crear)

**Archivos afectados:**

- `app/app/api/productos/imagen/route.ts`, `imagen-api.ts`

### Paso 5: POS — listar, buscar, precios, auto

**Acciones:**

- Fetch `producto_packs` (+ tramos) por `producto_id` de las variantes.
- Por cada variante unidad, emitir N entradas virtuales (stock_efectivo = floor(stock / unidades)).
- `VarianteResultado`: `pack_id`, `pack_unidades`, `pack_label`, `tramos` (del pack si es pack; del producto si es unidad).
- `generarPackVariantes` legado: solo si el producto **no** tiene `producto_packs`.
- `aplicarPrecioPack`: si la línea tiene `packs_producto_count > 1` o `pack_id` de catálogo N, skip auto.
- Buscador: `producto_nombre` + ` · ${pack_label}`; badge “Pack”.
- Carrito: chip dto si `descuentoPctTramo > 0`.
- `ElegirPackLinea` en línea unidad: convierte qty física a packs + remanente.
- `registrarVenta`: `pack_size = pack.unidades`.

**Archivos afectados:**

- `lib/pos/queries.ts`, `aplicarPrecioPack.ts`, `precios-condicion.ts`, `POSContainer.tsx`, `BuscadorVariantes.tsx`, `Carrito.tsx`, `ventas.ts`

### Paso 6: Catálogo público

**Acciones:**

- DTO `packs: { id, unidades, precio, nombre, imagen_url, tramos }[]`
- Ficha: segmento Unidad | cada pack. Precio grande = lista+tramo de esa presentación. Foto del pack. Texto “Dto. aplicado −X %” si qty califica.
- Carrito: `packId` en la clave de línea (`varianteId + packId`). Recalcular con tramos del pack.
- POST: `items: { variante_id, cantidad, pack_id? }`. Servidor: si `pack_id`, precio = `precioConTramo(pack.precio, pack.tramos, qty)`; `producto_nombre` snapshot `Coca · Pack x8`; guardar `precio_unitario` del **pack** (al convertir a venta, mandar `pack_size`).
- Grilla: si hay packs, “Unidad y packs”.

**Archivos afectados:**

- types, queries-publico, carrito, Ficha, Carrito, Grilla, `pedido/route.ts`, `whatsapp.ts`, `catalogo.ts` (editar/convertir: pack_size)

### Paso 7: Pedido inbox + convertir

**Acciones:**

- Ítems de pedido ya tienen snapshot de nombre/precio; al convertir, si el nombre/línea es pack, hace falta `pack_id` o `pack_size` persistido.
- Agregar `pedido_catalogo_items.pack_id uuid null` + `pack_unidades int null` en la misma migración (o esta) para no adivinar al convertir.
- `convertirPedidoAVenta` pasa `pack_size: pack_unidades ?? 1`.

**Archivos afectados:**

- migración, `catalogo.ts`, tipos, editor de pedido (al agregar pack desde buscador POS)

### Paso 8: Docs y tests

**Acciones:**

- `CLAUDE.md`: packs N por producto, tramos por pack, POS/catálogo eligen presentación; auto-pack solo 1 tamaño.
- Tests: virtual ids, tramo pack, aplicarPrecioPack no convierte si 2 packs.
- Checklist piloto Coca.

**Archivos afectados:**

- `CLAUDE.md`, `contexto/proyectos.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `aplicarPrecioPack` ↔ `syncCarritoPrecios` ↔ POS cart
- `generarPackVariantes` ↔ buscador, grilla POS, lista precios, asociar código
- `registrarVenta` `pack_size` ↔ stock físico
- Tramos producto vs tramos pack: no mezclar en la misma línea

### Actualizaciones Necesarias para Consistencia

- `CodigoDesconocidoModal`: asociar código a un **pack** de `producto_packs`, no solo al pack 1:1 de variante
- Buscador de lista de precios: label Pack xN

### Impacto en Flujos de Trabajo Existentes

- Carnicería / despensa con un six-pack en la variante: sin cambio (auto-pack sigue).
- Distribuidora: se deja de usar el toggle “Activar pack” por variante; se usan N packs del producto.
- Catálogo: líneas pack son otro ítem; stock al confirmar = unidades × tamaño.

---

## Lista de Validación

- [x] Coca 2,25: unidad + Pack x8 + Caja x24, cada uno con precio y (opcional) foto.
- [x] Tramo 3× pack x8 10 %: 2 packs = lista; 3 packs = −10 %; se ve “Dto. −10 %” en ficha, carrito y POS.
- [x] Tramo de **unidades** no aplica al vender packs (y viceversa).
- [x] Buscador: tres filas claras (unidad / Pack x8 / Pack x24). Escanear código de pack agrega pack, no unidad.
- [x] 24 unidades sueltas **no** se convierten solas a caja ni a 3 fardos.
- [x] Desde 24 unidades, “Pasar a pack…” permite x24 o x8.
- [x] Catálogo vende pack; POST ignora precio client; stock al convertir descuenta 8 o 24 por pack.
- [x] Rubro con un solo pack de variante: auto-pack sigue igual.
- [x] `CLAUDE.md` actualizado.
- [x] Tests de packs/tramos/auto en verde.

---

## Criterios de Éxito

1. El piloto carga Coca 2,25 con los packs que quiera y vende unidad o cualquier pack desde POS y catálogo.
2. Los descuentos “a partir de N packs” se ven y se cobran bien, sin mezclar tamaños.
3. El cajero no se confunde: el buscador dice Pack xN y nada se convierte solo si hay más de un bulto.

---

## Notas

- Aplicar la migración en Supabase antes de probar en el tenant.
- No es lista de precios por cliente.
- Print de remito/ticket: el nombre de línea ya trae “Pack x8” en el snapshot; no hace falta rediseñar tickets.
- Cajero hablado (otro plan): después podrá decir “tres packs de ocho”; fuera de este alcance.

---

## Notas de Implementación

**Implementado:** 2026-08-21

### Resumen

Packs N por producto (`producto_packs` + tramos por pack), editor en el producto, fotos, POS con etiquetas `Pack xN` y “Pasar a pack…”, catálogo con selector de presentación. Auto-pack solo si hay un tamaño. Snapshot `pack_id` / `pack_unidades` en ítems de pedido.

### Desviaciones del Plan

- `CodigoDesconocidoModal` no asocia códigos a `producto_packs` (sigue el pack 1:1 de variante). Se puede cargar el código en el editor de packs.
- El editor N-packs se muestra en todos los rubros con `usarPack`, no solo distribuidora. El toggle 1:1 de variante se oculta en distribuidora.

### Problemas Encontrados

Ninguno bloqueante. Hay que aplicar la migración `20260822000001_producto_packs_multiples.sql` en Supabase antes de probar.

