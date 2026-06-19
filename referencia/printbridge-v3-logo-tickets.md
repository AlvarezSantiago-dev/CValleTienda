# PrintBridge v3 — Integración de logo en tickets

Copiá `src/logo-raster.js` al PrintBridge v3 en producción (misma carpeta que `renderer.js`).

## 1. Agregar el módulo

```
scripts/printbridge-v3/src/logo-raster.js   ← copiar desde este repo
```

Requiere **Node.js 18+** (`fetch` nativo). PrintBridge v3 ya usa Node 18 en el build con `pkg`.

## 2. Parche en `renderer.js`

Al inicio del archivo:

```javascript
const { printTicketLogo } = require('./logo-raster')
```

En **`renderTicketVenta`**, justo después de activar Font B (si 58mm) y **antes** de `printer.alignCenter()` con el nombre:

```javascript
await printTicketLogo(printer, payload.tienda)
```

En **`renderTicketDevolucion`**, mismo lugar (inicio de cabecera):

```javascript
await printTicketLogo(printer, payload.tienda)
```

En **`renderValeCambio`**, antes del bloque "VALE DE CAMBIO":

```javascript
await printTicketLogo(printer, payload.tienda)
```

Asegurate de que esas funciones sean `async` si aún no lo son.

## 3. Payload

El backend ya envía en `payload.tienda`:

- `logo_url` — URL pública Supabase Storage
- `mostrar_logo` — boolean desde Configuración → Ticket

No hace falta cambiar `server.js` ni los endpoints.

## 4. Reiniciar PrintBridge

Después de copiar el archivo y parchear `renderer.js`:

1. Cerrar la ventana de PrintBridge (o el proceso en segundo plano)
2. Volver a ejecutar `start.bat`
3. Probar una venta desde el POS

## 5. Troubleshooting

| Síntoma | Causa probable |
|---------|----------------|
| Logo en preview web pero no en térmica | Falta parche en PrintBridge o agente no reiniciado |
| Logo omitido en consola | URL inaccesible, SVG (no soportado en raster), o imagen >2MB corrupta |
| Logo muy grande | Usar PNG/JPG ≤512px; `printImage` escala pero conviene logo compacto |

Si el logo falla, el ticket **sigue imprimiendo** (solo se omite la imagen).
