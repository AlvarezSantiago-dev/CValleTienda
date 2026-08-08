# Plan: Fase 4 — POS y Cobro Redesign (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Rediseño presentacional del POS sin degradar velocidad de caja (scanner, atajos, cobro guiado).
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md`

## Inventario (`app/components/pos/` + relacionados)

| Archivo | Rol |
|---|---|
| POSContainer.tsx | Orquestador layout + estado |
| BuscadorVariantes.tsx | Búsqueda/scanner |
| Carrito.tsx | Líneas del carrito |
| GrillaProductos.tsx | Catálogo rápido |
| PanelPago.tsx | Cobro clásico |
| PanelCobroResumen.tsx | Resumen + abrir guiado |
| CobroGuiadoModal.tsx | Wizard cobro |
| cobro-guiado/* | Pasos del wizard |
| PesoModal.tsx | Cantidad/peso |
| PrintSelectionModal.tsx | Post-venta print |
| CodigoDesconocidoModal.tsx (productos/) | Código no hallado |
| NuevoClienteModal.tsx (clientes/) | Alta cliente desde cobro |
| DescuentoEditor, PagoMultiMetodo, PagoRapidoChips, FacturaToggle, PosAtajosHelp, UltimoAgregadoChip, VarianteSelector | Auxiliares |

## Cambios
1. Migrar modales a `Modal` v2 + tokens.
2. POS page + shell visual tokens; EmptyState sin emoji.
3. Mobile: Carrito en Drawer inferior + barra sticky Cobrar (desktop intacto).
4. Precios page: PageHeader tokens.
5. **No tocar** actions/queries/hotkeys/print markup.

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

Modales POS/cobro a Modal v2; layout mobile con Drawer de carrito + sticky Cobrar; tokens en superficies principales; pages pos/precios con PageHeader. Build OK.

### Desviaciones del Plan

- PanelPago visible en mobile (modo clásico); solo PanelCobroResumen se oculta en mobile.
- CobroGuiado usa `size="full"` en lugar de `xl`.

### Problemas Encontrados

Ninguno.
