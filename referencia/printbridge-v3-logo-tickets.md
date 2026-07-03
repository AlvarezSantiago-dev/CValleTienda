# PrintBridge v3 — Integración de logo en tickets

**Desde v3.1.0** el logo ya viene incluido en el release oficial. No hace falta parche manual salvo hotfix de emergencia.

## Release oficial

1. Descargá `CValle-PrintBridge-v3.1.0.exe` desde [GitHub Releases](https://github.com/cvalle/printbridge/releases/latest).
2. Reemplazá el exe en la PC de caja (misma carpeta, sin reconfigurar).
3. Verificá versión en Configuración → Ticket → badge `v3.1.0`.

Código fuente: `scripts/printbridge-v3/src/logo-raster.js` + llamadas en `renderer.js`.

## Requisitos

- Node.js 18+ en build (`fetch` nativo).
- Migración Supabase `20260620100001_payload_tickets_logo.sql` aplicada.
- Logo PNG/JPG en Configuración → Negocio; toggle "Mostrar logo" activo.

## Payload

El backend envía en `payload.tienda`:

- `logo_url` — URL pública Supabase Storage
- `mostrar_logo` — boolean desde Configuración → Ticket

## Hotfix manual (solo emergencia)

Si no podés actualizar el exe aún, copiá `scripts/printbridge-v3/src/logo-raster.js` junto a `renderer.js` y agregá:

```javascript
const { printTicketLogo } = require('./logo-raster')
await printTicketLogo(printer, payload.tienda)
```

En `renderTicketVenta`, `renderTicketDevolucion` y `renderValeCambio` (funciones `async`).

## Troubleshooting

| Síntoma | Causa probable |
|---------|----------------|
| Logo en preview web pero no en térmica | PrintBridge &lt; 3.1.0 o migración SQL pendiente |
| Logo omitido en consola | URL inaccesible, SVG, o imagen &gt;512KB |
| Logo muy grande | Usar PNG/JPG ≤512px |

Si el logo falla, el ticket **sigue imprimiendo** (solo se omite la imagen).
