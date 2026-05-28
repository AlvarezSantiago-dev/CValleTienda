# Plan: Vale de cambio — slip separado opcional por venta

**Creado:** 2026-05-28  
**Estado:** Borrador  
**Pedido:** Imprimir un segundo slip ("vale de cambio") separado del ticket de venta, con la fecha límite para devoluciones/cambios calculada automáticamente. Cuando `dias_cambio > 0`, se imprimen los 2 documentos: el ticket normal + el vale. El ticket de venta no se modifica.

---

## Descripción General

El flujo deseado es: cajero confirma la venta → se imprimen automáticamente **dos documentos**:

1. **Ticket de venta** — igual que siempre, sin cambios
2. **Vale de cambio** — slip compacto que el cliente conserva como comprobante para reclamar cambios/devoluciones

El vale incluye: nombre de tienda, referencia al ticket, fecha de venta, artículos comprados (cant × nombre), total, y la sección destacada **"Válido para cambios hasta: [fecha]"**.

Con `dias_cambio = 0` o `null` se imprime solo el ticket — sin vale. Esto es configurable desde Configuración del negocio.

### Documentos resultantes

**Ticket de venta (sin cambios):**
```
CABRA TEST
Monotributista
────────────────────────────
COMPROBANTE INTERNO
NO VÁLIDO COMO FACTURA
────────────────────────────
Ticket T-0005
28/05/2026 10:39
Atendió: Santiago
────────────────────────────
1x REMERAS ESTAMPADA TALLES S/M
   (OVER/S/Gris)
   $ 55.000,00 c/u    $ 55.000,00
...
────────────────────────────
TOTAL              $ 235.000,00
────────────────────────────
Efectivo           $ 235.000,00
────────────────────────────
Gracias por su compra!
```

**Vale de cambio (nuevo, slip compacto):**
```
════════════════════════
    CABRA TEST
    VALE DE CAMBIO
════════════════════════
Ticket: T-0005
Fecha:  28/05/2026
────────────────────────
1x REMERAS ESTAMPADA
   TALLES S/M (OVER/S/Gris)
1x BERMUDA BAGG ESTAMPA
   (38/Gris)
────────────────────────
Total: $ 235.000,00
════════════════════════
VÁLIDO HASTA: 07/06/2026
(10 días con ticket)
════════════════════════
Conservar este comprobante
````

El campo `dias_cambio = 0` o `null` desactiva el vale — solo se imprime el ticket.

---

## Archivos a modificar

| Archivo | Tipo | Cambio |
|---|---|---|
| `supabase/migrations/20260528000002_dias_cambio.sql` | SQL | Agregar columna `dias_cambio` a `configuracion_tienda` |
| `supabase/migrations/20260528000003_build_payload_dias_cambio.sql` | SQL | Funciones SQL con `dias_cambio` en el payload |
| `app/lib/configuracion/queries.ts` | TS | Agregar `dias_cambio` a `ConfiguracionTienda` |
| `app/app/actions/configuracion.ts` | TS | Agregar `dias_cambio` a `ConfigTiendaInput` y update |
| `app/lib/impresion/types.ts` | TS | Agregar `dias_cambio?: number \| null` a `TiendaPayload` |
| `app/components/impresion/ValeCambioRenderer.tsx` | TSX | **NUEVO** — componente slip de vale de cambio (web fallback) |
| `app/lib/impresion/usePrint.tsx` | TSX | `imprimirConPayload` soporta segundo job después del primero |
| `app/components/pos/POSContainer.tsx` | TSX | Imprimir vale de cambio después del ticket principal |
| `app/components/ventas/PrintButtonClient.tsx` | TSX | Botón opcional "Reimprimir vale" en detalle de venta |
| `scripts/printbridge/src/renderer.js` | JS | **NUEVO** `renderValeCambio()` + endpoint en server.js |
| `scripts/printbridge/src/server.js` | JS | Endpoint `POST /print/vale` |
| `app/components/configuracion/DatosTiendaForm.tsx` | TSX | Campo de días en sección Ticket |

---

## Tareas

### T1 — Migración SQL: columna `dias_cambio`

Crear `supabase/migrations/20260528000002_dias_cambio_devolucion.sql`:

```sql
alter table public.configuracion_tienda
  add column if not exists dias_cambio integer null;

comment on column public.configuracion_tienda.dias_cambio is
  '0 o null = no emitir vale de cambio. > 0 = días válidos para cambios desde la fecha de venta.';
```

---

### T2 — Actualizar funciones SQL para incluir `dias_cambio` en el payload

Crear `supabase/migrations/20260528000003_build_payload_dias_cambio.sql` con los dos `CREATE OR REPLACE FUNCTION` completos, agregando:
- `ct.dias_cambio` en el SELECT de `configuracion_tienda`
- `'dias_cambio', v_tienda.dias_cambio` en el objeto `tienda` del JSON de retorno

Esto aplica tanto a `build_payload_ticket_venta` como a `build_payload_ticket_devolucion`.

---

### T3 — TypeScript: `TiendaPayload`, `ConfiguracionTienda`, `ConfigTiendaInput`

**`lib/impresion/types.ts`** — agregar al final de `TiendaPayload`:
```typescript
dias_cambio?: number | null
```

**`lib/configuracion/queries.ts`** — agregar al final de `ConfiguracionTienda`:
```typescript
dias_cambio: number | null
```

**`app/actions/configuracion.ts`** — en `ConfigTiendaInput`:
```typescript
dias_cambio: number | null
```
Validación: `if (input.dias_cambio !== null && (input.dias_cambio < 0 || input.dias_cambio > 365))`
Update: `dias_cambio: input.dias_cambio ?? null`

---

### T4 — `ValeCambioRenderer.tsx`: componente web (fallback window.print)

Crear `app/components/impresion/ValeCambioRenderer.tsx` — recibe `PayloadTicketVenta` y `diasCambio: number`.

```
Layout del vale (ancho = mismo ancho del ticket):
══════════════════════════
  [NOMBRE TIENDA]
  VALE DE CAMBIO
══════════════════════════
Ticket: T-0005   28/05/2026
──────────────────────────
1x REMERAS EST. TALLES S/M
   (OVER/S/Gris)
1x BERMUDA BAGG ESTAMPA
   (38/Gris)
──────────────────────────
Total: $ 235.000,00
══════════════════════════
  VÁLIDO HASTA: 07/06/2026
  (10 días con ticket)
══════════════════════════
 Conservar este comprobante
```

Cálculo de fecha límite:
```typescript
const [dd, mm, yyyy] = payload.fecha.split(' ')[0].split('/')
const base = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
base.setDate(base.getDate() + diasCambio)
const fechaLimite = base.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
```

Solo mostrar qty × nombre del producto (sin precios unitarios) — el vale es compacto.

---

### T5 — `usePrint.tsx`: soporte para segundo job secuencial

Agregar función helper `imprimirSecuencial` que acepta dos callbacks de impresión y los ejecuta en orden. No se puede llamar `window.print()` dos veces simultáneamente — el segundo debe esperar el `afterprint` del primero.

```typescript
// Nuevo método en el hook
const imprimirSecuencial = useCallback(
  async (jobs: Array<() => Promise<void>>) => {
    for (const job of jobs) {
      await new Promise<void>((resolve) => {
        // ejecutar job, esperar afterprint/timeout, resolve
      })
    }
  }, [...]
)
```

Para PrintBridge: dos llamadas `fetch` secuenciales son triviales — no hay conflicto.

---

### T6 — `POSContainer.tsx`: imprimir vale después del ticket

Después de `imprimirConPayload('ticket', ...)`, si `payload.tienda.dias_cambio > 0`:

```typescript
// Ya existe:
imprimirConPayload('ticket', payloadRes.data, <TicketVentaRenderer payload={payloadRes.data} />)

// Agregar (con pequeño delay para que la impresora termine el ticket):
if (payloadRes.data.tienda.dias_cambio) {
  setTimeout(() => {
    imprimirConPayload('vale', payloadRes.data, 
      <ValeCambioRenderer payload={payloadRes.data} diasCambio={payloadRes.data.tienda.dias_cambio!} />
    )
  }, 1500)
}
```

Para PrintBridge el endpoint es `POST /print/vale`. El delay de 1.5s da tiempo a la impresora física para cortar y avanzar el papel antes del segundo trabajo.

---

### T7 — `PrintButtonClient.tsx`: botón "Reimprimir vale" en detalle de venta

Si `payload.tienda.dias_cambio > 0`, mostrar un segundo botón pequeño: **"Vale de cambio"** al lado del botón de reimprimir ticket.

```tsx
{tieneValeCambio && (
  <button onClick={handleImprimirVale} ...>
    Vale de cambio
  </button>
)}
```

---

### T8 — `renderer.js` (PrintBridge): `renderValeCambio()`

Nueva función en `renderer.js`:

```javascript
async function renderValeCambio(printer, payload) {
  const t = payload.tienda
  const dias = t.dias_cambio
  const sym = t.simbolo_moneda || '$'

  if ((t.ancho_mm ?? 80) === 58) printer.setTypeFontB()

  printer.alignCenter()
  printer.bold(true)
  printer.println((t.razon_social || t.nombre || 'Mi Tienda').toUpperCase())
  printer.println('VALE DE CAMBIO')
  printer.bold(false)
  separator(printer)

  printer.alignLeft()
  printer.println(`Ticket: ${payload.numero_ticket}   ${payload.fecha.split(' ')[0]}`)

  separator(printer)

  for (const ln of payload.lineas) {
    const variantStr = [ln.talla, ln.color].filter(Boolean).join('/')
    const nombre = ln.nombre_producto + (variantStr ? ` (${variantStr})` : '')
    printer.println(`${ln.cantidad}x ${nombre}`)
  }

  separator(printer)
  printRow(printer, 'Total:', formatARS(payload.total, sym))
  separator(printer)

  // Calcular fecha límite
  const [dd, mm, yyyy] = payload.fecha.split(' ')[0].split('/')
  const base = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  base.setDate(base.getDate() + dias)
  const fechaLimite = base.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  printer.alignCenter()
  printer.bold(true)
  printer.println(`VALIDO HASTA: ${fechaLimite}`)
  printer.bold(false)
  printer.println(`(${dias} dias con ticket)`)
  separator(printer)
  printer.println('Conservar este comprobante')
  printer.println('')
}
```

---

### T9 — `server.js` (PrintBridge): endpoint `POST /print/vale`

Agregar al final de los endpoints de impresión:

```javascript
app.post('/print/vale', async (req, res) => {
  await handlePrint(renderValeCambio, req.body, res)
})
```

Y exportar `renderValeCambio` desde `renderer.js`.

---

### T10 — `DatosTiendaForm.tsx`: campo de días en sección Ticket

Agregar al form state:
```typescript
dias_cambio: initial?.dias_cambio ?? 0,
```

Agregar en la sección "Ticket impreso", después del campo `texto_pie`:

```tsx
<Input
  label="Días para cambios y devoluciones"
  name="dias_cambio"
  type="number"
  min={0}
  max={365}
  value={String(form.dias_cambio ?? 0)}
  onChange={(e) => update('dias_cambio', Number(e.target.value) || 0)}
  hint="0 = no imprimir vale. Ej: 30 → imprime un segundo slip con vencimiento."
  placeholder="0"
/>
```

---

### T11 — Aplicar migraciones en Supabase SQL Editor

Las dos migraciones deben aplicarse manualmente:
1. `20260528000002_dias_cambio_devolucion.sql` — ALTER TABLE
2. `20260528000003_build_payload_dias_cambio.sql` — CREATE OR REPLACE FUNCTION (x2)

---

## Flujo completo

```
Config: dias_cambio = 10
↓
Cajero confirma venta
↓
obtenerPayloadVenta() → payload.tienda.dias_cambio = 10
↓
imprimirConPayload('ticket', payload)    ← ticket normal sin cambios
↓ (1.5s delay)
imprimirConPayload('vale', payload)      ← segundo slip compacto
↓
Cajero entrega al cliente:
  📄 Ticket de venta
  📄 Vale de cambio (cortar y dar)
```

---

## Notas de implementación

- El ticket de venta **no se modifica** — sin tocar `TicketVentaRenderer` ni `renderTicketVenta`.
- El cálculo de fecha es **renderer-side** — no se guarda en DB. Si reimprimen, se recalcula desde `payload.fecha` (fecha original de la venta) + `dias_cambio` de la tienda. Correcto.
- El delay de 1.5s en POSContainer es para impresoras físicas con corte automático — evita que los dos trabajos ESC/POS se mezclen en la cola de la impresora.
- PrintBridge: dos `fetch` secuenciales, sin complejidad extra.
- `dias_cambio = 0` → `if (dias && dias > 0)` evalúa false → no se imprime vale. Correcto.
- Sin acentos en renderer.js (texto hardcodeado) para evitar problemas ESC/POS: `VALIDO`, `dias`, `Conservar`.
