# Plan: Agilidad de Carga de Productos — Todos los Rubros

**Creado:** 2026-05-16
**Estado:** Borrador
**Pedido:** Mejorar la velocidad de carga de productos para todos los rubros del sistema (ropa, ferretería, corralón, despensa, carnicería, verdulería, farmacia, librería, genérico).

---

## Descripción General

### Qué Logra Este Plan

Introduce 6 mejoras concretas al flujo de creación/edición de productos que reducen la fricción operativa para todos los rubros. El impacto más visible es para ropa (generador matricial) y rubros sin variantes (modo producto simple). Se trabaja exclusivamente sobre componentes de frontend y server actions existentes, sin cambios de base de datos.

### Por Qué Importa

El proceso actual de cargar 50 productos en una tienda de ropa (con 4 tallas × 3 colores = 12 variantes cada uno) representa cientos de interacciones manuales. Para una despensa o farmacia, el sistema ni siquiera tiene un "modo simple" — obliga a crear una variante vacía aunque el producto no la tenga. Esto es una barrera real para el onboarding de nuevos clientes y la adopción diaria del sistema.

---

## Estado Actual

### Estructura Existente Relevante

| Archivo | Descripción |
|---------|-------------|
| `app/components/productos/ProductoForm.tsx` | Formulario principal de creación/edición |
| `app/components/productos/VariantesEditor.tsx` | Editor de variantes en tabla |
| `app/components/productos/Buscador.tsx` | Buscador con soporte de escaneo por código |
| `app/components/productos/BarcodeButton.tsx` | Genera un EAN-13 único por variante |
| `app/app/actions/productos.ts` | Server actions: `crearProducto`, `crearCategoria`, `crearTalla`, `crearColor`, `duplicarProducto`, `buscarProductoPorCodigoBarras` |
| `app/lib/rubro/config.ts` | Config por rubro: `labelVar1`, `labelVar2`, `usarVar1`, `usarVar2`, `unidadesDisponibles` |
| `app/app/(dashboard)/productos/nuevo/page.tsx` | Página de nuevo producto |
| `app/app/(dashboard)/productos/[id]/page.tsx` | Página de edición de producto |

### Lo Que Ya Funciona Bien

- `crearCategoria`, `crearTalla`, `crearColor` existen como server actions públicas ✅
- `duplicarProducto` ya existe como server action ✅
- `buscarProductoPorCodigoBarras` ya existe y el Buscador lo usa ✅
- El rubro ya controla si se usan var1/var2 y con qué labels ✅
- El backend soporta variantes con `talla_id: null` y `color_id: null` ✅

### Brechas que se Abordan

1. **Sin "Producto Simple"**: el form siempre muestra el editor de variantes completo. Para carnicería/verdulería/despensa/farmacia, crear un producto requiere gestionar una variante vacía.
2. **Sin generador matricial**: para ropa, cada variante (talla × color) se crea una por una.
3. **Sin Bulk Fill**: llenar precio/stock en 12 filas = 24 interacciones individuales.
4. **Sin creación inline**: si la categoría/talla/color no existe, hay que abandonar el formulario.
5. **Barcode-First incompleto**: el Buscador ya navega al producto si el código existe, pero si NO existe, no ofrece crear el producto con ese código.
6. **Sin botón Duplicar en UI**: la server action `duplicarProducto` existe pero no hay botón en la pantalla de edición.

---

## Cambios Propuestos

### Resumen de Cambios

- Agregar toggle "¿Tiene variantes?" en `ProductoForm` con modo simple (3 campos inline)
- Agregar sección "Generar desde matriz" en `VariantesEditor` con checkboxes de var1 × var2
- Agregar fila de Bulk Fill (precio, stock, generar códigos) sobre la tabla de variantes
- Crear componente `InlineCreate` reutilizable para crear categoría/talla/color sin salir del form
- Mejorar `Buscador`: si el código no existe → redirigir a `/productos/nuevo?codigo=XXXX`
- Leer `searchParams.codigo` en la página nuevo y pre-llenar el código en la primera variante
- Crear `DuplicarProductoButton` y agregarlo a la página de edición

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|-----------------|-----------|
| `app/components/productos/InlineCreate.tsx` | Componente reutilizable: input + botón confirmar que aparece bajo un Select para crear categoría, talla o color sin salir del formulario |
| `app/components/productos/DuplicarProductoButton.tsx` | Botón client-side que llama a `duplicarProducto` y navega al nuevo producto |
| `app/components/productos/MatrizGenerador.tsx` | UI de selección matricial: checkboxes var1 × var2 + botón "Generar N variantes" |
| `app/components/productos/BulkFill.tsx` | Fila de acciones masivas sobre la tabla de variantes: precio, stock, generar códigos |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|-----------------|---------|
| `app/components/productos/ProductoForm.tsx` | Toggle `tieneVariantes` + modo simple inline (código barras + stock + stock mínimo) + integrar `InlineCreate` para categoría |
| `app/components/productos/VariantesEditor.tsx` | Integrar `MatrizGenerador` + `BulkFill` + integrar `InlineCreate` para talla/color |
| `app/components/productos/Buscador.tsx` | Cuando `buscarProductoPorCodigoBarras` devuelve `null` → `router.push('/productos/nuevo?codigo='+q)` |
| `app/app/(dashboard)/productos/nuevo/page.tsx` | Leer `searchParams.codigo` y pasarlo a `ProductoForm` como `initialCodigoBarras` |
| `app/components/productos/ProductoForm.tsx` | Aceptar prop `initialCodigoBarras?: string` y pre-llenar en la variante inicial |
| `app/app/(dashboard)/productos/[id]/page.tsx` | Agregar `DuplicarProductoButton` junto a `EliminarProductoButton` |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Sin cambios de DB**: el backend ya soporta variantes sin talla/color (null). El modo simple es 100% frontend — en submit, inyecta una sola variante con los campos del modo simple.

2. **Modo simple por defecto según rubro**: `tieneVariantes` arranca en `true` para rubros con `usarVar1: true` (todos actualmente). Pero la lógica del toggle es independiente del rubro — cualquier rubro puede tener un producto simple si el usuario lo decide. Arranca en `true` para no romper el comportamiento actual.

3. **Generador matricial no-destructivo**: al generar la matriz, solo se AGREGAN las combinaciones nuevas. Las variantes ya cargadas no se tocan. Esto permite combinar carga manual + generación matricial.

4. **`InlineCreate` con server actions client-side**: usa `useTransition` + la server action pública correspondiente (`crearCategoria`, `crearTalla`, `crearColor`). El resultado se agrega localmente al array del Select (React state) sin refetch de página.

5. **Barcode-First con query param**: la URL `/productos/nuevo?codigo=XXXX` permite compartir el link y es la forma más limpia de pasar el dato al Server Component de la página.

6. **`DuplicarProductoButton` navega al nuevo producto**: tras duplicar, navega a `/productos/{nuevo-id}` para que el usuario pueda editar el nombre, agregar stock y terminar la carga.

7. **`BulkFill` no sobreescribe campos ya editados manualmente**: aplica el valor solo a las variantes donde el campo está vacío (null/0). Para "forzar sobre todas", se usa un checkbox "Aplicar aunque tengan valor".

### Alternativas Consideradas

- **Modal para InlineCreate**: descartado porque rompe el flujo de teclado y es más pesado para crear una sola entrada. El inline bajo el select es más directo.
- **Reimplementar VariantesEditor como tabla editable con ag-grid**: demasiado overhead. La tabla actual con inputs es suficiente, solo necesita las acciones masivas.
- **Integrar Open Food Facts API para auto-fill por EAN**: interesante para despensa/farmacia pero fuera de alcance de este plan.

### Preguntas Abiertas

- ¿El Bulk Fill debe sobreescribir siempre, o solo campos vacíos? (recomendación: sobreescribir siempre, más simple y predecible — confirmar con uso real)
- ¿La creación inline de color debe incluir el selector de hex? (recomendación: sí, un `<input type="color">` simple)

---

## Tareas Paso a Paso

### Paso 1: Modo Producto Simple en ProductoForm

Agregar un toggle visible al inicio del formulario. Cuando el usuario desactiva "¿Tiene variantes?", el `VariantesEditor` se oculta y aparecen 3 campos inline: código de barras, stock inicial, stock mínimo. Al hacer submit, se inyecta una variante con `talla_id: null`, `color_id: null` y esos valores.

**Cambios en `ProductoForm.tsx`:**
- Importar `useRubro` (ya usado) para obtener `usarVar1`
- Estado: `const [tieneVariantes, setTieneVariantes] = useState(true)`
- Estado: `const [simpleCodigoBarras, setSimpleCodigoBarras] = useState(initialCodigoBarras ?? '')`
- Estado: `const [simpleStock, setSimpleStock] = useState(0)`
- Estado: `const [simpleStockMinimo, setSimpleStockMinimo] = useState(0)`
- Agregar prop: `initialCodigoBarras?: string`
- En `handleSubmit`: si `!tieneVariantes`, usar `variantes = [{ talla_id: null, color_id: null, codigo_barras: simpleCodigoBarras || null, precio_venta: null, stock_inicial: simpleStock, stock_minimo: simpleStockMinimo }]`
- UI: checkbox/toggle labeled "Tiene variantes (tallas, colores, medidas...)" visible solo en modo crear
- Cuando `!tieneVariantes`: renderizar 3 `<Input>` en lugar del `<VariantesEditor>`

**Archivos afectados:**
- `app/components/productos/ProductoForm.tsx`

---

### Paso 2: Lectura de `?codigo=` en página de nuevo producto

La página `/productos/nuevo` es un Server Component. Debe leer el search param `codigo` y pasarlo a `ProductoForm`.

**Cambios en `nuevo/page.tsx`:**
- Agregar prop `searchParams: Promise<{ codigo?: string }>` a la función de página
- Leer `const sp = await searchParams` y extraer `sp.codigo`
- Pasar `initialCodigoBarras={sp.codigo}` al `<ProductoForm>`

**Cambios en `Buscador.tsx`:**
- En `onKeyDown`, cuando `buscarProductoPorCodigoBarras` devuelve `res.data === null`:
  ```
  router.push(`/productos/nuevo?codigo=${encodeURIComponent(q)}`)
  ```
- Agregar feedback visual opcional: mensaje "Código no encontrado — creando nuevo producto..."

**Archivos afectados:**
- `app/app/(dashboard)/productos/nuevo/page.tsx`
- `app/components/productos/Buscador.tsx`
- `app/components/productos/ProductoForm.tsx` (prop `initialCodigoBarras`)

---

### Paso 3: InlineCreate para Categoría, Talla y Color

Crear el componente `InlineCreate` y usarlo en `ProductoForm` (categoría) y `VariantesEditor` (talla/color).

**Interfaz de `InlineCreate`:**
```tsx
interface InlineCreateProps {
  label: string                          // "Nueva categoría", "Nueva talla", etc.
  onConfirm: (valor: string, extra?: string) => Promise<{ id: string; nombre: string } | null>
  placeholder?: string
  withColor?: boolean                    // si true, muestra input type="color" para hex
}
```

**Comportamiento:**
- Botón `+ Nueva` al lado derecho del Select
- Al hacer click: aparece un row inline (bajo el select) con input de texto + (si withColor) input tipo color + botón "Crear" + botón "Cancelar"
- Al confirmar: llama `onConfirm`, recibe el nuevo item, lo agrega al array local del Select, lo selecciona automáticamente, oculta el inline form
- Errores: muestra mensaje inline en rojo

**Uso en `ProductoForm.tsx` (categoría):**
- El componente padre tiene estado `categorias: Categoria[]` local (copia del prop + nuevas creadas)
- El `onConfirm` llama a `crearCategoria(valor)` y retorna el nuevo item si fue exitoso
- Se agrega a `categorias` local y se selecciona `categoriaId`

**Uso en `VariantesEditor.tsx` (talla y color):**
- El editor tiene estado local `tallasLocales` y `coloresLocales` (copias de los props)
- `onConfirm` para talla: llama `crearTalla(valor, 0)`
- `onConfirm` para color: llama `crearColor(valor, hex)`
- Al confirmarse, se agrega a la lista local y se auto-selecciona en la variante activa

**Archivos a crear:**
- `app/components/productos/InlineCreate.tsx`

**Archivos a modificar:**
- `app/components/productos/ProductoForm.tsx` — envolver Select de categoría con InlineCreate
- `app/components/productos/VariantesEditor.tsx` — envolver Select de talla/color con InlineCreate, manejar estado local de tallasLocales/coloresLocales

---

### Paso 4: Generador de Matriz en VariantesEditor

Agregar una sección colapsable "Generar desde matriz" arriba del editor de variantes individuales.

**Interfaz de `MatrizGenerador`:**
```tsx
interface MatrizGeneradorProps {
  tallas: Talla[]
  colores: Color[]
  labelVar1: string
  labelVar2: string
  usarVar2: boolean
  onGenerar: (combinaciones: { tallaId: string | null; colorId: string | null }[]) => void
}
```

**Comportamiento:**
- Sección con header "Generar desde matriz" + chevron para expandir/colapsar (colapsada por defecto)
- Dos columnas de checkboxes: una para tallas (labelVar1), otra para colores (labelVar2)
- Si `!usarVar2`: solo muestra la columna de var1
- "Seleccionar todas" en cada columna
- Counter: "X × Y = Z combinaciones"
- Botón "Generar Z variantes" (deshabilitado si 0 seleccionados)
- Al generar: emite via `onGenerar` solo las combinaciones que NO existen ya en la tabla
- Las combinaciones se agregan al array de variantes con precio=null, stock=0, stock_min=0, código=null

**Integración en `VariantesEditor.tsx`:**
- Importar y renderizar `<MatrizGenerador>` antes de la tabla
- En el callback `onGenerar`: hacer `emit([...variantes, ...nuevasCombinaciones])`

**Archivos a crear:**
- `app/components/productos/MatrizGenerador.tsx`

**Archivos a modificar:**
- `app/components/productos/VariantesEditor.tsx` — integrar MatrizGenerador

---

### Paso 5: Bulk Fill sobre la tabla de variantes

Agregar una fila de controles encima de la tabla de variantes para aplicar valores en masa.

**Interfaz de `BulkFill`:**
```tsx
interface BulkFillProps {
  variantesCount: number
  onAplicarPrecio: (precio: number) => void
  onAplicarStock: (stock: number) => void
  onGenerarCodigos: () => void
  generandoCodigos?: boolean
}
```

**UI:**
- Fila compacta con fondo gris-50, borde inferior: `"Aplicar a todas:"`
- Input numérico "Precio" + botón "→ Aplicar"
- Input numérico "Stock" + botón "→ Aplicar"
- Botón "🔢 Generar códigos para todas" (llama a `generarCodigoBarrasUnico` por cada variante sin código)

**Integración en `VariantesEditor.tsx`:**
- `onAplicarPrecio`: itera todas las variantes no-eliminadas y hace `update(i, { precio_venta: precio })`
- `onAplicarStock`: itera todas las variantes no-eliminadas y hace `update(i, { stock_inicial: stock })`
- `onGenerarCodigos`: llama `generarCodigoBarrasUnico()` en loop para las que tienen `codigo_barras: null`, usando `useTransition`

**Archivos a crear:**
- `app/components/productos/BulkFill.tsx`

**Archivos a modificar:**
- `app/components/productos/VariantesEditor.tsx` — integrar BulkFill, exponer callbacks

---

### Paso 6: Botón Duplicar en pantalla de edición

La server action `duplicarProducto` ya existe. Solo falta el componente UI.

**`DuplicarProductoButton.tsx`:**
- Client component con `useTransition`
- Botón "Duplicar producto" con ícono de copia
- Llama `duplicarProducto(id)`
- Si ok: `router.push('/productos/' + nuevoId)`
- Si error: muestra toast o mensaje inline

**Integración en `[id]/page.tsx`:**
- Importar `DuplicarProductoButton`
- Agregar `<DuplicarProductoButton id={producto.id} />` junto a `<EliminarProductoButton>`

**Archivos a crear:**
- `app/components/productos/DuplicarProductoButton.tsx`

**Archivos a modificar:**
- `app/app/(dashboard)/productos/[id]/page.tsx`

---

## Secuencia de Implementación Recomendada

Los pasos son independientes entre sí y pueden ejecutarse en cualquier orden, pero se recomienda:

```
Paso 1 (Modo Simple)
    → Paso 2 (Barcode-First, lee initialCodigoBarras del Paso 1)
    → Paso 3 (InlineCreate, mayor independencia)
    → Paso 4 (Matriz, dentro de VariantesEditor)
    → Paso 5 (BulkFill, dentro de VariantesEditor, puede ir con Paso 4)
    → Paso 6 (Duplicar, 100% independiente)
```

Pasos 4 y 5 pueden implementarse en paralelo ya que ambos son sub-componentes de `VariantesEditor`.

---

## Impacto por Rubro

| Mejora | Ropa | Ferretería | Despensa | Carnicería | Verdulería | Farmacia | Corralón | Librería |
|--------|:----:|:----------:|:--------:|:----------:|:----------:|:--------:|:--------:|:--------:|
| Paso 1 — Simple | — | ✅✅ | ✅✅✅ | ✅✅✅ | ✅✅✅ | ✅✅✅ | ✅✅ | ✅ |
| Paso 2 — Barcode-First | ✅ | ✅✅ | ✅✅✅ | — | — | ✅✅✅ | — | — |
| Paso 3 — InlineCreate | ✅✅ | ✅✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paso 4 — Matriz | ✅✅✅ | ✅ | — | — | — | — | — | ✅ |
| Paso 5 — BulkFill | ✅✅✅ | ✅ | — | — | — | — | — | — |
| Paso 6 — Duplicar | ✅✅ | ✅✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Estimación de Complejidad

| Paso | Archivos nuevos | Archivos modificados | Complejidad |
|------|:--------------:|:--------------------:|:-----------:|
| 1 — Modo Simple | 0 | 1 | Baja |
| 2 — Barcode-First | 0 | 2 | Baja |
| 3 — InlineCreate | 1 | 2 | Media |
| 4 — Matriz | 1 | 1 | Media |
| 5 — BulkFill | 1 | 1 | Baja |
| 6 — Duplicar | 1 | 1 | Baja |
| **Total** | **4** | **5** | **Media** |
