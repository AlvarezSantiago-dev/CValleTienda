# Plan: Redesign de /dashboard y /pos inspirado en el landing page

**Creado:** 2026-05-10
**Estado:** Borrador
**Pedido:** Alinear visualmente las páginas /dashboard y /pos con el sistema de diseño del landing: paleta lime, tipografía bold con tracking negativo, border-gray-100, fondo blanco, sin emojis como íconos, botón cobrar negro rounded-full.

---

## Descripción General

El dashboard y el POS tienen paleta indigo (`focus:ring-indigo-500`, `bg-indigo-50`, `text-indigo-700`) y usan emojis como íconos en los KPI cards. El objetivo es:

1. **Dashboard**: actualizar tipografía del heading, reemplazar emojis de `KpiCard` por SVG, cambiar `bg-indigo-50` → `bg-lime-50`, actualizar colores del gráfico de barras (`VentasChart`) a lime, actualizar estados de los demás cards.
2. **POS**: actualizar heading, chips de categoría de `GrillaProductos` (indigo→lime), `focus:ring` de inputs en `Carrito` y `PanelPago`, color del total (`text-indigo-700` → `text-lime-800`), botón "Cobrar" negro `rounded-full`.

**Lo que NO cambia:** lógica de negocio, queries, actions, tipos, flujo de cobro.

---

## Estado Actual

| Componente | Problemas de paleta |
|---|---|
| `dashboard/page.tsx` | Heading `text-2xl font-bold text-gray-900` sin tracking |
| `KpiCard.tsx` | `bg-indigo-50 border-indigo-200`, emojis como íconos |
| `VentasChart.tsx` | Barras `#6366f1` / `#4338ca` (indigo) |
| `pos/page.tsx` | Heading básico, badge caja abierta en `green-100` (puede quedar) |
| `GrillaProductos.tsx` | Chips activos `bg-indigo-600` |
| `Carrito.tsx` | `focus:ring-indigo-500` en inputs |
| `PanelPago.tsx` | `text-indigo-700` en total, `focus:ring-indigo-500` en descuento |

---

## Tokens de diseño a aplicar

| Elemento | Antes | Ahora |
|---|---|---|
| Heading de página | `text-2xl font-bold text-gray-900` | `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]` |
| Subheading / label | `text-sm text-gray-500` | `text-[13px] text-gray-400` |
| KPI destacada bg | `bg-indigo-50 border-indigo-200` | `bg-lime-50 border-lime-200` |
| KPI destacada texto | `text-indigo-700` | `text-lime-800` |
| Barras gráfico activo | `#4338ca` (indigo-700) | `#4D7C0F` (lime-700) |
| Barras gráfico normal | `#6366f1` (indigo-500) | `#84CC16` (lime-400) |
| Barras gráfico pálido | `#c7d2fe` (indigo-200) | `#D9F99D` (lime-200) |
| Focus ring inputs | `focus:ring-indigo-500` | `focus:ring-lime-400/60` |
| Chip categoría activo | `bg-indigo-600 text-white` | `bg-[#0A0A0A] text-white` |
| Total a pagar | `text-indigo-700` | `text-lime-800` |
| Botón Cobrar | `bg-indigo-600 rounded-lg` | `bg-[#0A0A0A] rounded-full` |
| Borders cards | `border-gray-200` | `border-gray-100` |
| Ícono KPI | emoji (💵 🧾 📦 📅) | SVG `stroke="currentColor"` |

---

## Plan de Implementación

### Paso 1 — `KpiCard.tsx`

**Objetivo:** Eliminar emojis, reemplazar por íconos SVG, actualizar paleta destacada.

**Cambios:**
- La prop `icono?: string` pasa a ser `icono?: React.ReactNode` (acepta JSX — retrocompatible si no se pasa nada)
- Wrapper del ícono: `<div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">`
- KPI destacada: `bg-lime-50 border-lime-200` en vez de indigo
- Label destacado: `text-lime-800` en vez de `text-indigo-700`
- Valor: `text-[22px] font-bold text-[#0A0A0A]` (antes `text-2xl`)
- Label: `text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400` (más limpio)
- Borders: `border-gray-100` (más sutil)

**En `dashboard/page.tsx`:** reemplazar emojis por íconos SVG inline en cada `<KpiCard>`:

| KPI | Ícono SVG |
|---|---|
| Ventas hoy (💵) | `IconDollar` — billete / circle-dollar |
| Cant. ventas (🧾) | `IconReceipt` — lista/clipboard |
| Ticket promedio | `IconAverage` — barra horizontal con línea |
| Saldo caja | `IconWallet` — billetera |
| Ventas mes | `IconCalendar` — calendario |
| Cant. mes | `IconTrend` — chart line |
| Ticket mes | `IconMidline` — estadística |
| Ganancia bruta | `IconPercent` — porcentaje / profit |

Los SVG se definen como funciones locales en `dashboard/page.tsx` o en un archivo `DashboardIcons.tsx` nuevo en `components/dashboard/`.

### Paso 2 — `VentasChart.tsx`

**Objetivo:** Actualizar colores de barras a paleta lime.

**Cambios solo de colores:**
```tsx
// Antes
const fill = isHoy ? '#4338ca' : '#6366f1'

// Ahora
const fill = isHoy ? '#4D7C0F' : '#84CC16'   // lime-700 / lime-400
```
- Líneas de grilla: `stroke="#f3f4f6"` (antes `#e5e7eb` — más sutil)
- Texto ejes: sin cambios (`#9ca3af`)

### Paso 3 — `dashboard/page.tsx`

**Objetivo:** Actualizar heading y pasar íconos SVG a los KpiCards.

**Cambios:**
```tsx
// Antes
<h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
<p className="text-sm text-gray-500 capitalize">{hoy}</p>

// Ahora
<h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Inicio</h1>
<p className="text-[13px] text-gray-400 capitalize">{hoy}</p>
```

- Pasar `icono={<IconDollar />}` etc. en lugar de `icono="💵"` a cada `KpiCard`
- Si hay KPIs sin ícono definido, se puede omitir (la prop es opcional)

### Paso 4 — `GrillaProductos.tsx`

**Objetivo:** Chips de categoría con paleta coherente.

**Cambios:**
```tsx
// Activo: antes bg-indigo-600, ahora bg-[#0A0A0A]
categoriaActiva === null
  ? 'bg-[#0A0A0A] text-white'
  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'

// Chips normales: igual, el hover ya estaba bien
```

### Paso 5 — `Carrito.tsx`

**Objetivo:** Focus rings lime.

**Cambios:**
- `focus:ring-indigo-500` → `focus:ring-lime-400/60` en los 2 inputs (cantidad y precio)
- El estado `bg-red-50` para stock excedido: no cambiar (correcto semánticamente)
- `border border-gray-200` → `border border-gray-100` en el wrapper

### Paso 6 — `PanelPago.tsx`

**Objetivo:** Total lime, focus ring lime, botón Cobrar negro rounded-full.

**Cambios:**
- `text-2xl font-bold text-indigo-700` (total) → `text-2xl font-bold text-lime-800`
- `focus:ring-indigo-500` en el input descuento → `focus:ring-lime-400/60`
- Botón Cobrar: actualmente es un `<Button>` o algo similar — buscar el botón de cobrar en `POSContainer.tsx` o `PanelPago.tsx` y actualizar a `bg-[#0A0A0A] hover:bg-gray-800 rounded-full`

### Paso 7 — `pos/page.tsx`

**Objetivo:** Heading actualizado y badge "Caja abierta" alineado con el nuevo sistema.

**Cambios:**
```tsx
// Heading
<h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
  Punto de venta
</h1>

// Badge caja abierta: cambiar de green a lime para coherencia
<span className="inline-flex items-center gap-2 rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700 border border-lime-200">
  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" />
  Caja abierta
</span>
```

- Headings de los estados vacíos (caja cerrada, sin métodos) → mismo estilo
- `EmptyState` con emoji `🔒` y `💳`: verificar si tiene prop de ícono SVG — si no, dejarlo por ahora (fuera del scope)

---

## Archivos a Crear / Modificar

| Acción | Archivo |
|---|---|
| **CREAR** | `app/components/dashboard/DashboardIcons.tsx` |
| **MODIFICAR** | `app/components/dashboard/KpiCard.tsx` |
| **MODIFICAR** | `app/components/dashboard/VentasChart.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/dashboard/page.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/pos/page.tsx` |
| **MODIFICAR** | `app/components/pos/GrillaProductos.tsx` |
| **MODIFICAR** | `app/components/pos/Carrito.tsx` |
| **MODIFICAR** | `app/components/pos/PanelPago.tsx` |
| **VERIFICAR** | `app/components/pos/POSContainer.tsx` (botón Cobrar) |

---

## Archivos que NO se tocan

- Toda la lógica de queries y actions
- `StockBajoCard.tsx` — colores amber son semánticamente correctos
- `TopProductosCard.tsx`, `TopClientesCard.tsx` — ya usan `border-gray-200`, actualizar solo el border a `gray-100`
- `EstadoCajaBanner.tsx` — revisar si usa indigo
- `BuscadorVariantes.tsx`, `PagoMultiMetodo.tsx`, `FacturaToggle.tsx` — verificar focus rings

---

## Criterios de Éxito

- [ ] Sin emojis como íconos en KpiCards — todos SVG
- [ ] KPI destacada: `bg-lime-50 border-lime-200 text-lime-800`
- [ ] Gráfico de barras: lime-700 (hoy) / lime-400 (resto)
- [ ] Headings: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`
- [ ] Chips de categoría activo: `bg-[#0A0A0A] text-white`
- [ ] Inputs focus ring: `focus:ring-lime-400/60`
- [ ] Total POS: `text-lime-800`
- [ ] Botón Cobrar: `bg-[#0A0A0A] rounded-full`
- [ ] Badge "Caja abierta": lime
- [ ] Sin errores TypeScript

---

## Orden de Ejecución

1. Crear `DashboardIcons.tsx`
2. Modificar `KpiCard.tsx` (prop icono: ReactNode, paleta lime)
3. Modificar `VentasChart.tsx` (colores lime)
4. Modificar `dashboard/page.tsx` (heading + SVG icons)
5. Modificar `pos/page.tsx` (heading + badge)
6. Modificar `GrillaProductos.tsx` (chips)
7. Modificar `Carrito.tsx` (focus ring, border)
8. Modificar `PanelPago.tsx` (total, focus ring, botón cobrar)
9. Verificar `POSContainer.tsx` si el botón Cobrar vive ahí
10. Correr `get_errors` en todos los archivos modificados
