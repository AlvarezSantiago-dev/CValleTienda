# Plan: Redesign de Ventas, Devoluciones y Remitos — Nuevo Design System + 100% Responsive

**Creado:** 2026-05-10
**Estado:** Borrador
**Alcance:** Módulos ventas, devoluciones y remitos — pages, componentes de lista, detalle y formulario.

---

## Objetivos

1. **Paleta lime** — eliminar todo `indigo-*` y `blue-*` no semántico. Links → `text-lime-700 hover:text-lime-800`. Focus rings → `focus:ring-lime-400/60`.
2. **Tipografía** — headings de página `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`, subtítulos `text-[13px] text-gray-400`.
3. **Botones** — CTAs primarios `bg-[#0A0A0A] hover:bg-gray-800 rounded-full h-10`. Volver → `border border-gray-200 rounded-full`. Sin emojis como íconos en botones.
4. **Borders** — cards y tablas: `border-gray-100` (era `border-gray-200`). Hover de filas: `hover:bg-gray-50`.
5. **Badges** — Completada/Entregado: `bg-lime-50 text-lime-700 border border-lime-200`. Anulada/Anulado: `bg-red-50 text-red-700 border border-red-200`. Borrador: `bg-gray-100 text-gray-600`. Emitido: `bg-[#0A0A0A]/5 text-[#0A0A0A]`. Parcial: `bg-amber-50 text-amber-700 border border-amber-200`. Total: `bg-orange-50 text-orange-700 border border-orange-200`.
6. **Responsivo** — tablas con muchas columnas (ventas, remitos): vista de tarjetas en mobile (`< sm`), tabla en `sm:block`. TablaDevoluciones: `overflow-x-auto` ya tiene, ajustar solo estilos. Formularios: single column en mobile, grid en sm+. Headings de página con flex-wrap. Botones de acción: `flex-wrap gap-2`.

---

## Estado Actual — Problemas Identificados

| Archivo | Problemas |
|---|---|
| `ventas/page.tsx` | Heading `text-2xl text-gray-900`, tabla sin `overflow-x-auto` en mobile, no tiene vista de cards, `border-gray-200`, sin links lime |
| `ventas/[id]/page.tsx` | Heading viejo, botones `rounded-lg border-gray-300`, links `text-indigo-600`, cards `border-gray-200`, sección de ganancia sin estilo nuevo |
| `devoluciones/page.tsx` | Heading viejo |
| `devoluciones/nueva/page.tsx` | Back link `text-indigo-600`, heading viejo |
| `devoluciones/[id]/page.tsx` | Heading viejo, botones `rounded-lg`, links `text-indigo-600`, cards `border-gray-200` |
| `TablaDevoluciones.tsx` | Links `text-indigo-600`, badge Parcial `bg-blue-100 text-blue-800`, borders `border-gray-200` |
| `FiltrosDevoluciones.tsx` | `border-gray-200` |
| `DevolucionForm.tsx` | Necesita verificar focus rings |
| `remitos/page.tsx` | Heading viejo, botón Nuevo `bg-indigo-600 rounded-lg`, tabla sin `overflow-x-auto`, no tiene vista de cards, links `text-indigo-600`, `border-gray-200` |
| `remitos/nuevo/page.tsx` | Heading viejo, card `border-gray-200` |
| `remitos/[id]/page.tsx` | Heading viejo, cards `border-gray-200`, links `text-indigo-600`, badge `bg-blue-100` (emitido) |
| `NuevoRemitoForm.tsx` | `focus:ring-indigo-500` en selects e inputs |
| `RemitoAcciones.tsx` | Botones `rounded-lg`, `bg-blue-600` (Emitir), emoji 🖨️ en botón |
| `EmitirFacturaButton.tsx` | `bg-indigo-600 rounded-lg`, `focus:ring-indigo-500` |

---

## Tokens de Diseño

```
Heading:        text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]
Subtítulo:      text-[13px] text-gray-400
Link:           text-lime-700 hover:text-lime-800 font-medium
Link tabla:     text-lime-700 hover:underline text-xs font-medium
Focus:          focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400
CTA primario:   bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold
Btn volver:     border border-gray-200 rounded-full h-10 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50
Btn peligro:    border border-red-200 text-red-600 rounded-full h-10 px-4 text-sm font-medium hover:bg-red-50
Card border:    border border-gray-100
Table border:   border border-gray-100
Badge completada/entregado:  bg-lime-50 text-lime-700 border border-lime-200 rounded-full px-2 py-0.5 text-xs font-semibold
Badge anulado:  bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 text-xs font-semibold
Badge borrador: bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs font-semibold
Badge emitido:  bg-[#0A0A0A]/5 text-[#0A0A0A] rounded-full px-2 py-0.5 text-xs font-semibold
Badge parcial:  bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold
Badge total (dev): bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 text-xs font-semibold
Badge Comprobante AFIP: bg-lime-50 text-lime-800 border border-lime-200 rounded-full px-2 py-0.5 text-xs font-semibold
```

---

## Patrón de Cards Mobile para Tablas

Para ventas y remitos (tablas con 7-9 columnas), se usa el patrón:

```tsx
{/* Mobile: lista de cards */}
<div className="sm:hidden divide-y divide-gray-100">
  {items.map((item) => (
    <div key={item.id} className="p-4 flex flex-col gap-1">
      {/* Fila 1: número + badge */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#0A0A0A]">#{item.numero}</span>
        <BadgeComponent />
      </div>
      {/* Fila 2: fecha + total */}
      {/* Fila 3: cliente + link */}
    </div>
  ))}
</div>

{/* Desktop: tabla */}
<div className="hidden sm:block overflow-x-auto">
  <table>...</table>
</div>
```

---

## Plan de Implementación

### PASO 1 — Helpers de Badges compartidos

Crear un pequeño helper inline en cada archivo donde se use (no extraer componente, mantener localidad):

```tsx
function BadgeEstadoVenta({ estado }: { estado: string }) {
  const styles = {
    completada: 'bg-lime-50 text-lime-700 border border-lime-200',
    anulada:    'bg-red-50 text-red-600 border border-red-200',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${styles[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
}
```

### PASO 2 — `ventas/page.tsx`

**Cambios:**
- Heading: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]` + subtítulo `text-[13px] text-gray-400`
- Wrapper tabla: `border-gray-100`
- Agregar `BadgeEstadoVenta` inline
- Badge comprobante AFIP: `bg-lime-50 text-lime-800 border border-lime-200`
- Link "Ver": `text-lime-700 hover:underline text-xs font-medium`
- **Mobile cards** (`sm:hidden`): cada fila como card con:
  - Fila 1: `#ticket` bold + badge estado
  - Fila 2: fecha/hora + total bold
  - Fila 3: cliente (si existe) + cantidad items
  - Fila 4: link "Ver detalle →"
- **Desktop tabla** (`hidden sm:block overflow-x-auto`): conservar estructura actual con estilos nuevos
- `divide-y divide-gray-100` en lugar de `divide-gray-200`
- `hover:bg-gray-50` (ya existe, confirmar)

### PASO 3 — `ventas/[id]/page.tsx`

**Cambios:**
- Heading: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`
- Subtítulo fecha: `text-[13px] text-gray-400`
- Botón "← Volver": `inline-flex h-10 px-4 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50`
- Botón "↩ Devolver": `inline-flex h-10 px-4 border border-amber-200 bg-amber-50 rounded-full text-sm font-medium text-amber-900 hover:bg-amber-100`
- Sección de detalles (`bg-white border border-gray-200`): → `border-gray-100`
- Subtítulos de sección: `text-xs font-semibold uppercase tracking-[0.08em] text-gray-400`
- Label de detalle de venta (Ticket, Items, Total, etc.): `text-[13px] text-gray-400` / valor `text-[15px] font-semibold text-[#0A0A0A]`
- Links `text-indigo-600` → `text-lime-700`
- Tabla de items con `overflow-x-auto`
- Sección ganancia bruta (si tiene costo): `bg-lime-50 border border-lime-100 rounded-xl px-4 py-3` con `text-lime-800`
- Sección de pagos: `divide-y divide-gray-100`, nombres de método `text-gray-600`, montos `font-semibold text-[#0A0A0A]`
- Layout responsive: `grid grid-cols-1 lg:grid-cols-3 gap-6` — columna 1: info + items; columnas 2-3: panel lateral con totales + pagos + ganancia

### PASO 4 — `devoluciones/page.tsx`

**Cambios:**
- Heading + subtítulo → tokens nuevos
- Sin más cambios (el resto lo manejan los componentes)

### PASO 5 — `TablaDevoluciones.tsx`

**Cambios:**
- `border-gray-200` → `border-gray-100`
- `divide-gray-100` (era `divide-gray-200` implícito)
- Badge Parcial: `bg-blue-100 text-blue-800` → `bg-amber-50 text-amber-700 border border-amber-200`
- Badge Total: `bg-amber-100 text-amber-800` → `bg-orange-50 text-orange-700 border border-orange-200`
- Links `text-indigo-600` → `text-lime-700`
- Thead: `text-gray-500` → `text-gray-400`, tracking actualizado
- Ya tiene `overflow-x-auto` ✓

### PASO 6 — `FiltrosDevoluciones.tsx`

**Cambios:**
- `border-gray-200` → `border-gray-100`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` (era solo `md:grid-cols-5` — agrega paso intermedio `sm:grid-cols-2`)

### PASO 7 — `DevolucionForm.tsx`

**Cambios (verificar después de leer el archivo completo):**
- `focus:ring-indigo-500` → `focus:ring-lime-400/60`
- Botón "Devolver" ya usa Button component (lime por el cambio global)
- Inputs directos (`<input>`, `<select>`) que no usen el componente UI: actualizar focus
- Lista de items (tabla o lista): `border-gray-100`, `divide-gray-100`
- Resumen total: tipografía coherente
- `tipoResolucion` radio buttons: seleccionado `border-lime-500 bg-lime-50 text-lime-800`
- Layout: single column en mobile, grid `lg:grid-cols-2` en desktop para items vs panel pago

### PASO 8 — `devoluciones/nueva/page.tsx`

**Cambios:**
- Back link: `text-indigo-600` → `text-lime-700 hover:text-lime-800`
- Heading: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`
- Empty state card: `border-dashed border-gray-200` (era `border-gray-300`)
- Aviso sin métodos: border `border-amber-200` → ya correcto

### PASO 9 — `devoluciones/[id]/page.tsx`

**Cambios:**
- Heading: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`
- Botón "← Volver": `border-gray-200 rounded-full`
- PrintButtonClient ya usa Button (lime global)
- Card ticket: `border-gray-100`
- Cards info (Venta original / Cliente): `border-gray-100`, links `text-lime-700`
- Subtítulos de cards: `text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400`
- Layout cards: `grid grid-cols-1 sm:grid-cols-2` (ya tiene `md:grid-cols-2`) → actualizar breakpoint

### PASO 10 — `remitos/page.tsx`

**Cambios:**
- Heading: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`
- Botón "+ Nuevo remito": `bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold`
- Tabla wrapper: `border-gray-100`, `overflow-x-auto`
- `divide-gray-100`
- Badges de estado: actualizar según tokens
- Links Venta: `text-lime-700 hover:underline`
- Link "Ver →": `text-lime-700 hover:underline text-xs font-medium`
- **Mobile cards** (`sm:hidden`): cada remito como card con:
  - Fila 1: `#número` bold + badge estado
  - Fila 2: destinatario semibold
  - Fila 3: fecha + dirección truncada
  - Fila 4: venta asociada + entrega
  - Link "Ver detalle →"
- **Desktop tabla** (`hidden sm:block overflow-x-auto`): estilos actualizados

### PASO 11 — `remitos/nuevo/page.tsx`

**Cambios:**
- Heading + subtítulo → tokens nuevos
- Card wrapper: `border-gray-100`
- `max-w-2xl` → agregar `mx-auto` si no lo tiene (centrar en desktop)

### PASO 12 — `NuevoRemitoForm.tsx`

**Cambios:**
- Todo `focus:ring-indigo-500` → `focus:ring-lime-400/60`
- Selects y inputs: `border-gray-200 rounded-xl` (unificar estilo con el resto de la app)
- Botón Submit: usa Button (ya lime global)
- Grid `sm:grid-cols-2` para Dirección/Teléfono y Fecha entrega
- Error banner: `border-red-200 bg-red-50 text-red-700` (ya correcto, solo verificar)

### PASO 13 — `remitos/[id]/page.tsx`

**Cambios:**
- Heading: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`
- Back link `text-gray-500 hover:text-gray-700` → `text-[13px] text-lime-700 hover:text-lime-800`
- Badge emitido: `bg-blue-100 text-blue-700` → `bg-[#0A0A0A]/5 text-[#0A0A0A]`
- Cards detalle: `border-gray-100`
- Links venta: `text-indigo-600` → `text-lime-700`
- Subtítulos de cards: tokens nuevos
- `RemitoAcciones` responsive: `flex-wrap gap-2`
- Grid cards: `grid-cols-1 sm:grid-cols-2` (ya lo tiene, confirmar)

### PASO 14 — `RemitoAcciones.tsx`

**Cambios:**
- Botón "🖨️ Imprimir" → SVG inline de impresora, `border border-gray-200 text-gray-700 rounded-full h-10 px-4 text-sm font-medium hover:bg-gray-50`
- Botón "Emitir" (`bg-blue-600`): → `bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold`
- Botón "Marcar entregado" (`bg-green-600`): → semántico OK (éxito), actualizar a `bg-lime-600 hover:bg-lime-700 text-white rounded-full h-10 px-4 text-sm font-semibold`
- Botón "Anular": `border border-red-200 text-red-600 rounded-full h-10 px-4 text-sm font-medium hover:bg-red-50`
- `disabled:opacity-50` en todos

### PASO 15 — `EmitirFacturaButton.tsx`

**Cambios:**
- Botón trigger "Emitir Factura": `bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold` (sacar emoji 🧾)
- Texto del botón: "Emitir Factura Electrónica"
- Modal: `rounded-2xl shadow-2xl` (era `rounded-xl shadow-xl`)
- Input CUIT: `focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 border-gray-200 rounded-xl`
- Botones del modal: Cancel `border border-gray-200 rounded-full`, Emitir `bg-[#0A0A0A] rounded-full`
- Banner de éxito: `bg-lime-50 border border-lime-200 text-lime-800` (era `bg-green-50 border-green-200 text-green-800`)

---

## Archivos a Modificar

| Acción | Archivo |
|---|---|
| **MODIFICAR** | `app/app/(dashboard)/ventas/page.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/ventas/[id]/page.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/devoluciones/page.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/devoluciones/nueva/page.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/devoluciones/[id]/page.tsx` |
| **MODIFICAR** | `app/components/devoluciones/TablaDevoluciones.tsx` |
| **MODIFICAR** | `app/components/devoluciones/FiltrosDevoluciones.tsx` |
| **MODIFICAR** | `app/components/devoluciones/DevolucionForm.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/remitos/page.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/remitos/nuevo/page.tsx` |
| **MODIFICAR** | `app/app/(dashboard)/remitos/[id]/page.tsx` |
| **MODIFICAR** | `app/components/remitos/NuevoRemitoForm.tsx` |
| **MODIFICAR** | `app/components/remitos/RemitoAcciones.tsx` |
| **MODIFICAR** | `app/components/ventas/EmitirFacturaButton.tsx` |

## Archivos que NO se tocan
- `TicketImprimible.tsx`, `TicketDevolucion.tsx`, `RemitoImprimible.tsx` — componentes de impresión con sus propios estilos
- Queries / actions / types — sin cambios de lógica
- `PrintButtonClient.tsx` — usa Button global (ya actualizado)

---

## Criterios de Éxito

- [ ] Sin ningún `indigo` en los módulos ventas/devoluciones/remitos
- [ ] Sin emojis como íconos en botones (print → SVG, factura → texto)
- [ ] Headings: `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`
- [ ] Links: `text-lime-700 hover:text-lime-800`
- [ ] Botones CTA: `bg-[#0A0A0A] rounded-full`
- [ ] Botones volver: `border border-gray-200 rounded-full`
- [ ] Badges actualizados (completada lime, emitido oscuro, anulado rojo sutil)
- [ ] Vista de cards en mobile para ventas y remitos (tablas de 7+ columnas)
- [ ] `overflow-x-auto` en todas las tablas desktop
- [ ] Formularios usables en mobile (single column, inputs full-width)
- [ ] Sin errores TypeScript

---

## Orden de Ejecución

1. `TablaDevoluciones.tsx` + `FiltrosDevoluciones.tsx` (componentes compartidos, impacto global)
2. `DevolucionForm.tsx` (leer completo, luego actualizar focus rings y layout)
3. `devoluciones/page.tsx`, `devoluciones/nueva/page.tsx`, `devoluciones/[id]/page.tsx`
4. `ventas/page.tsx` (cards mobile — mayor cambio)
5. `ventas/[id]/page.tsx` (layout de detalle responsive)
6. `RemitoAcciones.tsx` + `NuevoRemitoForm.tsx`
7. `EmitirFacturaButton.tsx`
8. `remitos/page.tsx` (cards mobile)
9. `remitos/nuevo/page.tsx` + `remitos/[id]/page.tsx`
10. `get_errors` en todos los archivos modificados
