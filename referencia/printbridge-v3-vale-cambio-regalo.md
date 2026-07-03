# PrintBridge v3 — Vale de cambio sin precios (regalo)

**Desde v3.1.0** el layout del vale sin importes ya viene en el release oficial.

## Release oficial

1. Descargá `CValle-PrintBridge-v3.1.0.exe` desde [GitHub Releases](https://github.com/cvalle/printbridge/releases/latest).
2. Reemplazá el exe sin reconfigurar impresora — ver `referencia/printbridge-v3-actualizacion-sin-reconfig.md`.

## Qué incluye v3.1.0

- **No imprime** Total ni precios por ítem.
- **Destaca** `payload.numero_ticket` (ej. `T-0042`) centrado y en negrita.
- Artículos: solo cantidad × nombre (+ variante).
- Instrucción operativa antes de la validez.
- Logo en cabecera si corresponde (ver `printbridge-v3-logo-tickets.md`).

Alineado con `app/components/impresion/ValeCambioRenderer.tsx`.

## Hotfix manual (solo emergencia)

Editar `renderValeCambio` en `renderer.js` del agente local según la versión anterior de este doc (eliminar bloque Total, destacar ticket N°).

## Flujo cajero (mostrador)

1. Cliente llega con vale → lee **Ticket T-0042** impreso en el slip.
2. Cajero va a **Ventas** → busca `T-0042` o `42`.
3. Abre la venta → **Nueva devolución** / cambio según política del local.
4. El vale **no reemplaza** al ticket de venta para reembolsos con montos; solo identifica la operación.

## Payload

No requiere cambios en SQL. El endpoint `POST /print/vale` recibe el mismo `PayloadTicketVenta` que el ticket de venta; el renderer del vale omite campos monetarios.
