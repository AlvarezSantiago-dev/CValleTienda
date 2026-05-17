# Plan: Responsive completo — sin overflow horizontal en ningún módulo

**Creado:** 2026-05-13  
**Estado:** Borrador  
**Pedido:** Hacer 100% responsive toda la aplicación, eliminar cualquier barra de scroll horizontal en todos los módulos, cubrir todos los breakpoints posibles.

---

## Descripción General

### Qué Logra Este Plan

Elimina **todo** scroll horizontal no deseado de la aplicación. Cubre desde la capa global (CSS raíz) hasta cada tabla, tarjeta y formulario. Cada componente tendrá un layout específico para móvil (<640px), tablet/ventana pequeña (640–1023px) y desktop (≥1024px). Las tablas con muchas columnas reemplazarán el scroll por vistas de tarjetas apiladas.

### Por Qué Importa

El primer cliente potencial usa una pantalla de ~1080px de ancho. Con el sidebar de 224px, el área útil real es ~856px. En esa franja varias tablas y grids desbordaban mostrando barras horizontales o campos vacíos/truncados. Sin responsive sólido no hay conversión de clientes.

---

## Estado Actual

### Estructura Existente Relevante

```
app/app/globals.css                              — CSS raíz, sin overflow-x: hidden
app/app/(dashboard)/layout.tsx                   — main con overflow-auto (permite scroll X)
app/components/dashboard/GananciaBrutaCard.tsx   — YA ARREGLADO parcialmente
app/components/dashboard/KpiCard.tsx             — YA ARREGLADO parcialmente
app/components/dashboard/SaldosCard.tsx          — YA ARREGLADO parcialmente
app/components/dashboard/TopProductosCard.tsx    — w-24 fijo puede desbordarse
app/components/dashboard/TopClientesCard.tsx     — w-24 + w-20 fijos
app/components/dashboard/UltimasVentasCard.tsx   — columnas de tiempo/monto ajustadas
app/components/dashboard/UltimasDevolucionesCard.tsx — ídem
app/components/configuracion/TabsConfiguracion.tsx   — overflow-x-auto + min-w-max (crea scroll)
app/components/configuracion/MetodosPagoManager.tsx  — tabla 7 columnas + inputs, SIN vista móvil
app/components/configuracion/CuentasFondosManager.tsx — tabla 9 columnas + inputs, SIN vista móvil
app/components/devoluciones/TablaDevoluciones.tsx    — SIN vista móvil de tarjetas
app/components/stock/MovimientosTabla.tsx            — tabla 8 columnas, SIN vista móvil
app/components/pos/Carrito.tsx                       — tabla con overflow-x-auto, SIN vista móvil
app/components/pos/POSContainer.tsx                  — layout lg:grid-cols-5
```

### Brechas o Problemas que se Abordan

1. **Sin `overflow-x: hidden` global** → cualquier componente que desborde 1px crea barra de scroll en toda la página
2. **`overflow-auto` en main** → permite scroll horizontal; debe ser solo vertical
3. **Tablas sin alternativa móvil**: `TablaDevoluciones`, `MovimientosTabla`, `Carrito` usan `overflow-x-auto` en lugar de layouts adaptativos
4. **Tablas de configuración editables** (`MetodosPagoManager`, `CuentasFondosManager`): 7–9 columnas con campos de input embebidos, imposible de usar en pantallas <900px sin scroll horizontal
5. **Tabs de configuración**: `min-w-max` en contenedor provoca desborde en pantallas <700px
6. **Columnas fijas en dashboard** (`TopProductosCard`, `TopClientesCard`): `w-24` + `w-20` hardcodeados que pueden desbordarse en cards de ~400px
7. **Grid KPIs a 4 columnas desde 1024px**: con sidebar (224px) el ancho efectivo es ~800px, las cards de KPI quedan en ~188px que es muy ajustado para montos largos

---

## Cambios Propuestos

### Resumen de Cambios

- **`globals.css`**: agregar `overflow-x: hidden` en `html` y `body`
- **`layout.tsx` (dashboard)**: cambiar `overflow-auto` → `overflow-y-auto overflow-x-hidden` en `<main>`
- **`TabsConfiguracion.tsx`**: cambiar `overflow-x-auto` + `min-w-max` → `flex-wrap` para que los tabs envuelvan en varias líneas en pantallas chicas
- **`TopProductosCard.tsx`**: reemplazar `w-24`/`w-16` fijos por `shrink-0 text-right` con `min-w-0` en nombre; monto usa `tabular-nums` para alinear sin anchos fijos
- **`TopClientesCard.tsx`**: ídem — `w-20`/`w-24` → `shrink-0` + ocultar col "compras" en <md
- **`TablaDevoluciones.tsx`**: agregar vista de tarjetas para `sm:hidden`, mantener tabla para `hidden sm:block`
- **`MovimientosTabla.tsx`**: agregar vista de tarjetas para `sm:hidden`, mantener tabla para `hidden sm:block`; en la tarjeta mostrar: fecha, tipo badge, variante (si aplica), delta, stock posterior
- **`Carrito.tsx`** (POS): reemplazar tabla por lista de tarjetas en `sm:hidden`; mantener tabla para `hidden sm:block`
- **`MetodosPagoManager.tsx`**: agregar vista "accordion card" para `md:hidden` — cada método es una tarjeta que al tocar "Editar" despliega un form apilado; mantener tabla para `hidden md:block`
- **`CuentasFondosManager.tsx`**: ídem — tarjeta por cuenta + form desplegable en `md:hidden`
- **`POSContainer.tsx`**: ajustar breakpoint — `xl:grid-cols-5` en vez de `lg:grid-cols-5` para que el split POS/Pago ocurra en pantallas más amplias; en `lg:` el PanelPago queda en card sticky al fondo o debajo del carrito

---

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/globals.css` | Agregar `overflow-x: hidden` a `html` y `body` |
| `app/app/(dashboard)/layout.tsx` | `overflow-auto` → `overflow-y-auto overflow-x-hidden` en `<main>` |
| `app/components/configuracion/TabsConfiguracion.tsx` | `overflow-x-auto` + `min-w-max` → `flex-wrap gap-y-1` |
| `app/components/dashboard/TopProductosCard.tsx` | Quitar `w-24`/`w-16` fijos; usar `shrink-0` + `tabular-nums` |
| `app/components/dashboard/TopClientesCard.tsx` | Igual; ocultar col "compras" en `<sm:` con `hidden sm:inline` |
| `app/components/devoluciones/TablaDevoluciones.tsx` | Agregar `sm:hidden` card view + `hidden sm:block` tabla |
| `app/components/stock/MovimientosTabla.tsx` | Agregar `sm:hidden` card view + `hidden sm:block` tabla |
| `app/components/pos/Carrito.tsx` | Agregar `sm:hidden` card list + `hidden sm:block` tabla |
| `app/components/pos/POSContainer.tsx` | `lg:grid-cols-5` → `xl:grid-cols-5`; agregar sticky panel pago en mobile |
| `app/components/configuracion/MetodosPagoManager.tsx` | Agregar `md:hidden` accordion cards + `hidden md:block` tabla |
| `app/components/configuracion/CuentasFondosManager.tsx` | Ídem accordion cards |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **`overflow-x: hidden` en raíz**: Es la red de seguridad global. Cualquier desborde imprevisto no crea scrollbar visible. Sin esta capa, cualquier pixel que desborde en el futuro rompe el layout.

2. **Patrón `sm:hidden` / `hidden sm:block` para tablas**: Ya lo usan `TablaClientes`, `TablaStock`, `ListaProductos` y `ClienteHistorial`. Unificar el mismo patrón en TODOS los componentes restantes. Consistencia ante todo.

3. **`md:hidden` / `hidden md:block` para tablas de configuración**: Las tablas de config tienen inputs editables, mucho más complejas. El breakpoint `md` (768px) es más generoso para estas vistas. En móvil se muestran como accordion cards; en desktop, la tabla entera.

4. **Accordion inline para config editable**: En lugar de abrir un modal o navegar a otra página, el form de edición se despliega debajo de cada tarjeta (toggle). Mantiene la UX de edición inline que ya existe en desktop.

5. **`xl:grid-cols-5` para POS**: En el ancho efectivo real del cliente (~856px = 1080px viewport - 224px sidebar), `lg:` ya está activo. Eso pone la grilla 5 cols en un espacio insuficiente. Mover a `xl:` (1280px viewport) hace que en pantallas de 1080px el POS use layout de una columna (buscador → carrito → panel pago apilados), que es usable y claro.

6. **Tabs de config con `flex-wrap`**: Los tabs de navegación de configuración (7 ítems) no caben en una sola línea en ~800px. Usar wrap es la solución más limpia y accesible; no necesita scroll.

7. **No tocar componentes de impresión** (`TicketVentaRenderer`, `RemitoImprimible`, etc.): Esos tienen dimensiones fijas en mm para impresión. No son pantallas de usuario.

### Alternativas Consideradas

- **Scroll horizontal contenido** (como está ahora): Rechazada. El cliente especificó explícitamente que no quiere barras de scroll.
- **Ocultar columnas con `hidden md:table-cell`**: Útil como complemento pero no suficiente para tablas de 8–9 columnas donde las columnas críticas siguen siendo demasiadas para el espacio disponible.
- **Tabla con `table-layout: fixed` + anchos porcentuales**: Complejo de mantener y no elimina el overflow en columnas con datos largos.

---

## Plan de Implementación Paso a Paso

### Paso 1 — Capa global (5 min)

**Archivo**: `app/app/globals.css`

```css
html,
body {
  overflow-x: hidden;
  max-width: 100%;
}
```

**Archivo**: `app/app/(dashboard)/layout.tsx`

Cambiar en el `<main>`:
```
className="flex-1 p-4 md:p-6 overflow-auto"
→
className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden"
```

---

### Paso 2 — Tabs de Configuración (10 min)

**Archivo**: `app/components/configuracion/TabsConfiguracion.tsx`

Cambiar el `<nav>` de:
```html
<nav className="border-b border-gray-200 mb-6 overflow-x-auto">
  <ul className="flex gap-4 min-w-max">
```
A:
```html
<nav className="border-b border-gray-200 mb-6">
  <ul className="flex flex-wrap gap-x-4 gap-y-0">
```

Los tabs que envuelven a segunda línea simplemente generan una segunda fila de tabs — correcto y limpio.

---

### Paso 3 — Dashboard: TopProductosCard y TopClientesCard (15 min)

**`TopProductosCard.tsx`** — Cada `<li>` tiene 4 elementos: número, nombre, unidades, monto.

Cambiar a:
```tsx
<li className="flex items-center gap-2 py-2 text-sm min-w-0">
  <span className="w-5 shrink-0 text-xs text-gray-400 font-mono">{i + 1}.</span>
  <span className="flex-1 truncate text-gray-900 min-w-0">{p.nombre}</span>
  <span className="shrink-0 text-xs text-gray-500 hidden sm:inline">{p.unidades} u.</span>
  <span className="shrink-0 text-xs font-medium text-gray-900 tabular-nums">{formatARS(p.monto)}</span>
</li>
```

Quitar los `w-24` y `w-16` hardcodeados; usar `shrink-0` + `tabular-nums` para que el dinero no "salte" de ancho.

**`TopClientesCard.tsx`** — Igual: quitar `w-20`/`w-24`, agregar `shrink-0`, ocultar col "X compras" en pantallas muy chicas con `hidden sm:inline`.

---

### Paso 4 — TablaDevoluciones: agregar vista móvil (20 min)

**Archivo**: `app/components/devoluciones/TablaDevoluciones.tsx`

Patrón idéntico a `TablaClientes`. Estructura:
```tsx
return (
  <>
    {/* Mobile cards — sm:hidden */}
    <div className="sm:hidden space-y-3">
      {items.map((d) => (
        <Link href={`/devoluciones/${d.id}`} className="block bg-white border border-gray-100 rounded-xl p-4 ...">
          <div className="flex justify-between gap-2 mb-1">
            <span className="font-mono text-xs text-gray-600">#{d.numero_devolucion}</span>
            <Badge tipo={d.tipo} />
          </div>
          <p className="text-[13px] text-gray-400">{formatDateTime(d.created_at)}</p>
          {contexto === 'global' && d.cliente_nombre && (
            <p className="text-[13px] text-gray-700 mt-0.5">{d.cliente_nombre}</p>
          )}
          <div className="flex justify-between mt-2">
            <span className="text-sm font-semibold text-amber-700">{formatARS(d.total_devuelto)}</span>
            <span className="text-xs text-lime-700">Ver →</span>
          </div>
        </Link>
      ))}
    </div>

    {/* Desktop table — hidden sm:block */}
    <div className="hidden sm:block bg-white rounded-xl border ...">
      {/* tabla existente sin cambios */}
    </div>
  </>
)
```

---

### Paso 5 — MovimientosTabla: agregar vista móvil (20 min)

**Archivo**: `app/components/stock/MovimientosTabla.tsx`

La tarjeta móvil muestra los datos esenciales:
```tsx
{/* Mobile cards */}
<div className="sm:hidden space-y-2">
  {items.map((m) => (
    <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tipoBadge[m.tipo]}`}>
          {tipoLabel[m.tipo]}
        </span>
        <span className={`text-sm font-bold ${m.cantidad > 0 ? 'text-green-700' : 'text-red-600'}`}>
          {formatSignedDelta(m.cantidad)}
        </span>
      </div>
      {mostrarVariante && (
        <p className="text-[13px] font-medium text-gray-900">{m.variante_nombre}</p>
      )}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{formatDateTime(m.created_at)}</span>
        <span>Stock: {m.stock_anterior} → <strong>{m.stock_posterior}</strong></span>
      </div>
      {m.motivo && <p className="text-[13px] text-gray-500 mt-1 truncate">{m.motivo}</p>}
    </div>
  ))}
</div>

{/* Desktop table — hidden sm:block */}
<div className="hidden sm:block ...">
  {/* tabla existente */}
</div>
```

---

### Paso 6 — Carrito POS: agregar vista móvil (25 min)

**Archivo**: `app/components/pos/Carrito.tsx`

En mobile, cada ítem del carrito es una tarjeta compacta:
```tsx
{/* Mobile list */}
<div className="sm:hidden divide-y divide-gray-100">
  {items.map((it) => (
    <div key={it.id} className={`p-3 ${stockExcedido ? 'bg-red-50' : ''}`}>
      <div className="flex justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{it.producto_nombre}</p>
          <p className="text-xs text-gray-500">
            {[it.talla, usarVar2 ? it.color : null].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <button onClick={() => onRemove(it.id)} className="shrink-0 text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
      </div>
      <div className="flex items-center justify-between gap-3">
        {/* input cantidad */}
        <input type="number" ... className="w-20 h-8 border rounded-md text-sm px-2" />
        {/* precio */}
        <input type="number" ... className="w-24 h-8 border rounded-md text-sm px-2" />
        {/* subtotal */}
        <span className="font-semibold text-gray-900 tabular-nums">{formatARS(subtotal)}</span>
      </div>
      {stockExcedido && <p className="text-xs text-red-600 mt-1">Excede stock ({it.stock_actual})</p>}
    </div>
  ))}
</div>

{/* Desktop table */}
<div className="hidden sm:block overflow-hidden">
  <table ...> {/* tabla existente */} </table>
</div>
```

---

### Paso 7 — POS layout: ajustar breakpoint (5 min)

**Archivo**: `app/components/pos/POSContainer.tsx`

```tsx
// Antes
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3 ...">

// Después
<div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
  <div className="xl:col-span-3 ...">
```

En pantallas 1024–1279px (viewport), el POS queda en columna única apilada: buscador → carrito → panel pago. Limpio y usable.

---

### Paso 8 — MetodosPagoManager: vista móvil accordion (40 min)

**Archivo**: `app/components/configuracion/MetodosPagoManager.tsx`

Es la más compleja. Estructura:

```tsx
return (
  <div className="space-y-4">
    {/* ... error banner, checkbox inactivos ... */}

    {/* MOBILE: accordion cards — md:hidden */}
    <div className="md:hidden space-y-3">
      {visibles.map((m) => {
        const editing = filaIdEditando === m.id
        return (
          <div key={m.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Header de la tarjeta */}
            <div className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="font-semibold text-[#0A0A0A] truncate">{m.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {cuentasActivas.find(c => c.id === m.cuenta_fondo_id)?.nombre ?? '—'} · {m.comision_porcentaje}%
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.activo ? 'bg-lime-50 text-lime-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button
                  onClick={() => editing ? cancelEdit(m.id) : startEdit(m)}
                  className="h-8 px-3 text-xs font-medium border border-gray-200 rounded-full"
                >
                  {editing ? 'Cancelar' : 'Editar'}
                </button>
              </div>
            </div>

            {/* Form desplegable */}
            {editing && (
              <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre</label>
                  <Input value={edicion[m.id].nombre} onChange={...} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Cuenta de fondos</label>
                  <Select value={edicion[m.id].cuenta_fondo_id} onChange={...}>...</Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Comisión %</label>
                    <Input type="number" value={String(edicion[m.id].comision_porcentaje)} onChange={...} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Días acred.</label>
                    <Input type="number" value={String(edicion[m.id].dias_acreditacion)} onChange={...} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveRow(m.id)} disabled={isPending}
                    className="flex-1 h-9 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg">
                    Guardar
                  </button>
                  <button onClick={() => toggleActivo(m.id, m.activo)}
                    className="h-9 px-3 border border-gray-200 text-sm rounded-lg text-gray-600">
                    {m.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Tarjeta para agregar nuevo */}
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nuevo método</p>
        <Input placeholder="Nombre" value={nueva.nombre} onChange={...} />
        <Select value={nueva.cuenta_fondo_id} onChange={...}>...</Select>
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" placeholder="Comisión %" ... />
          <Input type="number" placeholder="Días acred." ... />
        </div>
        <button onClick={crearFila} disabled={isPending}
          className="w-full h-9 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg">
          + Agregar
        </button>
      </div>
    </div>

    {/* DESKTOP: tabla existente — hidden md:block */}
    <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 bg-white">
      <table ...> {/* tabla existente sin cambios */} </table>
    </div>
  </div>
)
```

---

### Paso 9 — CuentasFondosManager: vista móvil accordion (35 min)

**Archivo**: `app/components/configuracion/CuentasFondosManager.tsx`

Mismo patrón que MetodosPagoManager. La tarjeta móvil muestra:
- Encabezado: color swatch + nombre + tipo badge + estado
- Sub-info: descripción, saldo en ARS
- Al abrir edición: nombre, tipo (Select), descripción, color picker, orden

```tsx
{/* Mobile accordion — md:hidden */}
<div className="md:hidden space-y-3">
  {visibles.map((c) => {
    const editing = filaIdEditando === c.id
    return (
      <div key={c.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          {/* Color swatch */}
          <span className="h-4 w-4 rounded-full shrink-0 border border-gray-200"
            style={{ background: c.color ?? '#6366f1' }} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#0A0A0A] truncate">{c.nombre}</p>
            <p className="text-xs text-gray-500">{c.tipo.replace('_',' ')} · {formatARS(c.saldo_actual)}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${c.activo ? 'bg-lime-50 text-lime-700' : 'bg-gray-100 text-gray-500'}`}>
            {c.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button onClick={() => editing ? cancelEdit(c.id) : startEdit(c)}
            className="h-8 px-3 text-xs font-medium border border-gray-200 rounded-full shrink-0">
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
        {editing && (
          <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre</label>
              <Input value={edicion[c.id].nombre} onChange={...} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
              <Select value={edicion[c.id].tipo} onChange={...}>...</Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción (CBU, CVU, etc.)</label>
              <Input value={edicion[c.id].descripcion ?? ''} onChange={...} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Orden</label>
                <Input type="number" value={String(edicion[c.id].orden)} onChange={...} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Color</label>
                <input type="color" value={edicion[c.id].color ?? '#6366f1'} onChange={...}
                  className="h-9 w-12 rounded border border-gray-300 cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveRow(c.id)} disabled={isPending}
                className="flex-1 h-9 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg">
                Guardar
              </button>
              <button onClick={() => toggleActivo(c)}
                className="h-9 px-3 border border-gray-200 text-sm rounded-lg text-gray-600">
                {c.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  })}

  {/* Tarjeta nueva cuenta */}
  <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nueva cuenta</p>
    <Input placeholder="Nombre (ej: EFECTIVO)" value={nueva.nombre} onChange={...} />
    <Select value={nueva.tipo} onChange={...}>...</Select>
    <Input placeholder="Descripción (CBU, CVU...)" value={nueva.descripcion ?? ''} onChange={...} />
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Input type="number" placeholder="Orden" value={String(nueva.orden)} onChange={...} />
      </div>
      <input type="color" value={nueva.color ?? '#6366f1'} onChange={...}
        className="h-9 w-12 rounded border border-gray-300" />
    </div>
    <button onClick={crearFila} disabled={isPending}
      className="w-full h-9 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg">
      + Agregar
    </button>
  </div>
</div>

{/* Desktop — hidden md:block */}
<div className="hidden md:block ...">
  {/* tabla existente */}
</div>
```

---

## Orden de Ejecución

| # | Paso | Archivo(s) | Impacto | Tiempo est. |
|---|------|-----------|---------|------------|
| 1 | Global CSS + layout overflow | `globals.css`, `layout.tsx` | Previene cualquier scroll X de página | 5 min |
| 2 | Tabs config | `TabsConfiguracion.tsx` | Tabs de config envuelven en mobile | 10 min |
| 3 | Dashboard top cards | `TopProductosCard.tsx`, `TopClientesCard.tsx` | Montos no desbordan | 15 min |
| 4 | TablaDevoluciones móvil | `TablaDevoluciones.tsx` | Módulo devoluciones usable en mobile | 20 min |
| 5 | MovimientosTabla móvil | `MovimientosTabla.tsx` | Historial de stock usable en mobile | 20 min |
| 6 | Carrito POS móvil | `Carrito.tsx` | POS operativo en tablet/mobile | 25 min |
| 7 | POS breakpoint | `POSContainer.tsx` | Layout POS correcto en 1080px | 5 min |
| 8 | MetodosPago mobile | `MetodosPagoManager.tsx` | Config de métodos usable en ~900px | 40 min |
| 9 | CuentasFondos mobile | `CuentasFondosManager.tsx` | Config de cuentas usable en ~900px | 35 min |

**Total estimado: ~175 min (≈ 3 hs)**

---

## Validación Post-Implementación

Para cada módulo, verificar con viewport a **1080px** y **768px**:

- [ ] Dashboard: KPIs, ganancia, saldos, top productos, últimas ventas — sin ningún scroll X
- [ ] POS: buscador → carrito → panel pago — flujo completo sin scroll X
- [ ] Ventas: listado completo sin scroll X
- [ ] Devoluciones: listado + detalle sin scroll X
- [ ] Stock: tabla y movimientos sin scroll X
- [ ] Clientes: listado + historial sin scroll X
- [ ] Caja: apertura, sesión abierta, cierre sin scroll X
- [ ] Configuración → todos los tabs: tienda, rubro, métodos, cuentas, etiquetas, importar — sin scroll X
- [ ] Remitos: listado + form nuevo sin scroll X

---

## Notas de Implementación

- Los componentes de **impresión** (`TicketVentaRenderer`, `EtiquetaRenderer`, `RemitoImprimible`, `CierreCajaRenderer`) **NO se modifican** — usan dimensiones fijas en mm para papel.
- El `overflow-x: hidden` en html/body **no afecta** el sidebar drawer en mobile (usa `fixed` con `translate-x`).
- Los `overflow-y-auto` internos (nav del sidebar, etc.) **no se ven afectados** por `overflow-x: hidden` en el padre.
- Al cambiar el POS a `xl:grid-cols-5`, en pantalla de 1080px el panel de pago queda debajo del carrito — es comportamiento correcto y usable (scroll vertical, no horizontal).
