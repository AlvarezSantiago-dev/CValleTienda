# Plan: Vale de cambio sin precios + ticket de venta destacado

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** En /pos, quitar precio y total del vale de cambio (uso regalo); asociarlo claramente con la numeración de la venta para buscar la operación cuando el cliente vuelve.

---

## Descripción General

### Qué Logra Este Plan

Adapta el **vale de cambio** impreso desde el POS para el caso de uso real del negocio: el cliente se lleva un slip para regalo/cambio **sin ver montos**, pero con la **referencia inequívoca al ticket de venta** (`T-0042`) para que el cajero encuentre la venta en el sistema al volver.

### Por Qué Importa

Hoy el vale muestra el **Total** de la compra (líneas 88–92 de `ValeCambioRenderer.tsx`). Eso rompe el escenario regalo: quien recibe el vale descubre cuánto costó. La numeración de venta ya viaja en el payload (`numero_ticket`), pero no está lo bastante destacada ni explicada como clave de búsqueda operativa.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta / pieza | Rol |
|--------------|-----|
| `app/components/impresion/ValeCambioRenderer.tsx` | Render web del vale — **muestra Total** y `Ticket {numero_ticket}` |
| `app/components/impresion/TicketVentaRenderer.tsx` | Ticket completo con precios (sin cambios) |
| `app/components/pos/POSContainer.tsx` | Tras venta, modal `PrintSelectionModal` → imprime ticket y/o vale |
| `app/components/pos/PrintSelectionModal.tsx` | Selector post-venta; título ya muestra `Venta {numeroTicket}` |
| `app/components/ventas/PrintButtonClient.tsx` | Reimpresión de ticket y vale desde detalle de venta |
| `build_payload_ticket_venta` (SQL) | Payload compartido; incluye `numero_ticket` (`T-0042`), `numero_ticket_entero`, `total`, líneas con precios |
| `app/lib/tickets/format.ts` | `formatNumeroTicket`, `parseNumeroTicketQuery` — búsqueda en `/ventas` acepta `T-0042`, `42`, etc. |
| `app/lib/ventas/queries.ts` → `listarVentas` | Busca por `numero_ticket` vía `parseNumeroTicketQuery` |
| `app/app/(dashboard)/devoluciones/nueva/page.tsx` | Devolución entra por `venta_id`; título muestra ticket formateado |
| `planes/2026-05-28-ticket-validez-devolucion-configurable.md` | Plan original del vale (incluía Total en el mockup) |
| `planes/2026-06-08-fix-tickets-cambio-devolucion-numeracion.md` | Unificó formato `Ticket T-XXXX`; dejó Total en vale como default |
| `referencia/printbridge-v3-logo-tickets.md` | PrintBridge externo tiene `renderValeCambio` — parche manual |

### Brechas o Problemas que se Abordan

1. **Total visible en vale** — filtra el precio al destinatario del regalo.
2. **Ticket de venta poco operativo** — aparece como línea más; no comunica que es **el dato para buscar en el sistema**.
3. **PrintBridge desalineado** — si el agente térmico imprime Total, el fix web no alcanza.
4. **Copy del modal POS** — no distingue vale regalo vs ticket con precios.

---

## Cambios Propuestos

### Resumen de Cambios

- Quitar bloque **Total** del vale (web + doc PrintBridge).
- Confirmar que líneas del vale **no muestran precios** (ya OK; validar que no se agreguen).
- **Destacar** `numero_ticket` en el vale: tipografía mayor, caja/borde, etiqueta explícita *"Ticket de venta N° …"*.
- Agregar texto operativo: *"Para cambios, presentá este vale e indicá el ticket en mostrador"*.
- Ajustar copy en `PrintSelectionModal` y botón de reimpresión de vale.
- Documentar flujo cajero: buscar venta por ticket → devolución/cambio.
- Sin cambios al payload SQL ni a la numeración (ya correcta); opcional campo `tipo_documento: 'vale_cambio'` solo si PrintBridge lo necesita (ver alternativas).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `referencia/printbridge-v3-vale-cambio-regalo.md` | Guía de parche para quitar Total y destacar ticket en `renderValeCambio` del agente local |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/impresion/ValeCambioRenderer.tsx` | Quitar Total; rediseñar bloque de referencia con ticket destacado; copy regalo/cambio |
| `app/components/pos/PrintSelectionModal.tsx` | Copy del botón vale: "sin importes, para regalo" |
| `app/components/ventas/PrintButtonClient.tsx` | Label del botón reimprimir vale alineado al nuevo propósito |
| `planes/2026-05-28-ticket-validez-devolucion-configurable.md` | Nota al pie: mockup del vale actualizado (sin Total) — opcional, no bloqueante |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Sin precios en vale, con precios en ticket de venta:** El ticket de venta sigue igual (comprobante interno con montos). Solo el vale es "regalo-safe". El cajero puede imprimir ticket + vale o solo vale según el caso.

2. **Misma numeración de venta, sin número de vale separado:** No se crea contador `V-0001`. El vale referencia `payload.numero_ticket` (`T-0042`), que ya es lo que busca `listarVentas` y `listarDevoluciones`. Evita duplicar entidades y coincide con el pedido del usuario.

3. **No filtrar el payload SQL:** `build_payload_ticket_venta` sigue enviando `total` y precios por línea — el ticket los necesita. El renderer del vale simplemente **no los pinta**. Menor riesgo que duplicar RPC.

4. **Ticket destacado visualmente:** Bloque con borde, número grande, prefijo canónico `T-0042` (mismo string que ticket de venta y modal POS). Opcional mostrar fecha de venta debajo (sin hora si se prefiere compacto).

5. **Copy orientado a operación:** Una línea clara para el cliente y otra implícita para el cajero: el número es la clave de búsqueda en `/ventas`.

6. **PrintBridge fuera del repo:** Documentar parche en `referencia/`; no bloquear deploy web.

### Alternativas Consideradas

- **Payload SQL dedicado `build_payload_vale_cambio`:** Rechazado — duplica lógica; el filtrado en renderer alcanza.

- **Configuración "vale con/sin precio" en Configuración → Ticket:** Rechazado para MVP — el caso regalo es el default del negocio; se puede agregar toggle después si piden comprobante con monto.

- **Código de barras del ticket en el vale:** Posible mejora futura (escaneo en POS). Fuera de MVP — búsqueda por `T-0042` ya funciona.

- **Ocultar nombre del cliente en vale:** Rechazado — hoy el vale no imprime cliente; no hay leak adicional.

### Preguntas Abiertas (si las hay)

1. **¿Mostrar fecha de venta en el vale además del ticket?** Recomendado sí (ayuda si hay varias ventas el mismo día con búsqueda manual). Default: mantener fecha como hoy.

2. **¿Texto explícito "Regalo" en el vale?** Opcional — ej. subtítulo *"Comprobante para cambio — sin importes"*. Confirmar tono con el usuario al implementar.

3. **¿Imprimir código de barras Code128 del número de ticket?** Fuera de MVP salvo pedido explícito.

---

## Tareas Paso a Paso

### Paso 1: Rediseñar `ValeCambioRenderer` — sin precios, ticket destacado

**Descripción:** Ajustar el slip para regalo/cambio.

**Acciones:**

- **Eliminar** el bloque Total (líneas ~88–92) y la función `formatARS` si queda sin uso.
- **Reorganizar** la sección de referencia:

```
┌─────────────────────────┐
│  Ticket de venta N°     │
│       T-0042            │  ← fontSize 14–16px, fontWeight 700, centrado
│  Fecha: 08/06/2026      │
└─────────────────────────┘
```

- Usar `payload.numero_ticket` tal cual (ya viene formateado desde SQL).
- Agregar debajo del bloque de artículos (sin precios):

  *"Para cambios, presentá este vale e indicá el ticket de venta en mostrador."*

- Mantener sección **VÁLIDO HASTA** y *Conservar este comprobante*.
- Verificar que líneas sigan mostrando solo `cantidad × nombre (talle/color)` — **sin** `precio_unitario` ni `total_linea`.

**Layout propuesto (mockup):**

```
[Cabecera tienda + logo]
════════════════════════
      VALE DE CAMBIO
════════════════════════
┌──────────────────────┐
│ Ticket de venta N°   │
│      T-0042          │
│ Fecha: 08/06/2026    │
└──────────────────────┘
────────────────────────
1x REMERAS ESTAMPADA (M/Negro)
1x BERMUDA (38/Gris)
────────────────────────
Para cambios, presentá este
vale e indicá el ticket en
mostrador.
════════════════════════
VÁLIDO HASTA: 18/06/2026
(10 días con ticket)
════════════════════════
Conservar este comprobante
```

**Archivos afectados:**

- `app/components/impresion/ValeCambioRenderer.tsx`

---

### Paso 2: Ajustar copy en POS y reimpresión

**Descripción:** Alinear la UI con el propósito regalo.

**Acciones:**

- En `PrintSelectionModal.tsx`, cambiar descripción del botón vale:
  - Antes: *"Slip con validez de N días para cambios"*
  - Después: *"Sin importes — para regalo o cambio. Incluye el ticket de venta."*

- En `PrintButtonClient.tsx`, botón secundario de vale (si existe label):
  - Ej.: *"Reimprimir vale (sin precios)"*

**Archivos afectados:**

- `app/components/pos/PrintSelectionModal.tsx`
- `app/components/ventas/PrintButtonClient.tsx`

---

### Paso 3: Documentar flujo operativo y PrintBridge

**Descripción:** Consistencia térmica + guía para el cajero.

**Acciones:**

- Crear `referencia/printbridge-v3-vale-cambio-regalo.md` con:
  - Eliminar impresión de after lineas
  - Destacar `payload.numero_ticket` centrado y en negrita
  - Imprimir línea de instrucción de cambio
  - Referencia a `referencia/printbridge-v3-logo-tickets.md` para logo

- Incluir en el doc del plan / notas del vale el **flujo cajero**:

  1. Cliente llega con vale → lee **Ticket T-0042**
  2. Cajero va a **Ventas** → busca `T-0042` o `42`
  3. Abre la venta → **Nueva devolución** / cambio según política
  4. El vale no reemplaza al ticket de venta para reembolso con montos — solo identifica la operación

**Archivos afectados:**

- `referencia/printbridge-v3-vale-cambio-regalo.md` (nuevo)

---

### Paso 4: Validación

**Acciones:**

1. Venta en POS con `dias_cambio > 0` y rubro con vale → imprimir vale → **no** debe aparecer Total ni precios por línea.
2. Vale muestra **mismo** `T-0042` que ticket de venta y modal post-venta.
3. En `/ventas`, buscar `T-0042` → encuentra la venta correcta.
4. Reimprimir vale desde detalle de venta → mismo layout.
5. Ticket de venta **sin regresión** (sigue mostrando precios y total).
6. `npm run build` OK.

**Archivos afectados:** ninguno (QA)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/impresion/usePrint.tsx` — no cambia; sigue enviando mismo payload a PrintBridge
- `app/app/actions/impresion.ts` → `obtenerPayloadVenta` — sin cambios
- `build_payload_ticket_venta` — sin cambios (numeración ya correcta)
- Devoluciones — beneficio indirecto: búsqueda por ticket ya implementada

### Actualizaciones Necesarias para Consistencia

- Parche manual PrintBridge en tiendas con agente térmico
- Opcional: captura en `salidas/capturas/` del vale nuevo para novedades clientes

### Impacto en Flujos de Trabajo Existentes

- **Regalo:** cajero imprime solo vale (o ticket oculto + vale entregado al destinatario).
- **Compra normal con cambio:** ticket para el comprador, vale opcional para quien cambie después.
- **Caja / reportes:** sin impacto — el vale no es documento contable.
- **Numeración:** sin cambios — sigue siendo `get_siguiente_numero_ticket` en la venta.

---

## Lista de Validación

- [x] Vale impreso no muestra Total ni precios por ítem
- [x] Ticket de venta (`T-XXXX`) visible y destacado en el vale
- [x] Mismo número que ticket de venta y modal POS post-venta
- [x] Búsqueda en `/ventas` con el número del vale encuentra la venta (sin cambios — ya existía)
- [x] Copy del modal POS y reimpresión actualizado
- [x] Doc PrintBridge creada/actualizada
- [x] `npm run build` sin errores

---

## Criterios de Éxito

La implementación está completa cuando:

1. Un destinatario de regalo que recibe **solo el vale** no puede inferir el monto pagado.
2. El cajero puede localizar la venta original buscando el **ticket impreso en el vale** (`T-0042`) en el listado de ventas.
3. El ticket de venta completo conserva precios y total sin cambios.

---

## Notas

- El plan `2026-06-08-fix-tickets-cambio-devolucion-numeracion.md` dejó explícita la pregunta de quitar Total del vale — este plan **confirma quitarlo**.
- No se requiere migración SQL.
- Mejora futura: escanear código de barras del ticket desde el vale en el POS para abrir la venta directo.
- Mejora futura: botón "Ir a devolución" pre-cargado desde búsqueda por ticket (ya parcialmente cubierto vía `/devoluciones/nueva?venta_id=`).

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se rediseñó `ValeCambioRenderer`: sin Total ni precios, ticket de venta destacado en caja, subtítulo "Comprobante para cambio — sin importes", e instrucción operativa para mostrador. Copy actualizado en modal POS y botón de reimpresión. Guía PrintBridge en `referencia/printbridge-v3-vale-cambio-regalo.md`.

### Desviaciones del Plan

- Se agregó subtítulo *"Comprobante para cambio — sin importes"* (sugerido como opcional en preguntas abiertas).
- No se actualizó `planes/2026-05-28-ticket-validez-devolucion-configurable.md` (marcado opcional en el plan).

### Problemas Encontrados

- Ninguno. Build OK.
