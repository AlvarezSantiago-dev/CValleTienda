# Plan: Remito Clásico — Fidelidad 100% + Impresión correcta

**Fecha:** 2026-05-13  
**Objetivo:** Que el remito clásico sea visualmente idéntico al talonario físico y que el botón "Imprimir" imprima **solo el remito** en una hoja A4, sin sidebar, header ni UI del sistema.

---

## Diagnóstico

### Problema principal: impresión incluye la UI del sistema
`window.print()` imprime lo que se ve en pantalla. Actualmente:
- El `AppShell` (sidebar + header) NO tiene clases `print:hidden` → se imprime junto al remito
- El `<main>` también se imprime (con los data cards aunque estos sí tienen `print:hidden`)
- El resultado es una página caótica: sidebar a la izquierda, remito a la derecha

### Problema secundario: la hoja A4 no ocupa el tamaño correcto
- El `@page { margin: 0; }` actual está dentro de `@media print` (CSS inválido según spec — navegadores lo ignoran)
- El componente `RemitoImprimibleClasico` tiene su propio padding interno, pero si `@page` tiene márgenes, el remito se "recorta"

### Problema visual: diferencias con la foto
1. **Cuadro "FECHA"**: En el código hay un cuadro vacío con label "FECHA". En la foto ese cuadro no existe — solo DÍA, MES, AÑO tienen cuadros. El label "FECHA" está a la izquierda de los tres cuadros.
2. **Distribución encabezado**: En la foto, los datos de la empresa (dirección, teléfono) están en la mitad izquierda del encabezado, y los cuadros de fecha + número de remito en la mitad derecha — pero el "REMITO Nº" está **dentro del bloque de la fecha** alineado a la derecha, no debajo.
3. **La línea separadora** entre encabezado y destinatario en la foto es una línea horizontal simple, en el código es un border-top/border-bottom. Está bien, pero el spacing es diferente.
4. **Número de remito en la foto**: aparece en la misma zona derecha que los cuadros de fecha, alineado a la derecha abajo del bloque.
5. **El slogan**: La foto tiene "TODO PARA LA CONSTRUCCIÓN" en negro sólido (banda negra), teléfonos con ícono WhatsApp. Eso es branding específico del cliente. Nuestro componente genérico no debe tener slogan hardcodeado pero sí respetar el `texto_encabezado` si existe en la config.

---

## Pasos

### Paso 1 — AppShell: ocultar sidebar y header en impresión
**Archivo:** `app/components/layout/AppShell.tsx`

Agregar `print:hidden` al div del sidebar y al componente `<Header>`:
```tsx
{/* Sidebar */}
<div className={`fixed inset-y-0 left-0 z-30 ... print:hidden`}>
  <Sidebar ... />
</div>

{/* Header */}
<Header className="print:hidden" ... />
```

Como `Header` es un componente, necesita aceptar `className` y aplicarlo. Alternativa más simple: agregar `print:hidden` al wrapper del Header en AppShell: `<div className="print:hidden"><Header .../></div>`.

**Resultado esperado:** Al imprimir, no hay sidebar ni header — solo el contenido de `<main>`.

---

### Paso 2 — Layout del remito: ocultar datos de pantalla al imprimir
**Archivo:** `app/app/(dashboard)/remitos/[id]/page.tsx`

Los data cards (`Destinatario`, `Información del remito`, tabla de items) ya tienen `print:hidden`. ✅  
El encabezado con breadcrumb y acciones también ya tiene `print:hidden`. ✅  
El `<main>` en `DashboardLayout` tiene `p-4 md:p-6` — necesita `print:p-0` para no agregar padding extra.

Cambio en `DashboardLayout`:
```tsx
<main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden print:p-0">
```

El div que envuelve el componente imprimible:
```tsx
{/* Actualmente: */}
<div className="print:block">
  <RemitoImprimibleClasico ... />
</div>

{/* Sin cambio necesario — el div es block por defecto en pantalla también */}
```

---

### Paso 3 — print.css: regla @page correcta para A4
**Archivo:** `app/styles/print.css`

El `@page` **debe estar fuera** de `@media print` para ser válido. Mover y especificar tamaño A4:

```css
/* Fuera de cualquier @media: */
@page {
  size: A4 portrait;
  margin: 0;
}
```

Esto garantiza que el navegador configure la hoja a A4 sin márgenes, y el padding del componente (8mm 10mm) actúa como margen visual.

---

### Paso 4 — RemitoImprimibleClasico: corregir diseño del encabezado
**Archivo:** `app/components/remitos/RemitoImprimibleClasico.tsx`

Cambios visuales para igualar la foto:

#### 4a. Quitar el cuadro "FECHA" extra, reemplazar por label
```tsx
{/* Antes: 4 cuadros (FECHA vacío + DÍA + MES + AÑO) */}
{/* Después: label "FECHA" a la izquierda + 3 cuadros (DÍA + MES + AÑO) */}
<div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', justifyContent: 'flex-end', marginBottom: '4px' }}>
  <span style={{ fontSize: '8pt', fontWeight: 600, marginRight: '4px', paddingBottom: '3px' }}>FECHA</span>
  {[
    { label: 'DÍA', value: dia },
    { label: 'MES', value: mes },
    { label: 'AÑO', value: anio },
  ].map(({ label, value }) => (
    <div key={label} style={{ textAlign: 'center' }}>
      <div style={{ width: label === 'AÑO' ? '18mm' : '12mm', height: '10mm', border: '1.5px solid #222', ... }}>
        {value}
      </div>
      <div style={{ fontSize: '7pt', ... }}>{label}</div>
    </div>
  ))}
</div>
```

#### 4b. Bloque del nombre de empresa
- El nombre en rojo bold con font-size más grande (20pt)
- El CUIT debe aparecer más pequeño y en gris bajo el nombre
- El teléfono con el ícono WhatsApp (o ☎) en una línea separada, más prominente

#### 4c. Dirección en el bloque derecho
En la foto la dirección está en el bloque derecho (junto a los cuadros de fecha). En el código actual la dirección ya está en la derecha (bloque `textAlign: 'right'`). ✅

#### 4d. Número de remito
En la foto aparece como "REMITO Nº XXXXX" alineado a la derecha, justo debajo de la dirección, antes de la separación. Ya está en el bloque derecho. ✅

#### 4e. Línea separadora horizontal completa
En la foto hay una línea horizontal que separa el encabezado de los datos del destinatario. En el código, el div del destinatario tiene `borderTop` y `borderBottom`. Agregar una línea separadora explícita con un `<hr>` o un `<div>` con `border-top`.

#### 4f. Texto encabezado (slogan)
Agregar soporte para `textoEncabezado` prop (si está en la config). El componente ya recibe las props base pero no `textoEncabezado`. Agregar a la interfaz y mostrar debajo del teléfono en el bloque izquierdo, en negrita y fondo oscuro como en la foto.

---

### Paso 5 — Agregar prop textoEncabezado al componente
**Archivo:** `app/components/remitos/RemitoImprimibleClasico.tsx`

```tsx
interface Props {
  ...
  textoEncabezado?: string | null  // Nuevo
}
```

**Archivo:** `app/app/(dashboard)/remitos/[id]/page.tsx`

```tsx
const textoEncabezado = (config as { texto_encabezado?: string | null } | null)?.texto_encabezado ?? null
// Pasar al componente clásico:
<RemitoImprimibleClasico
  ...
  textoEncabezado={textoEncabezado}
/>
```

---

### Paso 6 — Verificar errores TypeScript y probar impresión
```bash
cd app && npx tsc --noEmit
```

Verificar en el navegador que:
1. La preview del remito en pantalla se ve correctamente
2. Al hacer Ctrl+P (o el botón Imprimir) la hoja muestra SOLO el remito en A4
3. No hay sidebar ni header en el PDF/preview de impresión
4. Los márgenes son correctos (ni muy apretados ni cortados)

---

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `app/components/layout/AppShell.tsx` | `print:hidden` en sidebar y Header wrapper |
| `app/app/(dashboard)/layout.tsx` | `print:p-0` en `<main>` |
| `app/styles/print.css` | Mover `@page` fuera de `@media print`, agregar `size: A4 portrait` |
| `app/components/remitos/RemitoImprimibleClasico.tsx` | Corregir FECHA, textoEncabezado, ajustes visuales |
| `app/app/(dashboard)/remitos/[id]/page.tsx` | Pasar `textoEncabezado` prop |

---

## Estado
- [ ] Paso 1 — AppShell print:hidden
- [ ] Paso 2 — Layout print:p-0
- [ ] Paso 3 — print.css @page A4
- [ ] Paso 4 — Rediseño encabezado RemitoImprimibleClasico
- [ ] Paso 5 — Prop textoEncabezado
- [ ] Paso 6 — Verificar TS + prueba visual
