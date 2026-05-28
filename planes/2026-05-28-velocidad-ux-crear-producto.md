# Plan: Velocidad UX — Flujo de Creación de Producto

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Mejorar la velocidad y ergonomía del flujo de creación de productos en todos los rubros.

---

## Análisis del Estado Actual

### Flujo completo mapeado

El flujo de creación de un producto recorre:

```
/productos → clic "Nuevo producto"
→ /productos/nuevo (Server Component)
    ↓ await Promise.all([categorias, tallas, colores, config])
→ ProductoForm (modo='crear')
    ├── Card 1: Info del producto
    │   ├── [Nombre*]         [Categoría + InlineCreate]
    │   ├── [Código base]     [URL de imagen]
    │   ├── [Precio compra]   [Precio venta* + botón markup]
    │   ├── [Unidad de medida]
    │   └── [Descripción (Textarea 3 rows)]
    ├── Card 2: Toggle variantes (solo crear)
    │   ├── Toggle "¿Tiene variantes?"
    │   └── Si NO: [Código barras + BarcodeButton] [Stock] [Stock mín.]
    └── Card 3: VariantesEditor (si tieneVariantes)
        ├── Header: [InlineCreate var1] [InlineCreate var2] [+ Agregar]
        ├── MatrizGenerador (solo si usarHexVar2)
        ├── BulkFill
        └── Tabla: Var1 | [Var2] | Código | Precio | Stock | StockMín | [Pack] | ×
→ Submit → crearProducto() → redirect /productos/{id}
```

**Flujos de entrada alternativos que ya existen:**
- Barcode-first: escanear en lista → si no existe → `/productos/nuevo?codigo=XXXX` (código pre-llenado)
- Voz: VoiceProductoWizard → crearProducto() directo
- Duplicar: DuplicarProductoButton → copia con stock 0
- CSV: /productos/importar (para carga masiva)

---

## Fricciones Identificadas

### F1 — Campos opcionales ocupan espacio prime (impacto ALTO)
`Código base (interno)` y `URL de imagen` están en el grid principal, en la misma fila que campos de alta frecuencia. Son raramente usados en la carga inicial de un catálogo. Cada producto creado requiere tabular sobre 2 campos innecesarios.

### F2 — Descripción en la primera card bloquea el scroll (impacto MEDIO)
`Textarea` de 3 rows ocupa ~90px al pie de la card principal. Es el campo menos completado en la carga de catálogo. Empuja visualmente el toggle de variantes hacia abajo.

### F3 — Toggle de variantes está demasiado abajo (impacto ALTO)
El toggle "¿Tiene variantes?" aparece en la segunda card, *después* de todos los campos de precio y descripción. Para rubros sin variantes (despensa, farmacia, carnicería), el usuario tiene que scrollear y hacer clic en el toggle antes de poder cargar el código de barras del producto simple. La decisión "simple vs. con variantes" es lo primero que hay que resolver, no lo último.

### F4 — No hay "Guardar y crear otro" (impacto ALTO)
Para cargar un catálogo de 50 productos, después de cada guardado el sistema navega a `/productos/{id}`. El usuario debe: esperar la carga → hacer clic en "← Productos" → hacer clic en "Nuevo producto". Son 3 acciones + 2 cargas de página extra por cada producto. En 50 productos = 150 acciones innecesarias.

### F5 — VariantesEditor sin atajos de teclado para seleccionar var1/var2 (impacto MEDIO)
El flujo Enter-para-avanzar-variante ya existe en el campo `código de barras`. Pero para completar el campo `talla` (Select), el usuario debe hacer clic con el mouse y elegir de un dropdown. No hay shortcut de teclado para seleccionar talla/color.

### F6 — Precio venta sin foco inmediato post-nombre (impacto MEDIO)
Para rubros donde el precio de compra no se trackea (verdulería, almacén pequeño), el campo `Precio compra` aparece antes de `Precio venta`. Esto obliga a tabular sobre un campo innecesario. El campo más importante para cerrar una venta es `Precio venta`.

### F7 — Sin persistencia de última categoría usada (impacto BAJO-MEDIO)
Al cargar 20 productos de la misma categoría "Pantalones", el usuario debe seleccionar "Pantalones" 20 veces. No hay memoria de la última selección.

### F8 — Indicador de margen poco visible (impacto BAJO)
El texto `"Ganancia: +X% — $X por unidad"` aparece en gris claro como hint de texto. No hay un indicador de "alerta" cuando el margen es inusualmente bajo (< 10%) o negativo.

### F9 — Sin acceso rápido desde teclado a nuevo producto (impacto BAJO)
No existe shortcut global para abrir `/productos/nuevo`. El flujo solo se puede iniciar con el mouse (botón "Nuevo producto" en la lista).

### F10 — Unidad de medida siempre visible aunque el rubro no la necesite (impacto BAJO)
Para ropa, zapatería, librería, la unidad de medida es siempre "unidad" y el dropdown es ruido. Solo es relevante para rubros con peso/volumen (carnicería, verdulería, ferretería, corralón).

---

## Cambios Propuestos

### Resumen priorizado

| # | Cambio | Impacto | Esfuerzo | Archivos |
|---|--------|---------|----------|----------|
| C1 | Mover toggle variantes al inicio del form | ALTO | bajo | ProductoForm.tsx |
| C2 | Agregar "Guardar y crear otro" | ALTO | bajo | ProductoForm.tsx |
| C3 | Campos opcionales en sección colapsable "Más detalles" | ALTO | medio | ProductoForm.tsx |
| C4 | Reordenar grid: Nombre → Precio venta → Precio compra → Categoría | MEDIO | bajo | ProductoForm.tsx |
| C5 | Ocultar unidad de medida para rubros sin peso/volumen | BAJO | muy bajo | ProductoForm.tsx |
| C6 | Badge de alerta cuando margen < 10% | BAJO | muy bajo | ProductoForm.tsx |
| C7 | Persistir última categoría con localStorage | BAJO | bajo | ProductoForm.tsx |

### Nuevos Archivos a Crear

Ninguno. Todos los cambios son en componentes existentes.

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|-----------------|---------|
| `app/components/productos/ProductoForm.tsx` | Todos los cambios de UX descritos arriba |

---

## Diseño Técnico

### C1 — Toggle de variantes al inicio

**Situación actual:**
```
Card 1: Info del producto (nombre, precios, etc.)   ← se rellena primero
Card 2: Toggle variantes                             ← está DESPUÉS
```

**Nuevo flujo:**
```
[Toggle visible justo arriba del card de info principal]
→ Si SIMPLE: Card con nombre + precio venta + precio compra + categoría + (código barras + stock) inline
→ Si CON VARIANTES: Card completa + VariantesEditor
```

El toggle NO va en una card separada. Va como una barra de 2 opciones tipo segmented control al tope del form, antes del primer card. Opciones: `Producto simple (sin variantes)` | `Con variantes (tallas, colores...)`.

En rubros con `defaultSinVariantes=true` (despensa, farmacia, etc.) el default arranca en "simple". En ropa, el default es "con variantes".

**Comportamiento del toggle:**
- Cambia el layout del form debajo
- NO elimina la Card de info — la mantiene igual
- Solo controla si aparece el VariantesEditor o los 3 campos simples

### C2 — Guardar y crear otro

**Implementación:**
Agregar un segundo botón de submit con `data-action="save-and-new"`. En `handleSubmit`:

```typescript
const actionType = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-action')
// ...después de crearProducto exitoso:
if (actionType === 'save-and-new') {
  // Resetear todos los estados del form
  // Preservar: categoriaId (si persistencia está habilitada)
  // Limpiar: nombre, precios, variantes, descripción, etc.
  // Focus al campo nombre
  router.push('/productos/nuevo') // o reset en-lugar sin navegación
} else {
  router.push(`/productos/${res.data.id}`)
}
```

Para el reset in-place (sin navegación), usar un `key` state que fuerce re-render del form:
```typescript
const [formKey, setFormKey] = useState(0)
// En save-and-new:
setFormKey(k => k + 1) // desmonta y remonta el form con estado inicial
toast.success('Producto creado. Cargá el siguiente.')
```

Layout de botones final:
```
[Cancelar]   [Guardar y crear otro]   [Crear producto →]
```

### C3 — Campos opcionales colapsables

La Card 1 actual tiene 8 campos (algunos en grid 2-col). Se reorganiza en 2 niveles:

**Siempre visible (campos primarios):**
```
[Nombre *]             [Categoría]
[Precio venta *]       [Precio compra]
```

**Colapsado por defecto (campos secundarios) — toggle "Más detalles ▾":**
```
[Código base]          [URL de imagen]
[Unidad de medida]     (solo si el rubro la necesita)
[Descripción]          (Textarea)
```

El toggle se expande inline con transición suave (`max-h` + `overflow-hidden`). Recordar en `localStorage` si el usuario los expandió (para que no tenga que hacer clic cada vez si los usa frecuentemente).

**Campos siempre en el área colapsada:**
- `codigo_base` — frecuencia: baja
- `imagen_url` — frecuencia: muy baja
- `descripcion` — frecuencia: baja
- `unidad_de_medida` — frecuencia: media (solo para rubros con peso)

### C4 — Reordenar grid principal

**Antes:**
```
[Nombre *]          [Categoría]
[Código base]       [URL de imagen]
[Precio compra]     [Precio venta *]
[Unidad de medida]
[Descripción]
```

**Después (campos primarios):**
```
[Nombre *]          [Categoría]
[Precio venta *]    [Precio compra]
```

Justificación: `Precio venta` es el campo más importante y más usado. Va primero. `Precio compra` es opcional para muchos rubros.

El auto-cálculo de markup sigue funcionando igual: al escribir `precio_compra`, si el precio venta no fue tocado manualmente, se auto-sugiere.

### C5 — Unidad de medida condicional

```typescript
// Solo mostrar si el rubro la necesita
const RUBROS_CON_UNIDAD = ['carniceria', 'verduleria', 'ferreteria', 'corralon', 'generica']
const mostrarUnidad = RUBROS_CON_UNIDAD.includes(rubro)
// O más elegante: si unidadesDisponibles.length > 1
const mostrarUnidad = unidadesOpciones.length > 1
```

Si solo hay una unidad disponible para el rubro, el campo no se muestra y se envía el valor default silenciosamente.

### C6 — Badge de alerta margen bajo

Extender el indicador de ganancia existente:

```typescript
const margenReal = ((precioVenta - precioCompra) / precioCompra) * 100
// Actual: solo muestra en gris
// Nuevo:
if (margenReal < 0)    → texto rojo + ícono ⚠️ "Precio por debajo del costo"
if (margenReal < 10)   → texto amber + "Margen muy bajo"
if (margenReal < 20)   → texto gray normal
if (margenReal >= 20)  → texto green (confirma un margen saludable)
```

### C7 — Persistir última categoría

```typescript
// Al cambiar categoriaId:
const STORAGE_KEY = 'cvalle:ultima-categoria'
localStorage.setItem(STORAGE_KEY, categoriaId)

// Al inicializar el form (solo en modo crear y sin initial.categoria_id):
const ultimaCategoria = localStorage.getItem(STORAGE_KEY)
const [categoriaId, setCategoriaId] = useState(
  initial?.categoria_id ?? (modo === 'crear' ? (ultimaCategoria ?? '') : '')
)
```

---

## Estado Actual de los Componentes Relevantes

### `app/components/productos/ProductoForm.tsx`
- **Líneas:** ~449
- **Props relevantes:** `modo`, `initial`, `initialCodigoBarras`, `initialVariantes`, `categorias`, `tallas`, `colores`, `margenDefault`
- **Estado actual del toggle:** `tieneVariantes` ya existe, default según `defaultSinVariantes` del rubro
- **Autofocus:** ya tiene `useAutoFocus(nombreRef)` — apunta al campo Nombre

### `app/app/(dashboard)/productos/nuevo/page.tsx`
- Lee `searchParams.codigo` y lo pasa como `initialCodigoBarras`
- Carga `categorias`, `tallas`, `colores`, `config`
- No necesita cambios para estos fixes de UX

---

## Tareas Paso a Paso

### T1 — Reordenar campos del grid principal y extraer secundarios

**Objetivo:** El usuario ve solo Nombre + Categoría + Precio venta + Precio compra en la vista principal.

**En `ProductoForm.tsx`:**
1. Mover `precio_venta` ANTES de `precio_compra` en el grid
2. Crear estado `const [mostrarDetalles, setMostrarDetalles] = useState(() => typeof window !== 'undefined' && localStorage.getItem('cvalle:form-detalles') === 'true')`
3. Envolver los campos secundarios (`codigoBase`, `imagenUrl`, `descripcion`, y `unidadMedida` si aplica) en un div colapsable:
   ```tsx
   <button type="button" onClick={() => setMostrarDetalles(!mostrarDetalles)}>
     {mostrarDetalles ? 'Menos detalles ▴' : 'Más detalles ▾'}
   </button>
   <div className={mostrarDetalles ? 'block' : 'hidden'}>
     {/* código base, imagen, descripción, unidad */}
   </div>
   ```
4. Guardar preferencia en localStorage al toggle

**Archivos:** `app/components/productos/ProductoForm.tsx`

---

### T2 — Mover el toggle de variantes al tope del form

**Objetivo:** La decisión "simple vs. con variantes" es lo primero que hace el usuario.

**En `ProductoForm.tsx`:**
1. Extraer el bloque del toggle actual de su card separada
2. Colocarlo como un **segmented control** antes del primer `<div className="bg-white ...">`:
   ```tsx
   {/* Solo en modo crear */}
   {modo === 'crear' && (
     <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
       <button
         type="button"
         onClick={() => setTieneVariantes(false)}
         className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
           !tieneVariantes ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
         }`}
       >
         Producto simple
       </button>
       <button
         type="button"
         onClick={() => setTieneVariantes(true)}
         className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
           tieneVariantes ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
         }`}
       >
         Con variantes
         <span className="ml-1.5 text-[11px] text-gray-400">
           {usarVar2 ? `(${labelVar1} × ${labelVar2})` : `(${labelVar1})`}
         </span>
       </button>
     </div>
   )}
   ```
3. Eliminar la Card separada que tenía el toggle (la segunda card en el form original)
4. El bloque de campos simples (código barras + stock + stock mínimo) pasa a estar dentro de la Card principal, al final del grid, visible solo cuando `!tieneVariantes`

**Archivos:** `app/components/productos/ProductoForm.tsx`

---

### T3 — Agregar botón "Guardar y crear otro"

**Objetivo:** Cargar 50 productos sin salir del formulario.

**En `ProductoForm.tsx`:**
1. Agregar `const [formKey, setFormKey] = useState(0)` al nivel del componente padre o usar `key={formKey}` sobre el `<form>`
2. En `handleSubmit`, leer el submitter:
   ```typescript
   const btn = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
   const esNuevo = btn?.getAttribute('data-action') === 'save-and-new'
   ```
3. En el bloque exitoso de `crearProducto`:
   ```typescript
   if (esNuevo) {
     toast.success(`"${nombre}" guardado. Cargá el siguiente.`)
     setFormKey(k => k + 1) // reset completo del form
   } else {
     toast.success('Producto creado exitosamente')
     router.push(`/productos/${res.data.id}`)
   }
   ```
4. Agregar el segundo botón al footer:
   ```tsx
   <div className="flex items-center justify-end gap-3">
     <LinkButton href="/productos" variant="ghost">Cancelar</LinkButton>
     {modo === 'crear' && (
       <Button
         type="submit"
         data-action="save-and-new"
         variant="secondary"
         disabled={pending}
       >
         {pending ? '...' : 'Guardar y crear otro'}
       </Button>
     )}
     <Button type="submit" disabled={pending}>
       {pending ? 'Guardando...' : modo === 'crear' ? 'Crear producto' : 'Guardar cambios'}
     </Button>
   </div>
   ```
5. El `formKey` se pasa como `key` al componente `ProductoForm` desde la página, O se maneja internamente con un wrapper ligero

**Nota sobre el reset:** Si se usa `key` externo, la página necesita mantener `formKey`. Alternativa más simple: manejar el reset internamente reseteando todos los `useState` a sus valores iniciales.

**Archivos:** `app/components/productos/ProductoForm.tsx`

---

### T4 — Condicionar unidad de medida y mejorar badge de margen

**Objetivo:** Menos ruido visual + feedback más claro sobre el margen.

**Unidad de medida — en `ProductoForm.tsx`:**
```typescript
// Ya existe: const unidadesOpciones = TODAS_LAS_UNIDADES.filter(...)
// Condición de visibilidad:
const mostrarUnidadMedida = unidadesOpciones.length > 1
```
Envolver el Select de unidad de medida en `{mostrarUnidadMedida && (...)}`.

**Badge de margen — extender el bloque existente:**
```typescript
// Reemplazar el bloque de margen actual:
const margenReal = ((precioVenta - precioCompra) / precioCompra) * 100
const ganancia = precioVenta - precioCompra
let margenColor = 'text-gray-400'
let margenPrefix = ''
if (margenReal < 0) { margenColor = 'text-red-600'; margenPrefix = '⚠️ ' }
else if (margenReal < 10) { margenColor = 'text-amber-600'; margenPrefix = '⚡ ' }
else if (margenReal >= 20) { margenColor = 'text-lime-600'; margenPrefix = '✓ ' }
```

**Archivos:** `app/components/productos/ProductoForm.tsx`

---

### T5 — Persistencia de última categoría

**Objetivo:** Al cargar 20 productos de la misma categoría, no seleccionarla 20 veces.

**En `ProductoForm.tsx`:**
```typescript
const STORAGE_CAT = 'cvalle:ultima-categoria'

// Inicializar:
const [categoriaId, setCategoriaId] = useState<string>(
  initial?.categoria_id ??
  (modo === 'crear' && typeof window !== 'undefined'
    ? (localStorage.getItem(STORAGE_CAT) ?? '')
    : '')
)

// Al cambiar:
function handleCategoriaChange(id: string) {
  setCategoriaId(id)
  if (modo === 'crear' && id) {
    localStorage.setItem(STORAGE_CAT, id)
  }
}
```

Reemplazar `onChange={(e) => setCategoriaId(e.target.value)}` en el Select de categoría por `onChange={(e) => handleCategoriaChange(e.target.value)}`.

**Archivos:** `app/components/productos/ProductoForm.tsx`

---

### T6 — Verificación y QA

**Checklist de validación:**

- [ ] En ropa: el segmented control arranca en "Con variantes"
- [ ] En despensa: el segmented control arranca en "Producto simple"
- [ ] Los campos Nombre y Precio venta son los primeros en el tab order
- [ ] "Más detalles" oculta código base, imagen, descripción
- [ ] "Más detalles" recuerda su estado entre sesiones
- [ ] "Guardar y crear otro" limpia el form y hace focus al campo Nombre
- [ ] "Guardar y crear otro" muestra toast con el nombre del producto guardado
- [ ] La categoría persiste en el nuevo form cuando se usa "Guardar y crear otro"
- [ ] El margen muestra en rojo cuando es negativo, amber cuando < 10%
- [ ] En ropa (sin peso), el campo "Unidad de medida" no aparece
- [ ] En carnicería/verdulería, "Unidad de medida" sigue apareciendo
- [ ] El barcode-first (`?codigo=`) sigue funcionando y selecciona "Producto simple"
- [ ] El modo editar no muestra el segmented control de variantes
- [ ] `tsc --noEmit` sin errores
- [ ] Build de producción sin warnings de hidratación (por el localStorage)

---

## Consideraciones Técnicas

### Hidratación SSR con localStorage
`localStorage` no existe en SSR. Los estados que lo leen deben usar `useState` con función lazy o un `useEffect` posterior. El patrón seguro:
```typescript
const [mostrarDetalles, setMostrarDetalles] = useState(false) // default seguro para SSR
useEffect(() => {
  setMostrarDetalles(localStorage.getItem('cvalle:form-detalles') === 'true')
}, [])
```

### Reset del form en "Guardar y crear otro"
La opción más limpia es pasar un `key` externo desde la página:
- Requiere que `/productos/nuevo/page.tsx` sea Client Component O
- Crear un wrapper client component que maneje el `key`

Alternativa sin wrapper: resetear cada `useState` individualmente dentro del mismo componente. Más verboso pero sin cambios en la página.

**Recomendación:** Usar el reset manual de estados (opción 2) — no requiere tocar la página ni agregar un wrapper. En `handleSubmit`, después de detectar `esNuevo`, llamar una función `resetForm()` que resetee todos los `useState` a sus defaults.

### Animación del colapsable "Más detalles"
Usar la técnica de `max-height` con CSS transition para un colapso suave sin dependencias externas:
```css
.detalles-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.2s ease;
}
.detalles-content.open {
  max-height: 400px; /* suficientemente grande */
}
```
Con Tailwind: usar `transition-all duration-200` + condicionar `max-h-0 overflow-hidden` vs `max-h-[400px]`.

---

## Impacto Esperado

| Métrica | Antes | Después |
|---------|-------|---------|
| Pasos para crear producto simple | ~12 interacciones | ~6 interacciones |
| Tiempo para cargar 10 productos simples | ~8-10 min | ~3-4 min |
| Scrolling en el form (rubros sin variantes) | Necesario | Innecesario |
| Carga de 2do producto seguido | 3 clics + 2 navegaciones | 1 clic |
| Visibilidad del margen bajo | Solo texto gris | Colores semánticos |

---

## Archivos Afectados

| Ruta del Archivo | Tipo de cambio |
|-----------------|----------------|
| `app/components/productos/ProductoForm.tsx` | Modificar — todos los cambios de UX |

---

## Lista de Validación Final

- [ ] T1 completado: campos primarios/secundarios reorganizados
- [ ] T2 completado: segmented control de variantes al tope
- [ ] T3 completado: botón "Guardar y crear otro" funciona
- [ ] T4 completado: unidad condicional + badge de margen mejorado
- [ ] T5 completado: última categoría persiste
- [ ] T6 completo: QA verificado en ropa, despensa y ferretería
- [ ] Sin regresiones en barcode-first y modo editar
- [ ] `npm run build` sin errores

---

## Criterios de Éxito

El plan está completo cuando:
1. Un operador puede cargar 10 productos simples (despensa) en menos de 4 minutos sin usar el mouse para el toggle de variantes.
2. Un operador de ropa puede cargar 5 productos con variantes sin scrollear para encontrar el editor de variantes.
3. El botón "Guardar y crear otro" funciona para una carga de catálogo sin interrupciones de navegación.
4. Los campos opcionales no interrumpen el flujo del tab order en los campos primarios.
