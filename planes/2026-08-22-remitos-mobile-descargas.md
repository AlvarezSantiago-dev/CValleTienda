# Plan: Remitos móvil + descargas (tickets, remitos, recibos)

**Creado:** 2026-08-22
**Estado:** Implementado
**Pedido:** Adaptar `/remitos` a celulares; tickets de venta, remitos y recibos de cobro descargables y legibles.

**Default de formato (si el usuario no elige otra opción):** PDF A4 / “Guardar como PDF” para compartir (WhatsApp/mail), **sin romper** impresión térmica existente (PrintBridge / `window.print` ticket).

---

## Descripción General

### Qué Logra Este Plan

1. UI de remitos usable en `< lg` (listado, detalle, nuevo, acciones).
2. Botón **Descargar** junto a Imprimir para: remito A4, ticket de venta (vista legible), recibo de cobro CC.
3. Sin modificar `styles/print.css`, `components/impresion/**` internos ni markup de `RemitoImprimible*` (solo wrappers / rutas nuevas).

### Por Qué Importa

En el local se consulta el sistema desde el celular; el remito A4 fijo a `210mm` rompe el viewport. Además hace falta mandar comprobantes por WhatsApp sin depender de la impresora de caja.

---

## Estado Actual (investigación)

| Documento | Hoy | Gap |
|-----------|-----|-----|
| Remito | A4 en pantalla + `window.print()` | Preview 210mm siempre visible; items en `<table>` sin cards; form nuevo `grid-cols-12` |
| Ticket venta | PrintBridge / print térmica | No hay descarga amigable móvil |
| Recibo cobro CC | `/recibos-cc/[id]` + print ticket | Idem; es el “recibo de pago” |
| PDF productos | `api/productos/pdf` HTML+print | Patrón reusable |

Hallazgos: listado ya usa `DataTable` con cards; el dolor está en **detalle** y **nuevo**.

---

## Cambios Propuestos

### Resumen

**Fase A — Remitos mobile (pantalla)**  
**Fase B — Descargas** (HTML print-friendly → Guardar PDF, patrón `api/productos/pdf`)

### Archivos a crear

| Ruta | Propósito |
|------|-----------|
| `app/app/api/documentos/remito/[id]/route.ts` | HTML A4 del remito listo para “Guardar como PDF” |
| `app/app/api/documentos/ticket-venta/[id]/route.ts` | HTML legible del ticket (A4 o 80mm-friendly page) |
| `app/app/api/documentos/recibo-cc/[id]/route.ts` | HTML del recibo de cobro |
| `app/components/documentos/BotonDescargarDoc.tsx` | Link/botón “Descargar PDF” (abre ruta + hint) |
| `planes/2026-08-22-remitos-mobile-descargas.md` | Este plan |

### Archivos a modificar

| Ruta | Cambios |
|------|---------|
| `app/app/(dashboard)/remitos/[id]/page.tsx` | Preview A4 `hidden print:block` o scaled card; items cards en mobile; acciones apiladas |
| `app/components/remitos/NuevoRemitoForm.tsx` | Filas item stacked / 2-col en vez de `grid-cols-12` |
| `app/components/remitos/RemitoAcciones.tsx` | Botón Descargar + layout touch |
| `app/components/ventas/PrintButtonClient.tsx` o detalle venta | Botón Descargar ticket |
| `app/components/clientes/BotonImprimirReciboCc.tsx` / página recibos-cc | Botón Descargar |
| `contexto/proyectos.md` | Registrar entrega |

### No tocar

- `app/styles/print.css`
- Markup interno de `components/impresion/*` y `RemitoImprimible*`
- PrintBridge (sigue para térmica en caja)

---

## Decisiones de Diseño

1. **Descarga = HTML dedicado + print browser** (como lista productos PDF), no Puppeteer en Vercel (costo/ops).
2. **Remito download** reutiliza los mismos datos del detalle; genera HTML A4 con `@page { size: A4 }` propio de esa ruta (no cambia `print.css` global).
3. **Ticket download** usa payload existente (`obtenerPayloadVenta`) renderizado a HTML legible (no 58mm obligatorio; tipografía clara para celular).
4. **Recibo de pagos** = recibo CC (`ReciboCcRenderer` / payload `obtenerPayloadReciboCc`).
5. Preview en pantalla del remito: no mostrar 210mm crudo; `hidden print:block` + opcional iframe/scaled preview.

### Alternativas descartadas

- Extender PrintBridge con tipo `remito` — innecesario para móvil/WhatsApp.
- html2canvas PNG only — peor para texto largo; PDF vía print es suficiente.

---

## Tareas Paso a Paso

### Paso 1 — Remitos detalle mobile
- Items: cards `md:hidden`, tabla `hidden md:block` (+ `overflow-x-auto`).
- Contenedor imprimible: `hidden print:block`.
- `PageHeader` / `RemitoAcciones`: stack vertical en mobile, botones `min-h-11` full-width opcionales.

### Paso 2 — Nuevo remito mobile
- Reemplazar fila `grid-cols-12` por stack (`flex-col sm:grid…`).
- Tipos entrega/CC: stack o labels cortos en mobile.

### Paso 3 — API documentos remito
- GET autenticado, valida tenant, HTML A4 autocontenido + script `window.print()` opcional o botón en página.
- Link “Descargar / Guardar PDF” en `RemitoAcciones`.

### Paso 4 — API ticket venta + UI
- Misma idea desde `/ventas/[id]` y opcionalmente post-venta (sin romper PrintSelectionModal).

### Paso 5 — API recibo CC + UI
- Desde `/recibos-cc/[id]` y botón junto a Imprimir.

### Paso 6 — Docs + build
- `contexto/proyectos.md`, build, checklist mobile 390px.

---

## Lista de Validación

- [x] `/remitos` usable en 390px sin scroll horizontal de página
- [x] `/remitos/[id]` sin hoja 210mm visible en screen; items legibles
- [x] `/remitos/nuevo` filas de ítem usables con el pulgar
- [x] Descargar remito abre HTML A4 y se puede Guardar como PDF
- [x] Descargar ticket venta y recibo CC idem
- [x] Imprimir térmica (PrintBridge) y `window.print` remito siguen funcionando
- [x] No se modificó `print.css` ni renderers de impresion
- [x] `npm run build` OK

---

## Criterios de Éxito

1. Remitos no “rompen” el zoom/viewport en celular.
2. Los tres documentos se pueden descargar/compartir sin impresora.
3. Frontera de impresión intacta.

---

## Notas

- Confirmación de formato del usuario: pendiente A/B/C; este plan asume **A + mantener print térmica** (≈ C con PDF A4 como descarga).
- Implementar con `/implementar planes/2026-08-22-remitos-mobile-descargas.md` tras OK.

---

## Notas de Implementación

**Implementado:** 2026-08-22

### Resumen

- Detalle de remito: preview A4 `hidden print:block`; ítems en cards mobile / tabla desktop; acciones touch-friendly.
- Nuevo remito: filas de ítem stacked en mobile; labels cortos en tipos.
- Rutas HTML A4: `/api/documentos/remito|[ticket-venta|recibo-cc]/[id]` + `BotonDescargarDoc`.
- Reimpresión térmica (PrintBridge / `usePrint`) intacta; solo se agregó el botón de descarga al lado.

### Desviaciones del Plan

- Helper compartido `lib/documentos/html.ts` (no estaba listado; evita duplicar shell HTML).
- No se tocó markup de `RemitoImprimible*` ni `styles/print.css` ni PrintBridge.

### Problemas Encontrados

Ninguno. `npm run build` OK.
