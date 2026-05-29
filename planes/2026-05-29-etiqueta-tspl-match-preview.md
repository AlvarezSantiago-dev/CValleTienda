# Plan: Fix completo impresión TSPL — igualar layout a la vista previa

**Creado:** 2026-05-29  
**Estado:** Implementado ✅  
**Pedido:** La etiqueta física impresa en TSPL no se parece a la vista previa del DisenadorEtiqueta. Hacer que ambas coincidan: centrado, jerarquía visual, sin desborde por nombres largos.

---

## Descripción General

### Qué Logra Este Plan

Reescribir `buildTsplEtiqueta` en `renderer.js` para que el output de comandos TSPL2 reproduzca fielmente el layout de `EtiquetaRenderer.tsx`: distribución vertical tipo *space-between*, barcode centrado, fuente adaptativa en nombres largos, truncado a 2 líneas, y separador `·` como en la preview.

### Por Qué Importa

El usuario diseñó su plantilla en la web y espera que la impresión física sea idéntica. Sin este fix, la etiqueta impresa es incómoda e impresentable para un negocio real que adhiere etiquetas a su mercadería.

---

## Estado Actual

### Estructura Relevante

| Archivo | Rol |
|---|---|
| `scripts/printbridge-v3/src/renderer.js` | Genera comandos TSPL2 — función `buildTsplEtiqueta` |
| `app/components/impresion/EtiquetaRenderer.tsx` | Vista previa HTML — fuente de verdad del diseño |
| `app/components/impresion/CodigoBarrasSVG.tsx` | Lógica de barcode SVG — fórmulas de tamaño reutilizables |
| `app/lib/impresion/types.ts` | Tipos `PlantillaEtiquetaPayload` y `PayloadEtiquetaItem` |

### Brechas que se Abordan

1. **Texto siempre pegado a la izquierda / arriba** — el preview usa distribución vertical `space-between` (header, body centrado, precio, barcode al fondo).
2. **Barcode no está centrado horizontalmente** — el preview centra el barcode con `alignItems: center`.
3. **Sin fuente adaptativa para nombres largos** — el preview reduce el font si `length > 25` o `> 40`.
4. **Sin truncado a 2 líneas** — TSPL no hace wrap automático; un nombre largo se desborda o sale cortado fuera de la etiqueta.
5. **Separador ` / ` en vez de ` · `** — detalle visual diferente al preview.
6. **Altura del barcode hardcodeada en 40 dots** — el preview usa `max(5mm, min(10mm, alto × 0.3))`.
7. **Precios con border-top visual** — se puede simular con una línea de guiones o simplemente el gap de separación.

---

## Análisis Técnico Previo a los Cambios

### Coordenadas TSPL2

La impresora 4BARCODE 3B-365B usa **203 DPI = 8 dots/mm**.

```
label width  = ancho_mm × 8  dots  (ej: 50mm → 400 dots)
label height = alto_mm  × 8  dots  (ej: 25mm → 200 dots)
```

Padding del preview: `2mm top/bottom, 2.5mm left/right`

```
leftPad   = round(2.5 × 8) = 20 dots
topPad    = round(2.0 × 8) = 16 dots
bottomPad = 16 dots
```

### Layout del EtiquetaRenderer (fuente de verdad)

```
┌─────────────────────────────────────────┐  ← top 2mm
│ [NOMBRE TIENDA] 6px, uppercase, gray    │  (si mostrar_nombre_tienda)
│─────────────────────────────────────────│  ← border-bottom 0.3px
│                                         │
│  [NOMBRE PRODUCTO] fzNombre, bold       │  ← centrado verticalmente
│  [TALLA · COLOR]   tamano_fuente_talla  │    en el body (flex:1)
│                                         │
│─────────────────────────────────────────│  ← border-top 0.3px
│ [PRECIO]  tamano_fuente_precio, bold    │
│─────────────────────────────────────────│
│        [██████ BARCODE ██████]          │  ← centrado horizontal
│        [codigo en texto]                │
└─────────────────────────────────────────┘  ← bottom 2mm
```

### Fórmulas clave del EtiquetaRenderer a replicar

```ts
// Fuente adaptativa (para nombre largo)
function fontSizeAdaptativo(base, largo) {
  if (largo > 40) return Math.round(base * 0.75)
  if (largo > 25) return Math.round(base * 0.85)
  return base
}

// Altura del barcode
barcodeHeightMm = Math.max(5, Math.min(10, alto_mm * 0.3))
// Ej: 25mm → max(5, min(10, 7.5)) = 7.5mm → 60 dots
```

### Mapeo de fuentes TSPL2 (203 DPI)

Las fuentes internas de impresoras TSC compatibles:

| Font ID | Alto aprox. en dots | Equivalente CSS px | Uso |
|---------|--------------------|--------------------|-----|
| `"1"`   | 12 dots (1.5mm)    | ≤ 8px              | nombre tienda, código texto |
| `"2"`   | 16 dots (2mm)      | 9–11px             | talla/color |
| `"3"`   | 24 dots (3mm)      | 12–14px            | nombre producto normal |
| `"4"`   | 32 dots (4mm)      | 15–20px            | precio, nombre grande |
| `"5"`   | 48 dots (6mm)      | > 20px             | precio muy grande |

La función `tsplFont` ya existente se ajusta con la fuente adaptativa del preview.

### Centrado del barcode en TSPL2

TSPL2 `BARCODE` no tiene parámetro de alineación. Se calcula la X manualmente:

```
// Code128: estimación de ancho en dots (narrow=2)
barcode_width_dots ≈ (str.length × 11 + 35) × narrow
// donde narrow = 2 (configuración actual)
barcodeX = max(leftPad, floor((w×8 - barcode_width_dots) / 2))
```

Este es un estimado; los módulos exactos varían según los caracteres Code128. Se usa `narrow=2` para que el barcode sea más ancho y legible.

### Truncado de nombres largos en TSPL2

TSPL2 no hace word wrap. Se implementa en JS:

```js
function tsplTruncate(text, font, maxWidthDots, xMul=1) {
  // ancho aproximado de un char en dots según font y xMul
  const charW = { "1":6, "2":8, "3":12, "4":16, "5":24 }
  const cw = (charW[font.replace(/"/g,'')] || 12) * xMul
  const maxChars = Math.floor(maxWidthDots / cw)
  if (text.length <= maxChars) return [text]
  // Intenta partir en 2 líneas al primer espacio antes del límite
  const line1 = text.slice(0, maxChars)
  const cutAt = line1.lastIndexOf(' ')
  if (cutAt > maxChars * 0.4) {
    return [text.slice(0, cutAt).trim(), text.slice(cutAt+1, cutAt+1+maxChars).trim()]
  }
  return [line1.trim(), text.slice(maxChars, maxChars*2).trim()]
}
```

Si hay 2 líneas, se emiten 2 comandos TEXT separados en Y consecutivos.

---

## Cambios Propuestos

### Resumen

- **Un solo archivo modificado**: `scripts/printbridge-v3/src/renderer.js`
- Reemplazar `buildTsplEtiqueta` completo con versión que replica el layout del preview
- Agregar helpers: `tsplFont`, `tsplFontHeight`, `tsplTruncate`, `estimateBarcodeWidth`

### Archivos a Modificar

| Ruta | Cambio |
|---|---|
| `scripts/printbridge-v3/src/renderer.js` | Reescribir `buildTsplEtiqueta` + agregar helpers de layout |

### Sin cambios en la app web

No hay cambios en `EtiquetaRenderer.tsx`, `DisenadorEtiqueta.tsx`, ni types — el payload ya tiene todo lo necesario.

---

## Diseño Detallado del Algoritmo

### Paso 1 — Constantes de layout

```js
const DOTS_PER_MM = 8
const W = Math.round(w * DOTS_PER_MM)         // ancho total en dots
const H = Math.round(h * DOTS_PER_MM)         // alto total en dots
const LEFT  = Math.round(2.5 * DOTS_PER_MM)  // margen izquierdo = 20 dots
const RIGHT = W - LEFT                        // límite derecho
const MAX_TEXT_W = RIGHT - LEFT               // ancho disponible para texto
const TOP_PAD    = Math.round(2 * DOTS_PER_MM) // 16 dots
const BOTTOM_PAD = TOP_PAD
```

### Paso 2 — Calcular sección inferior (anclar desde abajo)

```js
// Altura barcode = formula del preview
const barcodeHmm = Math.max(5, Math.min(10, h * 0.3))
const barcodeH   = Math.round(barcodeHmm * DOTS_PER_MM)

// Altura total del footer
let footerH = 0
if (mostrarBarcode && codigo) {
  footerH += barcodeH + 4   // 4 dots de gap arriba del barcode
  if (mostrarCodigo) footerH += 14  // texto del código debajo
}

// Y de inicio del footer
const footerY = H - BOTTOM_PAD - footerH
```

### Paso 3 — Calcular sección superior (anclar desde arriba)

```js
let headerBottomY = TOP_PAD
if (mostrarNombreTienda && nombreTienda) {
  // Fuente "1", alto 12 dots + 4 dots gap + 4 dots border visual
  headerBottomY += 12 + 8
}
```

### Paso 4 — Calcular posición del precio (ancla arriba del footer)

```js
// Gap entre precio y barcode = simula border-top del preview
const GAP_PRECIO_FOOTER = 8   // ~1mm
const priceH = tsplFontHeight(ptPrecio)

let precioY = null
if (mostrarPrecio && precio) {
  precioY = footerY - GAP_PRECIO_FOOTER - priceH
}
```

### Paso 5 — Calcular zona del cuerpo y centrar nombre+variante verticalmente

```js
const bodyTop    = headerBottomY
const bodyBottom = precioY != null ? (precioY - 8) : footerY - 8

// Tamaño adaptativo del nombre (replicar fontSizeAdaptativo del preview)
const ptNombreAdaptado = nombre.length > 40
  ? Math.round(ptNombre * 0.75)
  : nombre.length > 25
    ? Math.round(ptNombre * 0.85)
    : ptNombre

const fontNombre  = tsplFont(ptNombreAdaptado)
const lineHNombre = tsplFontHeight(ptNombreAdaptado)

// Truncar a 2 líneas si es necesario
const nombreLines = tsplTruncate(nombre, fontNombre, MAX_TEXT_W)
const contentH = nombreLines.length * lineHNombre + (variant ? tsplFontHeight(ptTalla) + 4 : 0)

// Centrar verticalmente en el body
const bodyH    = bodyBottom - bodyTop
const startY   = bodyTop + Math.max(0, Math.round((bodyH - contentH) / 2))
```

### Paso 6 — Emitir comandos TEXT en orden

```js
let y = TOP_PAD

// Header nombre tienda
if (mostrarNombreTienda && nombreTienda) {
  lines.push(`TEXT ${LEFT},${y},"1",0,1,1,"${tiendaStr}"`)
  y += 12 + 8
  // Simular border-bottom con una línea de guiones (opcional)
}

y = startY  // saltar al centrado del body

// Nombre producto (1 o 2 líneas)
for (const ln of nombreLines) {
  lines.push(`TEXT ${LEFT},${y},${fontNombre},0,1,1,"${ln}"`)
  y += lineHNombre
}

// Talla · Color
if (variant) {
  y += 2  // pequeño gap
  const fontTallaId = tsplFont(ptTalla)
  lines.push(`TEXT ${LEFT},${y},${fontTallaId},0,1,1,"${variant}"`)
}

// Precio
if (precioY != null) {
  lines.push(`TEXT ${LEFT},${precioY},${tsplFont(ptPrecio)},0,1,1,"${precio}"`)
}

// Barcode centrado
if (mostrarBarcode && codigo) {
  const narrow = 2
  const estBarW = estimateBarcodeWidth(codigo, narrow)
  const barcodeX = Math.max(LEFT, Math.floor((W - estBarW) / 2))
  const barcodeYpos = footerY
  lines.push(`BARCODE ${barcodeX},${barcodeYpos},"128",${barcodeH},0,0,${narrow},${narrow},"${codigo}"`)
  if (mostrarCodigo) {
    const codeY = barcodeYpos + barcodeH + 2
    lines.push(`TEXT ${LEFT},${codeY},"1",0,1,1,"${codigo}"`)
  }
}
```

### Función `estimateBarcodeWidth`

```js
function estimateBarcodeWidth(str, narrow = 2) {
  // Code128B: start(13) + data(11 * N) + check(11) + stop(13) modules
  // + quiet zones: 10 modules each side
  const modules = 11 * str.length + 13 + 11 + 13 + 20
  return modules * narrow
}
```

---

## Decisiones de Diseño

### Decisiones Clave

1. **No usar TSPL TEXT alignment=1 (center)**: Aunque algunas versiones de firmware TSC lo soportan, el `EtiquetaRenderer` NO centra el texto horizontalmente — lo alinea a la izquierda con padding. Mantener consistencia exacta con el preview.

2. **Barcode centrado con cálculo JS**: El preview centra el barcode via CSS `alignItems: center`. Replicar con X calculado usando estimación de módulos Code128B.

3. **Dos líneas de texto para nombre largo**: El preview usa `WebkitLineClamp: 2` y `WebkitBoxOrient: vertical`. TSPL no tiene equivalente nativo → se implementa partición en JS.

4. **Separador `·` en variante**: El preview usa `·` (U+00B7, interpunct). Verificar que el charset de la impresora lo soporte; si no, fallback a `-`.

5. **Simular `space-between` calculando Y desde abajo**: TSPL no tiene layout engine. Calcular `footerY` primero y construir el cuerpo hacia arriba.

6. **Sin cambios en la app web**: El payload ya es correcto. Solo se corrige el renderer en PrintBridge.

### Alternativas Descartadas

- **TSPL `TEXT` con alignment=1**: No confirmado en firmware 4BARCODE 3B-365B y texto está left-aligned en el preview de todas formas.
- **Imprimir via PDF/imagen rasterizada**: Requiere headless browser en PrintBridge, demasiado complejo.
- **Usar font × 2 (xMul=2)**: Distorsiona las proporciones; el preview usa fuentes del sistema a sus tamaños nativos.

---

## Tareas de Implementación

### T1 — Helpers de cálculo en renderer.js

Reemplazar los helpers actuales (`tsplFont`, `tsplFontHeight`) con versión mejorada + agregar `tsplTruncate` y `estimateBarcodeWidth`.

```js
// Mapeo CSS px → font TSPL (considerar adaptación aplicada antes)
function tsplFont(ptSize) {
  if (ptSize <= 8)  return '"1"'
  if (ptSize <= 11) return '"2"'
  if (ptSize <= 14) return '"3"'
  if (ptSize <= 20) return '"4"'
  return '"5"'
}

// Alto en dots que ocupa cada fuente (para calcular posición Y siguiente)
function tsplFontHeight(ptSize) {
  if (ptSize <= 8)  return 12
  if (ptSize <= 11) return 16
  if (ptSize <= 14) return 24
  if (ptSize <= 20) return 32
  return 48
}

// Ancho aproximado de un char en dots según font TSPL
function tsplCharWidth(fontStr) {
  const id = parseInt(fontStr.replace(/"/g, ''), 10)
  const widths = { 1: 8, 2: 10, 3: 16, 4: 20, 5: 28 }
  return widths[id] || 16
}

// Truncar texto a máximo 2 líneas según ancho disponible
function tsplTruncate(text, fontStr, maxWidthDots) {
  const cw = tsplCharWidth(fontStr)
  const maxChars = Math.floor(maxWidthDots / cw)
  if (!text || text.length <= maxChars) return [text]
  // Partir en espacio más cercano al límite
  const line1raw = text.slice(0, maxChars)
  const cut = line1raw.lastIndexOf(' ')
  if (cut > Math.floor(maxChars * 0.4)) {
    const l2 = text.slice(cut + 1, cut + 1 + maxChars)
    return [line1raw.slice(0, cut), l2 || '']
  }
  return [line1raw, text.slice(maxChars, maxChars * 2)]
}

// Estimación de ancho de Code128 en dots
function estimateBarcodeWidth(str, narrow) {
  const modules = 11 * str.length + 13 + 11 + 13 + 20
  return modules * narrow
}
```

### T2 — Reescribir `buildTsplEtiqueta` con layout space-between

Implementar el algoritmo completo descrito en Diseño Detallado. El resultado debe emitir:

```
SIZE 50 mm, 25 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
TEXT 20,16,"1",0,1,1,"MI TIENDA"        ← (si mostrar_nombre_tienda)
TEXT 20,40,"3",0,1,1,"Remera básica"    ← nombre (1 o 2 líneas)
TEXT 20,66,"2",0,1,1,"M · Negro"        ← variante (si aplica)
TEXT 20,100,"4",0,1,1,"$ 12.500,00"     ← precio (si aplica)
BARCODE 62,130,"128",60,0,0,2,2,"7791234567898"  ← barcode centrado
PRINT 1,1
```

Coordenadas Y calculadas dinámicamente según alto de etiqueta y campos activos.

### T3 — Probar con etiqueta 50×25mm (estándar)

Con el servidor corriendo, enviar un payload de prueba manual via `curl` o `Invoke-WebRequest`:

```json
{
  "plantilla": {
    "ancho_mm": 50, "alto_mm": 25,
    "mostrar_nombre": true, "mostrar_precio": true,
    "mostrar_talla": true, "mostrar_color": true,
    "mostrar_codigo": false, "mostrar_barcode": true,
    "mostrar_nombre_tienda": false,
    "tamano_fuente_nombre": 10,
    "tamano_fuente_precio": 14,
    "tamano_fuente_talla": 8
  },
  "simbolo_moneda": "$",
  "nombre_tienda": null,
  "items": [{
    "variante_id": "t1",
    "nombre_producto": "Remera básica algodón",
    "talla": "M", "color": "Negro",
    "codigo_barras": "7791234567898",
    "precio": 12500,
    "cantidad": 1
  }]
}
```

Verificar que la salida TSPL de `buildTsplEtiqueta` sea razonable antes de imprimir físicamente.

### T4 — Probar nombre largo

Testear con `nombre_producto: "Pantalón cargo slim fit talle especial con bolsillos"` (53 chars) para verificar que se trunca correctamente en 2 líneas sin desbordar.

### T5 — Probar con mostrar_nombre_tienda = true

Verificar que el header se imprime, desplaza el cuerpo hacia abajo y el layout sigue siendo proporcional.

### T6 — Imprimir físicamente y comparar con la vista previa

Abrir la página de Configuración → Avanzado → Etiquetas, ver la preview del diseñador, luego imprimir desde la pantalla de producto y comparar.

---

## Casos Edge a Cubrir

| Caso | Comportamiento Esperado |
|---|---|
| Sin código de barras | footerH = 0; precio y nombre ocupan más espacio |
| Sin precio | precioY = null; barcode sube |
| Sin talla ni color | No se emite la línea de variante |
| Nombre > 40 chars | Font reducida al 75%, truncado a 2 líneas |
| Etiqueta muy pequeña (25×15mm) | Barcode puede no caber; condicional `y + barcodeH <= H - bottomPad` |
| Etiqueta grande (100×50mm) | Todo tiene espacio; barcode más alto (10mm = 80 dots) |
| Código barras Code128 corto (8 chars) | Barcode más estrecho, centrado igual |
| Símbolo `·` no soportado | Charset PC858: verificar o fallback a ` / ` |

---

## Verificación Final

El plan está completo cuando:

- [ ] `buildTsplEtiqueta` emite TEXT y BARCODE con coordenadas calculadas dinámicamente
- [ ] Nombre largo (>25 chars) reduce la fuente y usa 2 líneas
- [ ] Barcode está centrado horizontalmente en la etiqueta
- [ ] El precio aparece pegado arriba del barcode (simula `space-between`)
- [ ] `testPrintEtiqueta` imprime físicamente una etiqueta visualmente correcta
- [ ] La impresión física coincide visualmente con la preview del DisenadorEtiqueta
