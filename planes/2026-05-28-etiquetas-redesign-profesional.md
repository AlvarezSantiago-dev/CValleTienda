# Plan: Etiquetas — Rediseño profesional, tamaño configurable y nombre de tienda

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Reestructuración completa del diseño de etiquetas: selector de tamaño (default 50×25), diseño visual profesional en configuración y al imprimir, opción de mostrar nombre de la tienda, y manejo inteligente de nombres de producto largos.

---

## Descripción General

El módulo de etiquetas funciona pero tiene un diseño plano y sin identidad. Este plan lo eleva a nivel profesional cubriendo:

1. **Diseño de etiqueta rediseñado** — layout profesional con jerarquía visual clara, separadores, micro-tipografía cuidada, precio destacado.
2. **Default 50×25 mm** — el formato más común en góndola. El valor actual es 50×30.
3. **Nombre de tienda opcional** — nuevo toggle `mostrar_nombre_tienda` + campo que se renderiza al tope de la etiqueta en micro-tipografía.
4. **Nombres largos** — capped a 2 líneas con font-size adaptativo según ancho de etiqueta y largo del nombre.
5. **UI de configuración mejorada** — `DisenadorEtiqueta.tsx` con layout más limpio, preview más fiel y badge de tamaño.

---

## Arquitectura actual

| Capa | Archivo | Responsabilidad |
|------|---------|----------------|
| DB | `configuracion_etiquetas` | Persiste plantilla única por tienda |
| Tipos | `app/types/database.ts` — `ConfiguracionEtiqueta` | Refleja la tabla |
| Tipos print | `app/lib/impresion/types.ts` — `PlantillaEtiquetaPayload` | Snapshot para payload |
| Helper | `app/lib/impresion/types.ts` — `plantillaSnapshot()` | DB → payload |
| Builder | `app/lib/impresion/payload-etiqueta.ts` | Construye el job payload |
| Action | `app/app/actions/impresion.ts` — `PlantillaEtiquetaInput` + `guardarPlantillaEtiqueta` | Guarda en DB |
| Renderer | `app/components/impresion/EtiquetaRenderer.tsx` | Renderiza 1 etiqueta |
| Hoja | `app/components/impresion/HojaEtiquetas.tsx` | Renderiza N etiquetas con saltos |
| Config UI | `app/components/configuracion/DisenadorEtiqueta.tsx` | Editor + preview en vivo |
| Página | `app/app/(dashboard)/configuracion/avanzado/etiquetas/page.tsx` | Server page que carga datos |

---

## Cambios necesarios por capa

### 1. DB — Migración
- Agregar columna `mostrar_nombre_tienda boolean not null default false`
- Cambiar `default` de `alto_mm` de `30` a `25`
- **Solo ALTER TABLE**, sin recrear la tabla

### 2. Tipos (`database.ts`)
- Agregar `mostrar_nombre_tienda: boolean` a `ConfiguracionEtiqueta`

### 3. Payload types (`types.ts`)
- Agregar `mostrar_nombre_tienda: boolean` a `PlantillaEtiquetaPayload`
- Agregar `nombre_tienda?: string | null` a `PayloadEtiquetaProducto` (nivel payload, no por item)
- Actualizar `plantillaSnapshot()` para mapear el nuevo campo

### 4. Builder (`payload-etiqueta.ts`)
- `buildPayloadEtiquetas()` recibe `nombreTienda?: string` y lo agrega al payload

### 5. Action (`actions/impresion.ts`)
- Agregar `mostrar_nombre_tienda: boolean` a `PlantillaEtiquetaInput`
- Actualizar `validarPlantilla()` (ninguna validación especial, es booleano)
- Actualizar el objeto `fila` del upsert para incluir el nuevo campo
- Cambiar el default en `ETIQUETA_DEFAULTS` en la page: `alto_mm: 25`

### 6. Renderer (`EtiquetaRenderer.tsx`)
Rediseño completo del layout:

```
┌─────────────────────────────────┐
│ TIENDA NOMBRE       (opcional)  │  ← micro-font, letra gris
│─────────────────────────────────│  ← línea separadora
│ Nombre del Producto             │  ← 1-2 líneas, font adaptativo
│ T M · Negro                     │  ← talla+color, secundario
│─────────────────────────────────│  ← línea separadora
│ $12.500                         │  ← PRECIO grande, destacado
│ ||||||||||||||||||||            │  ← barcode (si hay)
│ 7791234567890                   │  ← código texto (opcional)
└─────────────────────────────────┘
```

**Manejo de nombre largo:**
- Siempre `-webkit-line-clamp: 2` (máximo 2 líneas)
- Font-size adaptativo: si `nombre_producto.length > 25` → reducir tamaño un escalón (×0.85)
- Si `nombre_producto.length > 40` → reducir otro escalón (×0.75)
- `wordBreak: 'break-word'` para no desbordar

**Diseño profesional:**
- Líneas separadoras sutiles (`borderBottom: '0.3px solid #e5e5e5'`)
- Precio con `letterSpacing: '-0.03em'`, color negro puro
- Nombre de tienda: `textTransform: 'uppercase'`, `letterSpacing: '0.08em'`, color `#888`
- Padding interior: `2mm 2.5mm` (más generoso que el actual `1mm 1.5mm`)
- `border: '0.5px solid #d0d0d0'` en pantalla (se suprime con `border: 0` en `@media print`)

### 7. DisenadorEtiqueta.tsx
- Nuevo checkbox `mostrar_nombre_tienda` en la sección "Qué mostrar"
- Preview item ficticio incluye `nombre_tienda: 'Mi Tienda'` para visualizar
- Preview container usa sombra de papel `box-shadow: '0 1px 4px rgba(0,0,0,0.1)'` alrededor de la etiqueta
- Scale factor auto-calculado para que la etiqueta siempre quepa en el panel de preview con un máximo razonable
- Badge pill junto al título "Vista previa" mostrando `{ancho}×{alto}mm`

### 8. Página (`avanzado/etiquetas/page.tsx`)
- Cambiar default `alto_mm: 30` → `alto_mm: 25`
- Pasar `nombre_tienda` desde el ctx al `DisenadorEtiqueta` para preview realista

### 9. Donde se llama `buildPayloadEtiquetas`
Buscar los call sites y pasar `ctx?.nombre ?? tienda.nombre` al builder.

---

## Tareas

### T1 — Migración DB
**Archivo:** `supabase/migrations/YYYYMMDD_etiquetas_nombre_tienda.sql`

```sql
-- Agregar campo nombre de tienda en etiqueta
alter table public.configuracion_etiquetas
  add column if not exists mostrar_nombre_tienda boolean not null default false;

-- Actualizar el alto por defecto a 25mm en las plantillas predeterminadas nuevas
-- (las existentes no se tocan, solo el DEFAULT de la columna)
alter table public.configuracion_etiquetas
  alter column alto_mm set default 25;

comment on column public.configuracion_etiquetas.mostrar_nombre_tienda
  is 'Si true, imprime el nombre de la tienda al tope de la etiqueta';
```

### T2 — Actualizar tipos DB (`app/types/database.ts`)
- Agregar `mostrar_nombre_tienda: boolean` a la interface `ConfiguracionEtiqueta`

### T3 — Actualizar types de print (`app/lib/impresion/types.ts`)
- Agregar `mostrar_nombre_tienda: boolean` a `PlantillaEtiquetaPayload`
- Agregar `nombre_tienda?: string | null` a `PayloadEtiquetaProducto`
- Actualizar `plantillaSnapshot()`:
  ```ts
  mostrar_nombre_tienda: cfg.mostrar_nombre_tienda,
  ```

### T4 — Actualizar builder (`app/lib/impresion/payload-etiqueta.ts`)
- Agregar `nombreTienda?: string` como parámetro a `buildPayloadEtiquetas()`
- Agregar `nombre_tienda: nombreTienda ?? null` en el return

### T5 — Actualizar action (`app/app/actions/impresion.ts`)
- Agregar `mostrar_nombre_tienda: boolean` a `PlantillaEtiquetaInput`
- En `guardarPlantillaEtiqueta`: incluir `mostrar_nombre_tienda: input.mostrar_nombre_tienda` en `fila`
- **No cambiar** el valor default en la interface (el default lo setea la página)

### T6 — Actualizar page defaults (`configuracion/avanzado/etiquetas/page.tsx`)
- `ETIQUETA_DEFAULTS`: cambiar `alto_mm: 30 → 25` y agregar `mostrar_nombre_tienda: false`
- Al cargar desde DB incluir `mostrar_nombre_tienda: plant.mostrar_nombre_tienda`
- Obtener el nombre de la tienda del ctx y pasarlo al `DisenadorEtiqueta` como nuevo prop `nombreTienda`

### T7 — Rediseñar `EtiquetaRenderer.tsx`
Implementar el nuevo layout descrito arriba. Detalles clave:

```tsx
// Props ampliado
interface Props {
  item: PayloadEtiquetaItem
  plantilla: PlantillaEtiquetaPayload
  simboloMoneda?: string
  nombreTienda?: string | null  // nuevo
}

// Font adaptativo para nombre largo
function fontSizeNombre(base: number, largo: number): number {
  if (largo > 40) return Math.round(base * 0.75)
  if (largo > 25) return Math.round(base * 0.85)
  return base
}
```

Layout interno (flexColumn, justifyContent: 'space-between'):
1. **Header** (si `mostrar_nombre_tienda`): texto tienda en uppercase gris, `pb: '1mm'`, `borderBottom: '0.3px solid #e0e0e0'`
2. **Body**: nombre (2-line clamp, font adaptativo) + talla/color con `mt: '1mm'`
3. **Divider**: `borderTop: '0.3px solid #e0e0e0'` antes del precio
4. **Precio**: grande, bold, negro
5. **Footer**: barcode centrado + código texto

Borde de la etiqueta en pantalla (para el diseñador):
```tsx
border: '0.5px solid #ccc',
borderRadius: '1px',
```
En impresión este borde no se ve porque `@media print` ya setea `border: 0` para `.etiqueta-print`.
→ Agregar en `print.css`:
```css
@media print {
  .etiqueta-print {
    border: none !important;
  }
}
```

### T8 — Rediseñar `DisenadorEtiqueta.tsx`
- Agregar `nombreTienda?: string` a los props
- Agregar `mostrar_nombre_tienda` al form state y al `PREVIEW_ITEM` / `plantillaPreview`
- Agregar checkbox "Nombre de la tienda" en la sección "Qué mostrar"
- Mejorar preview container:
  - Calcular `ESCALA` dinámicamente: `Math.min(5, Math.floor(240 / form.ancho_mm))` (máx ×5, se adapta al ancho)
  - Fondo del área de preview: `bg-[#f0f0f0]` (simula superficie de impresión)
  - Sombra alrededor de la etiqueta en el preview: `filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'`
  - Badge pill: `{form.ancho_mm} × {form.alto_mm} mm`
- Pasar `nombreTienda` al `EtiquetaRenderer` del preview

### T9 — Actualizar call sites de `buildPayloadEtiquetas`
Buscar dónde se llama `buildPayloadEtiquetas` y pasar el nombre de la tienda.

### T10 — `HojaEtiquetas.tsx`
- Pasar `nombre_tienda={payload.nombre_tienda}` al `EtiquetaRenderer`

### T11 — QA: `get_errors` en todos los archivos modificados

---

## Archivos a modificar

| Archivo | Tipo cambio |
|---------|-------------|
| `supabase/migrations/NUEVO.sql` | NUEVO |
| `app/types/database.ts` | Agregar campo |
| `app/lib/impresion/types.ts` | Agregar campos + actualizar helper |
| `app/lib/impresion/payload-etiqueta.ts` | Parámetro nombreTienda |
| `app/app/actions/impresion.ts` | Nuevo campo en interface + upsert |
| `app/app/(dashboard)/configuracion/avanzado/etiquetas/page.tsx` | Defaults + pasar nombreTienda |
| `app/components/impresion/EtiquetaRenderer.tsx` | Rediseño completo |
| `app/components/impresion/HojaEtiquetas.tsx` | Pasar nombre_tienda |
| `app/components/configuracion/DisenadorEtiqueta.tsx` | UI + nuevo campo |
| `app/styles/print.css` | Suprimir borde en print |

---

## Notas de decisiones

- **Sin nombre de tienda en `PayloadEtiquetaItem`** — va en `PayloadEtiquetaProducto` porque es la misma tienda para todos los ítems del job. El renderer lo recibe por prop.
- **Font adaptativo en el renderer, no en la acción** — el renderer es el único que conoce el string en render time.
- **No modificar `@page` size dinámicamente para etiquetas** — ya funciona con el job continuo. El CSS `@page { size: Xmm Ymm }` se podría agregar pero requiere `usePrint.tsx` que es complejo. Dejamos el flujo actual.
- **Borde en pantalla, no en print** — mejora la UI del diseñador sin afectar la impresión real.
- **Default 50×25** — es el tamaño de rollo de góndola más vendido en Argentina (Brother DK-22223, Zebra 50×25).
