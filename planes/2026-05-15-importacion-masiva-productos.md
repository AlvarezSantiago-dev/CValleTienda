# Plan: Módulo de importación masiva de productos (CSV)

**Creado:** 2026-05-15
**Estado:** Borrador
**Pedido:** Construir el módulo de importación completo: UI + parser CSV + Server Action con inserción en Supabase

---

## Descripción General

### Qué Logra Este Plan

Agrega una nueva ruta `/productos/importar` con una interfaz completa que permite subir un archivo CSV, previsualizar las filas parseadas con advertencias/errores por fila, y confirmar la importación masiva. El servidor valida cada fila, resuelve categorías/tallas/colores por nombre (creándolos si no existen), y llama a `crearProducto()` por cada producto agrupado del CSV.

### Por Qué Importa

La migración desde sistemas anteriores puede tener cientos o miles de productos. Sin este módulo, el cliente debe cargarlos uno a uno. Es un requisito crítico de onboarding para clientes nuevos con stock existente.

---

## Estado Actual

### Estructura Existente Relevante

- `app/app/(dashboard)/productos/` — ruta raíz de productos con subrutas `nuevo/`, `categorias/`, `tallas/`, `colores/`
- `app/app/actions/productos.ts` — Server Actions `crearProducto()`, `editarProducto()` con validación robusta
- `app/components/productos/TabsProductos.tsx` — tabs de navegación del módulo, fácil de extender
- `app/lib/productos/queries.ts` — `listarCategorias()`, `listarTallas()`, `listarColores()`
- `app/types/database.ts` — interfaces `Producto`, `VarianteProducto`, `Categoria`, `Talla`, `Color`
- `app/components/ui/` — Button, Input, Select, etc. disponibles

### Brechas o Problemas que se Abordan

- No existe ninguna funcionalidad de importación CSV/Excel en el sistema
- El onboarding de clientes con stock existente requiere carga manual producto por producto
- No hay plantilla oficial de cómo entregar los datos al sistema

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva ruta `/productos/importar` (page + layout mínimo)
- Nuevo componente cliente `ImportadorCSV` con 3 pasos: subir → previsualizar → confirmar
- Nueva Server Action `importarProductosCSV()` en `actions/productos.ts`
- Nueva función `resolverOCrearTaxonomia()` en `lib/productos/queries.ts`
- Nuevo tab "Importar" en `TabsProductos.tsx`
- Plantilla CSV de ejemplo en `public/plantilla-importacion-productos.csv`

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/app/(dashboard)/productos/importar/page.tsx` | Server component: carga tallas/colores/categorías y renderiza el componente cliente |
| `app/components/productos/ImportadorCSV.tsx` | Componente cliente con flujo de 3 pasos: subir, previsualizar, confirmar |
| `app/components/productos/ImportPreviewTable.tsx` | Tabla de previsualización de filas parseadas con estado por fila (ok/warning/error) |
| `public/plantilla-importacion-productos.csv` | Plantilla CSV descargable con datos de ejemplo y todos los campos |

### Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `app/app/actions/productos.ts` | Agregar `importarProductosCSV()` y tipos `FilaCSVImport`, `ResultadoImportacion` |
| `app/lib/productos/queries.ts` | Agregar `resolverOCrearCategoria()`, `resolverOCrearTalla()`, `resolverOCrearColor()` |
| `app/components/productos/TabsProductos.tsx` | Agregar tab "Importar" con key `'importar'` |

---

## Decisiones de Diseño

1. **CSV en lugar de XLSX**: No requiere dependencias NPM. El parsing se hace en el cliente con `FileReader` + split por líneas. Evita añadir `xlsx`/`exceljs` al bundle.

2. **Parsing en el cliente, validación en el servidor**: El cliente parsea y muestra la preview. El servidor re-valida todo independientemente antes de insertar (nunca confiar en el cliente).

3. **Una fila = una variante**: Productos con múltiples variantes se agrupan por `codigo_base` (o por `nombre` si no hay código). Esto permite importar Remera M/L/XL con 3 filas del mismo `codigo_base`.

4. **Resolución de taxonomía por nombre**: Si una fila trae `categoria = "Pantalones"` y no existe, se crea automáticamente. Idem tallas y colores. Si la tienda ya tiene el nombre, reutiliza el existente.

5. **Importación en transacción por producto**: Si una variante falla, todo ese producto se marca como error pero los demás continúan. No se usa una transacción global para no bloquear una importación grande por un error puntual.

6. **Flujo de 3 pasos en UI**: Subir → Preview con errores → Confirmar. El usuario puede corregir el CSV y volver a subir antes de confirmar. Esto reduce el riesgo de datos sucios en producción.

### Alternativas Consideradas

- **XLSX/Excel**: Requiere `xlsx` npm (~1MB). Se evita por simplicidad. El usuario puede exportar a CSV desde Excel/Google Sheets en un clic.
- **Import directo sin preview**: Riesgoso para migraciones grandes. La preview protege contra errores de formato del CSV origen.

### Preguntas Abiertas

- ¿El cliente siempre tiene `precio_compra`? (puede dejarse en 0 si no)
- ¿Se permiten productos sin variantes de talla/color? → Sí, variante "genérica" sin talla ni color

---

## Tareas Paso a Paso

### Paso 1: Plantilla CSV de ejemplo

Crear el archivo `public/plantilla-importacion-productos.csv` con la estructura oficial y datos de ejemplo.

**Estructura de columnas:**
```
nombre,descripcion,categoria,codigo_base,precio_compra,precio_venta,unidad,talla,color,codigo_barras,stock_actual,stock_minimo
```

**Reglas:**
- `nombre`: obligatorio
- `precio_venta`: obligatorio, número entero o decimal (sin símbolo $)
- `precio_compra`: opcional, default 0
- `unidad`: opcional, default `unidad` (valores: `unidad`, `kg`, `metro`, `litro`, `par`, `caja`, `rollo`)
- `talla`: opcional, nombre de talla (ej. "M", "42", "Único")
- `color`: opcional, nombre de color (ej. "Negro", "Azul marino")
- `codigo_barras`: opcional, se autogenera si está vacío
- `stock_actual`: opcional, default 0
- `stock_minimo`: opcional, default 0
- `categoria`: opcional, nombre de categoría
- `codigo_base`: opcional — si múltiples filas tienen el mismo `codigo_base`, se agrupan como variantes del mismo producto

**Acciones:**
- Crear `public/plantilla-importacion-productos.csv` con 5-6 filas de ejemplo (remeras con tallas, pantalón sin variantes, producto con código de barras propio)

**Archivos afectados:**
- `app/public/plantilla-importacion-productos.csv` (nuevo)

---

### Paso 2: Agregar helpers de resolución de taxonomía en queries

En `lib/productos/queries.ts` agregar tres funciones que buscan por nombre+tienda_id y crean si no existe.

**Acciones:**
- Agregar función `resolverOCrearCategoria(supabase, tiendaId, nombre): Promise<string>` — retorna el `id`
- Agregar función `resolverOCrearTalla(supabase, tiendaId, nombre): Promise<string>` — retorna el `id`
- Agregar función `resolverOCrearColor(supabase, tiendaId, nombre): Promise<string>` — retorna el `id`
- Cada función hace un `upsert` por `(tienda_id, nombre)` con `onConflict` para ser idempotente

**Archivos afectados:**
- `app/lib/productos/queries.ts`

---

### Paso 3: Server Action `importarProductosCSV()`

En `app/app/actions/productos.ts` agregar la action que recibe las filas ya parseadas del cliente, las valida, resuelve taxonomía y las inserta.

**Tipos a agregar:**
```typescript
export interface FilaCSVImport {
  nombre: string
  descripcion?: string
  categoria?: string
  codigo_base?: string
  precio_compra: number
  precio_venta: number
  unidad?: string
  talla?: string
  color?: string
  codigo_barras?: string
  stock_actual: number
  stock_minimo: number
}

export interface ResultadoFilaImport {
  fila: number
  nombre: string
  ok: boolean
  error?: string
  productoId?: string
}

export interface ResultadoImportacion {
  ok: boolean
  total: number
  exitosos: number
  errores: ResultadoFilaImport[]
}
```

**Lógica de `importarProductosCSV(filas: FilaCSVImport[])`:**
1. `requireTiendaId()`
2. Validar máximo 500 filas
3. Agrupar filas por `codigo_base ?? nombre` → Map de producto → variantes[]
4. Para cada grupo:
   a. Resolver `categoria_id` (si tiene) con `resolverOCrearCategoria()`
   b. Para cada variante: resolver `talla_id`, `color_id`
   c. Generar código de barras si está vacío
   d. Construir `ProductoInput` y llamar a `crearProducto()` (reutilizar la lógica existente directamente con el cliente Supabase, no via redirect)
   e. Registrar resultado en array
5. Retornar `ResultadoImportacion`

**Nota:** En lugar de llamar `crearProducto()` (que hace redirect), extraer la lógica de inserción en una función interna `_insertarProducto(supabase, tiendaId, input)` y llamarla tanto desde `crearProducto()` como desde `importarProductosCSV()`.

**Archivos afectados:**
- `app/app/actions/productos.ts`

---

### Paso 4: Componente `ImportPreviewTable`

Tabla que muestra las filas parseadas antes de confirmar.

**Props:**
```typescript
interface ImportPreviewTableProps {
  filas: FilaCSVParsed[]  // filas con errores de validación cliente ya marcados
  total: number
}
```

**Columnas:**
- Estado (ícono ✓ / ⚠ / ✗)
- # fila
- Nombre
- Categoría
- Talla / Color
- Precio venta
- Stock
- Código de barras (si tiene)
- Error (si hay)

**Comportamiento:**
- Filas con error en rojo/fondo rosado
- Filas ok en verde tenue
- Scroll vertical si hay muchas filas
- Resumen arriba: "X filas — Y ok, Z con errores"

**Archivos afectados:**
- `app/components/productos/ImportPreviewTable.tsx` (nuevo)

---

### Paso 5: Componente principal `ImportadorCSV`

Componente cliente con máquina de estados de 3 pasos.

**Estados:**
```
'idle' → 'preview' → 'importing' → 'done'
```

**Paso 1 — Subir archivo (idle):**
- Drop zone con `<input type="file" accept=".csv">`
- Botón "Descargar plantilla CSV" que apunta a `/plantilla-importacion-productos.csv`
- Al seleccionar archivo: parsear CSV con `FileReader`, validar estructura de columnas
- Si columnas incorrectas: mostrar error inline
- Si ok: pasar a `preview`

**Parser CSV cliente:**
```typescript
function parsearCSV(texto: string): { filas: FilaCSVParsed[], erroresEstructura: string[] }
```
- Primera fila = encabezados, validar que tenga las columnas mínimas (`nombre`, `precio_venta`)
- Ignorar filas completamente vacías
- Convertir `precio_compra`, `precio_venta`, `stock_actual`, `stock_minimo` a números
- Marcar filas con error si `nombre` vacío o `precio_venta` no es número

**Paso 2 — Preview (preview):**
- Mostrar `<ImportPreviewTable>` con las filas
- Resumen: total, ok, con errores
- Si hay errores: advertencia "X filas tienen errores y serán omitidas. Las demás se importarán igual."
- Botón "Importar X productos" (deshabilitado si 0 filas ok)
- Botón "Cancelar / Cambiar archivo"

**Paso 3 — Importando (importing):**
- Spinner + "Importando productos..."
- Llama a `importarProductosCSV(filasOk)` via Server Action
- Al completar: pasar a `done`

**Paso 4 — Resultado (done):**
- Si todo ok: mensaje de éxito verde con total importado
- Si hubo errores parciales: lista de filas que fallaron con su error
- Botón "Ver productos" → `/productos`
- Botón "Importar otro archivo"

**Acciones:**
- Crear `app/components/productos/ImportadorCSV.tsx`

---

### Paso 6: Página `/productos/importar`

Server component que renderiza el componente cliente.

```typescript
// app/app/(dashboard)/productos/importar/page.tsx
import { TabsProductos } from '@/components/productos/TabsProductos'
import { ImportadorCSV } from '@/components/productos/ImportadorCSV'

export const dynamic = 'force-dynamic'

export default async function ImportarProductosPage() {
  return (
    <div>
      <h1 className="...">Importar productos</h1>
      <p className="...">Cargá un archivo CSV con tu catálogo para importarlo masivamente.</p>
      <TabsProductos active="importar" />
      <ImportadorCSV />
    </div>
  )
}
```

**Archivos afectados:**
- `app/app/(dashboard)/productos/importar/page.tsx` (nuevo)

---

### Paso 7: Agregar tab "Importar" en `TabsProductos`

Agregar el nuevo tab a la lista de navegación.

**Cambio en `TabsProductos.tsx`:**
```typescript
const tabs = [
  { href: '/productos', label: 'Productos', key: 'productos', show: true },
  { href: '/productos/categorias', label: 'Categorías', key: 'categorias', show: true },
  { href: '/productos/tallas', label: `${labelVar1}s`, key: 'tallas', show: usarVar1 },
  { href: '/productos/colores', label: `${labelVar2}s`, key: 'colores', show: usarVar2 },
  { href: '/productos/importar', label: 'Importar CSV', key: 'importar', show: true },  // ← nuevo
]
```

También actualizar el tipo:
```typescript
interface TabsProductosProps {
  active: 'productos' | 'categorias' | 'tallas' | 'colores' | 'importar'
}
```

**Archivos afectados:**
- `app/components/productos/TabsProductos.tsx`

---

### Paso 8: Validación y prueba

**Acciones:**
- Iniciar dev server: `npm run dev` desde `app/`
- Navegar a `/productos/importar`
- Probar con la plantilla de ejemplo descargada
- Probar con archivo CSV malformado (columnas incorrectas)
- Probar con CSV que tiene algunas filas con error y otras ok
- Verificar que los productos aparecen en `/productos` tras la importación
- Verificar que categorías/tallas/colores nuevos se crearon correctamente

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/productos/page.tsx` — lista de productos (verá los importados)
- `app/app/actions/productos.ts` — se modifica para agregar la action
- `app/lib/productos/queries.ts` — se modifica para agregar resolución de taxonomía
- `app/components/productos/TabsProductos.tsx` — se modifica para agregar el tab

### Actualizaciones Necesarias para Consistencia

- No requiere migraciones de base de datos (usa tablas existentes)
- No requiere nuevas variables de entorno

### Impacto en Flujos de Trabajo Existentes

- El flujo de `crearProducto()` se refactoriza levemente (extracción de `_insertarProducto`) pero el comportamiento externo no cambia
- El tab "Importar CSV" aparece en todas las páginas del módulo de productos

---

## Lista de Validación

- [ ] Plantilla CSV descargable desde la UI
- [ ] CSV con datos de ejemplo importa correctamente (productos + variantes)
- [ ] Filas con `nombre` vacío o `precio_venta` inválido se marcan como error en preview
- [ ] CSV con columnas incorrectas muestra error de estructura (no llega a preview)
- [ ] Categoría/talla/color nuevos se crean automáticamente
- [ ] Categoría/talla/color existentes se reutilizan (no se duplican)
- [ ] Productos aparecen en `/productos` tras importar
- [ ] Máximo 500 filas validado en servidor
- [ ] Tab "Importar CSV" visible y navegable desde cualquier subpágina de productos
- [ ] No se rompe el flujo de `crearProducto()` individual existente

---

## Criterios de Éxito

Una migración de 200 productos con variantes (ej. remeras con 4 talles = 800 filas) se importa en menos de 30 segundos, aparece en la lista de productos correctamente categorizada, con stock y códigos de barras, sin errores en la consola del servidor.
