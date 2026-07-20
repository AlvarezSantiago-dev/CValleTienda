Guía para operadores: pasar a **v3.1.5** en la PC de caja sin perder la impresora ya configurada.

## Cuándo usar

- El exe dice "listo" pero el navegador muestra `PrintBridge: no se encontró public/index.html` o `index=false`.
- `localhost:9100` falla (usar `http://127.0.0.1:9100/`).
- Logo borroso / ticket cortado a un lado / texto amontonado.
- Badge muestra versión &lt; 3.1.5.

## Pasos

1. **Cerrar PrintBridge** (consola, Task Manager, Startup viejo).
2. **Descargar solo el .exe** desde Configuración → Ticket, o:  
   https://joptfhktuokqpsbblmkt.supabase.co/storage/v1/object/public/printbridge/releases/CValle-PrintBridge-v3.1.5.exe  
   (desde v3.1.4 el panel UI va embebido; **no hace falta** carpeta `public` al lado).
3. **Reemplazar** el exe en la misma carpeta.
4. Abrir **http://127.0.0.1:9100/** → badge **v3.1.5**.
5. En el panel, poné el **ancho real del papel** (58 o 80). Si el papel es 58mm y figuraba 80, el ticket se corta.
6. Probar ticket.
7. Probar vale de cambio: sin subtítulo "sin importes", una sola línea de instrucción y sin caracteres raros.

## Dónde actualizar el link en el código (futuras versiones)

| Archivo | Qué cambiar |
|---------|-------------|
| `app/components/configuracion/PrintBridgeStatus.tsx` | `PRINTBRIDGE_DOWNLOAD_URL` + `MIN_PRINTBRIDGE_VERSION` + textos del botón |
| `referencia/printbridge-v3-actualizacion-sin-reconfig.md` | URL y número de versión |
| `scripts/printbridge-v3/README.md` | URL y versión |
| Supabase Storage | Subir/sobrescribir `printbridge/releases/CValle-PrintBridge-vX.Y.Z.exe` |

Tip: publicá también `CValle-PrintBridge-latest.exe` (mismo archivo) y apuntá el link a `latest` para no tocar código en cada release.

## Si el navegador no conecta

1. Usá `http://127.0.0.1:9100/`.
2. Matá procesos viejos en el puerto 9100.
3. Ver `salidas/checklist-printbridge-v312-cliente.md`.

## Config automática

| Origen | Ruta |
|--------|------|
| v3 | `%APPDATA%\CVallePrintBridge\config.json` |
