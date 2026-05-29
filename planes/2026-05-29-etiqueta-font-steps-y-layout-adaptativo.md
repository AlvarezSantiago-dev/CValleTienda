# Plan: Diseñador etiqueta — pasos reales TSPL, layout adaptativo, distancia barcode

**Creado:** 2026-05-29
**Estado:** Implementado ✅
**Pedido:** Mostrar los saltos reales de posibilidades de fuente. Ajuste completo para que todas las propiedades opcionales entren. Reajuste dinámico de la distancia del barcode.

---

## Descripción General

Tres problemas separados a resolver:

### Problema 1 — Sliders sin efecto real (DisenadorEtiqueta.tsx)
Los sliders van de 4 a 40px continuos, pero el firmware TSC solo tiene **4 fuentes bitmap**. El rango 4–11px produce exactamente el mismo resultado en papel. El usuario arrastra el slider y la vista previa cambia (CSS continuo) pero la impresión no cambia.

**Solución**: reemplazar los 3 sliders por un selector de **4 pasos discretos** que mapean exactamente a las 4 fuentes TSPL. Así preview = físico sin sorpresas.

### Problema 2 — Overflow con todo activado (renderer.js)
Con todos los campos habilitados + fuentes M/L en 50×25mm el layout actual desborda:

```
textEndY (tienda+nombre+variante) = 108 dots
footerH  (precio+sep+barcode+pad) = 116 dots
Total requerido = 224 dots > H=200 dots → OVERFLOW 24 dots
```

**Solución**: layout adaptativo en `buildTsplEtiqueta`:
1. Calcular `textEndY` dinámico
2. Calcular `footerH` dinámico
3. Si `textEndY + MIN_GAP + footerH ≤ H` → layout space-between normal
4. Si overflow → reducir `barcH` hasta el mínimo (40 dots = 5mm)
5. Si sigue sin entrar → cambiar a layout top-down (precio después del texto, barcode pegado)

### Problema 3 — Distancia rígida entre texto y barcode
Con poco contenido (sin tienda, sin variante, sin precio) el barcode queda anclado abajo pero hay demasiado espacio vacío en el centro. Con mucho contenido hay overflow. Necesita un `MIN_GAP_TEXT_BARC` de al menos 8 dots para que siempre haya un respiro visible.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `app/components/configuracion/DisenadorEtiqueta.tsx` | Reemplazar 3 `SliderRow` por `FontStepPicker` con 4 opciones |
| `scripts/printbridge-v3/src/renderer.js` | Layout adaptativo con `textEndY` dinámico y `barcH` compresible |

---

## Tareas

### Tarea 1 — `FontStepPicker`: 4 pasos que mapean a fuentes TSPL reales

**Archivo:** `DisenadorEtiqueta.tsx`

Los 4 pasos, con sus valores en px guardados en DB:

| Paso | px guardado | tsplFont() | Descripción |
|---|---|---|---|
| S | `10` | `"2"` (16 dots alto) | Pequeño |
| M | `12` | `"3"` (24 dots alto) | Mediano |
| L | `15` | `"4"` (32 dots alto) | Grande |
| XL | `21` | `"5"` (48 dots alto) | Extra grande |

**Nuevo componente** (inline en el mismo archivo, reemplaza `SliderRow`):

```tsx
interface FontStepPickerProps {
  label: string
  value: number
  onChange: (v: number) => void
}

const FONT_STEPS = [
  { label: 'S', value: 10, title: 'Pequeño' },
  { label: 'M', value: 12, title: 'Mediano' },
  { label: 'L', value: 15, title: 'Grande' },
  { label: 'XL', value: 21, title: 'Extra grande' },
]

function FontStepPicker({ label, value, onChange }: FontStepPickerProps) {
  // Snap value al paso más cercano
  const currentStep = FONT_STEPS.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  )

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-gray-700 min-w-[60px]">{label}</span>
      <div className="flex gap-1">
        {FONT_STEPS.map((step) => (
          <button
            key={step.value}
            type="button"
            title={step.title}
            onClick={() => onChange(step.value)}
            className={`w-9 h-8 rounded text-xs font-semibold border transition-colors ${
              currentStep.value === step.value
                ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Reemplazar en el JSX** la sección `<div className="space-y-3">` de "Tamaños de fuente":

```tsx
<div className="space-y-3">
  <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">
    Tamaño de fuente
  </h3>
  <FontStepPicker label="Nombre" value={form.tamano_fuente_nombre}
    onChange={(v) => patch('tamano_fuente_nombre', v)} />
  <FontStepPicker label="Precio" value={form.tamano_fuente_precio}
    onChange={(v) => patch('tamano_fuente_precio', v)} />
  <FontStepPicker label="Talla / Color" value={form.tamano_fuente_talla}
    onChange={(v) => patch('tamano_fuente_talla', v)} />
</div>
```

**Eliminar** `interface SliderRowProps` y `function SliderRow` (ya no se usan).

**Actualizar defaults** en `page.tsx` para que usen valores del step set:
```ts
const ETIQUETA_DEFAULTS = {
  ...
  tamano_fuente_nombre: 10,   // era 10 ✓
  tamano_fuente_precio: 15,   // era 14 → paso L más cercano
  tamano_fuente_talla: 10,    // era 9 → paso S
}
```

---

### Tarea 2 — Layout adaptativo en `buildTsplEtiqueta`

**Archivo:** `renderer.js` — reescribir la sección de layout (desde `// ── Layout SPACE-BETWEEN`)

**Algoritmo nuevo:**

```
PASO A: calcular textEndY (todo el bloque de texto de arriba)
─────────────────────────────────────────────────────────────
y = TOP_PAD
if mostrarNombreTienda && tienda → y += 18
for each nombreLine → y += lineHNombre
if variant → y += 2 + lineHTalla
textEndY = y

PASO B: calcular footerH (todo lo que va anclado abajo)
────────────────────────────────────────────────────────
// barcH inicial = max(5mm, min(10mm, alto*0.3)) igual que ahora
barcH = round(max(5, min(10, h*0.3)) * 8)

footerH = BOT_PAD
if mostrarBarcode && codigo:
  footerH += barcH
  if mostrarCodigo: footerH += 2 + 12   // 14 dots
if mostrarPrecio && precio:
  footerH += lineHPrecio + SEP_H + PRICE_GAP

PASO C: verificar si entra. Si no, comprimir barcH
──────────────────────────────────────────────────
MIN_GAP = 8   // mínimo 1mm entre texto y zona inferior
required = textEndY + MIN_GAP + footerH

if required > H:
  overflow = required - H
  barcH = max(40, barcH - overflow)   // comprimir hasta 5mm mínimo
  recalcular footerH con nuevo barcH

PASO D: calcular posiciones finales
────────────────────────────────────
// barcode: anclado desde abajo
codeTextH = (mostrarCodigo && codigo) ? 14 : 0
barcY = H - BOT_PAD - codeTextH - (codeTextH > 0 ? 2 : 0) - barcH

// precio: anclado sobre el barcode
priceY = (mostrarPrecio && precio)
  ? barcY - PRICE_GAP - SEP_H - lineHPrecio
  : null

// si el precio se montaría sobre el texto, pegarlo al texto
if priceY !== null && priceY < textEndY + 4:
  priceY = textEndY + 4
  // en este caso omitir el separador visual (muy comprimido)
  omitSep = true

PASO E: emitir en orden TOP → BOTTOM
─────────────────────────────────────
TEXT tienda
TEXT nombre (líneas)
TEXT variante
[espacio libre en el medio]
BAR separador (si !omitSep)
TEXT precio
BARCODE
TEXT código (si mostrar_codigo)
```

**Constante a agregar:**
```js
const MIN_GAP_TEXT_BARC = 8   // dots mínimos entre texto y zona de barcode
const BARC_H_MIN        = 40  // 5mm mínimo para que sea escaneable
```

---

### Tarea 3 — Verificación con casos extremos

Después de implementar, ejecutar el siguiente test en consola:

```js
// Caso extremo: TODO activado, fuente L (15px), 50×25mm
{
  plantilla: { ancho_mm:50, alto_mm:25,
    mostrar_nombre:true, mostrar_precio:true, mostrar_talla:true, mostrar_color:true,
    mostrar_codigo:true, mostrar_barcode:true, mostrar_nombre_tienda:true,
    tamano_fuente_nombre:15, tamano_fuente_precio:15, tamano_fuente_talla:10 },
  nombre_tienda:'Cabra TEST',
  items:[{ nombre_producto:'Adiddas Bad Bunny', talla:'42', color:'Blanco/Marron',
    codigo_barras:'7791234567898', precio:15000, cantidad:1 }]
}
```

**Resultado esperado**: todos los elementos aparecen, barcH ≥ 40 dots, sin coordenadas negativas.

También verificar el caso mínimo (solo barcode, sin texto):
```js
{ plantilla: { ancho_mm:50, alto_mm:25, mostrar_nombre:false, mostrar_precio:false,
  mostrar_talla:false, mostrar_color:false, mostrar_codigo:false, mostrar_barcode:true,
  mostrar_nombre_tienda:false, tamano_fuente_nombre:10, tamano_fuente_precio:10, tamano_fuente_talla:10 },
  items:[{ nombre_producto:'Test', codigo_barras:'7791234567898', precio:0, cantidad:1 }]
}
// Resultado esperado: barcH=60, barcY=128 (anclado desde abajo, sin compresión)
```

---

## Resultado visual esperado (50×25mm, todo activado, fuente M)

```
┌────────────────────────────────────┐
│ CABRA TEST                         │  ← tienda (16 dots → y=16)
│ ADIDDAS BAD BUNNY                  │  ← nombre (y=34)
│ 42 / BLANCO/MARRON                 │  ← variante (y=52)
│                                    │  ← gap ~8 dots
│ $ 15.000                           │  ← precio (anclado sobre barcode)
│ ─────────────────────────────────  │  ← separador
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← barcode comprimido (mín 5mm)
│     7 7 9 1 2 3 4 5 6 7 8 9 8     │  ← código (si activo)
└────────────────────────────────────┘
```

---

## Notas de implementación

- La `SliderRow` existente se elimina completamente de `DisenadorEtiqueta.tsx`
- Los valores 10/12/15/21 ya son los que `tsplFont()` mapea correctamente (≤11, ≤14, ≤20, >20)
- El preview web (`EtiquetaRenderer.tsx`) **no requiere cambios**: recibe los mismos px y el CSS los renderiza correctamente (el barcode CSS ya usa la fórmula `max(5mm, min(10mm, alto*0.3))`)
- No toca la DB: los campos `tamano_fuente_*` siguen siendo integers — solo cambia el UI de selección
