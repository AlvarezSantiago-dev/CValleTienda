# PrintBridge v3 — Actualización sin reconfigurar

Guía para operadores: pasar a **v3.1.1** en la PC de caja sin perder la impresora ya configurada.

## Cuándo usar

- Vale de cambio imprime **Total** o precios en térmica.
- Tickets no muestran **logo** aunque la preview web sí.
- Logo roto / texto en blanco debajo del logo.
- Error `No driver set!` en la consola.
- Badge en Configuración → Ticket muestra versión &lt; 3.1.1.

## Pasos

1. **Cerrar PrintBridge** — ventana de consola, proceso en segundo plano o tray (v2).
2. **Descargar** `CValle-PrintBridge-v3.1.1.exe` desde Configuración → Ticket en la app, o directo:  
   https://joptfhktuokqpsbblmkt.supabase.co/storage/v1/object/public/printbridge/releases/CValle-PrintBridge-v3.1.1.exe
3. **Reemplazar** el exe en **la misma carpeta** donde estaba el anterior (ej. `C:\CValle\printbridge-v3\`).
4. **Ejecutar** el nuevo exe (doble clic o acceso directo).
5. **Verificar** en CValleTienda → Configuración → Ticket:
   - Badge `PrintBridge conectado` con **v3.1.1**
   - Misma impresora y ancho que antes
6. **Probar** venta con vale desde el POS.

**No hace falta** abrir `http://localhost:9100` para volver a elegir impresora, salvo que el badge diga "sin impresora configurada".

## Config automática

| Origen | Ruta | Qué hace v3.1 |
|--------|------|----------------|
| v3 existente | `%APPDATA%\CVallePrintBridge\config.json` | Lee tal cual |
| v2 Electron | `%APPDATA%\CValle PrintBridge\config.json` | Migra a v3 path (no borra el legacy) |
| v1 flat | `printerName` en config v3 path | Migra a `ticketPrinter` |

## Logo en térmica (capa aparte)

El exe no alcanza: también necesitás la migración Supabase `20260620100001_payload_tickets_logo.sql` aplicada y logo subido en Configuración → Negocio.

## Autostart

Si usabas v2 con "iniciar con Windows" vía Electron, en v3 habilitá de nuevo **Inicio con Windows** desde `http://localhost:9100` tras el swap.

## Rollback

Guardá copia del exe anterior. Si algo falla, restaurá el exe viejo — la config en `%APPDATA%\CVallePrintBridge\` no se pierde.
