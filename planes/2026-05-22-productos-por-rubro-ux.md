# Plan: Productos por rubro — UX inteligente y flujo limpio

**Creado:** 2026-05-22
**Estado:** Borrador
**Pedido:** Adaptar el flujo de creación y gestión de productos según el rubro, comenzando por despensa/kiosco. Resolver la confusión de colores hexadecimales en presentaciones, el texto "tallas/colores" genérico, el estado inicial del toggle variantes, y clarificar el modelo mental de "un barcode = un producto".

---

## Descripción General

El sistema de productos fue diseñado inicialmente para **ropa** (Talla × Color = matriz de variantes). Al extenderse a otros rubros, se adaptaron las **etiquetas** (`labelVar1='Marca'`, `labelVar2='Presentación'`) pero no el **comportamiento del UI**. Resultado: una despensa ve el picker de colores hexadecimales en la pestaña "Presentaciones", el texto "Con tallas, colores u otras opciones" y el botón "⚡ Generar desde matriz" — todos conceptos de ropa.

También hay confusión con el modelo de datos: ¿cómo manejar Cerveza Quilmes Individual vs Pack de 6? La respuesta es clara y el plan la documenta.

---

## Análisis Profundo: El Modelo de Datos

### ¿Barcode individual vs pack comparten código?

**No.** En la realidad:
- Quilmes 340ml lata → EAN `7790895000764` → $800
- Quilmes Pack 6 latas → EAN `7790895000771` → $4800

Son barcodes distintos. El sistema soporta dos modelos:

**Modelo A — Variantes (recomendado para presentaciones del mismo producto base):**
```
Producto: "Cerveza Quilmes"
├── Variante: [Individual, —] → EAN 7790895000764 → $800
└── Variante: [Pack 6, —]     → EAN 7790895000771 → $4800
```
Ventaja: lista de productos limpia. Desventaja: UI de variantes más compleja.

**Modelo B — Productos separados (más simple para kiosco):**
```
Producto: "Quilmes Individual" → EAN 7790895000764 → $800
Producto: "Quilmes Pack 6"     → EAN 7790895000771 → $4800
```
Ventaja: máxima simplicidad. En POS: scan → venta directa, sin seleccionar variante.

**Para despensa, el Modelo B es el flujo natural**: cada barcode escaneado = un producto único. El toggle de variantes debería estar OFF por defecto y la UX debe favorecerlo.

### El problema de la pestaña "Marcas" vs "Presentaciones"

El usuario ve bajo "Marcas": 250g, 500g, 1kg, 250ml... Eso es un **error de seed** — esos valores son presentaciones/tamaños, no marcas. El sistema es correcto conceptualmente:
- **Marcas** (`tallas` tabla) → Sancor, Quilmes, Marolio, Arcor...
- **Presentaciones** (`colores` tabla) → 1L, 2L, 500ml, 250g, 1kg...

El dato malo fue cargado en el tab equivocado. Se resolverá con guía en pantalla y placeholders correctos.

---

## Problemas Identificados

### P1 — Presentaciones muestra hex picker para todos los rubros
**Archivo:** `app/app/(dashboard)/productos/colores/page.tsx`  
La página pasa `extraType="color"` a `TaxonomyManager` siempre. Para despensa, "Presentación" es un texto ("1L", "2L") no un color hex.

### P2 — InlineCreate en VariantesEditor agrega colores con hex para todos
**Archivo:** `app/components/productos/VariantesEditor.tsx`  
La creación rápida de var2 (`withColor` en `InlineCreate`) debería solo activarse para `ropa`.

### P3 — Toggle de variantes dice "Con tallas, colores u otras opciones"
**Archivo:** `app/components/productos/ProductoForm.tsx`  
Texto hard-codeado con conceptos de ropa. Debe usar `labelVar1`/`labelVar2` del rubro.

### P4 — Toggle de variantes inicia en ON (con variantes) para despensa
**Archivo:** `app/components/productos/ProductoForm.tsx` + `app/lib/rubro/config.ts`  
Para kiosco, el 90% de productos son simples (un barcode, sin variantes). El toggle debería iniciar en OFF para rubros como `despensa`, `carniceria`, `verduleria`, `farmacia`.

### P5 — "⚡ Generar desde matriz" no tiene sentido para despensa
**Archivo:** `app/components/productos/VariantesEditor.tsx`  
La matriz (todas las combinaciones Marca×Presentación) es útil para ropa (XS/S/M × Rojo/Azul). Para despensa genera combinaciones absurdas (Sancor × 1L, Sancor × 2L... lo cual es correcto pero el concepto "matriz" confunde). Ocultar para rubros no-ropa.

### P6 — Placeholders de "Marcas" no guían bien al usuario  
**Archivo:** `app/app/(dashboard)/productos/tallas/page.tsx`  
El placeholder del input de nueva talla dice "Nuevo marca" — genérico. Para despensa debería decir "Ej: Sancor, Quilmes, Marolio".

---

## Cambios a Implementar

### Cambio 1: `ConfigRubro` — agregar `defaultSinVariantes` y `usarHexVar2`

**Archivo:** `app/lib/rubro/config.ts`

Agregar dos nuevos campos a la interface `ConfigRubro`:
```ts
/** El toggle de variantes inicia en OFF (producto simple) */
defaultSinVariantes: boolean
/** La var2 usa color hexadecimal (true solo para ropa) */
usarHexVar2: boolean
```

Valores por rubro:
| Rubro | defaultSinVariantes | usarHexVar2 |
|---|---|---|
| ropa | false | true |
| ferreteria | false | false |
| corralon | false | false |
| despensa | **true** | false |
| libreria | false | false |
| generico | false | false |
| carniceria | **true** | false |
| farmacia | **true** | false |
| verduleria | **true** | false |

---

### Cambio 2: Pestaña "Presentaciones" sin hex para non-ropa

**Archivo:** `app/app/(dashboard)/productos/colores/page.tsx`

Cuando `cfg.usarHexVar2 === false`:
- Cambiar `extraType` de `"color"` a `"text"` 
- Cambiar `extraLabel` de `"Hex"` a `""` (sin campo extra — presentaciones son solo nombres)
- Cambiar `extraPlaceholder` acorde
- Actualizar el párrafo descriptivo para que no mencione "hex"

```tsx
// Antes (siempre):
extraType="color"
extraLabel="Hex"
extraPlaceholder="#FF0000"

// Después (condicional):
extraType={cfg.usarHexVar2 ? 'color' : undefined}
extraLabel={cfg.usarHexVar2 ? 'Hex' : undefined}
extraPlaceholder={cfg.usarHexVar2 ? '#FF0000' : undefined}
```

Verificar que `TaxonomyManager` acepte `extraType/extraLabel/extraPlaceholder` como opcionales.

---

### Cambio 3: InlineCreate var2 sin hex para non-ropa

**Archivo:** `app/components/productos/VariantesEditor.tsx`

Leer `usarHexVar2` del `useRubro()` hook (una vez implementado el Cambio 1):
```tsx
const { labelVar1, labelVar2, usarVar2, usarHexVar2 } = useRubro()

// En el InlineCreate de var2:
<InlineCreate
  label={labelVar2}
  withColor={usarHexVar2}   // solo true para ropa
  ...
/>
```

---

### Cambio 4: ProductoForm — toggle con texto dinámico y estado inicial inteligente

**Archivo:** `app/components/productos/ProductoForm.tsx`

**4a — Texto del toggle:**
```tsx
// Antes:
'Con tallas, colores u otras opciones'
'Producto único, sin variantes'

// Después (usando useRubro):
const { labelVar1, labelVar2, usarVar2, defaultSinVariantes } = useRubro()

// Descripción dinámica:
tieneVariantes
  ? usarVar2
    ? `Con ${labelVar1.toLowerCase()} y ${labelVar2.toLowerCase()}`
    : `Con ${labelVar1.toLowerCase()}`
  : 'Producto único — un solo código de barras'
```

**4b — Estado inicial del toggle:**
```tsx
// Antes:
const [tieneVariantes, setTieneVariantes] = useState<boolean>(
  modo === 'editar' ? true : !initialCodigoBarras || (initialVariantes?.length ?? 0) > 0
)

// Después:
const [tieneVariantes, setTieneVariantes] = useState<boolean>(
  modo === 'editar'
    ? true
    : initialCodigoBarras
      ? false                                      // barcode-first → siempre simple
      : (initialVariantes?.length ?? 0) > 0
        ? true                                     // ya tiene variantes cargadas
        : !defaultSinVariantes                     // por defecto del rubro
)
```

Para despensa: `defaultSinVariantes=true` → el toggle inicia en **OFF** (sin variantes).

---

### Cambio 5: MatrizGenerador — ocultar para non-ropa

**Archivo:** `app/components/productos/VariantesEditor.tsx`

El `MatrizGenerador` solo tiene sentido cuando el rubro usa combinaciones 2D (Var1 × Var2) de forma matricial. Para ropa eso es XS × Rojo, S × Rojo, M × Rojo...

Agregar condición:
```tsx
// Mostrar MatrizGenerador solo si el rubro no usa defaultSinVariantes
// (es decir, rubros que naturalmente trabajan con variantes matriciales)
const { usarHexVar2 } = useRubro()

{usarHexVar2 && (
  <MatrizGenerador ... />
)}
```

Justificación: `usarHexVar2` es true solo para `ropa`, que es el único rubro con matriz real. Para ferretería/corralón los atributos son más lineales y la matriz genera ruido.

---

### Cambio 6: Placeholder dinámico en pestaña Marcas

**Archivo:** `app/app/(dashboard)/productos/tallas/page.tsx`

Agregar placeholder descriptivo al `TaxonomyManager` según rubro:
- Para despensa: `"Ej: Sancor, Quilmes, Marolio"`
- Para ropa: `"Ej: XS, S, M, L, XL"`
- Para ferretería: `"Ej: 6mm, 8mm, 10mm"`
- Genérico: `"Nuevo ${cfg.labelVar1.toLowerCase()}"`

Agregar `createPlaceholder?: string` como prop opcional a `TaxonomyManager`, o simplemente pasar el texto dinamicamente.

También actualizar el párrafo descriptivo para reflejar bien el propósito:
- Despensa: "Definí las **marcas** disponibles (Sancor, Quilmes, Arcor...). Se usan como primera dimensión al crear variantes."

---

## Archivos a Modificar

| Archivo | Cambio | Complejidad |
|---|---|---|
| `app/lib/rubro/config.ts` | Agregar `defaultSinVariantes` y `usarHexVar2` a todos los rubros | Baja |
| `app/app/(dashboard)/productos/colores/page.tsx` | extraType/extraLabel condicional | Baja |
| `app/app/(dashboard)/productos/tallas/page.tsx` | Placeholder dinámico | Baja |
| `app/components/productos/VariantesEditor.tsx` | `withColor` condicional + ocultar MatrizGenerador | Media |
| `app/components/productos/ProductoForm.tsx` | Texto dinámico toggle + estado inicial por rubro | Media |

**No se requieren cambios de base de datos.**

---

## Orden de Implementación

1. `config.ts` — agregar los dos nuevos campos (base de todo lo demás)
2. `colores/page.tsx` — fix hex picker (visible, impacto inmediato)
3. `tallas/page.tsx` — placeholder descriptivo
4. `ProductoForm.tsx` — toggle texto + default state
5. `VariantesEditor.tsx` — withColor condicional + ocultar MatrizGenerador

---

## QA / Verificación

- [ ] Rubro `despensa`: nueva pestaña Presentaciones no muestra hex, solo nombre
- [ ] Rubro `despensa`: nuevo producto → toggle inicia en OFF (sin variantes)
- [ ] Rubro `despensa`: al activar toggle → texto dice "Con marcas y presentaciones" (no "tallas, colores")
- [ ] Rubro `despensa`: MatrizGenerador no aparece en VariantesEditor
- [ ] Rubro `despensa`: InlineCreate de presentación en variantes no muestra picker de color
- [ ] Rubro `ropa`: todo funciona igual que antes (hex, matriz, texto tallas/colores, toggle ON)
- [ ] POS: escanear barcode de producto simple (sin variantes) va directo a venta ✓

---

## Modelo Mental Correcto para Despensa (documentar en pantalla)

Este bloque se puede usar como texto de ayuda contextual en el futuro:

```
💡 Cómo manejar tus productos:
• Cada código de barras = un producto. Cargalo como producto simple (sin variantes).
• Si vendés "Leche 1L" y "Leche 2L" de la misma marca, tenés dos opciones:
  — Dos productos separados (más simple, recomendado)
  — Un producto "Leche" con dos presentaciones (1L y 2L), cada una con su propio barcode
```
