# PrintBridge v3 — Vale de cambio sin precios (regalo)

Parche manual para alinear la impresión térmica con `ValeCambioRenderer.tsx` del frontend.

## Objetivo

- **No imprimir** Total ni precios por ítem en el vale.
- **Destacar** `payload.numero_ticket` (ej. `T-0042`) como clave de búsqueda.
- Mantener artículos (cantidad × nombre), validez y copy operativo.

Para logo en cabecera, ver también `referencia/printbridge-v3-logo-tickets.md`.

## Cambios en `renderValeCambio`

### 1. Eliminar bloque Total

Buscar e **eliminar** la sección que imprime `Total:` y `payload.total` (después de las líneas de artículos).

### 2. Encabezado del vale

Después del logo / nombre de tienda:

```
════════════════════════
      VALE DE CAMBIO
Comprobante para cambio — sin importes
════════════════════════
```

### 3. Ticket de venta destacado

Reemplazar la línea plana `Ticket: T-0042` por un bloque centrado:

```javascript
printer.alignCenter()
printer.bold(true)
printer.println('TICKET DE VENTA N°')
printer.setTextSize(2, 2) // o equivalente en tu driver
printer.println(payload.numero_ticket)
printer.setTextSize(1, 1)
printer.bold(false)
printer.println('Fecha: ' + payload.fecha.split(' ')[0])
printer.alignLeft()
```

### 4. Artículos (sin precios)

Solo cantidad × nombre (+ variante si aplica). **No** imprimir `precio_unitario` ni `total_linea`.

### 5. Instrucción operativa

Después de los artículos, antes de la validez:

```
Para cambios, presentá este vale
e indicá el ticket de venta en mostrador.
```

### 6. Validez (sin cambios)

Mantener bloque `VÁLIDO HASTA:` calculado con `payload.tienda.dias_cambio` y `payload.fecha`.

## Flujo cajero (mostrador)

1. Cliente llega con vale → lee **Ticket T-0042** impreso en el slip.
2. Cajero va a **Ventas** → busca `T-0042` o `42`.
3. Abre la venta → **Nueva devolución** / cambio según política del local.
4. El vale **no reemplaza** al ticket de venta para reembolsos con montos; solo identifica la operación.

## Payload

No requiere cambios en SQL. El endpoint `POST /print/vale` sigue recibiendo el mismo `PayloadTicketVenta` que el ticket de venta; el renderer del vale simplemente omite campos monetarios.

## Reiniciar PrintBridge

Tras parchear `renderer.js`, reiniciar el agente local (`start.bat` o equivalente) y probar una venta con vale desde el POS.
