# Plan: Fase 5 — Caja (turnos) Redesign (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Rediseño presentacional del módulo Caja usando Design System v2, sin tocar queries ni Server Actions.
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md` (Paso 6)

## Inventario (`app/components/caja/` — 14)

| Archivo | Rol | Prioridad |
|---|---|---|
| AbrirSesionForm | Apertura inline | Tokens |
| CerrarSesionForm | Cierre + confirm inline | Tokens |
| SesionAbiertaPanel | Panel sesión + emergencia Modal | Modal + tokens |
| RegistrarMovimientoForm | Alta movimiento | → Modal |
| EditarMovimientoForm | Editar movimiento | → Modal |
| MovimientosTurnoTabla / Lista | Tabla movimientos | Tokens + Badge |
| HistorialCajaMes | Historial mes | DataTable + Badge |
| CierreDetalle / ResumenTurnoPanel | Detalle cierre | Tokens + Badge |
| VentasTurnoLista / TopProductosTurno | Extras detalle | Tokens |
| ReopenCajaButton / ImprimirCierreButton | Acciones | Modal / Button |

Páginas: `caja/page.tsx`, `caja/sesiones/[id]/page.tsx`

## Cambios
1. Migrar 4 overlays a `Modal` v2.
2. PageHeader + Badge en pages; historial con DataTable.
3. Tokens en superficies, pills → Badge, sin emojis de estado.
4. **No tocar** actions/queries/impresión CSS.

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

Caja migrada a DS v2: modales de movimiento/emergencia/reabrir, historial con DataTable, pages con PageHeader, tokens en paneles de apertura/cierre/resumen. Build OK.

### Desviaciones del Plan

- Cierre permanece como form inline de 2 pasos (no wizard Modal).
- Breadcrumbs auto por pathname en detalle de sesión.

### Problemas Encontrados

Ninguno.
