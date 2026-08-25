# Plan: Catálogo — destacados (coverflow) + grilla paginada

**Creado:** 2026-08-25
**Estado:** Implementado
**Pedido:** Interface de catálogo con productos destacados en carrusel coverflow al inicio, y debajo el resto paginado (~20) para no cargar todo de una.

---

## Descripción General

### Qué Logra Este Plan

Permite marcar productos como **destacados** en el catálogo público. En `/c/[slug]` aparece un **coverflow** (carrusel 3D) con esas portadas al inicio; debajo, un título de sección y la grilla existente (búsqueda + chips de categoría) **paginada en servidor** (~20 ítems) para reducir payload y trabajo de packs/tramos. El componente Coverflow se adapta al Design System v2 (no shadcn crudo).

### Por Qué Importa

La vitrina es la cara del negocio hacia el cliente. Destacar 5–12 productos con foto convierte el link en “vidriera”, no solo listado. Hoy `listarProductosCatalogo` trae **todos** los visibles con tramos + packs: con catálogo grande es pesado. Separar destacados (query chica) + página de grilla alinea performance con la UX pedida.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta / pieza | Rol |
|--------------|-----|
| `app/app/(catalogo)/c/[slug]/page.tsx` | Home catálogo: mensaje + `CatalogoGrilla` con **todos** los productos |
| `app/components/catalogo-publico/CatalogoGrilla.tsx` | Buscador + chips categoría + grilla (filtro client-side) |
| `app/lib/catalogo/queries-publico.ts` | `listarProductosCatalogo` (admin, sin paginar) |
| `app/lib/catalogo/types.ts` | `ProductoCatalogoPublico` (+ `categoria_*` reciente) |
| `productos.visible_en_catalogo` | Opt-in catálogo (default off) |
| `ProductoForm` + `ToggleCatalogoProducto` | UI para visible |
| `app/components/ui/cn.ts` | `cn` del proyecto (no `@/lib/utils`) |
| `app/components/ui/Pagination.tsx` | Paginación URL ya usada en stock/movimientos |
| `lucide-react` | **Ya instalado** en `app/package.json` |
| Stack | Next.js App Router, Tailwind, TS, primitives en `components/ui/` (DS v2, no CLI shadcn) |

### Brechas o Problemas que se Abordan

1. No existe flag ni UI de **producto destacado**.
2. No hay carrusel / hero de destacados en la home del catálogo.
3. La grilla carga el catálogo completo + adjuntos (tramos/packs) en un solo request.
4. El snippet Coverflow usa tokens shadcn (`bg-muted`, `text-foreground`, `animate-in`, `@/lib/utils`) incompatibles con este repo.

---

## Cambios Propuestos

### Resumen de Cambios

- Migración: `productos.destacado_en_catalogo boolean not null default false` + índice parcial.
- Dashboard: Switch “Destacar en catálogo” (requiere visible; tope de N destacados).
- Queries públicas: `listarDestacadosCatalogo` (máx N, select liviano) + `listarProductosCatalogo` paginado + filtros URL.
- UI: `CoverflowCarousel` adaptado a DS + wrapper `CatalogoDestacados` (slides desde productos, click → ficha).
- Home `/c/[slug]`: coverflow → título “Catálogo” / “Todos los productos” → grilla paginada.
- Docs: `referencia/catalogo-publico.md`, `CLAUDE.md`, `contexto/proyectos.md`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260825000003_catalogo_destacados.sql` | Columna `destacado_en_catalogo` + índice |
| `app/components/ui/coverflow-carousel.tsx` | Primitive coverflow (adaptado a tokens DS + `cn` local) |
| `app/components/catalogo-publico/CatalogoDestacados.tsx` | Mapea productos → slides; caption precio; Link a ficha |
| `app/components/productos/ToggleDestacadoCatalogo.tsx` | Toggle listado productos (opcional; o solo form) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/types/database.ts` | Campo `destacado_en_catalogo` en tipo Producto |
| `app/lib/catalogo/types.ts` | Flag opcional en DTO o tipo `ProductoDestacadoCatalogo` |
| `app/lib/catalogo/queries-publico.ts` | Queries destacados + listado paginado/filtrado |
| `app/app/(catalogo)/c/[slug]/page.tsx` | Destacados + grilla con `searchParams` page/cat/q |
| `app/components/catalogo-publico/CatalogoGrilla.tsx` | Dejar de asumir lista completa; filtros vía URL (o híbrido) |
| `app/components/productos/ProductoForm.tsx` | Switch destacado |
| `app/app/actions/productos.ts` / `catalogo.ts` | Persistir flag; validar tope y `visible_en_catalogo` |
| `app/components/productos/ListaProductos.tsx` | Badge / toggle destacado (mínimo badge) |
| `referencia/catalogo-publico.md`, `CLAUDE.md`, `contexto/proyectos.md` | Documentar |

### Archivos a Eliminar (si aplica)

Ninguno. No copiar `demo.tsx` ni assets R2/Unsplash de demo al catálogo real.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Flag en `productos` (no tabla puente)**: igual patrón que `visible_en_catalogo`; simple, suficiente para v1. Orden de destacados = `updated_at desc` o `nombre` (orden manual = fase 2).
2. **Tope de destacados = 12** (constante `CATALOGO_MAX_DESTACADOS`): coverflow + imágenes; action rechaza si se supera.
3. **Destacado implica visible**: al marcar destacado, forzar `visible_en_catalogo = true`; al quitar visible, apagar destacado.
4. **Destacados también pueden aparecer en la grilla** (default): el coverflow es spotlight, no exclusión. (Pregunta abierta si el usuario prefiere ocultarlos de la grilla.)
5. **Coverflow en `components/ui/`** + wrapper en `catalogo-publico/`: reutilizable; la integración de negocio no ensucia el primitive.
6. **No shadcn CLI**: el repo ya tiene Tailwind + TS + `components/ui`. Mapear clases del snippet a tokens (`bg-surface-sunken`, `text-fg`, `text-fg-muted`, `bg-surface/70`, `shadow-lg`, `focus-ring`). Quitar `animate-in` (no instalado).
7. **`cn` desde `@/components/ui/cn`**, no `@/lib/utils`.
8. **Paginación servidor `pageSize = 20`**: URL `?page=&categoria=&q=`. Chips y búsqueda navegan con `router.push` (como stock). Packs/tramos solo de la página actual.
9. **Query destacados liviana**: id, nombre, imagen_url, precio_venta + 1 variante vendible mínima si hace falta precio “desde”; **sin** adjuntar todos los packs/tramos al carousel (caption: nombre + precio desde lista).
10. **Placeholder** si no hay `imagen_url`: no meter Unsplash; usar `CatalogoPlaceholder` o slide con fondo + inicial (coverflow espera `src` — usar data-URI o adaptar card para children/placeholder).

### Alternativas Consideradas

| Alternativa | Por qué no (v1) |
|-------------|-----------------|
| Tabla `catalogo_destacados` con orden drag-and-drop | Más schema/UI; orden manual puede ser v1.1 |
| Seguir cargando todo client-side y solo paginar en UI | No reduce red ni adjuntos server |
| Embla / Swiper | El pedido trae coverflow listo; adaptar es más barato |
| Destacados solo en Configuración catálogo (multi-select) | Peor DX que switch en producto |

### Preguntas Abiertas (si las hay)

1. ¿Los destacados **también** salen en la grilla de abajo, o solo en el coverflow?
2. ¿Tope 8 o 12 destacados está bien?
3. ¿Page size 20 OK, o preferís 24 (grid 3×8)?

**Defaults si no hay respuesta:** sí aparecen en grilla; tope 12; pageSize 20.

---

## Tareas Paso a Paso

### Paso 1: Migración y tipos

**Acciones:**

- Crear migración:

```sql
alter table public.productos
  add column if not exists destacado_en_catalogo boolean not null default false;

comment on column public.productos.destacado_en_catalogo is
  'Si true y visible_en_catalogo, aparece en el coverflow del catálogo público.';

create index if not exists productos_destacados_catalogo_idx
  on public.productos (tienda_id)
  where destacado_en_catalogo = true and visible_en_catalogo = true and activo = true;
```

- Actualizar `types/database.ts` y inputs de `ProductoInput` / create/update.

**Archivos afectados:**

- `supabase/migrations/20260825000003_catalogo_destacados.sql`
- `app/types/database.ts`
- `app/app/actions/productos.ts`

---

### Paso 2: Actions y UI dashboard (marcar destacados)

**Acciones:**

- Constante `CATALOGO_MAX_DESTACADOS = 12` en `lib/catalogo/const.ts`.
- En create/update producto: persistir `destacado_en_catalogo`; si `true` → `visible_en_catalogo = true`; contar destacados activos de la tienda y fallar con mensaje claro si > tope.
- Action `setDestacadoEnCatalogo(productoId, boolean)` (espejo de `setVisibleEnCatalogo`); al desactivar visible, `destacado_en_catalogo = false`.
- `ProductoForm`: Switch “Destacar en el inicio del catálogo” (disabled si kit/bundle; hint del tope).
- Listado: badge “Destacado” y/o toggle compacto.

**Archivos afectados:**

- `app/lib/catalogo/const.ts`
- `app/app/actions/catalogo.ts`, `productos.ts`
- `ProductoForm.tsx`, `ListaProductos.tsx`, opcional `ToggleDestacadoCatalogo.tsx`

---

### Paso 3: Primitive CoverflowCarousel (adaptado)

**Acciones:**

- Copiar lógica del snippet a `app/components/ui/coverflow-carousel.tsx`.
- Imports: `cn` desde `@/components/ui/cn`; `lucide-react` (ya en deps — **no** reinstalar salvo que falte).
- Reemplazar clases shadcn:
  - `bg-muted` → `bg-surface-sunken`
  - `text-foreground` → `text-fg`
  - `text-muted-foreground` → `text-fg-muted`
  - `bg-background` → `bg-surface`
  - `ring-ring` / focus → `focus-ring` / tokens existentes
  - Quitar `animate-in fade-in` (usar transición opacity simple o nada)
- Extender slide opcional: `href?: string` y envolver imagen en `Link`/`<a>`, **o** dejar click en el wrapper de negocio.
- No incluir `demo.tsx` ni URLs R2/Unsplash en producción.

**Archivos afectados:**

- `app/components/ui/coverflow-carousel.tsx` (nuevo)

---

### Paso 4: CatalogoDestacados + queries destacados

**Acciones:**

- `listarDestacadosCatalogo(tiendaId, permiteInfinito)`:
  - Filtros: activo, visible, destacado, no kit/bundle.
  - `order` estable (nombre o `updated_at desc`).
  - `limit` = max destacados.
  - Select liviano (imagen, nombre, precio); mapear a DTO mínimo o reutilizar `ProductoCatalogoPublico` sin packs/tramos.
- `CatalogoDestacados`: convierte a `CoverflowSlide[]` (`src` = imagen o placeholder URL/`CatalogoPlaceholder` dentro de card si se adapta el primitive).
- Props: `showCaption` con título = nombre, subtitle = precio formateado (`formatARS` / “Desde …”).
- Click en slide central o caption → `/c/[slug]/p/[id]`.
- Si `slides.length === 0`, no renderizar sección.

**Archivos afectados:**

- `queries-publico.ts`, `types.ts`
- `CatalogoDestacados.tsx`

---

### Paso 5: Paginación y filtros server-side en grilla

**Acciones:**

- Cambiar `listarProductosCatalogo` a opciones: `{ page, pageSize = 20, categoriaId?, search?, soloNoDestacados? }` → `{ items, total, page, pageSize }`.
- Filtros PostgREST: `eq` categoría, `ilike` nombre; count exact.
- Adjuntar tramos/packs **solo** a `items` de la página.
- `page.tsx`: leer `searchParams` (`page`, `categoria`, `q`); cargar destacados + página en `Promise.all`.
- `CatalogoGrilla`:
  - Chips/búsqueda actualizan URL (debounce q ~300ms).
  - Recibir `total` + render `Pagination` (`basePath=/c/${slug}`).
  - Vacío: empty state + limpiar filtros.
- Título sección debajo del coverflow: p.ej. **“Todos los productos”** (o “Catálogo”) con `text-fg` / subtle.

**Archivos afectados:**

- `queries-publico.ts`
- `c/[slug]/page.tsx`
- `CatalogoGrilla.tsx`
- `Pagination` (reutilizar)

---

### Paso 6: Docs + validación

**Acciones:**

- Actualizar `referencia/catalogo-publico.md` (destacados + paginación).
- Línea en CLAUDE.md tabla App CValleTienda.
- `contexto/proyectos.md` (módulo catálogo).
- `npm run build`.
- Checklist 390 / 768: coverflow touch + grilla + paginación.

**Archivos afectados:**

- Docs listados arriba

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `ToggleCatalogoProducto` / `setVisibleEnCatalogo` — coordinar apagado de destacado.
- API pedido / ficha producto — sin cambio de contrato (destacado no afecta venta).
- Chips categoría recientes — migrar a URL sin romper UX.

### Actualizaciones Necesarias para Consistencia

- Spec `referencia/catalogo-publico.md`
- Aplicar migración en Supabase antes de prod

### Impacto en Flujos de Trabajo Existentes

- URLs `/c/slug` ganan query params; deep links sin params = página 1.
- Productos: un switch más en el form.
- Performance: menos filas + menos adjuntos por request en catálogos grandes.

### Setup shadcn / Tailwind / TS

**No hace falta** `npx shadcn@latest init`: el proyecto ya tiene Next + Tailwind + TypeScript y primitives en `app/components/ui/`. El path canónico es `app/components/ui/` (no `/components/ui` en la raíz del monorepo). Ahí vive el DS; no crear otra carpeta `components/ui` en la raíz del repo.

---

## Lista de Validación

- [x] Migración creada (`20260825000003_catalogo_destacados.sql`) — aplicar en Supabase
- [x] Se puede destacar ≤12 productos; el 13ro muestra error claro
- [x] Quitar “visible en catálogo” apaga destacado
- [x] Coverflow con placeholder si no hay imagen
- [x] Click lleva a ficha del producto
- [x] Grilla pagina de a 20; filtros por URL
- [x] Chips categoría + búsqueda funcionan con URL
- [x] Sin clases shadcn rotas (`muted`, `animate-in`)
- [x] Sin demo Unsplash/R2 en prod
- [x] `npm run build` OK
- [x] PrintBridge / POS no tocados

---

## Criterios de Éxito

1. Un owner marca 3–8 productos y el cliente ve el coverflow al abrir el link.
2. Con 100+ productos en catálogo, la home no descarga todos los packs/tramos de una.
3. El carrusel se siente nativo al DS v2 (tokens, radios, tipografía).
4. Marcar destacados es obvio desde el formulario de producto.

---

## Notas

- Relacionado: chips de categoría + softTrim marca/presentación (sesión reciente).
- Fase 2 posible: orden drag-and-drop de destacados; autoplay coverflow; excluir destacados de la grilla.
- El snippet original mide ancho de card y pinta transforms en DOM (raf) — mantener esa estrategia; no reescribir a Framer.
- `lucide-react` ya está: no agregar dependencia nueva salvo que el lockfile local no lo tenga (verificar en implementar).

---

## Implementación

Tras OK: `/implementar planes/2026-08-25-catalogo-destacados-coverflow.md`

---

## Notas de Implementación

**Implementado:** 2026-08-25

### Resumen

- Columna `destacado_en_catalogo` + tope 12 en actions/form/listado.
- `CoverflowCarousel` (DS v2) + `CatalogoDestacados` en home `/c/[slug]`.
- Grilla paginada (20) con `?q=&categoria=&page=` server-side; queries de categorías/destacados separadas.

### Desviaciones del Plan

- Ninguna relevante (defaults: destacados también en grilla; tope 12; pageSize 20).
- En listado de productos hay dos switches (visible + destacado) en la misma columna.

### Problemas Encontrados

- Ninguno. Falta aplicar la migración en Supabase para prod/local.
