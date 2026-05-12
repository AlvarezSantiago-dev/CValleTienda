# Plan: Rediseño Módulos Clientes y Configuración

**Creado:** 2026-05-10
**Estado:** Borrador
**Pedido:** Rediseñar clientes y configuración siguiendo el design system del nuevo landing page, 100% responsive con mobile cards donde corresponda.

---

## Descripción General

Aplicar el design system consolidado (paleta lime, botones `rounded-full`, `border-gray-100`, headings `text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]`, section labels `text-[10px] uppercase tracking-[0.10em]`) a **todos** los archivos de los módulos Clientes y Configuración.

- **Clientes** (10 archivos): listado con mobile cards, detalle con KPI cards + historial, forms con sección headers, acciones y modal.
- **Configuración** (15 archivos): TabsConfiguracion lime, 7 sub-páginas con heading nuevo, y 7 componentes manager/form con bordes, labels y botones actualizados.

Total: **25 archivos**, 0 cambios de lógica.

---

## Design System — Referencia Rápida

```
Heading principal:   text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]
Subtítulo:           text-[13px] text-gray-400 mt-1
Section label (h2):  text-[15px] font-semibold text-[#0A0A0A]
Section label (h3):  text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400
Dato field label:    text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400
Card border:         border border-gray-100
Empty state:         border border-dashed border-gray-200
Table thead:         bg-gray-50  →  tr: text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left
Table tbody:         divide-y divide-gray-100
Table wrapper:       hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden  +  div overflow-x-auto
Mobile cards:        sm:hidden space-y-3
Badge activo/lime:   bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700 rounded-full
Badge neutral:       bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-semibold rounded-full
Badge anulada/red:   bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 rounded-full
Badge completada:    bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700 rounded-full
Badge advertencia:   bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700 rounded-full
CTA button:          bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold
Secondary button:    border border-gray-200 rounded-full h-10 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50
Danger button:       border border-red-200 text-red-600 rounded-full h-10 px-4 text-sm font-medium hover:bg-red-50
Link:                text-lime-700 hover:text-lime-800 hover:underline
Checkbox accent:     text-lime-600 focus:ring-lime-400
Tabs activo:         border-lime-600 text-lime-700
KPI stat card:       rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5
                       label: text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400
                       value: text-base font-semibold text-[#0A0A0A]
Saldo favor:         bg-lime-50 border border-lime-200 (era emerald)
Feedback ok:         bg-lime-50 text-lime-800 border border-lime-200 rounded-xl
Feedback error:      bg-red-50 text-red-800 border border-red-200 rounded-xl
Rubro card selected: border-lime-600 bg-lime-50 (era indigo)
Rubro card text:     text-lime-700 (era indigo-700)
Aviso cambio rubro:  bg-amber-50 border border-amber-200 text-amber-800 (ya correcto)
Facturacion link:    text-lime-700 underline hover:text-lime-800 (era indigo)
```

---

## Archivos Involucrados

### Módulo Clientes (10 archivos)

| # | Archivo | Cambios clave |
|---|---------|---------------|
| C1 | `app/app/(dashboard)/clientes/page.tsx` | Heading nuevo, subtitle, botón CTA rounded-full, mobile cards sm:hidden, tabla hidden sm:block |
| C2 | `app/app/(dashboard)/clientes/nuevo/page.tsx` | Back link lime, heading nuevo, card border-gray-100 |
| C3 | `app/app/(dashboard)/clientes/[id]/page.tsx` | Back link lime, heading+badge, KPI cards gray-100, saldo favor lime, datos card border-gray-100, h2 labels nuevos |
| C4 | `app/app/(dashboard)/clientes/[id]/editar/page.tsx` | Back link lime, heading nuevo, card border-gray-100 |
| C5 | `components/clientes/TablaClientes.tsx` | Mobile cards sm:hidden, tabla hidden sm:block border-gray-100, thead gray-400, badge lime/gray, link lime, empty state border-gray-200 |
| C6 | `components/clientes/FiltrosClientes.tsx` | Card border-gray-100, botones rounded-full, checkbox lime |
| C7 | `components/clientes/ClienteForm.tsx` | Sección labels h3 nuevo, feedback lime/red rounded-xl, botón guardar rounded-full, cancelar rounded-full |
| C8 | `components/clientes/ClienteHistorial.tsx` | Mobile cards sm:hidden, tabla hidden sm:block border-gray-100, thead gray-400, badges lime/gray, link lime, empty state border-gray-200 |
| C9 | `components/clientes/AccionesCliente.tsx` | Botones rounded-full (danger y secondary) |
| C10 | `components/clientes/NuevoClienteModal.tsx` | Card interior border-gray-100, botones rounded-full, feedback lime/red |

### Módulo Configuración (15 archivos)

| # | Archivo | Cambios clave |
|---|---------|---------------|
| CF1 | `components/configuracion/TabsConfiguracion.tsx` | Tab activo border-lime-600 text-lime-700, hover border-gray-300, overflow-x-auto para mobile |
| CF2 | `app/app/(dashboard)/configuracion/page.tsx` | Heading nuevo, subtitle, cards border-gray-100 |
| CF3 | `app/app/(dashboard)/configuracion/rubro/page.tsx` | Heading nuevo, subtitle |
| CF4 | `app/app/(dashboard)/configuracion/metodos-pago/page.tsx` | Heading nuevo, subtitle |
| CF5 | `app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx` | Heading nuevo, subtitle |
| CF6 | `app/app/(dashboard)/configuracion/etiquetas/page.tsx` | Heading nuevo |
| CF7 | `app/app/(dashboard)/configuracion/facturacion/page.tsx` | Heading nuevo (faltan en código actual) |
| CF8 | `app/app/(dashboard)/configuracion/importar/page.tsx` | Heading nuevo, card border-gray-100, aviso amber OK, instrucciones |
| CF9 | `components/configuracion/DatosTiendaForm.tsx` | h2 sección labels, card border-gray-100, feedback lime/red, botón rounded-full |
| CF10 | `components/configuracion/LogoUpload.tsx` | Label text-[10px] uppercase, botones rounded-full, border-gray-100 |
| CF11 | `components/configuracion/MetodosPagoManager.tsx` | Tabla border-gray-100 thead gray-400, botones rounded-full edit/save/cancel/delete, checkbox lime, feedback lime/red |
| CF12 | `components/configuracion/CuentasFondosManager.tsx` | Tabla border-gray-100 thead gray-400, botones rounded-full, checkbox lime, feedback lime/red |
| CF13 | `components/configuracion/RubroForm.tsx` | Card border-gray-100, rubro cards border-lime-600/bg-lime-50 selected, text-lime-700, botón guardar rounded-full, feedback lime |
| CF14 | `components/configuracion/DisenadorEtiqueta.tsx` | Card border-gray-100, section labels, checkbox lime, botones rounded-full, presets labels |
| CF15 | `components/configuracion/FacturacionConfig.tsx` | Card border-gray-100, links lime, feedback lime/red, botón rounded-full, badges estado lime/gray |

---

## Tareas Detalladas

### FASE 1 — Páginas de clientes (C1–C4)

#### C1 · `app/app/(dashboard)/clientes/page.tsx`

```diff
- <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Clientes</h1>

- <p className="text-sm text-gray-500 mt-1">
+ <p className="text-[13px] text-gray-400 mt-1">

- <LinkButton href="/clientes/nuevo" size="sm">+ Nuevo cliente</LinkButton>
+ // Reemplazar LinkButton por <Link> nativo con clases CTA rounded-full:
+ <Link
+   href="/clientes/nuevo"
+   className="inline-flex items-center h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full transition-colors"
+ >
+   + Nuevo cliente
+ </Link>
```

El `EmptyState` genérico ya tiene su propio diseño — NO modificar su componente base, solo verificar que el botón dentro sea `rounded-full`. Si el componente EmptyState usa Button interno y pasa clases, ajustar ahí.

La paginación (`Pagination`) usa `LinkButton` internamente — si ya tiene rounded-full del rediseño anterior, omitir.

> **Responsive**: La página en sí no tiene tabla propia (usa `TablaClientes`), así que no se necesita lógica mobile aquí.

---

#### C2 · `app/app/(dashboard)/clientes/nuevo/page.tsx`

```diff
- <Link href="/clientes" className="text-sm text-indigo-600 hover:underline">
+ <Link href="/clientes" className="text-sm text-lime-700 hover:text-lime-800 hover:underline">

- <h1 className="text-2xl font-bold text-gray-900 mt-2">Nuevo cliente</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-2">Nuevo cliente</h1>

- <p className="text-sm text-gray-500 mt-1">
+ <p className="text-[13px] text-gray-400 mt-1">

- <div className="bg-white border border-gray-200 rounded-xl p-6">
+ <div className="bg-white border border-gray-100 rounded-xl p-6">
```

---

#### C3 · `app/app/(dashboard)/clientes/[id]/page.tsx`

```diff
// Back link
- <Link href="/clientes" className="text-sm text-indigo-600 hover:underline">
+ <Link href="/clientes" className="text-sm text-lime-700 hover:text-lime-800 hover:underline">

// Heading
- <h1 className="text-2xl font-bold text-gray-900">{nombreCompleto}</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">{nombreCompleto}</h1>

// Badge Activo (era green-100/green-800)
- <span className="... bg-green-100 text-green-800">Activo</span>
+ <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">Activo</span>

// Badge Inactivo (ya era gray-100/gray-600, solo ajustar font-semibold)
- <span className="... text-xs font-medium bg-gray-100 text-gray-600">Inactivo</span>
+ <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Inactivo</span>

// Subtítulo
- <p className="text-sm text-gray-500 mt-1">Cliente desde…</p>
+ <p className="text-[13px] text-gray-400 mt-1">Cliente desde…</p>

// KPI stat cards — reemplazar StatCard helper:
// Era: <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
//       <p className="text-xs text-gray-500">{label}</p>
//       <p className="text-base font-semibold text-gray-900">{value}</p>
// Nuevo:
// <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
//   <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">{label}</p>
//   <p className="text-base font-semibold text-[#0A0A0A]">{value}</p>
// </div>

// Saldo a favor (era emerald)
- <div className="... bg-emerald-50 border border-emerald-200 ...">
-   <p className="... text-emerald-800">Saldo a favor disponible</p>
-   <p className="... text-emerald-600 ...">Acreditado por devoluciones…</p>
-   <span className="... text-emerald-700">
+ <div className="flex items-center justify-between bg-lime-50 border border-lime-200 rounded-xl px-5 py-4">
+   <div>
+     <p className="text-sm font-semibold text-lime-800">Saldo a favor disponible</p>
+     <p className="text-[13px] text-lime-700 mt-0.5">Acreditado por devoluciones…</p>
+   </div>
+   <span className="text-2xl font-bold text-lime-700">

// Sección datos personales
- <div className="bg-white border border-gray-200 rounded-xl p-6">
+ <div className="bg-white border border-gray-100 rounded-xl p-6">

- <h2 className="text-base font-semibold text-gray-900 mb-4">Datos personales</h2>
+ <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-4">Datos personales</h2>

// Field labels (dl/dt)
// Era:   <dt className="text-xs uppercase tracking-wide text-gray-500 font-medium">
// Nuevo: <dt className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">

// Sección historial
- <h2 className="text-base font-semibold text-gray-900">Historial de compras</h2>
+ <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Historial de compras</h2>
```

Los botones "Editar" y "Desactivar/Reactivar" están en `LinkButton` (via `AccionesCliente`) — ya se actualizan en C9.

---

#### C4 · `app/app/(dashboard)/clientes/[id]/editar/page.tsx`

```diff
- <Link href={...} className="text-sm text-indigo-600 hover:underline">
+ <Link href={...} className="text-sm text-lime-700 hover:text-lime-800 hover:underline">

- <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar {nombreCompleto}</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-2">Editar {nombreCompleto}</h1>

- <div className="bg-white border border-gray-200 rounded-xl p-6">
+ <div className="bg-white border border-gray-100 rounded-xl p-6">
```

---

### FASE 2 — Componentes de clientes (C5–C10)

#### C5 · `components/clientes/TablaClientes.tsx`

**Mobile cards** (`sm:hidden`): mostrar cada cliente como una card con:
- Nombre completo en `text-sm font-semibold text-[#0A0A0A]`
- Badge Activo (lime) / Inactivo (gray) a la derecha del nombre
- DNI, teléfono y email en `text-[13px] text-gray-400`
- Compras y monto en fila inferior: `text-[13px] text-gray-600`
- Link "Ver →" en `text-xs text-lime-700 hover:underline`
- Última compra en `text-[13px] text-gray-400`
- Card: `bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200`

**Desktop** (`hidden sm:block`): tabla con:
```diff
- <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
+ <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
+   <div className="overflow-x-auto">

// Thead
- <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
-   <tr>
-     <th className="px-3 py-2 text-left font-medium">...
+ <thead className="bg-gray-50">
+   <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
+     <th className="px-3 py-2">...

// Tbody
- <tbody className="divide-y divide-gray-100">   // ← ya correcto
  // Sin cambio (ya era gray-100)

// Badge Activo (era green-100/green-800)
- <span className="... bg-green-100 text-green-800">Activo</span>
+ <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">Activo</span>

// Badge Inactivo (ajustar font-semibold)
- <span className="... font-medium bg-gray-100 text-gray-600">Inactivo</span>
+ <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Inactivo</span>

// Link
- <Link href={...} className="text-indigo-600 hover:underline text-xs font-medium">
+ <Link href={...} className="text-xs text-lime-700 hover:underline font-medium">

// Empty state
- <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 ...">
+ <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 ...">
```

**Estructura final del return:**
```tsx
return (
  <>
    {/* Mobile cards */}
    <div className="sm:hidden space-y-3">
      {items.map((c) => {
        const nombreCompleto = `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`
        return (
          <Link
            key={c.id}
            href={`/clientes/${c.id}`}
            className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-[#0A0A0A]">{nombreCompleto}</span>
              {c.activo ? (
                <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">Activo</span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Inactivo</span>
              )}
            </div>
            <div className="text-[13px] text-gray-400 space-y-0.5">
              {c.dni && <p>DNI {c.dni}</p>}
              {c.telefono && <p>{c.telefono}</p>}
              {c.email && <p>{c.email}</p>}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[13px] text-gray-600">
                {formatNumber(c.total_compras)} compras · {formatARS(c.monto_total)}
              </span>
              <span className="text-xs text-lime-700 font-medium">Ver →</span>
            </div>
            {c.ultima_compra && (
              <p className="text-[13px] text-gray-400 mt-1">
                Última: {formatDate(c.ultima_compra)}
              </p>
            )}
          </Link>
        )
      })}
    </div>

    {/* Desktop table */}
    <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
              ...th sin className de text ni font...
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            ...rows igual que antes pero badges/links actualizados...
          </tbody>
        </table>
      </div>
    </div>
  </>
)
```

---

#### C6 · `components/clientes/FiltrosClientes.tsx`

```diff
- className="bg-white rounded-xl border border-gray-200 p-4 grid ..."
+ className="bg-white rounded-xl border border-gray-100 p-4 grid ..."

// Checkbox
- className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
+ className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"

// Botón Aplicar (usar clases directas en lugar del componente Button size="sm")
// Si Button no tiene aún rounded-full, reemplazar por botón inline:
// <button type="submit" disabled={isPending}
//   className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60"
// >

// Botón Limpiar (ghost → secondary outline):
// <button type="button" onClick={limpiar}
//   className="h-10 px-4 text-sm font-medium text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50"
// >
```

> **Nota:** Si el componente `Button` del design system ya fue actualizado con `rounded-full` en sesiones anteriores, solo se necesita verificar que la variante `ghost` tenga las clases correctas.

---

#### C7 · `components/clientes/ClienteForm.tsx`

```diff
// Sección labels internos (si los tiene — actualmente no tiene h3s de sección, agregar)
// Agregar antes del grid principal:
// <h3 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">
//   Datos personales
// </h3>

// Feedback de error
- // (actualmente no hay feedback en ClienteForm, el error se muestra como string)
// Cambiar el div de error:
// De: texto plano en rojo
// A:
// <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
//   {error}
// </div>

// Botón submit
// Si usa <Button type="submit">, verificar que sea rounded-full.
// Si no, reemplazar por:
// <button type="submit" disabled={isPending}
//   className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60"
// >
//   {isPending ? 'Guardando…' : mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
// </button>
```

> Leer el archivo completo antes de implementar para identificar el bloque de botones al final del form.

---

#### C8 · `components/clientes/ClienteHistorial.tsx`

Idéntico patrón que C5 pero con columnas de venta. Mobile cards + desktop table.

**Mobile cards** por venta:
- Ticket `#XXXX` en `font-mono text-xs text-gray-600`
- Fecha en `text-[13px] text-gray-400`
- Total (bold si no anulada, tachado+gray-400 si anulada)
- Badge Completada (lime) / Anulada (gray) a la derecha
- Link "Ver →" en `text-xs text-lime-700`

**Desktop table:**
```diff
- <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
+ <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
+   <div className="overflow-x-auto">

// Thead
- <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
- <tr>
- <th className="px-3 py-2 text-left font-medium">
+ <thead className="bg-gray-50">
+ <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
+ <th className="px-3 py-2">

// Badge Completada (era green-100/green-800)
- <span className="... bg-green-100 text-green-800">Completada</span>
+ <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">Completada</span>

// Badge Anulada: ya correcto (gray-100/gray-600), solo font-semibold
- <span className="... font-medium bg-gray-100 text-gray-600">Anulada</span>
+ <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Anulada</span>

// Link
- <Link href={...} className="text-indigo-600 hover:underline text-xs font-medium">
+ <Link href={...} className="text-xs text-lime-700 hover:underline font-medium">

// Empty state
- <div className="... border-dashed border-gray-300 ...">
+ <div className="... border-dashed border-gray-200 ...">
```

---

#### C9 · `components/clientes/AccionesCliente.tsx`

`AccionesCliente` usa `<Button variant="danger" size="sm">` y `<Button variant="secondary" size="sm">`. Si el componente `Button` base ya fue actualizado con `rounded-full`, no hay cambios aquí.

Si **no** fue actualizado, reemplazar por botones inline:
```diff
- <Button type="button" variant={activo ? 'danger' : 'secondary'} size="sm" ...>
+ <button
+   type="button"
+   onClick={toggle}
+   disabled={isPending}
+   className={activo
+     ? 'h-10 px-4 text-sm font-medium border border-red-200 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-60'
+     : 'h-10 px-4 text-sm font-medium border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 disabled:opacity-60'
+   }
+ >
```

---

#### C10 · `components/clientes/NuevoClienteModal.tsx`

```diff
// Modal overlay ya usa bg-black/40 — OK
// Panel interior:
- // (buscar el div principal del modal, probablemente bg-white rounded-xl)
// Cambiar border a border-gray-100 si lo tiene

// Botones Cancelar y Crear:
// Cancelar:
// <button className="h-10 px-4 text-sm font-medium text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50">
// Crear:
// <button className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60">

// Feedback de error
// <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
```

> Leer el final del archivo (línea 80 en adelante) antes de implementar para ver la estructura del modal y los botones.

---

### FASE 3 — Páginas de configuración (CF2–CF8)

#### CF1 · `components/configuracion/TabsConfiguracion.tsx`

```diff
// Nav wrapper — agregar overflow-x-auto para mobile (tabs horizontales que no caben en móvil)
- <nav className="border-b border-gray-200 mb-6">
-   <ul className="flex gap-6">
+ <nav className="border-b border-gray-200 mb-6 overflow-x-auto">
+   <ul className="flex gap-4 min-w-max">

// Tab activo
- 'border-indigo-600 text-indigo-700'
+ 'border-lime-600 text-lime-700'

// Tab hover
- 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
+ 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
```

---

#### CF2 · `app/app/(dashboard)/configuracion/page.tsx`

```diff
- <h1 className="text-2xl font-semibold text-gray-900 mb-1">Configuración</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Configuración</h1>

- <p className="text-sm text-gray-500 mb-5">
+ <p className="text-[13px] text-gray-400 mb-5">

// Card del logo
- <div className="bg-white border border-gray-200 rounded-xl p-6">
+ <div className="bg-white border border-gray-100 rounded-xl p-6">
```

---

#### CF3 · `app/app/(dashboard)/configuracion/rubro/page.tsx`

```diff
- <h1 className="text-2xl font-semibold text-gray-900 mb-1">Configuración</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Rubro del negocio</h1>

- <p className="text-sm text-gray-500 mb-5">
+ <p className="text-[13px] text-gray-400 mb-5">
```

---

#### CF4 · `app/app/(dashboard)/configuracion/metodos-pago/page.tsx`

```diff
- <h1 className="text-2xl font-semibold text-gray-900 mb-1">Métodos de pago</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Métodos de pago</h1>

- <p className="text-sm text-gray-500 mb-5">
+ <p className="text-[13px] text-gray-400 mb-5">
```

---

#### CF5 · `app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx`

```diff
- <h1 className="text-2xl font-semibold text-gray-900 mb-1">Cuentas de fondos</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Cuentas de fondos</h1>

- <p className="text-sm text-gray-500 mb-5">
+ <p className="text-[13px] text-gray-400 mb-5">
```

---

#### CF6 · `app/app/(dashboard)/configuracion/etiquetas/page.tsx`

Agregar heading antes del `<TabsConfiguracion>`:
```tsx
<h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">
  Diseño de etiquetas
</h1>
<p className="text-[13px] text-gray-400 mb-5">
  Configurá el tamaño y el contenido de las etiquetas de precio.
</p>
```
> Verificar si ya tiene h1 — si no está, agregarlo.

---

#### CF7 · `app/app/(dashboard)/configuracion/facturacion/page.tsx`

Agregar heading antes de `<TabsConfiguracion>`:
```tsx
<h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">
  Facturación electrónica
</h1>
<p className="text-[13px] text-gray-400 mb-5">
  Integración con AFIP/ARCA a través de TusFacturasAPP.
</p>
```

---

#### CF8 · `app/app/(dashboard)/configuracion/importar/page.tsx`

```diff
- <h1 className="text-2xl font-semibold text-gray-900 mb-1">Configuración</h1>
+ <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Importar productos</h1>

- <p className="text-sm text-gray-500 mb-5">
+ <p className="text-[13px] text-gray-400 mb-5">

// Card importar
- <div className="bg-white border border-gray-200 rounded-xl p-6">
+ <div className="bg-white border border-gray-100 rounded-xl p-6">

// H2 dentro del card
- <h2 className="text-lg font-semibold text-gray-900 mb-1">Importar productos desde CSV</h2>
+ <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Importar productos desde CSV</h2>

- <p className="text-sm text-gray-500 mb-4">
+ <p className="text-[13px] text-gray-400 mb-4">

// Card instrucciones amber — ya correcto (bg-amber-50 border-amber-200), solo h3:
- <h3 className="text-sm font-semibold text-amber-800 mb-1">Instrucciones</h3>
+ <h3 className="text-sm font-semibold text-amber-800 mb-1">Instrucciones</h3>   // sin cambio
```

---

### FASE 4 — Componentes de configuración (CF9–CF15)

#### CF9 · `components/configuracion/DatosTiendaForm.tsx`

```diff
// Feedback
- className={`rounded-lg p-3 text-sm ${
-   mensaje.tipo === 'ok'
-     ? 'bg-green-50 text-green-800 border border-green-200'
-     : 'bg-red-50 text-red-800 border border-red-200'
+ className={`rounded-xl px-4 py-3 text-sm ${
+   mensaje.tipo === 'ok'
+     ? 'bg-lime-50 text-lime-800 border border-lime-200'
+     : 'bg-red-50 text-red-800 border border-red-200'

// Sección "Datos fiscales"
- <h2 className="text-lg font-semibold text-gray-900 mb-1">Datos fiscales</h2>
+ <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Datos fiscales</h2>

- <p className="text-sm text-gray-500 mb-4">
+ <p className="text-[13px] text-gray-400 mb-4">

// Sección "Configuración del ticket" (y similares si existen)
// Aplicar mismo patrón: text-[15px] font-semibold text-[#0A0A0A]

// Botón guardar
// <button type="submit" disabled={isPending}
//   className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60"
// >
//   {isPending ? 'Guardando…' : 'Guardar cambios'}
// </button>
```

> Leer el archivo completo (actualmente leído hasta línea 100) para ver todas las secciones y el bloque de botones final.

---

#### CF10 · `components/configuracion/LogoUpload.tsx`

```diff
// Label principal
- <p className="text-sm font-medium text-gray-700">Logo del negocio</p>
+ <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Logo del negocio</p>

// Descripción
- <p className="text-xs text-gray-500">Se mostrará en los remitos impresos…</p>
+ <p className="text-[13px] text-gray-400">Se mostrará en los remitos impresos…</p>

// Preview container — border-gray-200 → border-gray-100
- <div className="... border-dashed border-gray-200 ...">   // ya correcto, mantener

// Botón subir logo (actualmente usa className sin rounded-full)
// Agregar rounded-full:
// className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60"

// Botón eliminar logo
// className="h-10 px-4 text-sm font-medium border border-red-200 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-60"

// Error feedback
// <p className="text-sm text-red-600"> → no cambiar, es solo texto
```

> Leer las líneas 80+ para ver los botones completos.

---

#### CF11 · `components/configuracion/MetodosPagoManager.tsx`

Archivo con tabla editable inline. Cambios:

```diff
// Tabla wrapper
- // (buscar el div que envuelve la table)
+ // Agregar hidden sm:block si hay versión mobile, sino solo border-gray-100

// Thead
- // texto-xs text-gray-500 uppercase tracking-wide
+ // tr: text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400

// Tbody
- divide-y divide-gray-200  →  divide-y divide-gray-100

// Botones "Editar", "Guardar", "Cancelar", "Eliminar"
// Editar: border border-gray-200 rounded-full h-8 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50
// Guardar: bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-8 px-3 text-xs font-semibold
// Cancelar: border border-gray-200 rounded-full h-8 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50
// Eliminar/Desactivar: border border-red-200 text-red-600 rounded-full h-8 px-3 text-xs font-medium hover:bg-red-50
// Reactivar: border border-amber-200 text-amber-700 rounded-full h-8 px-3 text-xs font-medium hover:bg-amber-50

// Checkbox "Mostrar inactivos"
- className="... text-indigo-600 focus:ring-indigo-500"
+ className="... text-lime-600 focus:ring-lime-400"

// Card wrapper (si hay uno alrededor de toda la tabla)
- border border-gray-200
+ border border-gray-100

// Botón "Agregar nuevo método"
// bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full h-10 px-4 text-sm font-semibold

// Error feedback
// <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
```

> Este componente es extenso — leer el archivo completo para mapear todos los botones antes de implementar.

---

#### CF12 · `components/configuracion/CuentasFondosManager.tsx`

Idéntico patrón que CF11. Mismos cambios en tabla, botones y checkbox.

```diff
// Adicionalmente, hay un campo color picker (input type="color") — no modificar su lógica.
// El label del campo color:
- // text-xs text-gray-500 o similar
+ // text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400
// (aplicar si existe)
```

---

#### CF13 · `components/configuracion/RubroForm.tsx`

```diff
// Card exterior
- <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
+ <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">

// Label "Tipo de negocio"
- <p className="text-sm font-semibold text-gray-800 mb-1">Tipo de negocio</p>
+ <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-1">Tipo de negocio</p>

// Descripción
- <p className="text-xs text-gray-500 mb-4">
+ <p className="text-[13px] text-gray-400 mb-4">

// Rubro card selected (era indigo)
- 'border-indigo-600 bg-indigo-50'
+ 'border-lime-600 bg-lime-50'

// Rubro card text selected
- `text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`
+ `text-sm font-medium ${isSelected ? 'text-lime-700' : 'text-gray-800'}`

// Aviso cambio: ya correcto (amber-50/amber-200/amber-800), mantener

// Feedback ok
- // (si existe, buscar y cambiar)
// <div className="rounded-xl bg-lime-50 border border-lime-200 px-4 py-3 text-sm text-lime-800">

// Botón guardar
// <button type="submit" disabled={pending}
//   className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60"
// >
```

---

#### CF14 · `components/configuracion/DisenadorEtiqueta.tsx`

Componente con preview de etiqueta. Cambios de UI solamente:

```diff
// CheckboxRow interno
- <input ... className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
+ <input ... className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"

// Select de presets (si tiene label)
// Label: text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400

// Panels/cards envolventes
- border border-gray-200  →  border border-gray-100

// Section headers dentro del diseñador (campos de tamaño, campos de contenido)
- // text-sm font-semibold text-gray-900 o similar
+ // text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400

// Botón guardar plantilla
// h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full

// Feedback guardado
// rounded-xl bg-lime-50 border border-lime-200 text-sm text-lime-800
```

> Leer el archivo completo (actualmente leído hasta línea 60) para ver la estructura del form y el botón submit.

---

#### CF15 · `components/configuracion/FacturacionConfig.tsx`

```diff
// Card exterior
- <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
+ <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-6">

// H2 "Facturación Electrónica"
- <h2 className="text-base font-semibold text-gray-900">Facturación Electrónica</h2>
+ <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Facturación Electrónica</h2>

// Descripción
- <p className="text-sm text-gray-500 mt-0.5">
+ <p className="text-[13px] text-gray-400 mt-0.5">

// Link TusFacturasAPP
- className="text-indigo-600 underline hover:text-indigo-800"
+ className="text-lime-700 underline hover:text-lime-800"

// Badge estado activo/inactivo
// Activo: bg-lime-50 border border-lime-200 text-lime-700 rounded-full
// Inactivo: bg-gray-100 text-gray-600 rounded-full

// Secciones internas (Condición IVA, Punto de Venta, Credenciales API, etc.)
// Labels: text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400

// Feedback
- // bg-green-50 text-green-800 border-green-200  →  bg-lime-50 text-lime-800 border-lime-200
- // bg-red-50 text-red-800 border-red-200         →  mantener igual

// Botón guardar
// h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full

// Checkbox "Activar facturación"
- className="... text-indigo-600 focus:ring-indigo-500"
+ className="... text-lime-600 focus:ring-lime-400"
```

---

### FASE 5 — Verificación (get_errors)

Correr `get_errors` en los 25 archivos. Meta: 0 errores TypeScript.

Archivos a verificar:
```
app/app/(dashboard)/clientes/page.tsx
app/app/(dashboard)/clientes/nuevo/page.tsx
app/app/(dashboard)/clientes/[id]/page.tsx
app/app/(dashboard)/clientes/[id]/editar/page.tsx
app/components/clientes/TablaClientes.tsx
app/components/clientes/FiltrosClientes.tsx
app/components/clientes/ClienteForm.tsx
app/components/clientes/ClienteHistorial.tsx
app/components/clientes/AccionesCliente.tsx
app/components/clientes/NuevoClienteModal.tsx
app/app/(dashboard)/configuracion/page.tsx
app/app/(dashboard)/configuracion/rubro/page.tsx
app/app/(dashboard)/configuracion/metodos-pago/page.tsx
app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx
app/app/(dashboard)/configuracion/etiquetas/page.tsx
app/app/(dashboard)/configuracion/facturacion/page.tsx
app/app/(dashboard)/configuracion/importar/page.tsx
app/components/configuracion/TabsConfiguracion.tsx
app/components/configuracion/DatosTiendaForm.tsx
app/components/configuracion/LogoUpload.tsx
app/components/configuracion/MetodosPagoManager.tsx
app/components/configuracion/CuentasFondosManager.tsx
app/components/configuracion/RubroForm.tsx
app/components/configuracion/DisenadorEtiqueta.tsx
app/components/configuracion/FacturacionConfig.tsx
```

---

## Notas de Implementación

1. **Tailwind v4 — clases estáticas únicamente.** No concatenar strings dinámicos. Los ternarios con strings completos son OK.
2. **No modificar lógica**, solo clases CSS y estructura HTML de presentación.
3. **LinkButton y Button base**: Si estos componentes ya fueron actualizados con `rounded-full` en el rediseño del layout/sidebar, respetar esos cambios y no duplicarlos. Verificar primero.
4. **Mobile cards**: Siempre estructura `<> <div className="sm:hidden ..."> <div className="hidden sm:block ..."> </>`. Nunca omitir el fragmento.
5. **Componentes con inline-edit (Managers)**: Priorizar legibilidad — los botones inline pequeños usan `h-8 px-3 text-xs`, los CTA principales usan `h-10 px-4 text-sm`.
6. **NuevoClienteModal**: Leer las líneas 80+ del archivo para ver estructura completa del modal y botones antes de editar.
7. **DisenadorEtiqueta**: Es el componente más extenso y complejo del módulo configuración. Leer el archivo completo antes de implementar.
8. **FacturacionConfig**: Leer las líneas 80+ para ver el bloque de estado actual, credenciales y el botón de guardar.

---

## Orden de Ejecución Recomendado

```
Fase 1: C1 → C2 → C3 → C4              (páginas clientes — get_errors parcial)
Fase 2: C5 → C6 → C7 → C8 → C9 → C10  (componentes clientes — get_errors parcial)
Fase 3: CF1 → CF2 → CF3 → CF4 → CF5 → CF6 → CF7 → CF8  (páginas config)
Fase 4: CF9 → CF10 → CF11 → CF12 → CF13 → CF14 → CF15  (componentes config)
Fase 5: get_errors en los 25 archivos
```
