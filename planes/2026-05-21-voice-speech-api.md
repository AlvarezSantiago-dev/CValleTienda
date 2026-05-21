# Plan: Control por voz — Web Speech API

**Creado:** 2026-05-21
**Estado:** Borrador
**Pedido:** Integrar Web Speech API para navegación por voz entre secciones y carga guiada de productos mediante conversación paso a paso.

---

## Descripción General

### Qué Logra Este Plan

Un botón flotante de micrófono siempre visible en el dashboard que permite dos cosas:
1. **Navegar** a cualquier sección con una frase ("ir a clientes", "abrir caja")
2. **Cargar productos** mediante una conversación guiada paso a paso completamente por voz, terminando con una llamada directa a `crearProducto()` sin tocar el teclado

### Por Qué Importa

Reduce drásticamente el tiempo de carga de productos en back office — el caso de uso más frecuente y repetitivo del sistema. No requiere API key ni costo, funciona con el navegador Chrome/Edge que ya se usa.

---

## Estado Actual

### Estructura Relevante

| Archivo | Relevancia |
|---------|-----------|
| `components/layout/AppShell.tsx` | Client Component — punto de montaje del VoiceFab |
| `app/(dashboard)/layout.tsx` | Server Component — wrappea AppShell |
| `components/layout/Sidebar.tsx` | Define todas las rutas de navegación (`navGroups`) |
| `components/productos/ProductoForm.tsx` | Tiene `ProductoInput` + lógica de variantes — referencia para el wizard |
| `app/actions/productos.ts` | `crearProducto(input: ProductoInput)` — se llama directamente al confirmar |
| `types/database.ts` | `Talla { id, nombre }`, `Color { id, nombre }`, `Categoria { id, nombre }` |

### Brechas

- No existe ningún componente de voz
- No existe `lib/voz/` ni `components/voz/`
- `AppShell` ya es client component → agregar el FAB es directo sin refactoring

---

## Arquitectura

### Árbol de componentes

```
DashboardLayout (server)
└── AppShell (client, ya existe)
    ├── Sidebar
    ├── Header
    ├── VoiceProvider  ← NUEVO — context + state machine
    │   ├── VoiceFab   ← NUEVO — botón mic flotante
    │   ├── VoiceHUD   ← NUEVO — muestra pregunta + texto en tiempo real
    │   └── VoiceProductoWizard  ← NUEVO — modal del flujo guiado
    └── {children}
```

### Archivos nuevos

```
app/lib/voz/
  comandos.ts          ← Parsea frases de navegación → ruta
  numeros.ts           ← Convierte "dos mil quinientos" → 2500
  variantes.ts         ← Parsea "S cinco M diez L tres" → VarianteInput[]
  tipos.ts             ← Tipos compartidos del sistema de voz

app/components/voz/
  VoiceProvider.tsx    ← Context, máquina de estados, SpeechRecognition
  VoiceFab.tsx         ← Botón flotante mic (fixed, bottom-right)
  VoiceHUD.tsx         ← Overlay con pregunta actual + texto interim
  VoiceProductoWizard.tsx  ← Modal de confirmación antes de guardar
```

### Archivos modificados

```
app/components/layout/AppShell.tsx         ← Agrega VoiceProvider + VoiceFab + VoiceHUD
app/app/actions/productos.ts               ← Agrega obtenerDatosParaVoz() server action
```

---

## Diseño Técnico Detallado

### 1. Máquina de estados (`tipos.ts`)

```ts
type VozPaso =
  | 'inactivo'
  | 'escuchando_nav'        // modo navegación — un utterance, acción directa
  | 'producto_nombre'
  | 'producto_precio'
  | 'producto_variantes_yn' // "¿tiene variantes? sí o no"
  | 'producto_variantes'    // "S cinco M diez L tres"
  | 'producto_stock_simple' // sin variantes: stock total
  | 'producto_categoria'    // opcional
  | 'producto_confirmar'    // resumen + "¿guardar?"
  | 'producto_guardando'
  | 'producto_listo'
  | 'producto_error'

interface ProductoDraft {
  nombre?: string
  precioVenta?: number
  tieneVariantes?: boolean
  // con variantes
  variantes?: Array<{ label: string; tallaId: string | null; stock: number }>
  // sin variantes
  stockSimple?: number
  categoriaId?: string | null
  categoriaNombre?: string | null
}

interface VozContextValue {
  paso: VozPaso
  draft: ProductoDraft
  textoInterim: string   // lo que escucha en tiempo real (antes del final)
  textoFinal: string     // último utterance reconocido
  error: string | null
  iniciarNav(): void
  iniciarProducto(): void
  cancelar(): void
}
```

### 2. Parser de navegación (`comandos.ts`)

Mapeo de palabras clave → rutas. Normalización básica (minúsculas, sin tildes):

```ts
const RUTAS: Array<{ keywords: string[]; ruta: string }> = [
  { keywords: ['inicio', 'dashboard', 'home'],           ruta: '/dashboard' },
  { keywords: ['pos', 'vender', 'punto de venta'],       ruta: '/pos' },
  { keywords: ['ventas', 'venta'],                       ruta: '/ventas' },
  { keywords: ['devoluciones', 'devolucion'],            ruta: '/devoluciones' },
  { keywords: ['remitos', 'remito'],                     ruta: '/remitos' },
  { keywords: ['productos', 'producto'],                 ruta: '/productos' },
  { keywords: ['stock', 'inventario'],                   ruta: '/stock' },
  { keywords: ['caja'],                                  ruta: '/caja' },
  { keywords: ['clientes', 'cliente'],                   ruta: '/clientes' },
  { keywords: ['configuracion', 'configuración'],        ruta: '/configuracion' },
  { keywords: ['planes', 'plan', 'suscripcion'],         ruta: '/planes' },
]

// Trigger words que activan el modo nav
const TRIGGERS_NAV = ['ir a', 'abrir', 'mostrar', 'llevar a', 'navegar a', 'ir al']

// Trigger words que activan el flujo de producto
const TRIGGERS_PRODUCTO = ['nuevo producto', 'cargar producto', 'agregar producto', 'alta producto']

export function parsearComandoNav(texto: string): string | null
export function esComandoProducto(texto: string): boolean
```

### 3. Parser de números (`numeros.ts`)

El Speech API en Chrome/Edge con español **generalmente** convierte números hablados a dígitos directamente. "dos mil quinientos" → `"2500"`. Para cubrir los casos donde no lo hace:

```ts
// Primero intenta parseo directo de dígitos
// Si falla, convierte palabras a número
// Maneja: cero-novecientos noventa y nueve, mil, X mil, millón
// Acepta punto o coma como separador decimal
export function parsearNumero(texto: string): number | null
```

Palabras base mapeadas:
```
cero→0, uno/una→1, dos→2, tres→3, cuatro→4, cinco→5,
seis→6, siete→7, ocho→8, nueve→9, diez→10, once→11,
doce→12, trece→13, catorce→14, quince→15, veinte→20,
treinta→30, cuarenta→40, cincuenta→50, sesenta→60,
setenta→70, ochenta→80, noventa→90, cien/ciento→100,
doscientos→200, trescientos→300, cuatrocientos→400,
quinientos→500, seiscientos→600, setecientos→700,
ochocientos→800, novecientos→900, mil→1000
```

### 4. Parser de variantes (`variantes.ts`)

**Input esperado:** `"S cinco M diez L tres"` o `"S 5 M 10 L 3"` o `"talla S cinco"`

**Normalización de nombres de talla:**
```ts
const LETRAS_ESPAÑOL: Record<string, string> = {
  'ese': 's', 'eme': 'm', 'ele': 'l',
  'equis ele': 'xl', 'equis eme': 'xm',
  'doble ele': 'xxl', 'doble equis ele': 'xxl',
  'pe': 'p', 'eme eme': 'mm', 'ge': 'g'
}
// Normaliza letras habladas en español a su representación
// Luego hace match case-insensitive contra tallas disponibles
```

**Output:**
```ts
Array<{
  label: string          // nombre original de la talla
  tallaId: string | null // null si no matchea ninguna talla disponible
  stock: number
}>
```

**Algoritmo:**
1. Tokenizar por comas o espacios
2. Detectar tokens que son nombres de talla (coinciden con tallas disponibles, después de normalizar)
3. El token siguiente al nombre es el stock (número)
4. Si no hay match exacto → `tallaId: null` pero guardar el label para mostrar en confirmación

### 5. Server action `obtenerDatosParaVoz()`

Nueva función en `app/actions/productos.ts`:
```ts
// Retorna tallas, colores y categorías de la tienda para el wizard
export async function obtenerDatosParaVoz(): Promise<{
  tallas: Talla[]
  colores: Color[]
  categorias: Categoria[]
}>
```
Se llama una sola vez cuando se inicia el flujo de producto (lazy). Los resultados se cachean en el estado del wizard para la sesión.

### 6. VoiceProvider — flujo de navegación

```
1. Usuario presiona FAB → paso = 'escuchando_nav'
2. SpeechRecognition arranca (continuous: false, lang: 'es-AR')
3. Al recibir resultado final:
   a. parsearComandoNav(texto) → ruta → router.push(ruta) → paso = 'inactivo'
   b. esComandoProducto(texto) → paso = 'producto_nombre' (inicia wizard)
   c. Sin match → toast "No entendí. Intentá: 'ir a productos'" → paso = 'inactivo'
```

### 7. VoiceProvider — flujo de producto

```
paso: producto_nombre
  → SpeechRecognition arranca
  → draft.nombre = transcript
  → paso: producto_precio

paso: producto_precio
  → draft.precioVenta = parsearNumero(transcript)
  → si null → pide de nuevo ("No entendí el precio, ¿cuánto?")
  → paso: producto_variantes_yn

paso: producto_variantes_yn
  → si transcript incluye "si/sí/variantes/tallas" → draft.tieneVariantes = true → paso: producto_variantes
  → si incluye "no/ninguna/sin" → draft.tieneVariantes = false → paso: producto_stock_simple

paso: producto_variantes
  → parsearVariantes(transcript, tallasDisponibles) → draft.variantes
  → si ninguna variante parseada → pide de nuevo
  → paso: producto_categoria

paso: producto_stock_simple
  → draft.stockSimple = parsearNumero(transcript)
  → paso: producto_categoria

paso: producto_categoria
  → si "ninguna/no/saltar/omitir" → draft.categoriaId = null
  → si match con categoriaNombre → draft.categoriaId = id
  → paso: producto_confirmar

paso: producto_confirmar
  → muestra resumen en VoiceProductoWizard
  → SpeechRecognition: espera "sí/confirmar/guardar" o "no/cancelar"
  → "sí" → paso: producto_guardando → llama crearProducto()
  → "no" → paso: inactivo (cancela todo)
```

### 8. VoiceFab — estados visuales

```
inactivo         → ícono mic, gris oscuro, z-50
escuchando_nav   → ícono mic, verde pulsante (animate-pulse)
en flujo producto → ícono distinto, lime, muestra número de paso (1/5)
error            → ícono mic-off, rojo
```

Posición: `fixed bottom-6 right-6` — encima del Toaster (`z-50`)

### 9. VoiceHUD — overlay informativo

Aparece siempre que `paso !== 'inactivo'`. Panel flotante `fixed bottom-20 right-6`:

```
┌─────────────────────────────────────┐
│ 🎙 Paso 2 de 5                      │
│ ¿Cuál es el precio de venta?        │
│                                     │
│  "dos mil quinientos..."  ← interim │
└─────────────────────────────────────┘
```

- Muestra: número de paso, pregunta actual, texto interim en gris
- Botón ✕ para cancelar el flujo
- No tapa el contenido (pequeño, esquina inferior derecha)

### 10. VoiceProductoWizard — modal de confirmación

Se muestra solo en `paso === 'producto_confirmar'`. Modal centrado con:

```
Remera básica manga corta
Precio: $2.500
Variantes: S×5 | M×10 | L×3
Categoría: Ropa dama

[✓ Confirmar con voz o click]  [✗ Cancelar]
```

Acepta confirmación por voz O por click (accesibilidad).

---

## Limitaciones y manejo de errores

| Escenario | Comportamiento |
|-----------|----------------|
| Navegador sin soporte Speech API | FAB oculto, sin error visible |
| Sin micrófono / permiso denegado | Toast: "Permiso de micrófono denegado" |
| Chrome en móvil con ruido | El texto interim se muestra en tiempo real; si el resultado es incorrecto el usuario puede tocar ✕ y repetir |
| Talla no reconocida | Se guarda con `tallaId: null`, en confirmación aparece en naranja: "S (no encontrada en tu catálogo)" |
| `crearProducto()` falla | `paso = 'producto_error'`, mensaje legible, botón "Intentar de nuevo" |
| Precio no parseado 2 veces seguidas | Toast amigable + cancela el flujo |

---

## Tareas de Implementación

- [ ] **Paso 1** — Crear `lib/voz/tipos.ts`
- [ ] **Paso 2** — Crear `lib/voz/numeros.ts` (parsearNumero)
- [ ] **Paso 3** — Crear `lib/voz/variantes.ts` (parsearVariantes + normalizarTalla)
- [ ] **Paso 4** — Crear `lib/voz/comandos.ts` (parsearComandoNav + esComandoProducto)
- [ ] **Paso 5** — Agregar `obtenerDatosParaVoz()` en `app/actions/productos.ts`
- [ ] **Paso 6** — Crear `components/voz/VoiceProvider.tsx` (context + state machine + SpeechRecognition)
- [ ] **Paso 7** — Crear `components/voz/VoiceHUD.tsx`
- [ ] **Paso 8** — Crear `components/voz/VoiceProductoWizard.tsx`
- [ ] **Paso 9** — Crear `components/voz/VoiceFab.tsx`
- [ ] **Paso 10** — Modificar `components/layout/AppShell.tsx` para integrar VoiceProvider
- [ ] **Paso 11** — Verificar TypeScript sin errores (`npx tsc --noEmit`)
- [ ] **Paso 12** — Prueba manual: navegación + flujo de producto completo

---

## Notas de Implementación

- `SpeechRecognition` es browser-only → todos los componentes de voz son `'use client'`
- `typeof window === 'undefined'` guard en VoiceProvider para SSR
- `recognition.lang = 'es-AR'` para máxima precisión con acento argentino
- `recognition.interimResults = true` para mostrar el texto en tiempo real en VoiceHUD
- `recognition.continuous = false` — cada paso es un utterance independiente; esto es más robusto que `continuous: true` que puede cortar frases largas
- El parseo de variantes usa las tallas que `obtenerDatosParaVoz()` devuelve al inicio del flujo, no hay re-fetch
- Si la tienda no tiene tallas configuradas → el flujo de variantes pregunta directamente el stock simple, skipea el paso de variantes
