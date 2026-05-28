# Plan: POS UX Velocidad de Caja

**Creado:** 2026-05-27
**Estado:** Borrador
**Pedido:** Rediseñar el flujo del POS para agilizar la operación: grilla colapsable, chip de último producto agregado con ajuste de cantidad sin scrollear, y botones +/− en el carrito.

---

## Descripción General

El POS actual tiene tres fricciones principales que enlentecen la caja:

1. **Grilla siempre visible** — invasiva con muchos productos/categorías; ruido innecesario para usuarios con scanner.
2. **Sin scanner: scroll obligatorio** — después de agregar un producto, el cajero tiene que scrollear hasta el Carrito para ajustar la cantidad.
3. **Inputs de cantidad** — el `<input type="number">` en el carrito es lento y propenso a errores de tipeo.

---

## Layout Actual vs Target

### Actual
```
[Col 3/5]
  ① Buscador
  ② GrillaProductos — SIEMPRE visible (invasiva)
  ③ Carrito — queda muy abajo
[Col 2/5]
  ④ PanelPago
```

### Target
```
[Col 3/5]
  ① Buscador + botón "Catálogo ▾"    ← grilla colapsable
  ② Chip "último agregado" [−][qty][+]  ← nuevo, solo cuando hay ítem
  ③ GrillaProductos (COLAPSADA por defecto)
  ④ Carrito con botones +/−
[Col 2/5]
  ④ PanelPago (sin cambios)
```

---

## Cambios

### Cambio 1 — Grilla colapsable por defecto
- Estado `grillaAbierta: boolean` en `POSContainer`, **default `false`**
- Botón toggle junto al header de búsqueda: "📦 Catálogo" / "Cerrar catálogo"
- Condición de render: `{!buscadorQuery && grillaAbierta && <GrillaProductos />}`
- Cuando el usuario empieza a buscar (`buscadorQuery !== ''`) la grilla se oculta igual que antes

### Cambio 2 — Chip "último producto agregado"
- **Nuevo componente** `UltimoAgregadoChip.tsx`
- Aparece entre el buscador y el carrito cada vez que se agrega un ítem (scanner, búsqueda manual o grilla)
- Muestra: nombre + variante + cantidad actual en carrito + botones `[−]` y `[+]`
- Se auto-descarta a los 4 segundos de inactividad (timer se reinicia si se agrega el mismo producto otra vez)
- Botón `×` para descartar manualmente
- Para unidades decimales (kg, litro…) muestra solo info sin +/− (esas cantidades se manejan por el `PesoModal`)

### Cambio 3 — Botones +/− en Carrito (unidades enteras)
- En `Carrito.tsx`, tanto en vista desktop (tabla) como en vista mobile: reemplazar el `<input type="number">` de **cantidad** por un grupo `[−] qty [+]`
- Para unidades decimales (kg, litro, metro…) conservar el input numérico (no tiene sentido hacer +1 en 1.350 kg)
- El **input de precio unitario** no cambia (sigue siendo input)

---

## Archivos a Modificar

| Archivo | Tipo |
|---------|------|
| `app/components/pos/UltimoAgregadoChip.tsx` | NUEVO |
| `app/components/pos/POSContainer.tsx` | Modificar |
| `app/components/pos/Carrito.tsx` | Modificar |

---

## Tareas

### TAREA 1 — Nuevo componente `UltimoAgregadoChip.tsx`

Crear `app/components/pos/UltimoAgregadoChip.tsx`:

```tsx
'use client'

import type { CartItem } from './POSContainer'
import { useRubro } from '@/components/layout/RubroProvider'

/** Unidades vendidas en cantidad continua (decimales) */
const UNIDADES_DECIMALES = new Set(['kg', 'gramo', 'litro', 'metro', 'm2', 'm3', 'tonelada'])

interface UltimoAgregadoChipProps {
  item: CartItem
  onIncrement: () => void
  onDecrement: () => void
  onDismiss: () => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export function UltimoAgregadoChip({ item, onIncrement, onDecrement, onDismiss }: UltimoAgregadoChipProps) {
  const { labelVar1, usarVar2 } = useRubro()
  const decimal = UNIDADES_DECIMALES.has(item.unidad_de_medida)
  const variante = [item.talla, usarVar2 ? item.color : null].filter(Boolean).join(' · ')
  const subtotal = item.precio_unitario * item.cantidad

  return (
    <div className="flex items-center gap-3 bg-lime-50 border border-lime-200 rounded-xl px-4 py-2.5 shadow-sm animate-in slide-in-from-top-2 duration-200">
      {/* Indicador verde */}
      <div className="h-2 w-2 rounded-full bg-lime-500 shrink-0" />

      {/* Info del producto */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 truncate">
          {item.producto_nombre}
          {variante && <span className="text-gray-400 font-normal ml-1">· {variante}</span>}
          {item.es_pack && item.pack_cantidad && (
            <span className="ml-1.5 text-[10px] text-lime-700 bg-lime-100 border border-lime-200 px-1.5 py-0.5 rounded font-semibold">
              Pack ×{item.pack_cantidad}
            </span>
          )}
        </p>
        <p className="text-[11px] text-gray-400">
          {formatARS(item.precio_unitario)} c/u · Total: {formatARS(subtotal)}
        </p>
      </div>

      {/* Controles de cantidad — solo para unidades enteras */}
      {!decimal ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onDecrement}
            className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-base leading-none font-bold"
            aria-label="Reducir cantidad"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-[14px] font-bold text-gray-900 tabular-nums">
            {item.cantidad}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700 transition-colors text-base leading-none font-bold"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>
      ) : (
        <span className="text-[13px] font-bold text-gray-700 tabular-nums shrink-0">
          {item.cantidad} {item.unidad_de_medida}
        </span>
      )}

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        className="h-6 w-6 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors text-lg leading-none shrink-0"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}
```

---

### TAREA 2 — Modificar `POSContainer.tsx`

**2a.** Agregar import del nuevo componente:
```typescript
import { UltimoAgregadoChip } from './UltimoAgregadoChip'
```

**2b.** Agregar estados y ref en el cuerpo del componente (después de `buscadorQuery` state):
```typescript
const [grillaAbierta, setGrillaAbierta] = useState(false)
const [ultimoAgregadoId, setUltimoAgregadoId] = useState<string | null>(null)
const ultimoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

**2c.** Al final de la función `agregarVariante`, antes de cerrar la función, agregar el tracking del último ítem (solo para unidades NO medibles, las medibles las maneja `confirmarPeso`):
```typescript
// Si la unidad NO es medible, mostrar el chip inmediatamente
if (!UNIDADES_MEDIBLES.has(v.unidad_de_medida)) {
  setUltimoAgregadoId(v.id)
  if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
  ultimoTimerRef.current = setTimeout(() => setUltimoAgregadoId(null), 4000)
}
```

> Nota: `agregarVariante` hace early return cuando la unidad ES medible (abre PesoModal). El tracking para esas unidades va en `confirmarPeso`.

**2d.** Al final de `confirmarPeso` (después de llamar a `agregarVariante`), agregar:
```typescript
setUltimoAgregadoId(pesoModalPendiente.variante.id)  // ya está desestructurada antes
if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
ultimoTimerRef.current = setTimeout(() => setUltimoAgregadoId(null), 4000)
```

> Nota: en `confirmarPeso` la variante es `pesoModalPendiente.variante` antes de llamar `setPesoModalPendiente(null)`. Hay que capturarla antes.

**2e.** En la función `reset`, limpiar el estado:
```typescript
setUltimoAgregadoId(null)
if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
```

**2f.** Computar el item del chip (antes del return):
```typescript
const ultimoItem = ultimoAgregadoId ? (items.find((it) => it.id === ultimoAgregadoId) ?? null) : null
```

**2g.** En el render, reemplazar el card de búsqueda y la condición de la grilla:

Cambiar el header del card de búsqueda de:
```tsx
<div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
  <span className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400">Buscar o escanear producto</span>
</div>
```
A:
```tsx
<div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-2">
  <span className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400">Buscar o escanear</span>
  {!buscadorQuery && productos.length > 0 && (
    <button
      type="button"
      onClick={() => setGrillaAbierta((v) => !v)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
        grillaAbierta
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <span>📦</span>
      {grillaAbierta ? 'Cerrar catálogo' : 'Catálogo'}
    </button>
  )}
</div>
```

**2h.** Agregar el chip entre el banner de "código no encontrado" y la grilla:
```tsx
{/* Chip último agregado */}
{ultimoItem && (
  <UltimoAgregadoChip
    item={ultimoItem}
    onIncrement={() => {
      const siguiente = Math.min(ultimoItem.stock_actual, round2(ultimoItem.cantidad + 1))
      actualizarItem(ultimoItem.id, { cantidad: siguiente })
      if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
      ultimoTimerRef.current = setTimeout(() => setUltimoAgregadoId(null), 4000)
    }}
    onDecrement={() => {
      if (ultimoItem.cantidad <= 1) {
        eliminarItem(ultimoItem.id)
        setUltimoAgregadoId(null)
      } else {
        actualizarItem(ultimoItem.id, { cantidad: round2(ultimoItem.cantidad - 1) })
        if (ultimoTimerRef.current) clearTimeout(ultimoTimerRef.current)
        ultimoTimerRef.current = setTimeout(() => setUltimoAgregadoId(null), 4000)
      }
    }}
    onDismiss={() => setUltimoAgregadoId(null)}
  />
)}
```

**2i.** Cambiar la condición de la grilla:
```tsx
{/* Era: {!buscadorQuery && <GrillaProductos .../>} */}
{!buscadorQuery && grillaAbierta && (
  <GrillaProductos productos={productos} onSelect={agregarVariante} />
)}
```

---

### TAREA 3 — Modificar `Carrito.tsx`: botones +/− para unidades enteras

El carrito tiene dos vistas: **mobile** y **desktop (tabla)**. Ambas se modifican de la misma manera para las unidades enteras.

**Vista mobile** — reemplazar el bloque `<div className="flex items-center gap-1.5"> <label>Cant.</label> <input ...>`:

```tsx
<div className="flex items-center gap-1.5">
  <label className="text-[11px] text-gray-400 font-medium">Cant.</label>
  {decimal ? (
    <input
      type="number"
      min={0.001}
      step={0.001}
      value={it.cantidad}
      onChange={(e) => {
        const raw = parseFloat(e.target.value)
        const val = isNaN(raw) ? 0.001 : Math.max(0.001, raw)
        onUpdate(it.id, { cantidad: val })
      }}
      className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400"
    />
  ) : (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          if (it.cantidad <= 1) onRemove(it.id)
          else onUpdate(it.id, { cantidad: it.cantidad - 1 })
        }}
        className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors font-bold text-base leading-none"
      >−</button>
      <span className="min-w-[2rem] text-center text-[13px] font-bold text-gray-900 tabular-nums">
        {it.cantidad}
      </span>
      <button
        type="button"
        onClick={() => onUpdate(it.id, { cantidad: it.cantidad + 1 })}
        className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700 transition-colors font-bold text-base leading-none"
      >+</button>
    </div>
  )}
  {decimal && (
    <span className="text-[11px] text-gray-400">{it.unidad_de_medida}</span>
  )}
</div>
```

**Vista desktop (tabla)** — reemplazar el contenido de la `<td>` de cantidad (la que tiene `<div className="flex items-center gap-1.5"> <input type="number" ...>`):

```tsx
<td className="px-4 py-3">
  {decimal ? (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0.001}
        step={0.001}
        value={it.cantidad}
        onChange={(e) => {
          const raw = parseFloat(e.target.value)
          const val = isNaN(raw) ? 0.001 : Math.max(0.001, raw)
          onUpdate(it.id, { cantidad: val })
        }}
        className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 tabular-nums"
      />
      <span className="text-[11px] text-gray-400">{it.unidad_de_medida}</span>
    </div>
  ) : (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          if (it.cantidad <= 1) onRemove(it.id)
          else onUpdate(it.id, { cantidad: it.cantidad - 1 })
        }}
        className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors font-bold text-base leading-none"
      >−</button>
      <span className="min-w-[2.5rem] text-center text-[13px] font-bold text-gray-900 tabular-nums">
        {it.cantidad}
      </span>
      <button
        type="button"
        onClick={() => onUpdate(it.id, { cantidad: it.cantidad + 1 })}
        className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700 transition-colors font-bold text-base leading-none"
      >+</button>
    </div>
  )}
</td>
```

---

## Comportamientos del chip — edge cases

| Situación | Comportamiento |
|-----------|---------------|
| Scanner escanea el mismo producto 2 veces | Chip se actualiza (muestra ×2), timer se reinicia |
| Scanner escanea producto diferente | Chip cambia al nuevo producto |
| Usuario hace click `[+]` en el chip | Cantidad incrementa, timer se reinicia 4s |
| Usuario hace click `[−]` con cantidad 1 | Ítem eliminado del carrito, chip desaparece |
| Pasa 4 segundos sin interacción | Chip desaparece suavemente |
| Venta cobrada (`reset()`) | Chip desaparece, timer cancelado |
| Producto vendido por peso (kg/litro) | Chip muestra info sin +/− (modal ya maneja la cantidad) |

---

## Notas de implementación

- `animate-in slide-in-from-top-2 duration-200` en el chip requiere `tailwindcss-animate` (ya instalado en el proyecto).
- El timer usa `useRef` para evitar stale closures.
- El chip lee la `cantidad` del array `items` en tiempo real → siempre muestra la cantidad actual del carrito, no la del momento de agregar.
- No hay cambios en el servidor ni en la base de datos — 100% client-side.
- No se toca el `PanelPago`, ni el `BuscadorVariantes`, ni la lógica de cobro.

---

## Resumen de archivos

| Archivo | Tipo de cambio |
|---------|---------------|
| `app/components/pos/UltimoAgregadoChip.tsx` | NUEVO |
| `app/components/pos/POSContainer.tsx` | Estados + render |
| `app/components/pos/Carrito.tsx` | Controles de cantidad |
