# Plan: Rediseño UX/UI etiqueta — layout profesional que replica el preview exactamente

**Creado:** 2026-05-29
**Estado:** Implementado ✅
**Pedido:** El barcode es muy alto y visualmente feo. Profesionalizar la etiqueta para que se vea como el preview del diseñador.

---

## Descripción General

El problema raíz es que `buildTsplEtiqueta` usa un layout **top-down** donde el barcode "llena el espacio sobrante" (`H*0.6` = 15mm de alto en etiqueta 25mm), mientras que `EtiquetaRenderer.tsx` usa un layout **space-between** con el barcode anclado abajo a una altura fija del 30% del alto (`alto_mm*0.3` = 7.5mm). Resultado: el físico se ve muy diferente al preview.

### Diferencia actual

| Atributo | Preview (EtiquetaRenderer.tsx) | TSPL actual | Esperado |
|---|---|---|---|
| Layout | `space-between` (texto arriba, barcode abajo) | top-down (todo apilado) | space-between |
| Alto barcode | `max(5mm, min(10mm, alto*0.3))` = 7.5mm | `H*0.6` = 15mm | 7.5mm (60 dots) |
| Número de código | Solo si `mostrar_codigo=true`, centrado | Solo si `mostrar_codigo=true` | igual |
| Precio | Con línea separadora arriba del barcode | Sin separador | idem preview |
| Distribución vertical | Nombre+variante centrados en zona libre | Pegados arriba | centrados |

---

## Diseño objetivo (50×25mm, sin precio, con barcode)

```
┌─────────────────────────────────┐  ← y=0
│                                 │  TOP_PAD = 16 dots (2mm)
│  ADIDDAS BAD BUNNY              │  y=16, font "2", 16 dots alto
│  42 / BLANCO/MARRON             │  y=34, font "2", 16 dots alto
│                                 │
│         ← ~80 dots vacíos →     │  espacio central libre
│                                 │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  y=128, 60 dots alto (7.5mm), centrado
│      7 7 9 1 2 3 4 5 6 7 8 9 8 │  y=190, font "1" (si mostrar_codigo=true)
│                                 │  BOT_PAD = 12 dots (1.5mm)
└─────────────────────────────────┘  ← y=200
```

Con precio:
```
┌─────────────────────────────────┐
│  REMERA BASICA ALGODON          │  y=16
│  M / NEGRO                      │  y=34
│                                 │  espacio libre
│  $ 12.500                       │  y = barcY - gap - priceH (anclado desde abajo)
│  ─────────────────────────      │  línea separadora (BARLINE)
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  barcode anclado a y=H-BOT-barcH
└─────────────────────────────────┘
```

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `scripts/printbridge-v3/src/renderer.js` | Reescribir solo la sección de layout dentro de `buildTsplEtiqueta` |

---

## Tareas

### Tarea 1 — Cambiar barcH al 30% del alto (igual que el preview)

**Archivo:** `renderer.js` → dentro del bloque `if (mostrarBarcode && codigo)`

**Actual:**
```js
const barcH = Math.min(barcHAvail, Math.round(H * 0.6))
```

**Nuevo:**
```js
// Replicar exactamente EtiquetaRenderer.tsx: max(5mm, min(10mm, alto_mm*0.3))
const barcHmm = Math.max(5, Math.min(10, h * 0.3))
const barcH   = Math.round(barcHmm * DOTS_PER_MM)   // para 25mm → 60 dots (7.5mm)
```

---

### Tarea 2 — Cambiar a layout space-between

El texto va anclado desde `TOP_PAD`, el barcode (con precio opcional encima) va anclado desde `H - BOT_PAD`.

**Algoritmo:**

```
// 1. Calcular posición del barcode (anclado desde abajo)
barcH   = max(5mm, min(10mm, h*0.3)) en dots
barcY   = H - BOT_PAD - barcH

// 2. Precio encima del barcode (si activo)
PRICE_GAP = 8 dots  // ~1mm separación
priceH    = tsplFontHeight(ptPrecio)
priceY    = barcY - PRICE_GAP - priceH   (solo si mostrarPrecio && precio)

// 3. Línea separadora entre precio y barcode
lineY = barcY - 4 (BARLINE comando TSPL, si mostrarPrecio && precio)

// 4. Texto: nombre + variante arriba en TOP_PAD
y = TOP_PAD
TEXT nombre en y
y += lineHNombre
TEXT variant en y  (si aplica)
```

---

### Tarea 3 — Número de código centrado bajo el barcode

Cuando `mostrar_codigo=true`, el texto del código va centrado bajo el barcode (igual que el preview que lo muestra como monospace centrado).

**Cálculo X centrado:**
```js
const codeStr  = codigo
const codeW    = codeStr.length * tsplCharWidth('"1"')  // 8 dots/char font "1"
const codeX    = Math.floor((W - codeW) / 2)
const codeY    = barcY + barcH + 2
```

---

### Tarea 4 — Eliminar test-barcode.js del repositorio

`scripts/printbridge-v3/test-barcode.js` fue creado temporalmente para debug. Borrarlo.

---

## Resultado esperado post-implementación

Para payload: `{ nombre:'Adiddas Bad Bunny', talla:'42', color:'Blanco/Marron', codigo:'7791234567898', precio: null, 50×25mm }`

```
SIZE 50 mm, 25 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
TEXT 20,16,"2",0,1,1,"ADIDDAS BAD BUNNY"
TEXT 20,34,"2",0,1,1,"42 / BLANCO/MARRON"
BARCODE <X centrado>,128,"128",60,0,0,<narrow>,<narrow>,"7791234567898"
PRINT 1,1
```

- Barcode en y=128: anchado desde H(200) - BOT_PAD(12) - barcH(60) = 128 ✓
- Barcode alto = 60 dots = 7.5mm (vs 120 dots = 15mm actual) ✓
- Espacio libre entre texto y barcode = 128 - 50 = 78 dots ≈ 9.7mm → distribuido visualmente ✓

---

## Validación

Después de implementar:
1. Ejecutar `node test-barcode.js` y verificar que `barcH=60` (no 120)
2. Reiniciar PrintBridge y hacer impresión física de prueba
3. Comparar con screenshot del preview web: texto arriba, espacio central, barcode proporcional abajo
4. El barcode debe verse como ~30% del alto visual de la etiqueta
