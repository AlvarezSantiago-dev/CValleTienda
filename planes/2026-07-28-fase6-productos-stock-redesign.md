# Plan: Fase 6 — Productos y Stock Redesign (Fable)

**Creado:** 2026-07-28
**Estado:** Implementado
**Pedido:** Catálogo DataTable, formularios/taxonomías/import/stock con Design System v2. Sin tocar queries/actions de negocio.
**Plan maestro:** `planes/2026-07-28-rediseno-uiux-completo-fable.md` (Paso 7)

## Inventario
- Productos: 24 componentes (CodigoDesconocidoModal + TabsProductos ya v2)
- Stock: 6 componentes
- Páginas: productos/*, stock/*

## Cambios
1. ListaProductos + TablaStock → DataTable + Badge
2. Pages → PageHeader; banners de límite con tokens
3. TaxonomyManager + ImportadorCSV + Ajuste/Ingreso → tokens (+ Modal confirm)
4. ProductoForm shell + auxiliares: token sweep (preservar flujo)
5. No tocar print.css / lógica de variantes

---

## Notas de Implementación

**Implementado:** 2026-07-28

### Resumen

Catálogo y stock con DataTable; taxonomías y ajuste con Modal; PageHeader en todas las páginas del módulo; token sweep en formularios/variantes/import. Build OK.

### Desviaciones del Plan

- ProductoForm no se reorganizó en secciones nuevas (solo tokens).
- Print popovers no migrados a Drawer/DropdownMenu.
- Import wizard visual únicamente (pasos existentes).

### Problemas Encontrados

Ninguno.
