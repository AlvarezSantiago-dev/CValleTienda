# Plan: Reestructuración completa de tickets — No válidos como factura

**Creado:** 2026-05-28
**Estado:** Borrador
**Pedido:** Reestructurar todos los tickets del sistema para dejar en claro que no son comprobantes fiscales válidos ante AFIP, corregir el tamaño roto en window.print() y unificar los dos sistemas de ticket paralelos que existen.

---

## Descripción General

### Qué Logra Este Plan

Rediseña los tres tickets del sistema (venta, devolución, cierre de caja) para cumplir con la obligación legal de declarar explícitamente que son comprobantes internos no fiscales. Elimina los componentes legacy duplicados, corrige el `@page` del CSS para que window.print() respete el ancho configurado (58/76/80mm), y mantiene sincronizados el renderer JSX (web/fallback) con el renderer ESC/POS de PrintBridge.

### Por Qué Importa

Un ticket que muestra CUIT y condición de IVA sin el disclaimer "NO VÁLIDO COMO FACTURA" puede confundir al cliente y tiene implicancias legales. Además el tamaño roto hace que el ticket se imprima como un rectángulo chico sobre hoja A4 en el fallback window.print(), lo que es inusable. Unificar los dos sistemas reduce la deuda técnica y el riesgo de bugs por divergencia.

---

## Estado Actual

### Estructura Existente Relevante

**Componentes activos (sistema nuevo — payload):**
- `app/components/impresion/TicketVentaRenderer.tsx` — ticket de venta, usa `PayloadTicketVenta`
- `app/components/impresion/TicketDevolucionRenderer.tsx` — ticket de devolución, usa `PayloadTicketDevolucion`
- `app/components/impresion/CierreCajaRenderer.tsx` — cierre de caja, usa `PayloadCierreCaja`
- `scripts/printbridge/src/renderer.js` — clon ESC/POS de los tres tickets para PrintBridge

**Componentes legacy (sistema viejo — a eliminar):**
- `app/components/ventas/TicketImprimible.tsx` — usa `ConfiguracionTienda` + `TicketDatos`, probablemente sin uso activo
- `app/components/devoluciones/TicketDevolucion.tsx` — usa `DevolucionCompleta` + `ConfiguracionTienda`, probablemente sin uso activo

**Tipos:**
- `app/lib/impresion/types.ts` — define `TiendaPayload`, `PayloadTicketVenta`, `PayloadTicketDevolucion`, `PayloadCierreCaja`, `FacturaTicketPayload`

**CSS:**
- `app/styles/print.css` — tiene `@page { size: A4 portrait; margin: 0; }` — INCORRECTO para tickets térmicos

**Base de datos:**
- `supabase/migrations/20260419000007_configuracion.sql` — `ancho_ticket_mm` con constraint `(58, 80)` — faltaba 76mm
- `supabase/migrations/20260527000001_fix_ancho_ticket_76mm.sql` — **pendiente de aplicar** — agrega 76mm al constraint

### Brechas o Problemas que se Abordan

1. **Sin disclaimer fiscal**: El ticket muestra CUIT y condición IVA pero nunca dice "NO VÁLIDO COMO FACTURA". Esto es requerido legalmente cuando no hay factura electrónica asociada.

2. **Tamaño roto en window.print()**: `@page { size: A4 portrait }` en print.css ignora el `width: NNmm` inline del ticket. El browser muestra hoja A4 con el ticket chico en una esquina.

3. **Dos sistemas de ticket en paralelo**: `TicketImprimible.tsx` + `TicketDevolucion.tsx` (legacy) coexisten con `TicketVentaRenderer.tsx` + `TicketDevolucionRenderer.tsx` (nuevo). El legacy ya no se usa pero genera confusión y riesgo de que alguien lo llame accidentalmente.

4. **CierreCajaRenderer hardcodea 80mm**: No usa `payload.tienda.ancho_mm`, siempre 80mm. Si la tienda tiene 58mm, el ticket de cierre se desborda.

5. **renderer.js (PrintBridge) no tiene disclaimer**: El ESC/POS tampoco imprime "NO VÁLIDO COMO FACTURA".

6. **Migración de 76mm no aplicada**: La migración `20260527000001_fix_ancho_ticket_76mm.sql` existe pero no fue ejecutada en Supabase.

---

## Cambios Propuestos

### Resumen de Cambios

- Agregar banda/línea de disclaimer "COMPROBANTE INTERNO — NO VÁLIDO COMO FACTURA" en todos los tickets cuando `payload.factura` es null
- Cuando SÍ hay `payload.factura`, el disclaimer cambia a mostrar tipo de comprobante y datos AFIP (como ya hace)
- Mover el bloque de factura electrónica a ANTES del pie de tienda (actualmente está después)
- Corregir `@page` en print.css para usar el ancho real del ticket (vía custom property CSS inyectada inline)
- Hacer que `CierreCajaRenderer` use `payload.tienda.ancho_mm`
- Eliminar `TicketImprimible.tsx` y `TicketDevolucion.tsx` legacy (verificar antes que no haya imports activos)
- Actualizar `renderer.js` de PrintBridge para que espeje todos los cambios anteriores
- Aplicar la migración SQL pendiente de 76mm

### Nuevos Archivos a Crear

Ninguno — solo modificaciones a archivos existentes.

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| --- | --- |
| `app/components/impresion/TicketVentaRenderer.tsx` | Agregar disclaimer "NO VÁLIDO COMO FACTURA" cuando no hay factura; mover bloque factura a antes del pie; usar `formatPrecio` en lugar de `formatARS` local para unificar |
| `app/components/impresion/TicketDevolucionRenderer.tsx` | Agregar disclaimer "DEVOLUCIÓN — COMPROBANTE INTERNO"; asegurarse que se muestre correctamente |
| `app/components/impresion/CierreCajaRenderer.tsx` | Reemplazar `width: '80mm'` hardcodeado por `payload.tienda.ancho_mm`; usar `payload.tienda.simbolo_moneda` en lugar de `'$'` hardcodeado |
| `app/styles/print.css` | Corregir `@page` para tickets: en lugar de A4, usar `size: var(--ticket-width, 80mm) auto` — y explicar que el ancho se inyecta desde usePrint.tsx |
| `app/lib/impresion/usePrint.tsx` | Al activar impresión, inyectar `--ticket-width` en el `style` del elemento raíz o via `document.documentElement.style` con el ancho del payload |
| `scripts/printbridge/src/renderer.js` | Espejo de todos los cambios: agregar disclaimer en ticket de venta y devolución; actualizar renderTicketDevolucion para usar `payload.venta_referencia` (actualmente usa `payload.numero_ticket_original` — revisar consistencia con tipo) |

### Archivos a Eliminar

| Archivo | Razón |
| --- | --- |
| `app/components/ventas/TicketImprimible.tsx` | Legacy — reemplazado por `TicketVentaRenderer.tsx`. Verificar que no haya imports activos antes de eliminar. |
| `app/components/devoluciones/TicketDevolucion.tsx` | Legacy — reemplazado por `TicketDevolucionRenderer.tsx`. Verificar que no haya imports activos antes de eliminar. |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Disclaimer prominente pero no intrusivo**: Se ubica entre el encabezado de la tienda y los datos del ticket (debajo de la primera línea divisoria `---`), centrado, en mayúsculas, en recuadro con `border: 1px solid`. No interrumpe los totales ni el flujo de lectura del cliente, pero es inequívocamente visible. Texto exacto: `COMPROBANTE INTERNO / NO VÁLIDO COMO FACTURA`.

2. **Mismo disclaimer en ESC/POS**: El `renderer.js` de PrintBridge imprime la misma línea centrada, con negrita, para que sea legible en la térmica.

3. **Disclaimer solo cuando no hay factura**: Si `payload.factura` existe (CAE + tipo + número), el ticket ya es un comprobante fiscal oficial y no corresponde el disclaimer. En su lugar se muestra el bloque AFIP con CAE y QR.

4. **Corrección del `@page` via CSS custom property**: `usePrint.tsx` ya conoce el ancho del payload (lo pasa al renderer como prop). Se agrega `document.documentElement.style.setProperty('--ticket-ancho-mm', `${ancho}mm`)` antes de `window.print()`. El `@page` en print.css usa `size: var(--ticket-ancho-mm, 80mm) auto`. Esto soluciona el tamaño sin crear reglas CSS dinámicas ni componentes intermedios.

5. **`CierreCajaRenderer` usa `ancho_mm` del payload**: El cierre de caja también viene del mismo `TiendaPayload`. El fix es trivial — reemplazar el `'80mm'` literal por `${payload.tienda.ancho_mm || 80}mm`.

6. **`simbolo_moneda` en cierre de caja**: `CierreCajaRenderer` hardcodea `'$'`. Debe usar `payload.tienda.simbolo_moneda || '$'`.

7. **Eliminar legacy con verificación previa**: Antes de borrar `TicketImprimible.tsx` y `TicketDevolucion.tsx`, buscar en todo el codebase si hay imports o referencias activas. Si hay, migrarlos primero.

8. **`renderer.js` — consistencia de campo `venta_referencia`**: El tipo `PayloadTicketDevolucion` tiene el campo `venta_referencia`, pero `renderer.js` accede a `payload.numero_ticket_original` que no existe en el tipo. Corregir en renderer.js para usar `payload.venta_referencia`.

### Alternativas Consideradas

- **Disclaimer al pie del ticket**: Menos visible. Si el ticket es largo, el cliente puede arrancar el papel antes de llegar al pie. Descartado.
- **Disclaimer en el encabezado, antes del nombre de tienda**: Muy agresivo visualmente. El nombre de la tienda debe ser lo primero. Descartado.
- **CSS `@page` dinámico con `<style>` inyectado**: Más complejo y con posibles problemas de CSP. La CSS custom property es más limpia.
- **Mantener los legacy**: Agregan confusión y superficie de bugs sin valor. Descartado.

### Preguntas Abiertas

Ninguna — todas las decisiones de diseño están definidas y consensuadas.

---

## Tareas Paso a Paso

### Paso 1: Aplicar migración SQL de 76mm

Aplicar la migración pendiente `20260527000001_fix_ancho_ticket_76mm.sql` a Supabase para que el constraint de `ancho_ticket_mm` acepte 58, 76 y 80mm.

**Acciones:**
- Ejecutar `npx supabase db push` desde el directorio `app/` con las credenciales de Supabase
- Verificar que el constraint quede como `check (ancho_ticket_mm in (58, 76, 80))`

**Archivos afectados:**
- `supabase/migrations/20260527000001_fix_ancho_ticket_76mm.sql` (ya existe, solo aplicar)

---

### Paso 2: Verificar y limpiar componentes legacy

Antes de eliminar los legacy, confirmar que no hay imports activos en el codebase.

**Acciones:**
- `grep_search` en todo el proyecto por `TicketImprimible` y `TicketDevolucion` (el viejo en `devoluciones/`)
- Si hay imports activos, redirigirlos al componente nuevo equivalente
- Eliminar `app/components/ventas/TicketImprimible.tsx`
- Eliminar `app/components/devoluciones/TicketDevolucion.tsx`

**Archivos afectados:**
- `app/components/ventas/TicketImprimible.tsx` (eliminar)
- `app/components/devoluciones/TicketDevolucion.tsx` (eliminar)
- Cualquier archivo que los importe (migrar si existen)

---

### Paso 3: Rediseñar `TicketVentaRenderer.tsx`

Aplicar el nuevo diseño con disclaimer, reordenamiento de secciones y exportar `formatPrecio` (para reutilización desde TicketDevolucionRenderer y CierreCajaRenderer).

**Estructura del ticket rediseñado:**
```
[ENCABEZADO TIENDA]
  Razón social / Nombre (grande, negrita, mayúsculas)
  CUIT: xxx (si tiene)
  Condición IVA (si tiene)
  Dirección (si tiene)
  Teléfono (si tiene)
  Texto encabezado personalizado (si tiene)

[---separador---]

[DISCLAIMER — siempre visible cuando NO hay factura]
  ┌─────────────────────────────────────┐
  │  COMPROBANTE INTERNO                │
  │  NO VÁLIDO COMO FACTURA             │
  └─────────────────────────────────────┘
  (border: 1px solid #000, padding: 2px, textAlign: center, fontSize: 9px)

[---separador---]

[DATOS DEL TICKET]
  Ticket {numero_ticket}          {fecha}
  Atendió: {vendedor}
  Cliente: {nombre} · DNI {dni}

[---separador---]

[LÍNEAS DE PRODUCTOS]
  Nx NombreProducto (talla/color)   $xxx,xx
     $xxx,xx c/u

[---separador---]

  Subtotal             $xxx,xx
  Descuento           -$xxx,xx
  TOTAL                $xxx,xx   (grande, negrita)

[---separador---]

[PAGOS]
  Efectivo             $xxx,xx
  Tarjeta (ref)        $xxx,xx

[Observaciones si tiene]

[PIE PERSONALIZADO de tienda si tiene]

[FACTURA ELECTRÓNICA — solo si payload.factura existe]
  FACTURA ELECTRÓNICA {A/B/C}
  N° 00001-00000042
  CAE: xxxxxxxxxxxxxx
  Vence: DD/MM/YYYY
  [QR AFIP]

  ¡Gracias por tu compra!
```

**Acciones:**
- Renombrar función `formatARS` a `formatPrecio` y exportarla (para que TicketDevolucionRenderer y CierreCajaRenderer la reutilicen)
- Agregar bloque disclaimer entre el separador post-encabezado y los datos del ticket
- El disclaimer se muestra solo cuando `!payload.factura`
- Mover el bloque de factura electrónica a ANTES del "¡Gracias por tu compra!" (ya está así, pero verificar orden)
- El `@page` aún se maneja en Paso 5; en este paso solo el JSX

**Archivos afectados:**
- `app/components/impresion/TicketVentaRenderer.tsx`

---

### Paso 4: Rediseñar `TicketDevolucionRenderer.tsx`

**Estructura del ticket de devolución:**
```
[ENCABEZADO TIENDA]
  Razón social
  CUIT (si tiene)
  Dirección (si tiene)

[---separador---]

[DISCLAIMER]
  ┌──────────────────────────────┐
  │  DEVOLUCIÓN                  │
  │  COMPROBANTE INTERNO         │
  │  NO VÁLIDO COMO FACTURA      │
  └──────────────────────────────┘

[---separador---]

[DATOS]
  N° {numero_devolucion}          {fecha}
  Venta ref.: {venta_referencia}
  Tipo: Total / Parcial
  Atendió: {vendedor}
  Cliente: {nombre} · DNI {dni}

[---separador---]

  Motivo: {motivo}

[---separador---]

[LÍNEAS]

[---separador---]

  TOTAL DEVUELTO       $xxx,xx

[REINTEGRO por método si hay pagos]

[PIE de tienda si tiene]
```

**Acciones:**
- Importar `formatPrecio` desde `TicketVentaRenderer` (ya lo hace, verificar nombre correcto)
- Agregar bloque disclaimer visible con border similar al del ticket de venta
- Fusionar el título "DEVOLUCIÓN" dentro del disclaimer para que quede como un solo bloque destacado

**Archivos afectados:**
- `app/components/impresion/TicketDevolucionRenderer.tsx`

---

### Paso 5: Corregir `CierreCajaRenderer.tsx`

**Acciones:**
- Reemplazar `width: '80mm'` y `maxWidth: '80mm'` hardcodeados por `width: \`${payload.tienda.ancho_mm || 80}mm\``
- Reemplazar `const sym = '$'` por `const sym = payload.tienda.simbolo_moneda || '$'`
- Agregar al pie: ya tiene `"Comprobante interno"` — mantenerlo, es correcto

**Archivos afectados:**
- `app/components/impresion/CierreCajaRenderer.tsx`

---

### Paso 6: Corregir `print.css` y `usePrint.tsx` para tamaño correcto

**Problema actual:** `@page { size: A4 portrait; }` en `print.css` hace que el browser fuerce hoja A4 cuando el usuario usa window.print() como fallback. El ticket con `width: 80mm` queda como un bloque chico a la izquierda de una hoja A4.

**Solución:**

En `usePrint.tsx`, antes de llamar `window.print()`, detectar el ancho del ticket del payload y setearlo como CSS custom property en `document.documentElement`:

```typescript
// Dentro de imprimir() o imprimirConPayload(), antes de window.print():
const anchoMm = payload?.tienda?.ancho_mm ?? 80
document.documentElement.style.setProperty('--ticket-ancho-mm', `${anchoMm}mm`)
```

En `print.css`, cambiar `@page`:

```css
@page {
  size: var(--ticket-ancho-mm, 80mm) auto;
  margin: 0;
}
```

**Nota:** CSS custom properties en `@page` tienen soporte limitado en algunos browsers. Alternativa más robusta: en `usePrint.tsx`, inyectar un `<style>` temporal en `<head>` con `@page { size: NNmm auto; }` antes de imprimir y removerlo después. Esta alternativa es más compatible con todos los browsers y es la que debe implementarse.

**Acciones:**
- En `usePrint.tsx`: antes de `window.print()`, insertar `<style id="print-page-size">@page { size: NNmm auto; margin: 0; }</style>` en `document.head`, luego en el `afterprint` event, removerlo
- En `print.css`: cambiar `@page { size: A4 portrait; }` por `@page { size: 80mm auto; }` como fallback base (para cuando la inyección dinámica no ocurra), y agregar comentario explicando la estrategia

**Archivos afectados:**
- `app/styles/print.css`
- `app/lib/impresion/usePrint.tsx`

---

### Paso 7: Actualizar `renderer.js` de PrintBridge (ESC/POS)

Mantener el renderer ESC/POS sincronizado con los cambios de los renderers JSX.

**Acciones en `renderTicketVenta`:**
- Después del separador post-encabezado, imprimir el disclaimer cuando `!payload.factura`:
  ```javascript
  if (!payload.factura) {
    printer.alignCenter()
    printer.println('COMPROBANTE INTERNO')
    printer.println('NO VALIDO COMO FACTURA')
    separator(printer)
  }
  ```

**Acciones en `renderTicketDevolucion`:**
- Corregir `payload.numero_ticket_original` → `payload.venta_referencia` (nombre correcto del campo en el tipo)
- Cambiar el título suelto `printer.println('DEVOLUCION')` para que sea parte del bloque disclaimer:
  ```javascript
  printer.bold(true)
  printer.println('DEVOLUCION')
  printer.println('COMPROBANTE INTERNO')
  printer.println('NO VALIDO COMO FACTURA')
  printer.bold(false)
  ```

**Archivos afectados:**
- `scripts/printbridge/src/renderer.js`

---

### Paso 8: Verificación final

**Acciones:**
- Abrir el POS, hacer una venta de prueba → verificar que el ticket imprime correctamente en la térmica (PrintBridge) con el disclaimer visible
- Verificar que el fallback window.print() muestra el ticket al tamaño correcto (no A4)
- Verificar el ticket de devolución
- Verificar el ticket de cierre de caja
- Verificar que `npx tsc --noEmit` no reporta errores en los archivos modificados

---

## Resumen Visual del Ticket de Venta Rediseñado

```
┌───────────────────────────────┐  (80mm o el ancho configurado)
│       MI TIENDA SRL           │
│   CUIT: 30-12345678-9         │
│   IVA Responsable Inscripto   │
│   Av. Principal 123           │
│   Tel: 2616-123456            │
├ - - - - - - - - - - - - - - - ┤
│    COMPROBANTE INTERNO        │  ← NUEVO (box con border)
│   NO VÁLIDO COMO FACTURA      │  ← NUEVO
├ - - - - - - - - - - - - - - - ┤
│ Ticket T-0042    28/05/2026   │
│ Atendió: Juan Pérez            │
│ Cliente: María García          │
├ - - - - - - - - - - - - - - - ┤
│  2x  Remera negra XL   $4.000 │
│       $ 2.000,00 c/u          │
│  1x  Jean talle 42     $8.500 │
│       $ 8.500,00 c/u          │
├ - - - - - - - - - - - - - - - ┤
│ Subtotal           $ 12.500   │
│ Descuento          -$ 1.250   │
│ TOTAL              $ 11.250   │  ← grande/negrita
├ - - - - - - - - - - - - - - - ┤
│ Efectivo           $ 11.250   │
├ - - - - - - - - - - - - - - - ┤
│     ¡Gracias por tu compra!   │
└───────────────────────────────┘
```

Si la venta tiene factura electrónica AFIP, el bloque disclaimer NO aparece y en su lugar va el bloque CAE + QR al pie.
