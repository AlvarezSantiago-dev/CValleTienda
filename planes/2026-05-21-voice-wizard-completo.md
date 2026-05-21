# Plan: Voice Wizard Completo — todos los campos + rubro-aware + crear categoría

**Creado:** 2026-05-21
**Estado:** Borrador
**Pedido:** El wizard de voz debe cubrir TODOS los campos de `ProductoInput`, crear la categoría si no existe, y adaptar las preguntas según el rubro configurado de la tienda.

---

## Diagnóstico del sistema actual

### Campos faltantes en el wizard actual

| Campo de `ProductoInput` | ¿Cubierto? | Prioridad |
|--------------------------|------------|-----------|
| nombre                   | ✅ sí       | —         |
| precio_venta             | ✅ sí       | —         |
| precio_compra            | ❌ no       | Alta      |
| unidad_de_medida         | ❌ no       | Alta (kg, litro, m2...) |
| descripcion              | ❌ no       | Media     |
| codigo_base              | ❌ no       | Baja (dictar por voz es incómodo) |
| imagen_url               | ❌ no       | Nula (no se dicta una URL) |
| categoria_id             | ✅ sí       | —         |
| **crear categoría inline**   | ❌ no   | Alta      |
| talla/variante (Var1)    | ✅ parcial  | —         |
| color/variante (Var2)    | ❌ no       | Media (depende del rubro) |
| stock_inicial            | ✅ sí       | —         |
| stock_minimo             | ❌ no       | Alta      |
| codigo_barras            | ❌ no       | Baja      |

### Problemas con el rubro

- El wizard actual ignora completamente `ConfigRubro`
- Para **carnicería** o **verdulería**, no tiene sentido preguntar "¿tiene tallas?": son productos simples por kg
- Para **ferretería**, "Var1" no son tallas sino medidas ("1/4 pulgada", "3/4 pulgada") y "Var2" son materiales
- La unidad de medida es crítica: para carnicería es `kg`, para librería es `unidad`, para corralón puede ser `m3`
- Si el rubro solo tiene 1 unidad disponible → skip directo (nunca preguntar)

---

## Arquitectura del nuevo wizard

### Máquina de estados completa

```
inactivo
escuchando_nav

— FLUJO PRODUCTO —
producto_nombre
producto_precio_venta
producto_precio_compra          ← NUEVO: skippable con "omitir"/"cero"
producto_unidad                 ← NUEVO: solo si rubro.unidadesDisponibles.length > 1
producto_categoria
producto_categoria_crear        ← NUEVO: cuando dice una cat. que no existe → "¿la creo?"
producto_variantes_yn           ← solo si rubro.usarVar1 = true Y tallas.length > 0
producto_variantes              ← Var1: tallas/medidas/cortes + stock por variante
producto_variantes_color        ← NUEVO: Var2 colores, solo si rubro.usarVar2 = true Y colores.length > 0
producto_stock_simple           ← solo si sin variantes
producto_stock_minimo           ← NUEVO: después de stock_simple, skippable
producto_descripcion            ← NUEVO: skippable, va al final antes de confirmar
producto_confirmar
producto_guardando
producto_listo
producto_error
```

### Flujo visual de pasos (adaptativo por rubro)

**Ropa** (usarVar1=true, usarVar2=true, 1 unidad):
```
Nombre → Precio venta → Precio compra → Categoría → ¿Variantes? →
  SÍ: Tallas (Var1: S M L) → Colores (Var2: rojo, azul) → Descripción → Confirmar
  NO: Stock → Stock mínimo → Descripción → Confirmar
```
Total pasos: 7–8

**Carnicería** (usarVar1=true, usarVar2=false, unidades: kg/gramo/unidad):
```
Nombre → Precio venta por [kg] → Precio compra → Unidad (kg/gramo/unidad) → Categoría →
¿Tiene cortes? → SI: Cortes + stock  → Descripción → Confirmar
               → NO: Stock → Stock mínimo → Descripción → Confirmar
```

**Despensa** (usarVar1=true, usarVar2=true, unidades: unidad/kg/gramo/litro/pack):
```
Nombre → Precio venta → Precio compra → Unidad → Categoría →
¿Tiene variantes (marca/presentación)? → ...
```

**Corralón** (usarVar1=true, usarVar2=false, múltiples unidades):
```
Nombre → Precio venta → Precio compra → Unidad (m3/bolsa/metro...) → Categoría →
¿Tiene tipos? → ...
```

---

## Diseño técnico detallado

### 1. `lib/voz/tipos.ts` — VozPaso extendido + ProductoDraft extendido

```ts
export type VozPaso =
  | 'inactivo'
  | 'escuchando_nav'
  | 'producto_nombre'
  | 'producto_precio_venta'
  | 'producto_precio_compra'      // NUEVO
  | 'producto_unidad'             // NUEVO
  | 'producto_categoria'
  | 'producto_categoria_crear'    // NUEVO
  | 'producto_variantes_yn'
  | 'producto_variantes'
  | 'producto_variantes_color'    // NUEVO
  | 'producto_stock_simple'
  | 'producto_stock_minimo'       // NUEVO
  | 'producto_descripcion'        // NUEVO
  | 'producto_confirmar'
  | 'producto_guardando'
  | 'producto_listo'
  | 'producto_error'

export interface VarianteDraft {
  label: string            // nombre de talla/medida/corte
  tallaId: string | null
  colorId: string | null   // NUEVO: color opcional por variante
  colorLabel: string | null // NUEVO
  stock: number
  stockMinimo: number      // NUEVO
}

export interface ProductoDraft {
  nombre?: string
  precioVenta?: number
  precioCompra?: number            // NUEVO
  unidadMedida?: string            // NUEVO
  tieneVariantes?: boolean
  variantes?: VarianteDraft[]
  stockSimple?: number
  stockMinimo?: number             // NUEVO
  categoriaId?: string | null
  categoriaNombre?: string | null
  categoriaPendienteCrear?: string // NUEVO: nombre que dijo pero no existe todavía
  descripcion?: string | null      // NUEVO
}
```

### 2. `lib/voz/unidades.ts` — NUEVO

Parser de unidades de medida habladas. Mapea pronunciaciones comunes a los valores de `UnidadMedida`:

```ts
const MAPA_UNIDADES: Record<string, string> = {
  'unidad': 'unidad', 'unidades': 'unidad',
  'kilo': 'kg', 'kilos': 'kg', 'kilogramo': 'kg', 'kilogramos': 'kg',
  'gramo': 'gramo', 'gramos': 'gramo',
  'litro': 'litro', 'litros': 'litro',
  'metro': 'metro', 'metros': 'metro',
  'metro cuadrado': 'm2', 'metros cuadrados': 'm2',
  'metro cúbico': 'm3', 'metros cúbicos': 'm3',
  'tonelada': 'tonelada', 'toneladas': 'tonelada',
  'bolsa': 'bolsa', 'bolsas': 'bolsa',
  'pack': 'pack', 'packs': 'pack',
  'caja': 'caja', 'cajas': 'caja',
}

// parsearUnidad("kilogramos") → "kg"
// parsearUnidad("metro cuadrado") → "m2"
// también acepta la primera opción de una lista: "kilo o gramo → kilo"
export function parsearUnidad(texto: string, disponibles: string[]): string | null
```

### 3. `lib/voz/variantes.ts` — extender con soporte de colores

Agregar función para parsear colores (Var2):
```ts
// Input: "rojo" | "azul" | "negro" | nombre del color existente
// Output: Color | null
export function matchColor(texto: string, colores: Color[]): Color | null

// Para múltiples variantes con su color:
// Input: "S rojo M azul L negro"
// Para cada VarianteDraft existente, asociar su color si lo menciona
export function parsearColoresVariantes(
  texto: string,
  variantesDraft: VarianteDraft[],
  colores: Color[]
): VarianteDraft[]  // mismas variantes pero con colorId/colorLabel populados

// Si dice un único color ("todo azul") → aplicar ese color a todas las variantes
export function esColorUnico(texto: string): boolean
```

### 4. `app/actions/productos.ts` — extender `obtenerDatosParaVoz()` (mínimo)

La función ya existe, pero hay que verificar que devuelva la config de rubro también:
```ts
export interface DatosVozResult {
  tallas: Talla[]
  colores: Color[]
  categorias: Categoria[]
  rubro: Rubro          // NUEVO — para que VoiceProvider lo tenga disponible sin useRubro()
}
```
Alternativa: VoiceProvider lee directamente `useRubro()` que ya está disponible en el árbol de componentes (RubroProvider → AppShell → VoiceProvider). **Esta alternativa es más limpia y no requiere cambiar la action.**

### 5. `components/voz/VoiceProvider.tsx` — reescritura de la máquina de estados

**Cambios clave:**

a) Leer `useRubro()` al inicio del componente para tener `usarVar1`, `usarVar2`, `labelVar1`, `labelVar2`, `unidadesDisponibles`

b) Nueva función `calcularSiguientePaso()`: en lugar de hardcodear la secuencia, calcular el próximo paso según el contexto actual y la config del rubro:

```ts
function calcularSiguientePasoDesde(
  pasoActual: VozPaso,
  draft: ProductoDraft,
  config: ConfigRubro,
  datos: DatosVoz
): VozPaso {
  // Tabla de transiciones condicionales
  switch (pasoActual) {
    case 'producto_precio_venta':
      return 'producto_precio_compra'
    
    case 'producto_precio_compra':
      // Skip unidad si el rubro tiene solo 1 opción
      return config.unidadesDisponibles.length > 1
        ? 'producto_unidad'
        : 'producto_categoria'
    
    case 'producto_unidad':
      return 'producto_categoria'
    
    case 'producto_categoria':
      // Manejado especialmente: si no hay match → producto_categoria_crear
      return 'producto_variantes_yn' // o stock_simple si no usarVar1
    
    case 'producto_variantes_yn':
      return draft.tieneVariantes
        ? 'producto_variantes'
        : 'producto_stock_simple'
    
    case 'producto_variantes':
      return config.usarVar2 && datos.colores.length > 0
        ? 'producto_variantes_color'
        : 'producto_descripcion'
    
    case 'producto_variantes_color':
      return 'producto_descripcion'
    
    case 'producto_stock_simple':
      return 'producto_stock_minimo'
    
    case 'producto_stock_minimo':
      return 'producto_descripcion'
    
    case 'producto_descripcion':
      return 'producto_confirmar'
    
    default:
      return 'producto_confirmar'
  }
}
```

c) Procesamiento del paso `producto_categoria` mejorado:
```ts
// Si el texto NO coincide con ninguna categoría existente:
// → draft.categoriaPendienteCrear = transcript
// → irAPaso('producto_categoria_crear')

// Si dice "ninguna" / "sin categoría":
// → categoriaId = null → siguiente paso
```

d) Procesamiento del paso `producto_categoria_crear` nuevo:
```ts
// Escucha "sí" / "no"
// "sí" → await crearCategoriaInline(draft.categoriaPendienteCrear)
//        → actualizar datosVozRef con nueva categoría
//        → draft.categoriaId = nueva.id, categoriaNombre = nueva.nombre
//        → siguiente paso
// "no" → draft.categoriaId = null → siguiente paso
```

e) Procesamiento del paso `producto_precio_compra`:
```ts
// Si "omitir" | "cero" | "sin costo" → draft.precioCompra = 0 → siguiente
// Si número → draft.precioCompra = n → siguiente
```

f) Procesamiento del paso `producto_unidad`:
```ts
// parsearUnidad(transcript, config.unidadesDisponibles)
// Si match → draft.unidadMedida = valor → siguiente
// Si no match → repetir (mostrar opciones disponibles en HUD)
```

g) Procesamiento del paso `producto_stock_minimo`:
```ts
// Si "omitir" | "ninguno" | "cero" → 0 → siguiente
// Si número → Math.round → siguiente
```

h) Procesamiento del paso `producto_descripcion`:
```ts
// Si "omitir" | "no" | "sin descripción" | "nada" → null → siguiente
// Si texto → trim → siguiente
```

i) Procesamiento del paso `producto_variantes_color`:
```ts
// Si "todos iguales" | "sin color" → null en todas → siguiente
// Si color único ("azul") → aplicar a todas las variantes → siguiente
// Si "S rojo M azul L negro" → parsearColoresVariantes() → siguiente
```

### 6. `components/voz/VoiceHUD.tsx` — preguntas rubro-aware

Las preguntas dinámicas deben recibir el contexto del rubro. Ejemplo:

```ts
// En lugar de texto fijo, las preguntas se generan en VoiceProvider y se pasan via context:
// VozContextValue agrega:  preguntaActual: string

// O VoiceHUD llama useRubro() por sí mismo para personalizar el texto:
const { labelVar1, labelVar2 } = useRubro()

const PREGUNTAS_DINAMICAS = {
  producto_variantes_yn:
    `¿Tiene ${labelVar1.toLowerCase()}s? (sí o no)`,       // "¿Tiene tallas?" / "¿Tiene cortes?"
  producto_variantes:
    `Decí los ${labelVar1.toLowerCase()}s y cantidades`,   // "Decí las tallas y cantidades"
  producto_variantes_color:
    `¿De qué ${labelVar2.toLowerCase()} son las variantes? (o "sin color")`, // "¿De qué color...?"
  producto_precio_compra:
    `¿Cuál es el precio de compra? (o decí "omitir")`,
  producto_unidad:
    `¿En qué unidad se vende? (${disponibles.join(", ")})`,
  producto_stock_minimo:
    `¿Cuánto es el stock mínimo? (o "omitir")`,
  producto_descripcion:
    `¿Querés agregar una descripción? (o decí "omitir")`,
  producto_categoria_crear:
    `No encontré esa categoría. ¿La creo como nueva? (sí o no)`,
}
```

### 7. `components/voz/VoiceProductoWizard.tsx` — mostrar todos los campos

Modal de confirmación actualizado con secciones:
- Nombre + descripción
- Precios: venta / compra
- Unidad de medida
- Categoría
- Variantes (con colores si aplica) O Stock simple + Stock mínimo

---

## Tabla de pasos por rubro

| Rubro       | Unidad | Var1 (label) | Var2 (label) | Pasos totales (max) |
|-------------|--------|--------------|--------------|---------------------|
| ropa        | solo unidad | Talla | Color  | 9                   |
| ferreteria  | unidad/pack/caja | Medida | Material | 10       |
| corralon    | múltiples | Tipo | —        | 9                   |
| despensa    | múltiples | Marca | Presentación | 10              |
| libreria    | unidad/pack/caja | Marca | Modelo | 10            |
| carniceria  | kg/gramo/unidad | Corte | — | 9                  |
| farmacia    | unidad/caja/pack | Presentación | — | 9           |
| verduleria  | kg/gramo/unidad | Variedad | — | 9               |
| generico    | todos | Variante 1 | Variante 2  | 10                  |

---

## Preguntas por paso (texto final)

| Paso | Pregunta |
|------|----------|
| producto_nombre | "¿Cómo se llama el producto?" |
| producto_precio_venta | "¿Cuál es el precio de venta?" |
| producto_precio_compra | "¿Cuál es el precio de compra? (o decí «omitir»)" |
| producto_unidad | "¿En qué unidad se vende? Opciones: [lista según rubro]" |
| producto_categoria | "¿A qué categoría pertenece? (o «ninguna»)" |
| producto_categoria_crear | "No encontré esa categoría. ¿La creo? (sí / no)" |
| producto_variantes_yn | "¿Tiene [labelVar1]s? (sí o no)" |
| producto_variantes | "Decí los [labelVar1]s y la cantidad de cada uno" |
| producto_variantes_color | "¿De qué [labelVar2] son? (uno por variante, o «sin [labelVar2]»)" |
| producto_stock_simple | "¿Cuántas unidades tenés en stock?" |
| producto_stock_minimo | "¿Cuál es el stock mínimo para alerta? (o «omitir»)" |
| producto_descripcion | "¿Querés agregar una descripción? (o «omitir»)" |
| producto_confirmar | "¿Todo correcto? (confirmá o cancelá)" |

---

## Archivos a crear / modificar

### Crear (nuevo)
| Archivo | Propósito |
|---------|-----------|
| `lib/voz/unidades.ts` | Parser de unidades de medida habladas |

### Modificar
| Archivo | Cambio |
|---------|--------|
| `lib/voz/tipos.ts` | Expandir `VozPaso` y `ProductoDraft` |
| `lib/voz/variantes.ts` | Agregar `matchColor` y `parsearColoresVariantes` |
| `app/actions/productos.ts` | Importar `crearCategoriaInline` en el wizard (ya existe) |
| `components/voz/VoiceProvider.tsx` | Reescribir máquina de estados, leer `useRubro()`, manejar todos los pasos |
| `components/voz/VoiceHUD.tsx` | Preguntas dinámicas con `useRubro()`, contar pasos correctamente |
| `components/voz/VoiceProductoWizard.tsx` | Mostrar todos los campos en la confirmación |

---

## Tareas de implementación

- [ ] **Paso 1** — Actualizar `lib/voz/tipos.ts` (expandir VozPaso y ProductoDraft)
- [ ] **Paso 2** — Crear `lib/voz/unidades.ts` (parsearUnidad)
- [ ] **Paso 3** — Extender `lib/voz/variantes.ts` (matchColor, parsearColoresVariantes)
- [ ] **Paso 4** — Reescribir `components/voz/VoiceProvider.tsx` (máquina de estados completa)
- [ ] **Paso 5** — Actualizar `components/voz/VoiceHUD.tsx` (preguntas dinámicas por rubro)
- [ ] **Paso 6** — Actualizar `components/voz/VoiceProductoWizard.tsx` (confirmación con todos los campos)
- [ ] **Paso 7** — TypeScript check sin errores
- [ ] **Paso 8** — Prueba manual rubro ropa (con variantes y colores)
- [ ] **Paso 9** — Prueba manual rubro carnicería (unidad kg, sin variantes por color)

---

## Notas importantes

- **`crearCategoriaInline`** ya existe en `app/actions/productos.ts` — solo hay que llamarla desde el wizard
- **El rubro** está disponible en el árbol via `useRubro()` (RubroProvider wrappea AppShell → wrappea VoiceProvider) — no hace falta cambiarlo en la action
- **Campos omitidos por voz** (muy difíciles de dictar): `codigo_base`, `imagen_url`, `codigo_barras` por variante — se dejan como null/vacío y el usuario los completa luego editando el producto
- **El paso `producto_precio_compra`** es importante para el margen — no omitir el paso, solo hacer que sea skippable con "omitir"
- **El cálculo de número de pasos visible** en el FAB y HUD debe actualizarse dinámicamente: contar solo los pasos que aplican al rubro y draft actual
- **Si `usarVar1 = false` Y `usarVar2 = false`** (caso hipotético): skip directo a stock simple
- **Creación de talla inline** (opcional avanzado): si dice una talla que no existe en el catálogo, podrías ofrecer crearla igual que la categoría. Marcar como "Paso 2" del plan (no implementar en esta iteración).
