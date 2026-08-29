# Rendimiento y consumo a escala

Convenciones para mantener CValleTienda barato de operar (~100 tenants, multi-rubro).

## Auth por request

- Usar `requireAuthCtx()` (`app/lib/supabase/require-ctx.ts`) en queries del dashboard. Un solo `getUser` + `perfiles` por request.
- `createClient()` está envuelto en `React.cache()`; mantener `cache: 'no-store'` en datos autenticados.

## Agregar en SQL, no en Node

- No bajar filas de hechos (`ventas`, `detalles_venta`, …) para sumar en JS.
- Layout/aviso de caja: `existeSesionCajaAbierta()` (boolean). Totales: RPC `totales_sesion_caja` o agregados PostgREST.
- Listados: `stock_total` / `variantes_count` con segunda query agrupada por `producto_id` (solo IDs de la página), no embed de todas las variantes.

## Select explícito

- Evitar `select('*')` en listados y taxonomías. Detalle de ficha puede ser más amplio.
- Columnas mínimas en shell (`layout.tsx`): perfil `id, tienda_id, nombre, apellido, rol`.

## RLS

- Políticas de aislamiento: `(select public.get_tienda_id())`, no `get_tienda_id()` sin wrap.
- Migración: `supabase/migrations/20260829000002_rls_select_wrap_y_trgm.sql`.

## Búsqueda

- `pg_trgm` + índices GIN en `productos.nombre`, códigos de barras, catálogo visible.
- POS: lookups exactos (EAN, pack) en `Promise.all` antes de ILIKE.

## Cache (solo lectura pública)

- Catálogo `/c/[slug]`: `unstable_cache` + tag `catalogo:{tiendaId}`, revalidate 30 s.
- Invalidar con `invalidarCacheCatalogo(tiendaId)` (`updateTag`) al cambiar visibilidad, precios, stock o config de catálogo.
- **No** cachear POS, stock autenticado ni layout del dashboard en CDN/ISR.

## Imágenes

- Tapas del catálogo público: `next/image` con `sizes` acordes al layout (grilla 4:5, ficha hero).

## Qué mirar post-deploy

- Supabase → Query Performance: `ventas` por sesión, `get_tienda_id`, ILIKE en productos.
- EXPLAIN en staging con tenant seed grande (ropa 500×20 variantes o 5k SKUs).
