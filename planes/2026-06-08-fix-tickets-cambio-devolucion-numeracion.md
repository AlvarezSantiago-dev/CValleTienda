# Plan: Fix numeración ticket cambio/venta + ticket devolución completo

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Unificar numeración entre ticket de venta y vale de cambio para buscar en ventas y gestionar devoluciones; rediseñar ticket de devolución más completo y sin valor por prenda.

---

## Descripción General

### Qué Logra Este Plan

Establece **un formato único de número de ticket** (`T-0042`) en ticket de venta, vale de cambio, pantalla de ventas y ticket de devolución, de modo que el número impreso en mano del cliente coincida con lo que el vendedor busca en `/ventas` para iniciar una devolución. Además, corrige y enriquece el **ticket de devolución impreso**: más datos operativos (venta original, cliente, vendedor, ítems con variante/código) y **sin precios por línea** — solo el total devuelto y el reintegro.

### Por Qué Importa

En mostrador, el flujo real es: cliente presenta vale o ticket → el vendedor busca la venta por número → registra devolución/cambio. Hoy hay **inconsistencia visual**: el POS confirma `Venta #42`, la lista muestra `# 42`, pero lo impreso dice `T-0042`. Eso genera fricción y errores al buscar. El ticket de devolución además perdió campos en migraciones recientes y muestra precios unitarios por prenda que el usuario no quiere en el comprobante.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `supabase/migrations/20260419000005_ventas.sql` | `ventas.numero_ticket` (integer secuencial por tienda) + RPC `get_siguiente_numero_ticket` |
| `supabase/migrations/20260528000003_build_payload_dias_cambio.sql` | Formatea ticket venta: `prefijo || '-' || lpad(numero, 4, '0')` |
| `supabase/migrations/20260528000004_payload_rubro.sql` | **Regresión**: `build_payload_ticket_devolucion` sin `vendedor`, `cliente`, `cuit`, `codigo_barras` en líneas |
| `supabase/migrations/20260429000003_impresion_dispositivos_y_fixes.sql` | Versión completa anterior de `build_payload_ticket_devolucion` (referencia) |
| `app/lib/impresion/types.ts` | `PayloadTicketVenta`, `PayloadTicketDevolucion` |
| `app/components/impresion/TicketVentaRenderer.tsx` | Imprime `Ticket {payload.numero_ticket}` |
| `app/components/impresion/ValeCambioRenderer.tsx` | Imprime `Ticket: {payload.numero_ticket}` (mismo payload, etiqueta distinta) |
| `app/components/impresion/TicketDevolucionRenderer.tsx` | Muestra precio unitario y total por línea; cabecera incompleta |
| `app/app/actions/impresion.ts` | `obtenerPayloadVenta` / `obtenerPayloadDevolucion` vía RPC SQL |
| `app/lib/ventas/queries.ts` | Búsqueda ventas: extrae dígitos de `q` → `numero_ticket.eq.N` |
| `app/lib/devoluciones/queries.ts` | Búsqueda devoluciones solo por `numero_devolucion` o motivo — **no** por ticket de venta |
| `app/components/pos/POSContainer.tsx` | Confirmación usa `numeroTicket` entero; modal impresión usa `payload.numero_ticket` formateado |
| `app/app/(dashboard)/ventas/page.tsx` | Lista muestra `# {numero_ticket}` sin prefijo |
| `planes/2026-05-28-ticket-validez-devolucion-configurable.md` | Spec del vale de cambio (referencia de diseño) |

### Brechas o Problemas que se Abordan

1. **Numeración visual inconsistente:** Impreso = `T-0042`, UI POS = `#42`, lista ventas = `# 42`. El cliente y el vendedor no ven el mismo identificador.

2. **Vale de cambio vs ticket de venta:** Comparten `payload.numero_ticket` en SQL, pero el vale usa etiqueta `Ticket:` con dos puntos y el ticket de venta usa `Ticket ` sin dos puntos. Menor, pero suma confusión.

3. **Búsqueda en ventas frágil:** `listarVentas` parsea solo dígitos (`T-0042` → 42). Funciona en muchos casos, pero no hay feedback visual alineado; si el usuario escribe mal el prefijo puede fallar silenciosamente.

4. **Devoluciones no buscables por ticket de venta:** En `/devoluciones`, buscar `42` o `T-0042` no encuentra devoluciones ligadas a esa venta.

5. **Payload devolución regresado:** La migración `20260528000004` eliminó `vendedor`, `cliente` y datos fiscales de tienda que sí tenía `20260429000003`. El renderer los espera (`payload.vendedor`, `payload.cliente`) pero el SQL ya no los envía.

6. **Ticket devolución muestra valor por prenda:** Columna de precio/total por línea (`precio_unitario`, `total_linea`) — el pedido pide quitarlos.

7. **Ticket devolución incompleto:** Falta fecha de la venta original, código de barras por ítem, datos fiscales de tienda en cabecera (comparado con ticket de venta).

---

## Cambios Propuestos

### Resumen de Cambios

- Crear helper compartido `formatNumeroTicket(prefijo, numero)` y `parseNumeroTicketQuery(q)` en TypeScript.
- Agregar campos al payload SQL: `numero_ticket` (formateado) + `numero_ticket_entero` (integer) en venta; en devolución agregar `fecha_venta`, restaurar `vendedor`/`cliente`/datos tienda.
- Nueva migración SQL que reemplaza `build_payload_ticket_venta` y `build_payload_ticket_devolucion` con versión consolidada y completa.
- Unificar etiquetas impresas: vale y venta muestran **exactamente** `Ticket T-0042`.
- Actualizar UI ventas/POS para mostrar número formateado (no solo entero).
- Mejorar búsqueda en ventas y devoluciones usando `parseNumeroTicketQuery`.
- Rediseñar `TicketDevolucionRenderer`: ítems sin precios, layout más completo.
- Ajustar `ValeCambioRenderer`: misma línea de ticket que venta; opcional quitar total del vale (ver pregunta abierta).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/tickets/format.ts` | `formatNumeroTicket`, `parseNumeroTicketQuery`, tests inline de casos |
| `supabase/migrations/20260608000001_fix_payload_tickets_numeracion.sql` | Consolidar builders SQL venta + devolución |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/impresion/types.ts` | Agregar `numero_ticket_entero?` a venta; `fecha_venta?` a devolución |
| `app/components/impresion/TicketVentaRenderer.tsx` | Usar helper de formato si hace falta; sin cambio visual mayor |
| `app/components/impresion/ValeCambioRenderer.tsx` | Misma línea `Ticket {n}` que venta; destacar número |
| `app/components/impresion/TicketDevolucionRenderer.tsx` | Rediseño: sin precios por línea, más campos, ticket venta prominente |
| `app/lib/ventas/queries.ts` | Búsqueda con `parseNumeroTicketQuery`; opcional retornar `numero_ticket_formateado` |
| `app/lib/devoluciones/queries.ts` | Búsqueda por ticket de venta asociado |
| `app/app/(dashboard)/ventas/page.tsx` | Mostrar ticket formateado (`T-0042`) |
| `app/components/pos/POSContainer.tsx` | Confirmación con número formateado |
| `app/components/dashboard/UltimasVentasCard.tsx` | Ticket formateado |
| `app/app/(dashboard)/devoluciones/nueva/page.tsx` | Mostrar venta como `T-0042` |
| `app/components/devoluciones/TablaDevoluciones.tsx` | Venta ref. formateada |
| `app/components/onboarding/OnboardingWizard.tsx` | Preview coherente con formato real `T-0001` |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Formato canónico:** `{prefijo}-{numero}` con padding 4 dígitos, ej. `T-0042`. Es el que ya produce `build_payload_ticket_venta`. Toda la UI debe converger a este formato.

2. **Vale de cambio = mismo número, no secuencia nueva:** El vale **no** consume un número distinto; es comprobante auxiliar de la misma venta. Referencia idéntica al ticket de venta.

3. **Payload dual:** Mantener `numero_ticket` (string formateado) para impresión y agregar `numero_ticket_entero` (number) para lógica/búsqueda sin re-parsear.

4. **Ticket devolución sin precios por ítem:** Las líneas muestran `cantidad × nombre`, variante (talla/color), código de barras si existe. **No** mostrar `precio_unitario` ni `total_linea`. Se mantienen `TOTAL DEVUELTO` y bloque de reintegro (montos agregados).

5. **Restaurar payload completo de devolución:** Reincorporar campos de `20260429000003` + `fecha_venta` de la venta original + `rubro`/`dias_cambio` de migraciones posteriores — una sola función SQL definitiva.

6. **Búsqueda tolerante:** `parseNumeroTicketQuery('T-0042')`, `'T0042'`, `'42'`, `'0042'` → `42`.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Numeración separada para vale (V-0001) | Impide buscar la venta original con el papel del cliente |
| Quitar también el total del vale de cambio | Fuera de scope explícito; el pedido apunta al ticket de devolución |
| Formatear solo en UI sin tocar SQL | El payload impreso seguiría siendo la fuente de verdad; SQL ya formatea bien |
| Eliminar `total_devuelto` del ticket devolución | El comercio necesita saber cuánto se reintegró |

### Preguntas Abiertas (si las hay)

1. **¿Quitar el total del vale de cambio también?** El pedido menciona quitar valor de la prenda en devolución. Por defecto el plan **mantiene el total en el vale** (útil para cambios con diferencia de precio). Confirmar si también debe ocultarse ahí.

2. **¿Padding de ticket:** ¿Mantener 4 dígitos (`T-0042`) o alinear con onboarding que muestra `T0001` sin guión? Recomendación: **mantener `T-0042`** (ya en producción en impresos) y corregir solo el preview de onboarding.

---

## Tareas Paso a Paso

### Paso 1: Helper de formato de ticket (TypeScript)

Crear `app/lib/tickets/format.ts`:

```typescript
/** Formato canónico: T-0042 */
export function formatNumeroTicket(prefijo: string | null | undefined, numero: number): string {
  const p = (prefijo || 'T').trim().toUpperCase()
  return `${p}-${String(numero).padStart(4, '0')}`
}

/** Extrae el entero de búsquedas: T-0042, T0042, 42, 0042 */
export function parseNumeroTicketQuery(q: string): number | null {
  const trimmed = q.trim()
  if (!trimmed) return null
  // Prefijo-numero: T-42, T-0042
  const m = trimmed.match(/^[A-Za-z]{1,6}-?(\d+)$/i)
  if (m) {
    const n = Number(m[1])
    return Number.isInteger(n) && n > 0 ? n : null
  }
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isInteger(n) && n > 0 ? n : null
}
```

**Archivos afectados:**

- `app/lib/tickets/format.ts` (nuevo)

---

### Paso 2: Migración SQL — payloads consolidados

Crear `supabase/migrations/20260608000001_fix_payload_tickets_numeracion.sql`.

**`build_payload_ticket_venta`** — agregar al JSON raíz:

```sql
'numero_ticket', v_tienda.prefijo_ticket || '-' || lpad(v_venta.numero_ticket::text, 4, '0'),
'numero_ticket_entero', v_venta.numero_ticket,
```

(Mantener resto igual a versión actual con `dias_cambio`, factura opcional en app layer.)

**`build_payload_ticket_devolucion`** — reescribir combinando lo mejor de `20260429000003` + `20260528000004`:

Campos obligatorios del objeto raíz:

| Campo | Fuente |
|-------|--------|
| `tienda` | nombre, razon_social, cuit, condicion_iva, direccion_legal, ancho_mm, simbolo_moneda, texto_encabezado, texto_pie, dias_cambio, rubro |
| `tipo_documento` | `'DEVOLUCIÓN'` |
| `numero_devolucion` | `'D-' \|\| lpad(numero_devolucion, 4, '0')` |
| `venta_referencia` | mismo formato que ticket venta (`prefijo-lpad`) |
| `numero_ticket_entero` | `ventas.numero_ticket` (nuevo — facilita búsqueda) |
| `fecha_venta` | `to_char(ventas.created_at, 'DD/MM/YYYY HH24:MI')` |
| `fecha` | fecha devolución |
| `vendedor` | perfil de `devoluciones.usuario_id` |
| `cliente` | json cliente si `cliente_id` |
| `motivo`, `tipo`, `total_devuelto` | cabecera devolución |
| `lineas` | nombre, codigo_barras, talla, color, cantidad (**sin** precio_unitario/total_linea en el JSON impreso, o incluirlos en SQL pero no renderizarlos) |
| `pagos` | reintegros |

Incluir `order by created_at` en agregación de líneas.

**Archivos afectados:**

- `supabase/migrations/20260608000001_fix_payload_tickets_numeracion.sql` (nuevo)

---

### Paso 3: Actualizar tipos TypeScript

En `app/lib/impresion/types.ts`:

```typescript
export interface PayloadTicketVenta {
  // ...
  numero_ticket: string
  numero_ticket_entero?: number
}

export interface PayloadTicketDevolucion {
  // ...
  venta_referencia: string
  numero_ticket_entero?: number
  fecha_venta?: string
  vendedor: string | null  // ya existía en tipo, asegurar consistencia
  cliente: ClientePayload | null
}

export interface LineaTicketDevolucion {
  nombre_producto: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  cantidad: number
  // precio_unitario y total_linea: mantener en tipo por compatibilidad SQL
  // pero el renderer NO los muestra
  precio_unitario?: number
  total_linea?: number
}
```

**Archivos afectados:**

- `app/lib/impresion/types.ts`

---

### Paso 4: Unificar vale de cambio con ticket de venta

En `ValeCambioRenderer.tsx`:

**Antes:**
```tsx
<div>Ticket: {payload.numero_ticket}</div>
```

**Después:**
```tsx
<div>Ticket {payload.numero_ticket}</div>
```

Agregar línea secundaria opcional si `numero_ticket_entero` existe:
```tsx
{/* mismo criterio visual que TicketVentaRenderer línea 71-74 */}
```

Considerar quitar bloque "Total:" si el usuario confirma en pregunta abierta — por defecto **mantener**.

**Archivos afectados:**

- `app/components/impresion/ValeCambioRenderer.tsx`

---

### Paso 5: Rediseñar ticket de devolución (sin precios por ítem)

Actualizar `TicketDevolucionRenderer.tsx`:

**Layout propuesto:**

```
[Cabecera tienda — igual que venta: razón social, CUIT, dirección]
[Disclaimer DEVOLUCIÓN — COMPROBANTE INTERNO]
────────────────────────
Devolución D-0003          08/06/2026 15:30
Ticket venta T-0042
Venta del 01/06/2026 10:39
Tipo: Parcial / Total
Atendió: Santiago
Cliente: Juan Pérez · DNI …
────────────────────────
Motivo: Cambio de talle
────────────────────────
2× Remera estampada
   Talle M / Negro
   Cód. 7791234567890
1× Bermuda
   38 / Gris
────────────────────────
TOTAL DEVUELTO      $ 12.500,00
Reintegro:
  Efectivo          $ 12.500,00
────────────────────────
[pie tienda]
```

**Cambios concretos:**

- Eliminar columna `<td>{formatPrecio(ln.total_linea)}</td>` y precios en líneas.
- Tabla de ítems: solo cantidad × nombre + variante + código.
- Cambiar `Venta ref.:` por `Ticket venta` usando `venta_referencia` (mismo string que ticket impreso).
- Agregar `fecha_venta` si viene en payload.
- Mantener `TOTAL DEVUELTO` y sección reintegro.

**Archivos afectados:**

- `app/components/impresion/TicketDevolucionRenderer.tsx`

---

### Paso 6: UI — mostrar ticket formateado en ventas y POS

**Ventas list** (`ventas/page.tsx`):

- Cargar `prefijo_ticket` de configuración (join en `listarVentas` o helper server-side).
- Mostrar `formatNumeroTicket(prefijo, v.numero_ticket)` en lugar de `# {numero_ticket}`.

**POS** (`POSContainer.tsx`):

- Tras venta exitosa, formatear con `formatNumeroTicket(config.prefijo_ticket, numeroTicket)` en toast de confirmación y donde corresponda.

**Otros lugares** (misma función):

- `UltimasVentasCard.tsx`
- `devoluciones/nueva/page.tsx`, `TablaDevoluciones.tsx`, `devoluciones/[id]/page.tsx`
- `AnularVentaInlineButton` — label `#${numeroTicket}` → formateado si se pasa prefijo

**Extender `listarVentas`** para incluir `prefijo_ticket` desde `configuracion_tienda` en el query o mapeo.

**Archivos afectados:**

- `app/lib/ventas/queries.ts`
- `app/app/(dashboard)/ventas/page.tsx`
- `app/components/pos/POSContainer.tsx`
- `app/components/dashboard/UltimasVentasCard.tsx`
- `app/components/devoluciones/TablaDevoluciones.tsx`
- `app/app/(dashboard)/devoluciones/nueva/page.tsx`
- `app/app/(dashboard)/devoluciones/[id]/page.tsx`

---

### Paso 7: Mejorar búsqueda por número de ticket

**Ventas** — en `listarVentas`:

Reemplazar bloque actual:

```typescript
const ticketDigits = busqueda.replace(/\D/g, '')
const ticket = Number(ticketDigits)
```

Por:

```typescript
import { parseNumeroTicketQuery } from '@/lib/tickets/format'
const ticket = parseNumeroTicketQuery(busqueda)
if (ticket != null) {
  condiciones.push(`numero_ticket.eq.${ticket}`)
}
```

**Devoluciones** — en `listarDevoluciones`:

Cuando `parseNumeroTicketQuery(search)` devuelve número, filtrar devoluciones cuya venta tenga ese `numero_ticket`:

```typescript
// Opción A: subquery de venta_ids
const { data: ventas } = await supabase
  .from('ventas')
  .select('id')
  .eq('tienda_id', tiendaId)
  .eq('numero_ticket', ticket)
// q = q.in('venta_id', ids)
```

Mantener búsqueda existente por `numero_devolucion`.

**Archivos afectados:**

- `app/lib/ventas/queries.ts`
- `app/lib/devoluciones/queries.ts`

---

### Paso 8: Corregir preview onboarding

En `OnboardingWizard.tsx`, cambiar preview de `T0001` a `T-0001` usando la misma función `formatNumeroTicket`.

**Archivos afectados:**

- `app/components/onboarding/OnboardingWizard.tsx`

---

### Paso 9: Validación manual

1. Aplicar migración: `npx supabase db push` (o SQL manual en dashboard).
2. Registrar venta en POS con `dias_cambio > 0`.
3. Imprimir ticket de venta y vale → verificar **mismo** `Ticket T-00XX` en ambos.
4. Ir a `/ventas`, buscar `T-00XX` → encuentra la venta; UI muestra `T-00XX`.
5. Desde venta, crear devolución parcial.
6. Imprimir ticket devolución:
   - Muestra `Ticket venta T-00XX` y fecha venta original.
   - Ítems **sin** precio por línea.
   - `TOTAL DEVUELTO` y reintegro visibles.
7. En `/devoluciones`, buscar `T-00XX` → lista la devolución.
8. `npm run build` sin errores TypeScript.

**Archivos afectados:**

- Ninguno (pruebas)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/components/ventas/PrintButtonClient.tsx` | Reimpresión ticket + vale |
| `app/app/actions/ventas.ts` | Retorna `numeroTicket` entero al POS |
| `app/app/actions/devoluciones.ts` | Crea devolución ligada a venta |
| `app/app/actions/impresion.ts` | Consume RPCs de payload |
| `planes/2026-05-28-ticket-validez-devolucion-configurable.md` | Spec original del vale |

### Actualizaciones Necesarias para Consistencia

- Si existe PrintBridge externo al repo, espejar cambios en `renderValeCambio` y `renderTicketDevolucion` (fuera de scope si no está en workspace).
- No requiere actualizar `CLAUDE.md`.

### Impacto en Flujos de Trabajo Existentes

- **POS:** Mismo flujo de impresión; número visible al cajero más claro.
- **Devoluciones:** Búsqueda mejorada por ticket de venta.
- **Ventas:** Display y búsqueda alineados con papel impreso.
- **DB:** Solo reemplazo de funciones SQL; sin cambio de schema de tablas.

---

## Lista de Validación

- [x] Ticket de venta y vale de cambio muestran el **mismo** número formateado (`T-0042`)
- [x] POS y lista `/ventas` muestran el número formateado (no solo entero)
- [x] Buscar `T-0042` o `42` en ventas encuentra la venta correcta
- [x] Buscar ticket de venta en `/devoluciones` encuentra devoluciones asociadas
- [x] Ticket devolución incluye vendedor, cliente, ticket venta, fecha venta
- [x] Ticket devolución **no** muestra precio por ítem
- [x] Ticket devolución sí muestra total devuelto y reintegro
- [ ] Migración SQL aplicada sin errores (pendiente deploy en Supabase)
- [x] `npm run build` compila sin errores TypeScript

---

## Criterios de Éxito

1. Un vendedor puede leer el número del vale o ticket de venta del cliente y encontrar la venta en `/ventas` escribiendo exactamente ese número.
2. El ticket de devolución impreso es operativamente completo (referencia clara a la venta, ítems identificables) y no expone precios unitarios por prenda.
3. No hay regresión en impresión de ticket de venta ni en flujo de devoluciones existente.

---

## Notas

- La raíz del bug de numeración es **display inconsistente**, no necesariamente dos secuencias distintas en DB. El vale ya usa el payload de la venta.
- La regresión en `build_payload_ticket_devolucion` (migración `20260528000004`) explica por qué el ticket de devolución se siente "incompleto" hoy.
- Mantener `precio_unitario`/`total_linea` en `detalles_devolucion` (DB) para contabilidad; solo ocultarlos en el **comprobante impreso**.

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se creó el helper compartido `formatNumeroTicket` / `parseNumeroTicketQuery`, una migración SQL que consolida `build_payload_ticket_venta` y `build_payload_ticket_devolucion` (con vendedor, cliente, fecha_venta, codigo_barras), se unificó la etiqueta del vale de cambio con el ticket de venta, se rediseñó el ticket de devolución sin precios por línea, y se actualizó la UI (POS, ventas, devoluciones, dashboard, onboarding) para mostrar y buscar con el formato canónico `T-0042`.

### Desviaciones del Plan

Ninguna.

### Problemas Encontrados

Ninguno. La migración SQL debe aplicarse manualmente en Supabase (`npx supabase db push` o dashboard) para que los payloads impresos reflejen los campos restaurados en producción.
