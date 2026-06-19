# Capturas para el PDF de novedades

Guardá acá los screenshots en PNG (recomendado) o JPG.

El HTML referencia estas rutas como `capturas/nombre-archivo.png` (relativo a `salidas/`).

## Archivos sugeridos

| Archivo | Pantalla |
|---------|----------|
| `graficos-finanzas.png` | Gráficos → Finanzas |
| `variantes-tabla.png` | Productos → variantes |
| `inicio-turnos.png` | Inicio → banner + Turnos de hoy |
| `caja-preview-cierre.png` | Caja → vista previa del cierre |
| `pos-cobro-guiado.png` | POS → asistente paso a paso |
| `venta-ticket-hora.png` | Venta → detalle con T-XXXX |

Instrucciones completas en `2026-06-18-novedades-clientes-cvalletienda.md`.

**Regenerar PDF:** `npm install playwright` (una vez) → `node scripts/generar-pdf-novedades.mjs`
