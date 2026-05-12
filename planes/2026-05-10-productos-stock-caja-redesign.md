# Plan: Rediseño Productos, Stock y Caja — Nuevo Design System

**Creado:** 2026-05-10
**Estado:** Borrador
**Pedido:** Rediseñar los módulos Productos, Stock y Caja para que usen el mismo design system del landing page (paleta lime, tipografía bold tracking negativo, botones rounded-full, bordes gray-100, 100% responsive con mobile cards).

---

## Descripción General

Tres módulos completos sin tocar desde el diseño original. Todos usan clases `indigo`, `green`, `blue` obsoletas, `border-gray-200`, `rounded-lg`, `text-gray-500` y headings `text-2xl font-semibold text-gray-900`. Hay **26 archivos** a modificar.

El redesign sigue exactamente los mismos tokens del landing/auth/dashboard/ventas ya implementados. Cada tabla larga recibe una capa de **mobile cards** (`sm:hidden`) para pantallas chicas.

---

## Design System Tokens (referencia)

```
Heading principal:    text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]
Subtitle:             text-[13px] text-gray-400
Section label:        text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400
Card border:          border border-gray-100 rounded-xl
CTA button:           bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold
Back/secondary btn:   border border-gray-200 rounded-full h-10 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50
Danger btn:           border border-red-200 text-red-600 rounded-full h-10 px-4 text-sm font-medium hover:bg-red-50
Link:                 text-lime-700 hover:text-lime-800 hover:underline
Focus ring:           focus:ring-2 focus:ring-lime-400/60 focus:outline-none
Table thead:          bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400
Table divide:         divide-y divide-gray-100
Badge completada:     bg-lime-50 text-lime-700 border border-lime-200 rounded-full px-2 py-0.5 text-xs font-semibold
Badge anulado:        bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 text-xs font-semibold
Badge neutro:         bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs font-semibold
Badge emitido/dark:   bg-[#0A0A0A]/5 text-[#0A0A0A] rounded-full px-2 py-0.5 text-xs font-semibold
Badge amber:          bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold
Empty state border:   border border-dashed border-gray-200 rounded-xl
```

---

## Archivos a Modificar (26 en total)

### MÓDULO PRODUCTOS (10 archivos)

1. `app/app/(dashboard)/productos/page.tsx`
2. `app/app/(dashboard)/productos/nuevo/page.tsx`
3. `app/app/(dashboard)/productos/[id]/page.tsx`
4. `app/app/(dashboard)/productos/categorias/page.tsx`
5. `app/app/(dashboard)/productos/tallas/page.tsx`
6. `app/app/(dashboard)/productos/colores/page.tsx`
7. `app/components/productos/TabsProductos.tsx`
8. `app/components/productos/ListaProductos.tsx`
9. `app/components/productos/ProductoForm.tsx`
10. `app/components/productos/TaxonomyManager.tsx`

### MÓDULO STOCK (9 archivos)

11. `app/app/(dashboard)/stock/page.tsx`
12. `app/app/(dashboard)/stock/[varianteId]/page.tsx`
13. `app/app/(dashboard)/stock/movimientos/page.tsx`
14. `app/components/stock/TablaStock.tsx`
15. `app/components/stock/FiltrosStock.tsx`
16. `app/components/stock/AlertaStockBajo.tsx`
17. `app/components/stock/IngresoForm.tsx`
18. `app/components/stock/AjusteForm.tsx`
19. `app/components/stock/MovimientosTabla.tsx`

### MÓDULO CAJA (7 archivos)

20. `app/app/(dashboard)/caja/page.tsx`
21. `app/app/(dashboard)/caja/sesiones/[id]/page.tsx`
22. `app/components/caja/SesionAbiertaPanel.tsx`
23. `app/components/caja/CerrarSesionForm.tsx`
24. `app/components/caja/AbrirSesionForm.tsx`
25. `app/components/caja/CierreDetalle.tsx`
26. `app/components/caja/ReopenCajaButton.tsx`

---

## Tareas de Implementación

---

### FASE 1 — MÓDULO PRODUCTOS

#### Paso 1 — `TabsProductos.tsx`

**Objetivo:** Nav tabs activo lime, borde inferior lime, scroll horizontal en mobile.

Cambios:
```
ANTES:  border-b border-gray-200
ANTES:  border-indigo-600 text-indigo-700  (activo)
ANTES:  border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300  (inactivo)

DESPUÉS: border-b border-gray-100
DESPUÉS: border-lime-600 text-lime-700  (activo)
DESPUÉS: border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200  (inactivo)
```

Además envolver `<ul>` en `<div className="overflow-x-auto">` para que los tabs no se rompan en mobile.

---

#### Paso 2 — `ListaProductos.tsx`

**Objetivo:** Mobile cards, tabla desktop con overflow-x-auto, estilos nuevos.

**Mobile cards (`sm:hidden`)** — antes del bloque de tabla, agregar:
```tsx
<div className="sm:hidden space-y-3">
  {items.map((p) => (
    <Link key={p.id} href={`/productos/${p.id}`}
      className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-[#0A0A0A]">{p.nombre}</span>
        <span className={p.stock_total === 0 ? 'text-red-600 font-semibold text-sm' : 'text-[#0A0A0A] font-semibold text-sm'}>
          {p.stock_total} u.
        </span>
      </div>
      <div className="text-[13px] text-gray-400 mt-0.5">{p.categoria?.nombre ?? 'Sin categoría'}</div>
      {p.codigo_base && <div className="text-[13px] font-mono text-gray-400">{p.codigo_base}</div>}
      <div className="mt-2 text-sm font-semibold text-lime-700">{formatARS(p.precio_venta)}</div>
    </Link>
  ))}
</div>
```

**Tabla desktop** — envolver en `<div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden"><div className="overflow-x-auto">`:
```
ANTES:  bg-white border border-gray-200 rounded-xl overflow-hidden (div wrapper)
ANTES:  bg-gray-50 text-gray-600 (thead)
ANTES:  font-medium (th)
ANTES:  hover:text-indigo-700 (link producto)

DESPUÉS: hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden (div externo)
         overflow-x-auto (div interno)
DESPUÉS: bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (thead tr class)
DESPUÉS: hover:text-lime-700 (link producto)
DESPUÉS: border-t border-gray-100 (rows ya tienen esto ✓)
```

---

#### Paso 3 — `ProductoForm.tsx`

**Objetivo:** Cards border-gray-100, section label estilo nuevo.

```
ANTES:  bg-white border border-gray-200 rounded-xl p-5 space-y-4 (ambas cards)
ANTES:  text-sm font-semibold text-gray-800 (section label "Información del producto")

DESPUÉS: bg-white border border-gray-100 rounded-xl p-5 space-y-4 (ambas cards)
DESPUÉS: text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400 (section label)
```

---

#### Paso 4 — `TaxonomyManager.tsx`

**Objetivo:** Cards border-gray-100, thead texto gris claro, edit row lime, links lime.

```
ANTES:  bg-white border border-gray-200 rounded-xl p-5 (form card)
ANTES:  bg-white border border-gray-200 rounded-xl overflow-hidden (tabla card)
ANTES:  bg-gray-50 text-gray-600 (thead)
ANTES:  border-t border-gray-100 bg-indigo-50/30 (edit row)
ANTES:  text-xs text-indigo-600 hover:underline (Editar button)

DESPUÉS: border-gray-100 (ambas cards)
DESPUÉS: bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (thead)
DESPUÉS: border-t border-gray-100 bg-lime-50/40 (edit row)
DESPUÉS: text-xs text-lime-700 hover:underline (Editar button)
```

---

#### Paso 5 — Pages páginas productos (6 archivos)

Todos los 6 pages (`page.tsx`, `nuevo/page.tsx`, `[id]/page.tsx`, `categorias/page.tsx`, `tallas/page.tsx`, `colores/page.tsx`):

**`productos/page.tsx`**:
```
ANTES:  text-2xl font-semibold text-gray-900  →  text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]
ANTES:  text-sm text-gray-500 mb-5  →  text-[13px] text-gray-400 mb-5
```

**`productos/nuevo/page.tsx`**:
```
ANTES:  text-2xl font-semibold text-gray-900 mb-1  →  text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1
ANTES:  text-sm text-gray-500 mb-5  →  text-[13px] text-gray-400 mb-5
```

**`productos/[id]/page.tsx`**:
```
ANTES:  text-2xl font-semibold text-gray-900  →  text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]
ANTES:  text-sm text-gray-500  →  text-[13px] text-gray-400
```
Nota: `EliminarProductoButton` usa `Button variant="danger"` que el sistema ya maneja.

**`categorias/page.tsx`** (y tallas/colores — igual patrón):
```
ANTES:  text-2xl font-semibold text-gray-900 mb-1  →  text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1
ANTES:  text-sm text-gray-500 mb-5  →  text-[13px] text-gray-400 mb-5
```

---

### FASE 2 — MÓDULO STOCK

#### Paso 6 — `AlertaStockBajo.tsx`

**Objetivo:** Badges al nuevo estilo con border + fondo suave.

```
ANTES:  bg-red-100 text-red-800   (sin stock)
ANTES:  bg-amber-100 text-amber-800  (bajo stock)

DESPUÉS: bg-red-50 text-red-600 border border-red-200   (sin stock)
DESPUÉS: bg-amber-50 text-amber-700 border border-amber-200  (bajo stock)
```

Los dots `bg-red-500` y `bg-amber-500` se mantienen.

---

#### Paso 7 — `TablaStock.tsx`

**Objetivo:** Mobile cards, tabla desktop con nuevos estilos, link lime.

**Mobile cards (`sm:hidden`)** — antes del bloque de tabla:
```tsx
<div className="sm:hidden space-y-3">
  {items.map((it) => {
    const diferencia = it.stock_actual - it.stock_minimo
    return (
      <div key={it.id} className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold text-[#0A0A0A] text-sm">{it.producto_nombre}</span>
          <AlertaStockBajo stockActual={it.stock_actual} stockMinimo={it.stock_minimo} />
        </div>
        {(usarVar1 || usarVar2) && (
          <div className="text-[13px] text-gray-400 mb-1 flex items-center gap-1.5">
            {usarVar2 && it.color_hex && (
              <span className="h-3 w-3 rounded-full border border-gray-200 inline-block"
                style={{ backgroundColor: it.color_hex }} />
            )}
            {[usarVar1 ? it.talla : null, usarVar2 ? it.color : null].filter(Boolean).join(' / ') || '—'}
          </div>
        )}
        {it.codigo_barras && (
          <div className="font-mono text-xs text-gray-400 mb-2">{it.codigo_barras}</div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.08em] text-gray-400 mr-1">Stock</span>
            <span className="font-bold text-[#0A0A0A]">{formatNumber(it.stock_actual)}</span>
            {it.stock_minimo > 0 && (
              <span className="text-[13px] text-gray-400 ml-2">/ mín {formatNumber(it.stock_minimo)}</span>
            )}
          </div>
          <Link href={`/stock/${it.id}`} className="text-xs text-lime-700 hover:underline font-medium">
            Ajustar →
          </Link>
        </div>
      </div>
    )
  })}
</div>
```

**Tabla desktop** — envolver en `<div className="hidden sm:block bg-white rounded-xl border border-gray-100 overflow-hidden">`:
```
ANTES:  bg-white rounded-xl border border-gray-200 overflow-hidden (wrapper)
ANTES:  bg-gray-50 text-gray-600 text-xs uppercase tracking-wide (thead)
ANTES:  text-indigo-600 hover:underline text-xs font-medium (Ajustar link)
ANTES:  border border-dashed border-gray-300 (empty state)

DESPUÉS: hidden sm:block bg-white rounded-xl border border-gray-100 overflow-hidden (wrapper)
DESPUÉS: bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (thead tr)
DESPUÉS: text-lime-700 hover:underline text-xs font-medium (Ajustar link)
DESPUÉS: border border-dashed border-gray-200 (empty state)
```

---

#### Paso 8 — `FiltrosStock.tsx`

**Objetivo:** Border gray-100, grid responsive, checkbox lime.

```
ANTES:  bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 gap-3 items-end
        con: md:grid-cols-5 o md:grid-cols-4 dinámico

DESPUÉS: bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end
         con: lg:grid-cols-5 o lg:grid-cols-4 dinámico
         (usar template literal: `... ${usarVar2 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`)

ANTES:  h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500  (checkbox)
DESPUÉS: h-4 w-4 rounded border-gray-200 text-lime-600 focus:ring-lime-400/60 focus:ring-offset-0  (checkbox)
```

---

#### Paso 9 — `IngresoForm.tsx` y `AjusteForm.tsx`

**`IngresoForm.tsx`**:
```
ANTES:  bg-white rounded-xl border border-gray-200 p-5 space-y-4  (form card)
ANTES:  font-semibold text-gray-900  (h3)
ANTES:  bg-green-50 text-green-800 border border-green-200  (feedback ok)

DESPUÉS: bg-white rounded-xl border border-gray-100 p-5 space-y-4
DESPUÉS: text-sm font-semibold text-[#0A0A0A]
DESPUÉS: bg-lime-50 text-lime-800 border border-lime-200
```

**`AjusteForm.tsx`**:
```
ANTES:  bg-white rounded-xl border border-gray-200 p-5 space-y-4
ANTES:  font-semibold text-gray-900  (h3)
(Feedback ok ya es verde — actualizar igual al lime)

DESPUÉS: bg-white rounded-xl border border-gray-100 p-5 space-y-4
DESPUÉS: text-sm font-semibold text-[#0A0A0A]
(feedback ok → bg-lime-50 text-lime-800 border border-lime-200)
```

---

#### Paso 10 — `MovimientosTabla.tsx`

**Objetivo:** Badges con border, thead gray-400, links lime, border-gray-100.

```
ANTES tipoBadge:
  entrada:    bg-green-100 text-green-800
  salida:     bg-red-100 text-red-800
  ajuste:     bg-blue-100 text-blue-800
  devolucion: bg-amber-100 text-amber-800
  inicial:    bg-gray-100 text-gray-700

DESPUÉS tipoBadge:
  entrada:    bg-lime-50 text-lime-700 border border-lime-200
  salida:     bg-red-50 text-red-600 border border-red-200
  ajuste:     bg-[#0A0A0A]/5 text-[#0A0A0A]
  devolucion: bg-amber-50 text-amber-700 border border-amber-200
  inicial:    bg-gray-100 text-gray-600

ANTES:  bg-white rounded-xl border border-gray-200 overflow-hidden
ANTES:  bg-gray-50 text-gray-600 text-xs uppercase tracking-wide (thead)
ANTES:  text-indigo-600 hover:underline font-medium (link variante)
ANTES:  text-indigo-600 hover:underline (Ticket link)
ANTES:  border border-dashed border-gray-300 (empty state)

DESPUÉS: bg-white rounded-xl border border-gray-100 overflow-hidden
DESPUÉS: bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (thead)
DESPUÉS: text-lime-700 hover:underline font-medium (link variante)
DESPUÉS: text-lime-700 hover:underline (Ticket link)
DESPUÉS: border border-dashed border-gray-200 (empty state)
```

---

#### Paso 11 — `stock/page.tsx`

```
ANTES:  text-2xl font-bold text-gray-900  →  text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]
ANTES:  text-sm text-gray-500 mt-1  →  text-[13px] text-gray-400 mt-1
```

---

#### Paso 12 — `stock/[varianteId]/page.tsx`

**Objetivo:** Back link lime, heading nuevo, subtitle nuevo, Stat cards border-gray-100, heading "Últimos movimientos" nuevo.

```
ANTES:  text-sm text-indigo-600 hover:underline (← Volver a stock)
ANTES:  text-2xl font-bold text-gray-900 mt-1
ANTES:  text-sm text-gray-500 mt-0.5
ANTES:  bg-white rounded-xl border border-gray-200 p-4 (Stat cards)
ANTES:  text-xs text-gray-500 (Stat label)
ANTES:  text-2xl font-bold mt-1 (Stat value)
ANTES:  text-lg font-semibold text-gray-900 mb-3 (h2 "Últimos movimientos")

DESPUÉS: text-sm text-lime-700 hover:text-lime-800 hover:underline
DESPUÉS: text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-1
DESPUÉS: text-[13px] text-gray-400 mt-0.5
DESPUÉS: bg-white rounded-xl border border-gray-100 p-4 (Stat cards)
DESPUÉS: text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (Stat label)
DESPUÉS: text-[22px] font-bold mt-1 (Stat value — reducir levemente)
DESPUÉS: text-[15px] font-semibold text-[#0A0A0A] mb-3 (h2 "Últimos movimientos")
```

Función `Stat` interna:
```
ANTES:  text-xs text-gray-500  →  text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400
ANTES:  text-2xl font-bold mt-1  →  text-[22px] font-bold mt-1
ANTES:  text-red-700  →  text-red-600 (tone danger)
ANTES:  border border-gray-200  →  border-gray-100
```

---

#### Paso 13 — `stock/movimientos/page.tsx`

**Objetivo:** Back link lime, heading nuevo, filtros border-gray-100, inputs focus lime, botones rounded-full.

```
ANTES:  text-sm text-indigo-600 hover:underline (← Volver a stock)
ANTES:  text-2xl font-bold text-gray-900 mt-1
ANTES:  text-sm text-gray-500 mt-1
ANTES:  bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end
ANTES:  w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm (select + date inputs)
ANTES:  bg-indigo-600 rounded-lg hover:bg-indigo-700 (Filtrar button)
ANTES:  border border-gray-300 rounded-lg bg-white hover:bg-gray-50 (Limpiar link)

DESPUÉS: text-sm text-lime-700 hover:text-lime-800 hover:underline
DESPUÉS: text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-1
DESPUÉS: text-[13px] text-gray-400 mt-1
DESPUÉS: border-gray-100 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 (form card)
DESPUÉS: w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm
         focus:outline-none focus:ring-2 focus:ring-lime-400/60 (select + date)
DESPUÉS: bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold
DESPUÉS: border border-gray-200 rounded-full h-10 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50
```

---

### FASE 3 — MÓDULO CAJA

#### Paso 14 — `AlertaStockBajo.tsx` ya cubierto en Paso 6.

#### Paso 15 — `AbrirSesionForm.tsx`

```
ANTES:  bg-white border border-gray-200 rounded-xl p-6 max-w-md space-y-4
ANTES:  text-lg font-semibold text-gray-900
ANTES:  text-sm text-gray-500 mt-1

DESPUÉS: bg-white border border-gray-100 rounded-xl p-6 max-w-md space-y-4
DESPUÉS: text-base font-semibold text-[#0A0A0A]
DESPUÉS: text-[13px] text-gray-400 mt-1
```

---

#### Paso 16 — `CerrarSesionForm.tsx`

```
ANTES:  bg-white border border-gray-200 rounded-xl p-6 max-w-xl space-y-4
ANTES:  text-lg font-semibold text-gray-900
ANTES:  text-sm text-gray-500 mt-1
ANTES:  border-t border-gray-200 (div separador)

DESPUÉS: bg-white border border-gray-100 rounded-xl p-6 max-w-xl space-y-4
DESPUÉS: text-base font-semibold text-[#0A0A0A]
DESPUÉS: text-[13px] text-gray-400 mt-1
DESPUÉS: border-t border-gray-100
```

---

#### Paso 17 — `SesionAbiertaPanel.tsx`

**Objetivo:** Badge caja abierta lime, heading nuevo, stats border-gray-100, tabla interna border-gray-100, emergency button rounded-full, modal buttons rounded-full.

```
ANTES:  bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 (badge Caja abierta)
        h-1.5 w-1.5 bg-green-500 (dot)

DESPUÉS: bg-lime-50 border border-lime-200 px-2.5 py-1 text-xs font-semibold text-lime-700 (badge)
         h-1.5 w-1.5 bg-lime-500 animate-pulse (dot)

ANTES:  text-lg font-semibold text-gray-900 mt-2 (h2 "Sesión activa")
ANTES:  text-sm text-gray-500 mt-0.5
DESPUÉS: text-base font-semibold text-[#0A0A0A] mt-2
DESPUÉS: text-[13px] text-gray-400 mt-0.5

ANTES:  px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 (emergency btn)
DESPUÉS: h-8 px-3 rounded-full border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50

ANTES: Función Stat:
  rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5
  text-xs text-gray-500  (label)
  text-base font-semibold (value)
  text-green-700  (tone ok)
  text-amber-700  (tone warn)

DESPUÉS:
  rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5
  text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (label)
  text-base font-semibold (value)
  text-lime-700  (tone ok)
  text-amber-700  (tone warn — mantener)

ANTES: Observaciones:
  rounded-lg bg-gray-50 px-3 py-2 (ok, mantener)

ANTES: h3 "Saldo actual por cuenta":
  text-sm font-medium text-gray-900 mb-2
DESPUÉS: text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2

ANTES: tabla interna:
  rounded-lg border border-gray-200 overflow-hidden
  bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 (thead)
  divide-y divide-gray-200 (tbody)

DESPUÉS:
  rounded-xl border border-gray-100 overflow-hidden
  bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (thead)
  divide-y divide-gray-100 (tbody)

ANTES: Modal botones:
  px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg (Cancelar)
  px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg (Confirmar cierre)

DESPUÉS:
  h-10 px-4 text-sm font-medium text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 (Cancelar)
  h-10 px-4 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 (Confirmar — mantener rojo danger)
```

---

#### Paso 18 — `CierreDetalle.tsx`

**Objetivo:** Card border-gray-100, badges nuevos, Cell highlight lime, tablas border-gray-100.

```
ANTES:  bg-white border border-gray-200 rounded-xl p-6 space-y-5 (outer card)
DESPUÉS: bg-white border border-gray-100 rounded-xl p-6 space-y-5

ANTES: Badge "Cerrado":
  bg-gray-100 text-gray-700 rounded-full
DESPUÉS: bg-gray-100 text-gray-600 rounded-full

ANTES: Badge "Emergencia":
  bg-amber-100 text-amber-800 rounded-full
DESPUÉS: bg-amber-50 text-amber-700 border border-amber-200 rounded-full

ANTES:  text-lg font-semibold text-gray-900 mt-2 (h2)
DESPUÉS: text-base font-semibold text-[#0A0A0A] mt-2

ANTES: Función Cell (highlight):
  border-indigo-200 bg-indigo-50 (highlight=true)
  text-indigo-700 (highlight=true, value)
DESPUÉS:
  border-lime-200 bg-lime-50 (highlight=true)
  text-lime-800 (highlight=true, value)

ANTES: Sección Arqueo:
  rounded-lg border border-gray-200 bg-gray-50 p-4 (wrapper)
DESPUÉS: rounded-xl border border-gray-100 bg-gray-50 p-4

ANTES: h3 "Arqueo de efectivo" + "Desglose por cuenta":
  text-sm font-semibold text-gray-900 mb-2
DESPUÉS: text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2

ANTES: tabla desglose:
  rounded-lg border border-gray-200 overflow-hidden
  bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 (thead)
  divide-y divide-gray-200 (tbody)
DESPUÉS:
  rounded-xl border border-gray-100 overflow-hidden
  bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 (thead)
  divide-y divide-gray-100 (tbody)
```

---

#### Paso 19 — `ReopenCajaButton.tsx`

**Objetivo:** Trigger rounded-full, modal buttons rounded-full.

```
ANTES: trigger:  rounded-lg border border-amber-300 bg-amber-50 text-amber-800
DESPUÉS: trigger: rounded-full border border-amber-300 bg-amber-50 text-amber-800 (mantener colores amber, solo shape)

ANTES: Cancelar:  px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg
DESPUÉS: h-10 px-4 text-sm font-medium text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50

ANTES: Confirmar: px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg
DESPUÉS: h-10 px-4 text-sm font-semibold text-white bg-amber-600 rounded-full hover:bg-amber-700
```

---

#### Paso 20 — `caja/page.tsx`

**Objetivo:** Heading nuevo, links lime, historial responsive con mobile cards, badges lime, border-gray-100.

```
ANTES:  text-2xl font-bold text-gray-900 (h1)
ANTES:  text-sm text-gray-500 mt-1 (p)
DESPUÉS: text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]
DESPUÉS: text-[13px] text-gray-400 mt-1

ANTES: h2 "Último cierre realizado":
  text-sm font-semibold text-gray-700
DESPUÉS: text-[13px] font-semibold text-[#0A0A0A]

ANTES: Link "Ver detalle completo →":  text-xs text-indigo-600 hover:underline
DESPUÉS: text-xs text-lime-700 hover:underline

ANTES: h2 "Historial reciente":
  text-lg font-semibold text-gray-900 mb-3
DESPUÉS: text-[15px] font-semibold text-[#0A0A0A] mb-3

ANTES: empty state:
  border border-dashed border-gray-300
DESPUÉS: border border-dashed border-gray-200

ANTES: tabla historial:
  bg-white border border-gray-200 rounded-xl overflow-hidden
  thead: bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500
  tbody: divide-y divide-gray-200

DESPUÉS: hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden (div externo)
         overflow-x-auto (div interno)
         thead: bg-gray-50 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400
         tbody: divide-y divide-gray-100

ANTES: Badge "Abierta":  bg-green-100 text-green-800
DESPUÉS: bg-lime-50 text-lime-700 border border-lime-200

ANTES: Badge "Cerrada":  bg-gray-100 text-gray-700
DESPUÉS: bg-gray-100 text-gray-600

ANTES: diferencia_efectivo > 0:  text-blue-700
DESPUÉS: text-[#0A0A0A] font-semibold

ANTES: Link "Ver →":  text-xs text-indigo-600 hover:underline
DESPUÉS: text-xs text-lime-700 hover:underline

ANTES: Link "dashboard":  text-indigo-600 hover:underline
DESPUÉS: text-lime-700 hover:underline
```

**Mobile cards `sm:hidden`** — agregar antes del bloque de tabla de historial:
```tsx
<div className="sm:hidden space-y-3">
  {ultimas.map((s) => (
    <Link key={s.id} href={`/caja/sesiones/${s.id}`}
      className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-[#0A0A0A]">
          {formatDateTime(s.fecha_apertura)}
        </span>
        {s.estado === 'abierta' ? (
          <span className="inline-flex rounded-full bg-lime-50 px-2 py-0.5 text-xs font-semibold text-lime-700 border border-lime-200">Abierta</span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Cerrada</span>
        )}
      </div>
      <div className="text-[13px] text-gray-400">
        {nombreUsuario(s.usuario_apertura) ?? 'Sin usuario'}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[13px] text-gray-600">
          {s.total_ventas_cantidad} ventas · {formatARS(s.total_ventas_monto)}
        </span>
        {s.diferencia_efectivo != null && (
          <span className={`text-xs font-semibold ${s.diferencia_efectivo === 0 ? 'text-lime-700' : s.diferencia_efectivo > 0 ? 'text-[#0A0A0A]' : 'text-red-600'}`}>
            {s.diferencia_efectivo > 0 ? '+' : ''}{formatARS(s.diferencia_efectivo)}
          </span>
        )}
      </div>
    </Link>
  ))}
</div>
```

---

#### Paso 21 — `caja/sesiones/[id]/page.tsx`

```
ANTES: breadcrumb link "← Caja":
  text-sm text-gray-500 hover:text-indigo-600 hover:underline
DESPUÉS: text-sm text-lime-700 hover:text-lime-800 hover:underline

ANTES: h1 "Detalle de sesión":
  text-2xl font-bold text-gray-900
DESPUÉS: text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]

ANTES: p subtitle:
  text-sm text-gray-500 mt-1
DESPUÉS: text-[13px] text-gray-400 mt-1

ANTES: h2 "Cierre":
  text-sm font-semibold text-gray-700
DESPUÉS: text-[13px] font-semibold text-[#0A0A0A]

ANTES: empty state (sin cierre):
  border border-dashed border-gray-300
DESPUÉS: border border-dashed border-gray-200
```

---

### FASE 4 — VERIFICACIÓN

#### Paso 22 — `get_errors` en todos los archivos modificados

Correr `get_errors` sobre los 26 archivos. Reparar cualquier error TypeScript que haya surgido.

---

## Orden de Ejecución

```
1. TabsProductos.tsx
2. ListaProductos.tsx
3. ProductoForm.tsx
4. TaxonomyManager.tsx
5. productos/page.tsx
6. productos/nuevo/page.tsx
7. productos/[id]/page.tsx
8. productos/categorias/page.tsx
9. productos/tallas/page.tsx
10. productos/colores/page.tsx
11. AlertaStockBajo.tsx
12. TablaStock.tsx
13. FiltrosStock.tsx
14. IngresoForm.tsx
15. AjusteForm.tsx
16. MovimientosTabla.tsx
17. stock/page.tsx
18. stock/[varianteId]/page.tsx
19. stock/movimientos/page.tsx
20. AbrirSesionForm.tsx
21. CerrarSesionForm.tsx
22. SesionAbiertaPanel.tsx
23. CierreDetalle.tsx
24. ReopenCajaButton.tsx
25. caja/page.tsx
26. caja/sesiones/[id]/page.tsx
27. get_errors (verificación final)
```

---

## Notas para el Implementador

- **Tailwind v4**: Solo clases estáticas. No concatenar strings dinámicamente. Si la clase depende de una condición, usar objeto ternario con strings completos.
- **Mobile cards con `sm:hidden`**: Los wrappers de tabla deben ser `hidden sm:block`. Usar siempre `overflow-x-auto` en tablas.
- **`text-blue-700` para diferencia positiva en caja**: Reemplazar por `text-[#0A0A0A] font-semibold` (sobrante de caja = ok, no es "positivo" azul).
- **Emojis ⚠️ en SesionAbiertaPanel**: Mantener en el badge "Cerrada con emergencia" (se ve bien en tablas). No remover.
- **`EliminarProductoButton`**: Usa `Button variant="danger"` que ya está correcto por el componente global. No modificar.
- **`Button` component**: El variant `secondary` usa `border-gray-300 rounded-lg`. Si se necesita el estilo nuevo `border-gray-200 rounded-full`, se debe usar `inline` en vez de LinkButton donde sea necesario en esta iteración, o actualizar Button.tsx. Para este plan se prefiere inline para no afectar todo el sistema.
- **Stat en `stock/[varianteId]/page.tsx`**: La función `Stat` local se modifica internamente; no es el mismo componente que el KpiCard del dashboard.
- **Archivos de tallas/colores**: Seguir exactamente el mismo patrón que `categorias/page.tsx` — solo cambiar heading y subtitle.
