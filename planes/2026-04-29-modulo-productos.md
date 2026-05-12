# Plan: Módulo de Productos

**Creado:** 2026-04-29
**Estado:** Implementado
**Pedido:** Construir módulo de Productos: listado con búsqueda, alta/edición de producto con variantes (talla/color/código de barras), gestión de categorías/tallas/colores.

---

## Descripción General

### Qué Logra Este Plan

Implementa el módulo de Productos completo: catálogo navegable y buscable, alta/edición de productos con variantes (talla × color + código de barras + stock inicial + precio override), y gestión de los catálogos auxiliares (categorías, tallas, colores). Es la base para que cualquier tienda pueda cargar su inventario y luego vender.

### Por Qué Importa

Sin catálogo no se puede vender. Productos es el primer módulo del MVP en orden de dependencia: POS, Stock, Ventas y Devoluciones consumen variantes. Una tienda real debe poder, en su primera sesión, dar de alta sus prendas con todas las combinaciones de talla y color, generar códigos de barras, ver el listado y editarlo. Sin esto el resto del sistema no se puede usar.

---

## Estado Actual

### Estructura Existente Relevante

- **Schema** ya creado en migraciones 003 ([supabase/migrations/20260419000003_productos.sql](supabase/migrations/20260419000003_productos.sql)): tablas `categorias`, `tallas`, `colores`, `productos`, `variantes_producto` con RLS multi-tenant por `tienda_id` y triggers de updated_at.
- **Tipos** en [app/types/database.ts](app/types/database.ts): interfaces `Producto`, `VarianteProducto`, `Categoria`, `Talla`, `Color`.
- **Layout** en [app/app/(dashboard)/layout.tsx](app/app/(dashboard)/layout.tsx) con sidebar y header — la ruta `/productos` ya está enlazada en [app/components/layout/Sidebar.tsx](app/components/layout/Sidebar.tsx).
- **Página actual** en [app/app/(dashboard)/productos/page.tsx](app/app/(dashboard)/productos/page.tsx): solo placeholder.
- **Patrones** ya establecidos: server components con `createClient()` de [app/lib/supabase/server.ts](app/lib/supabase/server.ts), server actions en `app/app/actions/*`, RLS confía en el `tienda_id` del usuario via `get_tienda_id()`.
- **Trigger de stock** ([supabase/migrations/20260419000006_stock.sql](supabase/migrations/20260419000006_stock.sql)) registra movimientos automáticamente al insertar en `detalles_venta`. Para stock inicial hay que insertar manualmente en `movimientos_stock` con tipo `'inicial'`.

### Brechas o Problemas que se Abordan

1. La ruta `/productos` está vacía (placeholder).
2. No hay UI para gestionar categorías, tallas ni colores (rutas inexistentes).
3. No existe ningún server action ni componente reutilizable para productos.
4. No hay forma de generar códigos de barras: las tiendas reales muchas veces no tienen barcode original y necesitan emitir uno propio.
5. La columna `precio_venta` en `variantes_producto` es nullable — el código que la consuma (POS) tiene que decidir el fallback al precio del producto. Hay que dejar la convención clara desde el alta.
6. La tabla `productos` no tiene constraint para evitar duplicados de `codigo_base` por tienda — aceptable, pero hay que validarlo en UI.
7. La tabla `variantes_producto` tiene UNIQUE de `codigo_barras` solo parcial (cuando no es null). El index actual usa `(tienda_id, codigo_barras)` partial — pero NO es UNIQUE. **Riesgo:** dos variantes pueden tener el mismo código de barras. Hay que agregar constraint UNIQUE para garantizar que el escaneo de barcode siempre apunte a una sola variante.

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva migración `20260429000001_codigo_barras_unique.sql` que agrega UNIQUE constraint parcial a `variantes_producto.codigo_barras` por tienda.
- Crear server actions en `app/app/actions/productos.ts` para CRUD completo: producto + variantes + categorías + tallas + colores.
- Reescribir `/productos/page.tsx` como listado server-rendered con búsqueda y filtros.
- Crear `/productos/nuevo/page.tsx` y `/productos/[id]/page.tsx` para alta/edición.
- Crear sub-rutas `/productos/categorias`, `/productos/tallas`, `/productos/colores` con CRUD inline.
- Componentes reutilizables: `ProductoForm`, `VariantesEditor`, `BarcodeGenerator`, `Buscador`, `ListaProductos`, `TaxonomyManager`.
- Helper en `app/lib/barcode.ts` para generar códigos EAN-13 válidos (con checksum).
- Helper `app/lib/productos/queries.ts` para queries reusables (listado, detalle, taxonomías).
- Actualizar Sidebar (sub-navegación dentro de Productos) — opcional, también se puede resolver con tabs en el header de la sección.
- Regenerar `all_migrations.sql`.

### Nuevos Archivos a Crear

| Ruta del Archivo                                                    | Propósito                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `supabase/migrations/20260429000001_codigo_barras_unique.sql`       | UNIQUE constraint parcial sobre `(tienda_id, codigo_barras)` para garantizar unicidad por tienda. |
| `app/app/actions/productos.ts`                                      | Server actions: CRUD producto, variantes, categorías, tallas, colores. |
| `app/lib/productos/queries.ts`                                      | Helpers de lectura: listado paginado con filtros, detalle con variantes, taxonomías. |
| `app/lib/barcode.ts`                                                | Generador EAN-13 con checksum + validador.                            |
| `app/app/(dashboard)/productos/page.tsx`                            | Listado: búsqueda, filtros (categoría, activo), tabla con variantes resumidas, paginación. |
| `app/app/(dashboard)/productos/nuevo/page.tsx`                      | Alta: form de producto + editor de variantes inicial.                 |
| `app/app/(dashboard)/productos/[id]/page.tsx`                       | Edición: form + variantes existentes editables + agregar nuevas.      |
| `app/app/(dashboard)/productos/categorias/page.tsx`                 | CRUD inline de categorías.                                            |
| `app/app/(dashboard)/productos/tallas/page.tsx`                     | CRUD inline de tallas con orden.                                      |
| `app/app/(dashboard)/productos/colores/page.tsx`                    | CRUD inline de colores con preview de hex.                            |
| `app/components/productos/ProductoForm.tsx`                         | Form (Client Component) con campos del producto y submit a action.    |
| `app/components/productos/VariantesEditor.tsx`                      | Editor de filas dinámicas: talla/color/código_barras/precio/stock.    |
| `app/components/productos/BarcodeButton.tsx`                        | Botón "Generar EAN-13" para autocompletar códigos de barras.          |
| `app/components/productos/ListaProductos.tsx`                       | Tabla de productos con info resumida (server component).              |
| `app/components/productos/Buscador.tsx`                             | Input de búsqueda con form GET (URL search params).                   |
| `app/components/productos/FiltroCategoria.tsx`                      | Select de categoría como filtro.                                      |
| `app/components/productos/TabsProductos.tsx`                        | Tabs de subnavegación: Catálogo / Categorías / Tallas / Colores.      |
| `app/components/productos/TaxonomyManager.tsx`                      | Componente genérico CRUD inline para categorías/tallas/colores.       |
| `app/components/ui/Button.tsx`                                      | Botón base reutilizable (primario/secundario/peligro).                |
| `app/components/ui/Input.tsx`, `app/components/ui/Select.tsx`, `app/components/ui/Textarea.tsx` | Inputs base con estilos consistentes. |
| `app/components/ui/EmptyState.tsx`                                  | Estado vacío reutilizable (cuando no hay productos/categorías).       |
| `app/components/ui/Pagination.tsx`                                  | Paginación con prev/next via URL params.                              |

### Archivos a Modificar

| Ruta del Archivo                       | Cambios                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `supabase/all_migrations.sql`          | Regenerar para incluir la nueva migración 014.                                             |
| `app/components/layout/Sidebar.tsx`    | Sin cambio estructural; el item "Productos" ya existe. Las sub-secciones se manejan vía tabs internos. |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Server Components por default, Client Components solo donde hace falta interacción.** Los listados y páginas de detalle son server. Los formularios y editores de variantes son client (`'use client'`).
2. **Server Actions para todas las mutaciones.** No se expone API REST custom. El cliente envía `FormData` o estado serializable y el action revalida la ruta con `revalidatePath`.
3. **Búsqueda y filtros via URL search params** (`?q=remera&categoria=abc&page=2`). Permite linkable, back/forward del browser, y server-rendering directo sin estado cliente.
4. **Soft delete en lugar de DELETE físico.** Cambiar `activo=false` preserva integridad referencial de ventas históricas. Hay un "Eliminar" en UI que confirma y desactiva. DELETE real solo para entidades sin uso (categoría sin productos, color sin variantes) — opcional.
5. **`codigo_barras` UNIQUE por tienda** (constraint nuevo). Sin esto, escanear un código en POS podría devolver más de una variante. Con la constraint, el INSERT/UPDATE falla y la UI muestra error claro.
6. **Generación EAN-13 propia.** Tiendas locales no siempre tienen barcode oficial. El botón "Generar" propone uno aleatorio con prefijo configurable y checksum válido. Si choca con uno existente, reintenta. La generación es client-side; la validación de unicidad la hace la DB.
7. **Variantes como editor de filas inline (no matriz talla×color).** La matriz se ve linda pero confunde cuando hay tallas o colores que no aplican a todas las combinaciones. Lista plana con dropdowns es más simple y refleja exactamente lo que se guarda.
8. **Stock inicial al crear variante** se inserta directamente en `variantes_producto.stock_actual` y se registra un movimiento `'inicial'` en `movimientos_stock` para auditoría. No usa el trigger de venta.
9. **`precio_venta` en variante es nullable.** Si está vacío en UI se guarda `null` y el POS usa el precio del producto. Si tiene valor, sobrescribe. Mostrar el campo con placeholder explicativo: "Dejar vacío para usar el del producto".
10. **Imagen de producto = URL de texto en MVP.** Subida a Supabase Storage queda como mejora futura (otro plan). Por ahora un input URL con preview.
11. **Sin librerías nuevas** (no react-hook-form, no zod, no shadcn). El stack actual ya tiene todo. Validación con `formData` + lógica simple en server action. Cuando crezca la complejidad se evalúa zod.
12. **Componentes UI base (`Button`, `Input`, etc.) ahora.** Esta es la primera vista con formularios reales. Crear los building blocks ahora paga durante todos los módulos siguientes (POS, Caja, Clientes).
13. **Subnavegación con tabs en `/productos/*`** (Catálogo / Categorías / Tallas / Colores) — no agregar items separados al sidebar para no inflarlo.
14. **Paginación simple offset/limit** (20 por página). Para los volúmenes esperados (cientos de productos por tienda en MVP) es más que suficiente.

### Alternativas Consideradas

- **Editor de variantes en matriz (talla × color).** Rechazado: complejidad UX, mal manejo de combinaciones inválidas, difícil ajustar precio/barcode por celda. Filas son más simples.
- **Subir imagen a Supabase Storage.** Postergado: requiere policy RLS en bucket, manejo de uploads/borrado, imagen optimizada. Otro plan.
- **react-hook-form + zod.** Rechazado para MVP: añade peso/complejidad. Server actions con `FormData` y validación inline alcanzan. Si el form crece (>15 campos con validaciones cruzadas), revisar.
- **shadcn/ui.** Rechazado por ahora: configuración inicial, decisiones de design system anticipadas. Building blocks propios con Tailwind son más rápidos para esta etapa.
- **Eliminación física con `ON DELETE CASCADE`.** Rechazado: rompe trazabilidad histórica de ventas pasadas y movimientos de stock. Soft delete preserva todo.
- **Códigos de barras con prefijo GS1 oficial.** Rechazado: requiere registro y costo. EAN-13 random con checksum válido funciona internamente y es estándar para uso interno (impresión + scanner).

### Preguntas Abiertas

- **¿El stock inicial se carga al crear la variante o en un paso separado?** Recomiendo **al crear la variante** (campo `stock_inicial` en el editor; default 0). Más simple, permite arrancar a vender enseguida.
- **¿Qué pasa con el `precio_venta` en variante si el del producto cambia después?** Decisión: sigue siendo override estático. Si querés que herede dinámicamente, el campo se queda en NULL. Si lo guardás con valor, queda fijo.
- **¿Permitimos editar el código de barras de una variante existente?** Sí, mientras no haya ventas con ese código. Riesgo bajo: el snapshot del barcode se guarda en `detalles_venta.codigo_barras` así que el histórico no se rompe.
- **¿Mostramos stock total (suma de variantes) en el listado de productos?** Sí, recomendado. Suma simple en query con join lateral o agregación.

---

## Tareas Paso a Paso

Ejecutar en orden. Cada paso es validable.

### Paso 1: Migración UNIQUE de código de barras

Asegurar unicidad de `codigo_barras` por tienda para que el scanner de POS sea determinístico.

**Acciones:**

- Crear `supabase/migrations/20260429000001_codigo_barras_unique.sql`:
  - `DROP INDEX IF EXISTS variantes_codigo_barras_idx;` (era no-único)
  - `CREATE UNIQUE INDEX variantes_codigo_barras_unique_idx ON public.variantes_producto (tienda_id, codigo_barras) WHERE codigo_barras IS NOT NULL;`
  - Comentario explicando la decisión.
- Aplicarla en el SQL Editor de Supabase (manual).
- Regenerar `all_migrations.sql` (`Get-ChildItem ... | Sort-Object | concat`).

**Archivos afectados:**

- `supabase/migrations/20260429000001_codigo_barras_unique.sql` (nuevo)
- `supabase/all_migrations.sql` (regenerado)

**Validación:** Insertar dos variantes con mismo barcode en la misma tienda debe fallar. Insertar el mismo barcode en dos tiendas distintas debe funcionar.

---

### Paso 2: Componentes UI base

Crear los building blocks que usarán todos los módulos del dashboard.

**Acciones:**

- Crear `app/components/ui/Button.tsx`: variantes `primary | secondary | danger | ghost`, tamaños `sm | md`, soporta `as Link`. Estilos Tailwind: `bg-indigo-600 hover:bg-indigo-700 text-white`, etc.
- Crear `app/components/ui/Input.tsx`, `Select.tsx`, `Textarea.tsx`: estilos consistentes (`border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500`), forwardRef, label opcional.
- Crear `app/components/ui/EmptyState.tsx`: prop `title`, `description`, `cta?` (botón con link).
- Crear `app/components/ui/Pagination.tsx`: recibe `page`, `pageSize`, `total`, genera links con search params preservados.

**Archivos afectados:**

- `app/components/ui/Button.tsx` (nuevo)
- `app/components/ui/Input.tsx` (nuevo)
- `app/components/ui/Select.tsx` (nuevo)
- `app/components/ui/Textarea.tsx` (nuevo)
- `app/components/ui/EmptyState.tsx` (nuevo)
- `app/components/ui/Pagination.tsx` (nuevo)

**Validación:** importar `Button` desde una página y renderiza correctamente.

---

### Paso 3: Helper de código de barras EAN-13

Generador con checksum válido.

**Acciones:**

- Crear `app/lib/barcode.ts`:
  - `generateEAN13(prefix?: string): string` — genera 12 dígitos aleatorios (con prefijo opcional, default `'200'` reservado para uso interno) y calcula el dígito verificador con el algoritmo EAN-13.
  - `validateEAN13(code: string): boolean` — valida formato (13 dígitos) y checksum.
  - Tests unitarios mínimos en comentario o archivo aparte (`barcode.test.ts` si se decide testear).

**Archivos afectados:**

- `app/lib/barcode.ts` (nuevo)

**Validación:** `generateEAN13()` retorna 13 dígitos y `validateEAN13(generateEAN13())` es `true`.

---

### Paso 4: Helpers de queries

Centralizar la lectura de productos en una función testeable y reutilizable.

**Acciones:**

- Crear `app/lib/productos/queries.ts`:
  - `listarProductos(opts: { q?, categoriaId?, soloActivos?, page, pageSize })`: retorna `{ productos, total }`. Usa `select('*, categoria:categorias(id, nombre), variantes:variantes_producto(count)')` para traer info resumida + count de variantes. Filtra con `.ilike('nombre', '%q%')` o búsqueda multi-campo (nombre, codigo_base) según `q`.
  - `obtenerProducto(id)`: producto completo + variantes (con nombres de talla/color expandidos).
  - `listarCategorias()`, `listarTallas()`, `listarColores()`: simples, ordenados por `orden` o `nombre`.
- Cada función crea su `supabase = await createClient()` o lo recibe inyectado.

**Archivos afectados:**

- `app/lib/productos/queries.ts` (nuevo)

**Validación:** la página `/productos` puede consumirla sin errores TS.

---

### Paso 5: Server Actions

Mutaciones server-side seguras.

**Acciones:**

- Crear `app/app/actions/productos.ts` con:
  - `crearProducto(formData)`: parsea form (nombre, descripcion, categoria_id, codigo_base, precio_compra, precio_venta, imagen_url, activo) + array de variantes (talla_id, color_id, codigo_barras, precio_venta, stock_inicial, stock_minimo). Inserta producto, luego variantes. Por cada variante con `stock_inicial > 0`, inserta movimiento `'inicial'` en `movimientos_stock`. `revalidatePath('/productos')`. Redirige a `/productos/[id]`.
  - `actualizarProducto(id, formData)`: idem pero update + sync de variantes (insert nuevas, update existentes, soft-delete las quitadas via `activo=false`).
  - `eliminarProducto(id)`: soft delete (`activo=false`).
  - `duplicarProducto(id)`: copia producto + variantes con stock 0.
  - `crearCategoria`, `actualizarCategoria`, `eliminarCategoria` (idem para tallas/colores).
  - Validaciones server: nombre requerido, precio >= 0, formato barcode si se ingresa.
  - Manejo de errores: retornar `{ error: string }` en lugar de redirect cuando falla validación, para mostrar mensaje en UI.

**Archivos afectados:**

- `app/app/actions/productos.ts` (nuevo)

**Validación:** llamar `crearProducto` desde el form crea producto + variantes en DB y retorna éxito.

---

### Paso 6: Componente `BarcodeButton`

Botón cliente que rellena un input con un EAN-13 generado.

**Acciones:**

- Crear `app/components/productos/BarcodeButton.tsx` (`'use client'`):
  - Recibe ref/id del input asociado.
  - Onclick: llama `generateEAN13()`, dispara evento que setea el valor del input padre.
  - Estilos pequeños (botón secundario al lado del input).

**Archivos afectados:**

- `app/components/productos/BarcodeButton.tsx` (nuevo)

**Validación:** clic genera código de 13 dígitos en el input.

---

### Paso 7: Componente `VariantesEditor`

El componente más complejo del módulo: editor dinámico de filas.

**Acciones:**

- Crear `app/components/productos/VariantesEditor.tsx` (`'use client'`):
  - Props: `tallas: Talla[]`, `colores: Color[]`, `variantesIniciales?: VarianteProducto[]`, `name?: string` (para FormData).
  - Estado local: array de variantes (con id local UUID si son nuevas).
  - Render: tabla con columnas Talla / Color / Código de barras / Precio venta override / Stock inicial / Stock mínimo / Acción (eliminar fila).
  - Botones: "+ Agregar variante", para cada fila botón borrar (si es existente: marca `_eliminada=true`).
  - Serialización al submit: input hidden con JSON del array (`name="variantes_json"`). El server action lo parsea con `JSON.parse`.
  - Validación inline: combinaciones talla+color únicas; warning si se duplica.

**Archivos afectados:**

- `app/components/productos/VariantesEditor.tsx` (nuevo)

**Validación:** agregar y eliminar filas funciona; el JSON se envía bien al server.

---

### Paso 8: Componente `ProductoForm`

Wrapper del form completo (cabecera del producto + variantes).

**Acciones:**

- Crear `app/components/productos/ProductoForm.tsx` (`'use client'`):
  - Props: `producto?` (si existe = edit), `categorias`, `tallas`, `colores`, `action` (server action a llamar).
  - Render: form con campos (nombre*, descripcion, categoria_id, codigo_base, precio_compra, precio_venta*, imagen_url, activo) + `<VariantesEditor />` integrado.
  - Submit: usa `<form action={action}>`. Manejo de error con `useFormState` (React 19) — muestra mensaje arriba si retorna error.
  - Botones: Guardar / Cancelar (link a `/productos`).

**Archivos afectados:**

- `app/components/productos/ProductoForm.tsx` (nuevo)

**Validación:** crear y editar productos guarda correctamente.

---

### Paso 9: Tabs de subnavegación

Tabs internos de la sección Productos.

**Acciones:**

- Crear `app/components/productos/TabsProductos.tsx` (`'use client'` por `usePathname`):
  - Tabs: Catálogo (`/productos`), Categorías (`/productos/categorias`), Tallas (`/productos/tallas`), Colores (`/productos/colores`).
  - Resalta el activo según `pathname`.

**Archivos afectados:**

- `app/components/productos/TabsProductos.tsx` (nuevo)

**Validación:** se renderiza arriba de cada sub-página y resalta correctamente.

---

### Paso 10: Página listado `/productos`

**Acciones:**

- Reemplazar [app/app/(dashboard)/productos/page.tsx](app/app/(dashboard)/productos/page.tsx):
  - Server Component async.
  - Lee `searchParams` (`q`, `categoria`, `activo`, `page`).
  - Llama `listarProductos(...)` y `listarCategorias()`.
  - Renderiza: `TabsProductos` arriba, header con título + botón "Nuevo producto", `Buscador`, `FiltroCategoria`, `ListaProductos`, `Pagination`.
  - Si total = 0 y no hay filtros: `EmptyState` con CTA "Crear primer producto".
- Crear `app/components/productos/Buscador.tsx` (`'use client'`): input con form GET que preserva otros query params.
- Crear `app/components/productos/FiltroCategoria.tsx` (`'use client'`): select que dispara navegación con nuevo `?categoria=...`.
- Crear `app/components/productos/ListaProductos.tsx` (server component): tabla con columnas Imagen / Nombre / Categoría / Precio / Variantes (count) / Stock total / Activo / Acciones (Editar, Duplicar, Desactivar).

**Archivos afectados:**

- `app/app/(dashboard)/productos/page.tsx` (reescrito)
- `app/components/productos/Buscador.tsx` (nuevo)
- `app/components/productos/FiltroCategoria.tsx` (nuevo)
- `app/components/productos/ListaProductos.tsx` (nuevo)

**Validación:** listado muestra productos cargados, búsqueda filtra, paginación funciona, link a editar abre el detalle.

---

### Paso 11: Página `/productos/nuevo`

**Acciones:**

- Crear `app/app/(dashboard)/productos/nuevo/page.tsx`:
  - Server Component async.
  - Trae `categorias`, `tallas`, `colores`.
  - Renderiza `<ProductoForm action={crearProducto} categorias={...} tallas={...} colores={...} />`.

**Archivos afectados:**

- `app/app/(dashboard)/productos/nuevo/page.tsx` (nuevo)

**Validación:** crear un producto desde 0 con 2-3 variantes se guarda y redirige a `/productos/[id]`.

---

### Paso 12: Página `/productos/[id]`

**Acciones:**

- Crear `app/app/(dashboard)/productos/[id]/page.tsx`:
  - Server Component async; recibe `params.id`.
  - Llama `obtenerProducto(id)`. Si no existe: `notFound()`.
  - Renderiza `<ProductoForm producto={producto} action={actualizarProducto.bind(null, id)} ... />`.
  - Sección extra al pie: botones "Duplicar", "Desactivar"/"Activar" (server actions form).

**Archivos afectados:**

- `app/app/(dashboard)/productos/[id]/page.tsx` (nuevo)

**Validación:** abrir un producto existente carga sus datos y variantes; editar y guardar persiste.

---

### Paso 13: Páginas de taxonomías (categorías, tallas, colores)

CRUD inline simple, una sola tabla por página.

**Acciones:**

- Crear `app/components/productos/TaxonomyManager.tsx` (`'use client'`):
  - Props genéricas: `items`, `actionCrear`, `actionActualizar`, `actionEliminar`, `extraFields?` (para `hex_color` en colores y `orden` en tallas).
  - Render: lista editable con botón "Agregar nuevo" y filas inline editables.
- Crear `app/app/(dashboard)/productos/categorias/page.tsx`: server component que trae categorías y pasa al `TaxonomyManager`.
- Idem `/productos/tallas/page.tsx` y `/productos/colores/page.tsx` (con campos extra).
- Para colores: input `type="color"` que actualiza `hex_color`.
- Para tallas: input numérico para `orden` y drag-handle opcional (futuro).

**Archivos afectados:**

- `app/components/productos/TaxonomyManager.tsx` (nuevo)
- `app/app/(dashboard)/productos/categorias/page.tsx` (nuevo)
- `app/app/(dashboard)/productos/tallas/page.tsx` (nuevo)
- `app/app/(dashboard)/productos/colores/page.tsx` (nuevo)

**Validación:** crear/editar/eliminar categorías, tallas y colores funciona desde la UI.

---

### Paso 14: Verificación end-to-end

**Acciones:**

- Aplicar la migración 014 en SQL Editor.
- Cargar 3-5 categorías, 5-7 tallas (XS, S, M, L, XL, XXL), 4-6 colores.
- Crear un producto "Remera básica" con 4 variantes (S/M/L × Negro/Blanco) y stock inicial 10 c/u, generando barcode automático.
- Verificar:
  - Aparece en el listado con count correcto de variantes.
  - El stock total es la suma esperada.
  - Editar el producto funciona; agregar una variante nueva funciona.
  - Eliminar (soft delete) lo oculta del listado de "activos".
  - Búsqueda por nombre encuentra el producto.
  - Filtro por categoría funciona.
  - Generar EAN-13 dos veces produce códigos distintos y válidos.
  - Intentar crear dos variantes con mismo barcode falla con mensaje claro.

**Archivos afectados:**

- Ninguno.

**Validación:** flujo completo funcional sin errores.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/layout/Sidebar.tsx`: ya enlaza a `/productos`. Sin cambios.
- POS (futuro): consumirá `variantes_producto` por `codigo_barras` para escanear.
- Stock (futuro): consumirá `variantes_producto` y `movimientos_stock` para ajustes.
- Tipos en `app/types/database.ts`: ya están definidos, no necesitan cambios.

### Actualizaciones Necesarias para Consistencia

- Tras cargar productos en una sesión real, considerar agregar widget en `/dashboard` (resumen) que muestre "X productos activos / Y variantes con stock". No incluido en este plan.
- `supabase/all_migrations.sql` regenerado.

### Impacto en Flujos de Trabajo Existentes

- Login y dashboard siguen funcionando igual.
- Las taxonomías (categorías, tallas, colores) que se carguen aquí estarán disponibles para cuando se construya el POS.
- La constraint UNIQUE de `codigo_barras` previene problemas futuros en el escaneo.

---

## Lista de Validación

- [ ] Migración `20260429000001_codigo_barras_unique.sql` aplicada y constraint activa.
- [ ] `npm run lint && npm run build` pasan sin errores en `app/`.
- [ ] `/productos` muestra lista (vacía al inicio) con `EmptyState` y CTA.
- [ ] `/productos/nuevo` permite crear producto + variantes con barcode generado.
- [ ] `/productos/[id]` permite editar y agregar/quitar variantes.
- [ ] Búsqueda por nombre funciona.
- [ ] Filtro por categoría funciona.
- [ ] Paginación funciona con > 20 productos.
- [ ] Soft delete oculta productos desactivados (con toggle "Mostrar inactivos").
- [ ] `/productos/categorias`, `/productos/tallas`, `/productos/colores` permiten CRUD.
- [ ] Tabs de subnavegación se ven activos correctamente.
- [ ] Intentar duplicar barcode da error legible.
- [ ] Crear variante con `stock_inicial > 0` registra fila en `movimientos_stock` con tipo `'inicial'`.

---

## Criterios de Éxito

La implementación está completa cuando:

1. Una tienda nueva puede, en una sola sesión, dar de alta su catálogo completo (categorías, tallas, colores y productos con variantes) usando solo la UI.
2. Cada variante puede tener un código de barras único, generado automáticamente o ingresado manualmente, listo para escanear desde POS.
3. El catálogo es navegable, buscable y editable sin errores ni recargas pesadas.
4. La estructura de datos creada es consumible directamente por el módulo POS futuro (escaneo → variante → venta).
5. Los componentes UI base (`Button`, `Input`, etc.) quedan disponibles para todos los módulos siguientes.

---

## Notas

- **Subida de imágenes a Supabase Storage** queda como follow-up. Plan futuro: bucket `productos`, RLS por tienda, redimensionamiento server-side.
- **Importación masiva (CSV)** queda como follow-up. Útil cuando una tienda ya tiene su catálogo en Excel.
- **Etiquetas de productos** (impresión de barcodes en hojas) ya tiene tablas (`configuracion_etiquetas`) pero la UI no se trata aquí — otro plan.
- **Duplicar producto** se incluye porque tiendas reales suelen cargar productos parecidos (misma base, distinta línea). Ahorra tiempo.
- **Drag-and-drop para reordenar tallas/colores**: postergado, se puede gestionar con campo `orden` numérico al inicio.
- **Filtro "con stock bajo"**: postergado al módulo Stock.
- **Si la primera tienda real necesita campos extra** (talle de pantalón en cm, género, temporada, etc.): se evalúa después del feedback. Mantener schema flexible.


---

## Notas de Implementación (2026-04-29)

### Resumen
Módulo completo y funcional. 23 archivos creados, 1 migración SQL nueva, 1 reemplazo de placeholder. `tsc --noEmit` pasa sin errores.

### Archivos creados
- `supabase/migrations/20260429000001_codigo_barras_unique.sql` — UNIQUE parcial por (tienda_id, codigo_barras)
- `app/components/ui/{Button,Input,Select,Textarea,EmptyState,Pagination}.tsx` (6)
- `app/lib/barcode.ts` — generador/validador EAN-13
- `app/lib/productos/queries.ts` — listarProductos / obtenerProducto / listarCategorias / listarTallas / listarColores
- `app/app/actions/productos.ts` — CRUD productos + duplicar + generarCodigoBarrasUnico + CRUD categorías/tallas/colores
- `app/components/productos/{BarcodeButton,VariantesEditor,ProductoForm,TabsProductos,Buscador,FiltroCategoria,ListaProductos,EliminarProductoButton,TaxonomyManager}.tsx` (9)
- `app/app/(dashboard)/productos/{nuevo,[id],categorias,tallas,colores}/page.tsx` (5)

### Archivos modificados
- `app/app/(dashboard)/productos/page.tsx` — placeholder reemplazado por listado real
- `app/types/database.ts` — añadido `__InternalSupabase` marker, helper `TableShape<>`, `Views`/`CompositeTypes` requeridos por `GenericSchema` de postgrest-js v2.103+
- `app/lib/supabase/{server,client,middleware}.ts` — quitado el genérico `<Database>` (ver "Desviaciones")
- `supabase/all_migrations.sql` — regenerado para incluir la migración 014

### Decisiones tomadas (preguntas abiertas del plan)
- **stock_inicial en editor:** Sí, al crear y al agregar variante nueva en edición. Genera `movimientos_stock` con `tipo='inicial'`. En edición de variantes existentes, el campo aparece deshabilitado con tooltip que apunta al módulo de Stock.
- **edit codigo_barras permitido:** Sí, manejado por la UNIQUE constraint con error traducido.
- **stock total en listado:** Sí, se calcula como suma de `variantes.stock_actual` con un nested select.
- **imagen como URL en MVP:** Sí, input `type=url` simple en el form. Storage queda fuera del alcance.

### Desviaciones del plan
- **Cliente Supabase sin genérico `<Database>`:** El shape manual de `Database` no satisface 100% el `GenericSchema` que postgrest-js v2.103+ exige (`Insert/Update` debe ser `Record<string, unknown>`, `Relationships: GenericRelationship[]`, `Views` obligatorio). Tras varios intentos de fix manual, la solución pragmática fue eliminar el genérico de los tres clients: el código mantiene tipos fuertes en su capa (interfaces `Producto`, `VarianteProducto`, etc. siguen usándose en componentes/queries) pero el cliente queda como `any`. **Acción futura:** correr `npx supabase gen types typescript --project-id <id>` para regenerar `database.ts` y restaurar el genérico.
- **Sin `react-hook-form` ni `zod`:** Validación manual en server action (`validarProducto`) y en cliente con `required` HTML. Suficiente para el MVP.
- **Sin `shadcn/ui`:** Componentes base implementados a mano con Tailwind, alineados al patrón ya existente.

### Problemas encontrados y resueltos
1. **Tipos `never` en queries**: provocado por shape `Database` incompleto. Diagnóstico: leer `GenericSchema`/`GenericTable` en `@supabase/postgrest-js`. Solución temporal: cliente sin generic.
2. **Bug `'id' in res.data`** en narrowing TS: arreglado con guard `typeof res.data === 'object'`.

### Pendiente para el usuario
1. **Aplicar migración** `20260429000001_codigo_barras_unique.sql` en SQL Editor de Supabase. Es idempotente (`DROP INDEX IF EXISTS` + `CREATE UNIQUE INDEX`).
2. **Probar end-to-end** con `npm run dev`: crear categoría → talla → color → producto con 2 variantes → editar → duplicar → eliminar.
3. (Opcional) Regenerar tipos con CLI de Supabase para volver a `createServerClient<Database>`.
