# Checklist QA — PrintBridge v3.1.5 (textos finales)

Fecha: 2026-07-20

## Precondiciones

- Exe instalado: `CValle-PrintBridge-v3.1.5.exe`
- Panel accesible en `http://127.0.0.1:9100/`
- Config existente preservada en `%APPDATA%\CVallePrintBridge\config.json`

## Validaciones de ticket de venta

- [ ] El ticket imprime una sola vez el pie (`texto_pie`).
- [ ] Ya no aparece un segundo "Gracias por tu compra!" al final.
- [ ] No hay caracteres raros (garabatos/CJK) en textos del pie.

## Validaciones de vale de cambio

- [ ] No aparece el subtítulo "Comprobante para cambio - sin importes".
- [ ] Aparece la instrucción: "Para cambios, presentar este vale de cambio en el mostrador."
- [ ] La instrucción sale completa y legible (sin cortes raros).
- [ ] El número de ticket se imprime destacado y luego vuelve al tamaño normal.

## Validación por ancho de papel

- [ ] Prueba en 58 mm: textos legibles, sin caracteres extraños.
- [ ] Prueba en 80 mm: textos legibles, sin caracteres extraños.

## Validación de app web

- [ ] En Configuración > Ticket, `PrintBridgeStatus` muestra versión `v3.1.5`.
- [ ] El enlace de descarga apunta a `CValle-PrintBridge-v3.1.5.exe`.
- [ ] Si corre una versión anterior, aparece el aviso de actualización.

## Resultado final

- [ ] Aprobado para uso en caja.
- [ ] Si falla algún punto, registrar impresora/modelo/ancho y adjuntar foto del ticket.
