# Plan: Optimización de consumo y rendimiento a escala (100 tenants, multi-rubro)

**Creado:** 2026-08-29
**Estado:** Implementado
**Pedido:** Optimización de consumo en profundidad sin romper el sistema, pensada para cualquier rubro y hasta ~100 clientes (tenants) en la plataforma.

---

## Descripción General

### Qué Logra Este Plan

Reduce el consumo de Supabase (CPU/IO/egress), Vercel (invocaciones y duración de funciones) y la latencia percibida en los caminos calientes (shell del dashboard, POS, catálogo público, listados), **sin cambiar reglas de cobro, stock, cuenta corriente, remitos ni impresión**. El resultado es el mismo producto, más barato de operar y más rápido cuando hay muchos productos (ropa) o muchos SKUs (despensa/ferretería).

### Por Qué Importa

CValleTienda es un SaaS multi-tenant: 100 tiendas × 1–3 usuarios concurrentes + catálogos públicos. Hoy varias consultas se ejecutan **en cada navegación** y algunas bajan filas enteras a Node para agregar en JS. Eso escala linealmente con tickets del turno y con el tamaño del catálogo. El diferencial comercial (“completo, adaptable al rubro, operacional desde el día uno”) se rompe si la caja se siente lenta o la factura de infra se come el margen de $45.000/mes. Este plan ataca consumo real medible, no un rewrite.

---

## Estado Actual

### Hipótesis de carga (objetivo de diseño)

| Dimensión | Hipótesis conservadora a 100 tenants |
| --------- | ------------------------------------- |
| Tenants | 100 tiendas, mix de 10 rubros |
| Usuarios concurrentes pico | ~200–300 (caja + owner + catálogo) |
| Tenant “ropa” | 200–2.000 productos × 8–40 variantes (talla×color) |
| Tenant “despensa / ferretería” | 2.000–8.000 SKUs, 1 variante |
| Tenant “distribuidora” | menos SKUs, más CC / remitos / pedidos |
| Tickets/día (despensa) | 150–300 por caja |
| Tablas que más crecen | `ventas`, `detalles_venta`, `movimientos_stock`, `movimientos_fondos`, `variantes_producto` |

A esta escala **no hace falta particionar**. Sí hace falta: menos round-trips por request, RLS que no evalúe `get_tienda_id()` por fila, índices para `ILIKE`, y no bajar el turno entero a Node.

### Estructura Existente Relevante

| Pieza | Rol hoy |
| ----- | ------- |
| `app/lib/supabase/server.ts` | Cliente SSR. **Todas** las fetches van con `cache: 'no-store'` (correcto para datos autenticados; anula ISR). **No** está envuelto en `React.cache`. |
| `app/lib/supabase/context.ts` | `getContextoTienda` sí usa `React.cache`, pero el layout y casi todos los `getCtx()` locales **no lo usan**. |
| `app/app/(dashboard)/layout.tsx` | En **cada** navegación: `getUser` + `perfiles.select('*')` + `tiendas` + `obtenerSesionAbiertaLite()`. |
| `app/components/layout/AvisoCajaCerrada.tsx` | Llama **otra vez** a `obtenerSesionAbiertaLite()` (mismo request). |
| `app/lib/caja/queries.ts` → `obtenerSesionAbiertaLite` | Trae **todas** las ventas del turno (`select total` sin límite) y suma en JS. El layout solo necesita un boolean. El dashboard sí necesita totales. |
| `app/lib/pos/queries.ts` | `listarProductosPOS(100)`: productos + **todas** las variantes + tramos + packs. `buscarVariantes`: 6–10 round-trips secuenciales por tecla (debounce 250 ms / 0 ms si parece código). |
| `app/proxy.ts` + `lib/supabase/middleware.ts` | Auth JWT en casi toda navegación. Extra: `perfiles.rol` en rutas solo-admin. Matcher ya excluye `/api` y estáticos. |
| `app/lib/dashboard/queries.ts` | KPIs vía RPC (`get_dashboard_inicio` / `ganancia` / `tops`) — **bien**. `React.cache` local. |
| `app/lib/catalogo/queries-publico.ts` | Service role (bypassa RLS). Grilla paginada (20). `listarCategoriasCatalogoPublico` baja **todos** los productos visibles para deduplicar categorías. `obtenerTiendaCatalogoPorSlug` no se comparte con `generateMetadata`. |
| `app/lib/productos/queries.ts` | Listado pagina 20, pero anida **todas** las variantes de cada producto (ropa: explosión de filas). |
| `supabase/migrations/20260419000002_perfiles.sql` | `get_tienda_id()` es `STABLE SECURITY DEFINER`. Políticas: `tienda_id = public.get_tienda_id()` **sin** `(select …)` — el planner puede evaluar por fila. |
| Índices | Buenos en FKs y `tienda_id`. **No hay `pg_trgm`**. Búsquedas POS/stock/catálogo son `ILIKE '%q%'`. |
| Fotos | Upload ya redimensiona a ~280 KB (`lib/productos/imagen-const.ts`). Catálogo/POS suelen usar `<img>` crudo, no `next/image`. |
| Realtime | Un canal `notificaciones:{tiendaId}` + poll fallback 60 s. Aceptable a 100 tenants. |
| Cajero hablado | Rate limit 30/min. Fuera de alcance salvo no empeorarlo. |
| Plan POS offline | `planes/2026-08-29-pos-offline-pwa.md` — **otro objetivo**. No mezclar. |

### Brechas o Problemas que se Abordan

1. **Shell caro:** cada click del menú dispara auth + perfil `*` + tienda + **todas las ventas del turno** (y a veces dos veces). En una despensa a las 19:00 eso son cientos de filas por navegación a Stock/Clientes/etc.
2. **`getCtx()` copiado ~12 veces:** cada query module hace `getUser` + `perfiles` otra vez. `getContextoTienda` existe y casi no se usa en queries.
3. **RLS a escala:** `get_tienda_id()` lee `perfiles` vía `auth.uid()` en políticas `FOR ALL`. Sin wrap `(select …)` el costo de RLS crece con el tamaño de `ventas` / `variantes_producto` **de toda la plataforma**.
4. **POS: N round-trips por búsqueda.** Scanner (delay 0) y tipeo (250 ms) pegan 3 lookups exactos en serie y después ILIKE sin trigram. En ferretería/despensa el catálogo grande hace seq scan + RLS.
5. **Grilla POS de 100 productos** hidrata tramos + packs + kits aunque el cajero solo mira tapas. En ropa, 100 × N variantes es payload grande en cada `router.refresh()` post-venta.
6. **Catálogo público:** doble fetch de tienda (metadata + page); categorías = scan completo; sin cache de lectura aunque es público y el stock puede tolerar 15–30 s de stale.
7. **Listados:** `select('*')` en taxonomías y algunos módulos; `listarProductos` anida variantes solo para `stock_total` / `variantes_count`.
8. **Sin presupuesto de búsqueda full-text:** no hay `pg_trgm` ni RPC de búsqueda POS. El plan no introduce Elastic ni Redis.

No se aborda (a propósito): particionado, cambio de modelo de stock/CC, quitar RLS, cachear POS autenticado en CDN (stock stale = venta incorrecta), ni el plan offline.

---

## Cambios Propuestos

### Resumen de Cambios

- **Fase A (cero riesgo de negocio):** unificar contexto de auth por request; layout/aviso de caja = `EXISTS`; totales de turno = `SUM` en SQL; columnas mínimas.
- **Fase B (migración aditiva):** wrap RLS `(select get_tienda_id())`; `pg_trgm` en nombre/código; índices parciales de catálogo y bajo-stock.
- **Fase C (POS, mismo contrato):** paralelizar lookups exactos; no hidratar tramos/packs en la grilla hasta el alta al carrito **si** el click de grilla ya carga variante completa (ver decisión); RPC opcional de búsqueda si A+B no alcanza.
- **Fase D (catálogo público):** cachear lookup de tienda; categorías con `DISTINCT`; `revalidate` corto; `next/image` en tapas.
- **Fase E (listados):** stock_total por RPC/agregado; `select` explícito; no anidar todas las variantes en el listado de productos.
- **Observabilidad:** guía de qué mirar en Supabase (Query Performance) + logs de timing en dev detrás de flag. Sin APM nuevo.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | -------- |
| `supabase/migrations/20260829000002_rls_select_wrap_y_trgm.sql` | Wrap de políticas de aislamiento + `pg_trgm` + índices de búsqueda/catálogo/bajo-stock. **Solo ADD / REPLACE policy**. |
| `supabase/migrations/20260829000003_sesion_caja_totales_rpc.sql` | RPC `totales_sesion_caja(p_sesion_id)` → `{monto, cantidad}` con `SUM`/`COUNT`. Opcional si PostgREST aggregate alcanza; preferir RPC por claridad y RLS. |
| `app/lib/supabase/require-ctx.ts` | `requireAuthCtx()` = `cache()`: `{ supabase, userId, tiendaId, rol }`. Único `getUser`+perfil por request. |
| `referencia/rendimiento-escala.md` | Convención: no `select *` en listados, no bajar agregados a JS, cuándo cachear (solo público). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/supabase/server.ts` | Envolver `createClient` en `React.cache`. **Mantener** `cache: 'no-store'` en el fetch autenticado. |
| `app/lib/supabase/context.ts` | Reusar `requireAuthCtx()`; no repetir `getUser`/`perfiles`. |
| `app/app/(dashboard)/layout.tsx` | `perfiles`: solo `id, tienda_id, nombre, apellido, rol`. Caja: `existeSesionCajaAbierta()` (boolean). Usar `getContextoTienda` para no duplicar tienda. |
| `app/components/layout/AvisoCajaCerrada.tsx` | Usar `existeSesionCajaAbierta()` (misma función cacheada). |
| `app/lib/caja/queries.ts` | `existeSesionCajaAbierta` (select `id` `.limit(1)`). `obtenerSesionAbiertaLite` / `obtenerSesionAbierta`: **no** traer todas las ventas; `SUM`/`COUNT` SQL o RPC. Envolver `getCtx` con `requireAuthCtx`. |
| `app/lib/pos/queries.ts` | `getCtx` → `requireAuthCtx` + rubro. `buscarVariantes`: lookups exactos en `Promise.all`. Grilla: ver decisión POS. |
| `app/app/(dashboard)/pos/page.tsx` | Dejar de reconsultar perfil/tienda; nombre desde `getContextoTienda`. |
| `app/lib/{stock,ventas,devoluciones,clientes,remitos,precios,cc}/queries.ts` | Reemplazar `getCtx` local por `requireAuthCtx`. |
| `app/lib/catalogo/queries-publico.ts` | `React.cache` en `obtenerTiendaCatalogoPorSlug`. Devolver `rubro`. Categorías: query distinct, no scan. |
| `app/app/(catalogo)/c/[slug]/page.tsx` | Usar `rubro` del DTO. `export const revalidate = 30` **solo si** no rompe pedidos (searchParams hacen la ruta dinámica: usar `unstable_cache` / `cacheTag` por slug en las queries, no ISR ciego con `q=`). |
| Componentes catálogo con tapa | `next/image` con `sizes` + `quality` (tapas 1200 px ya en storage). |
| `app/lib/productos/queries.ts` | Listado: no anidar todas las variantes; agregado `stock_total` / `variantes_count` (RPC chica o segunda query agrupada). |
| `CLAUDE.md` | 4–6 líneas: convención de rendimiento + puntero a `referencia/rendimiento-escala.md`. |
| `contexto/proyectos.md` | Ítem de proyecto “optimización consumo escala”. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **No romper contratos de negocio:** mismas reglas de stock infinito por rubro, tramos, packs, CC, remito auto, tickets. Si un cambio exige alterar `registrarVenta`, se recorta del alcance.
2. **No cachear datos autenticados en CDN/ISR:** `no-store` se queda en el cliente SSR. El stock y los precios en caja deben ser frescos. Cache solo en **catálogo público** (lectura, opt-in, 15–30 s).
3. **Fases independientes y revertibles:** A no requiere migración. B es aditiva. C/D/E se pueden pausar. Cada fase deja el sistema usable.
4. **Optimizar para el peor rubro, no para un promedio:** ropa (muchas variantes por producto) y despensa (muchos SKUs / muchos tickets). Nada específico de un solo rubro en SQL salvo índices parciales que ya existen (`activo`, `visible_en_catalogo`).
5. **RLS wrap, no quitar RLS:** el aislamiento multi-tenant es el producto. El wrap `(select get_tienda_id())` es el patrón oficial Supabase y no cambia semántica.
6. **Agregar en SQL, no en Node:** cualquier `select col` de una tabla de hechos para `reduce()` es un bug de consumo (caso actual: ventas del turno).
7. **Un `requireAuthCtx` por request:** deja de haber 12 copias de `getUser`+`perfiles`. No se pasa el cliente de Supabase al browser.
8. **POS grilla vs búsqueda:** la búsqueda/scanner es el camino de caja. La grilla es atajo visual. Priorizar round-trips de `buscarVariantes`. La grilla puede seguir limit 100; no subir el límite “por si acaso”.
9. **Fuera de alcance vs plan offline:** IndexedDB / SW no entran. Si más adelante el snapshot offline hidrata el POS, igual conviene que el server sea barato (este plan).
10. **Sin Redis / queues / partición:** overkill a 100 tenants. Reevaluar a 500+ o si `detalles_venta` supera decenas de millones.

### Alternativas Consideradas

| Enfoque | Por qué no (ahora) |
| ------- | ------------------ |
| Cachear layout dashboard 30 s | Badge de caja y plan/acceso pueden quedar stale; riesgo de “caja abierta” falso. |
| Quitar `no-store` global | Next podría cachear PostgREST de un tenant y servir a otro en edge cases. No. |
| Full-text `tsvector` | Mejor para frases; el POS busca EAN + prefijo de nombre. Trigram cubre `ILIKE %q%` con menos cambio de app. |
| RPC gigante que devuelve el POS entero | Choca con el plan offline y con el límite 100. Primero recortar round-trips. |
| Particionar `ventas` por mes | Complejidad de RLS/FKs injustificada < ~10M filas. |
| `select *` → GraphQL | No hay capa GraphQL; recortar columnas en PostgREST alcanza. |

### Preguntas Abiertas (si las hay)

1. **Alcance de implementación:** ¿ejecutar A+B de una vez (recomendado) y dejar C/D/E como follow-up, o el plan completo en un solo `/implementar`?
2. **POS grilla:** al tocar un producto de la grilla, ¿aceptamos un fetch extra de tramos/packs de ese producto (más barato en ropa grande) o preferimos seguir mandando tramos de los 100 en el RSC inicial (cero cambio UX, menos ahorro)?
3. **Catálogo stale 30 s:** ¿aceptable que un producto marcado “sin stock” siga visible hasta 30 s en `/c/[slug]`? (El pedido WhatsApp no descuenta hasta confirmar en inbox.)
4. **Supabase plan (Pro vs Team) y región:** no cambia el código; sí el techo de conexiones. Confirmar que el pooler (puerto 6543 / transaction mode) es el que usa el dashboard. El app usa **PostgREST HTTP**, no `pg` directo: el cuello es CPU de queries + egress, no `max_connections` de Node.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden. Cada fase termina con checklist de humo (POS cobro, stock, catálogo, login cajero).

### Paso 1: Convención y helper de contexto (Fase A)

Crear `app/lib/supabase/require-ctx.ts`:

```ts
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const requireAuthCtx = cache(async () => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return {
    supabase,
    userId: auth.user.id,
    tiendaId: perfil.tienda_id as string,
    rol: perfil.rol as string,
  }
})
```

Envolver `createClient` en `cache()` en `server.ts` (un cookie store / un client por request).

**Acciones:**

- Implementar `requireAuthCtx`.
- `getContextoTienda` llama a `requireAuthCtx` y luego `tiendas` (una vez).
- Reemplazar `getCtx` locales en queries listadas. **No** cambiar signatures públicas de las funciones de listado.

**Archivos afectados:**

- `app/lib/supabase/require-ctx.ts` (nuevo)
- `app/lib/supabase/server.ts`
- `app/lib/supabase/context.ts`
- `app/lib/caja/queries.ts`, `pos/queries.ts`, `stock/queries.ts`, `ventas/queries.ts`, `devoluciones/queries.ts`, `clientes/queries.ts`, `remitos/queries.ts`, `precios/queries.ts`, `cc/queries.ts`, `dashboard/queries.ts` (`getCtx` interno)

### Paso 2: Caja en el shell — boolean vs totales (Fase A)

Hoy `layout` y `AvisoCajaCerrada` solo necesitan “¿hay sesión abierta?”. `obtenerSesionAbiertaLite` baja **todas** las ventas del turno.

**Acciones:**

- Agregar `existeSesionCajaAbierta()`: `sesiones_caja` `select id` `eq estado abierta` `maybeSingle`, **sin** join a ventas. `React.cache`.
- Layout + Aviso usan esa función.
- `obtenerSesionAbiertaLite`: sesión + RPC/agregado `SUM(total), COUNT(*)` filtrando `estado = completada` y `sesion_caja_id`. **Prohibido** `.select('total')` sin límite.
- `obtenerSesionAbierta` (página POS / caja): mismo criterio para el bloque de totales; no traer array de ventas si solo se necesita suma.

Si PostgREST no permite el aggregate limpio, migración `totales_sesion_caja`:

```sql
create or replace function public.totales_sesion_caja(p_sesion_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'monto', coalesce(sum(total), 0),
    'cantidad', count(*)::int
  )
  from public.ventas
  where sesion_caja_id = p_sesion_id
    and estado = 'completada'
    and tienda_id = (select public.get_tienda_id());
$$;
```

**Archivos afectados:**

- `app/lib/caja/queries.ts`
- `app/app/(dashboard)/layout.tsx`
- `app/components/layout/AvisoCajaCerrada.tsx`
- `supabase/migrations/20260829000003_sesion_caja_totales_rpc.sql` (si hace falta)

### Paso 3: Layout — columnas mínimas (Fase A)

**Acciones:**

- `perfiles.select('id, tienda_id, nombre, apellido, rol')` (lo que `AppShell` realmente usa). Verificar props de `AppShell` / `Header` antes de recortar.
- Reusar `getContextoTienda()` + `existeSesionCajaAbierta()` en paralelo (`Promise.all`) en el layout. Evitar `tiendas` duplicado.
- `pos/page.tsx`: nombre de tienda desde contexto, no el IIFE de 4 queries.

**Archivos afectados:**

- `app/app/(dashboard)/layout.tsx`
- `app/app/(dashboard)/pos/page.tsx`
- `app/components/layout/AppShell.tsx` (solo si el tipo de `perfil` se estrecha)

### Paso 4: Migración RLS wrap + trigram (Fase B)

**Principio:** semántica idéntica. Solo cambiar `public.get_tienda_id()` por `(select public.get_tienda_id())` y `auth.uid()` por `(select auth.uid())` en `USING` / `WITH CHECK`.

**Acciones:**

1. Actualizar helpers:

```sql
create or replace function public.get_tienda_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tienda_id from public.perfiles where id = (select auth.uid())
$$;
```

Igual para `get_rol()`.

2. Recrear políticas de aislamiento tenant. Inventario (verificar en `pg_policies` al implementar; no omitir tablas nuevas post-agosto):

   - `categorias`, `tallas`, `colores`, `productos`, `variantes_producto`
   - `clientes`, `ventas`, `detalles_venta`, `pagos_venta`
   - `movimientos_stock`, `sesiones_caja`, `cierres_caja`, `cierres_caja_detalle`
   - `cuentas_fondos`, `movimientos_fondos`, `metodos_pago`
   - `devoluciones` (+ tablas hijas)
   - `configuracion_tienda`, `configuracion_etiquetas`
   - `producto_packs`, `producto_pack_tramos`, `producto_tramos_cantidad`
   - `pedidos_catalogo` / ítems / `notificaciones` (nombres reales en migraciones 20260819+)
   - `kit_componentes`, bundles, historial de precios, etc.

   Políticas **con predicados extra** (rol owner/admin, `id = auth.uid()`, etc.) se reescriben **copiando el predicado exacto** y solo wrappeando las llamadas a función.

3. Extensión e índices (concurrentes no aplican dentro de transacción de migración Supabase; índices normales OK):

```sql
create extension if not exists pg_trgm;

create index if not exists productos_nombre_trgm_idx
  on public.productos using gin (nombre gin_trgm_ops);

create index if not exists productos_codigo_base_trgm_idx
  on public.productos using gin (codigo_base gin_trgm_ops)
  where codigo_base is not null;

create index if not exists variantes_codigo_barras_trgm_idx
  on public.variantes_producto using gin (codigo_barras gin_trgm_ops)
  where codigo_barras is not null;

-- Catálogo público (service role igual se beneficia)
create index if not exists productos_catalogo_visible_idx
  on public.productos (tienda_id, categoria_id)
  where visible_en_catalogo = true and activo = true;

-- Bajo stock (comparación ya en RPC)
create index if not exists variantes_bajo_stock_idx
  on public.variantes_producto (tienda_id)
  where activo = true and stock_minimo > 0 and stock_actual <> -1;
```

4. **No** tocar policies de Storage ni `tiendas` (el catálogo público usa admin).

**Validación SQL:** en un tenant de prueba, `explain (analyze, buffers)` de `buscarVariantes` ILIKE y de `listar_stock_bajo_ids`.

**Archivos afectados:**

- `supabase/migrations/20260829000002_rls_select_wrap_y_trgm.sql`

### Paso 5: POS — recortar round-trips (Fase C)

**Acciones (obligatorias, bajo riesgo):**

- En `buscarVariantes`, los 3 lookups exactos (unidad, `producto_packs.codigo_barras`, `pack_codigo_barras`) en **`Promise.all`**. Cortocircuitar si alguno matchea (misma prioridad actual: unidad → pack producto → pack legado).
- Seguir filtrando stock con `filtroStockConStock` / infinito por rubro. No cambiar `esStockVendible`.
- `adjuntarTramos` + `expandirEntradasPack` **después** del slice a `limit`, no sobre el merge completo (hoy ya se acerca; verificar que kits no disparen queries extra innecesarias).

**Acciones (grilla — depende de pregunta abierta 2):**

- **Opción recomendada (si se aprueba fetch al click):** `listarProductosPOS` deja de llamar `adjuntarTramos` / `expandirEntradasPack` / `computarStockKits` para la grilla. Al elegir variante en UI, si `tramos` está vacío, llamar action `hidratarVariantePos(id)` (una variante). Scanner/búsqueda siguen hidratando completo.
- **Opción conservadora:** no tocar hidratación de grilla; solo Paso 5 lookups + Fase A/B.

**No hacer en este plan:** RPC `buscar_variantes_pos` (reservar si A+B+C lookups no bajan latencia). Si se hace después: un round-trip, `limit`, mismos filtros de stock, tests de EAN/pack/kit.

**Archivos afectados:**

- `app/lib/pos/queries.ts`
- `app/app/actions/ventas.ts` (`buscarVariantesAction` sin cambio de contrato)
- `app/components/pos/POSContainer.tsx` (solo si opción fetch-al-click)

### Paso 6: Catálogo público (Fase D)

**Acciones:**

- `obtenerTiendaCatalogoPorSlug` envuelto en `cache()` (mismo request: metadata + page).
- Incluir `rubro` en `TiendaCatalogoInterna`; borrar `obtenerRubroTiendaId` extra en la page.
- `listarCategoriasCatalogoPublico`: no traer todos los productos. Query a `categorias` con filtro de existencia, o RPC:

```sql
select c.id, c.nombre
from public.categorias c
where c.tienda_id = p_tienda
  and exists (
    select 1 from public.productos p
    where p.categoria_id = c.id
      and p.activo
      and p.visible_en_catalogo
      and not p.es_kit and not p.es_bundle
  );
```

- Cache de lectura: `unstable_cache` / `cacheLife` 30 s con tag `catalogo:{tiendaId}`. Invalidar en actions que cambian `visible_en_catalogo`, stock, precios, packs, `catalogo_activo` (`revalidateTag`). **No** cachear el POST de pedido.
- Tapas: `next/image` en `CatalogoFicha`, `CatalogoDestacados`/coverflow, cards de grilla. `sizes` acorde al layout. Remitos imprimibles: **no tocar** (regla design system).
- Rate limit in-memory (`lib/catalogo/rate-limit.ts`) sigue; a 100 tenants en serverless es best-effort (documentar). No migrar a Upstash en este plan.

**Archivos afectados:**

- `app/lib/catalogo/queries-publico.ts`
- `app/app/(catalogo)/c/[slug]/page.tsx` (+ ficha si existe)
- `app/components/catalogo-publico/*` (imágenes)
- Actions de catálogo/productos/stock que deban `revalidateTag`

### Paso 7: Listados dashboard (Fase E)

**Acciones:**

- `listarProductos`: reemplazar embed de todas las variantes por agregado. RPC sugerida `productos_listado_agregados(p_ids uuid[])` → `producto_id, stock_total, variantes_count, pack_info`. O: una query a `variantes_producto` `.in('producto_id', ids)` agrupando en JS **solo de la página actual** (20 ids), no del catálogo entero.
- `categorias` / `tallas` / `colores` pages: `select` de columnas usadas, no `*`.
- `clientes` y otros `select('*')` de detalle: recortar en **listados**; el detalle de ficha puede seguir amplio.
- Dashboard Inicio: no cambiar RPCs salvo que `EXPLAIN` muestre seq scan (Fase B índices deberían bastar).

**Archivos afectados:**

- `app/lib/productos/queries.ts`
- Pages de taxonomías
- `app/lib/clientes/queries.ts` (listado)

### Paso 8: Documentación y consistencia

**Acciones:**

- Escribir `referencia/rendimiento-escala.md`: carga objetivo, qué no cachear, wrap RLS, “agregar en SQL”, cómo validar en Supabase Dashboard → Query Performance.
- `CLAUDE.md`: párrafo corto + link.
- `contexto/proyectos.md`: línea en desarrollo.

**Archivos afectados:**

- `referencia/rendimiento-escala.md`
- `CLAUDE.md`
- `contexto/proyectos.md`

### Paso 9: Validación de humo (todas las fases)

Correr a mano (o Playwright si el entorno lo permite) **después de cada fase**:

- Login owner y cajero; cajero no entra a `/productos`.
- `/pos`: scanner EAN, búsqueda por nombre, pack xN, kit (si hay), cobro contado, stock infinito (despensa) si hay fixture.
- `/stock` paginado + filtro bajo stock.
- `/c/{slug}`: grilla, destacados, ficha, agregar al pedido.
- Distribuidora (si hay tenant): pedido a cuenta + remito (no cambiar lógica; solo que no 500).
- Impresión: no tocar `print.css` / PrintBridge.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- Todo el dashboard (`layout.tsx` es el multiplicador).
- POS: `POSContainer`, `BuscadorVariantes`, `buscarVariantesAction`.
- Catálogo: `queries-publico.ts`, inbox `/pedidos`.
- RPCs dashboard y `listar_stock_bajo_ids` (no reescribir; se benefician de índices).
- Plan `planes/2026-08-29-pos-offline-pwa.md`: comparte `listarProductosPOS` / snapshot. Coordinar: si offline se implementa después, `obtenerSnapshotPos` debe usar las mismas queries baratas, no reintroducir `select total` de todo el turno.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` (convención).
- `contexto/proyectos.md`.
- `referencia/rendimiento-escala.md` (nuevo).

### Impacto en Flujos de Trabajo Existentes

- **Usuarios:** deberían notar POS y menú más rápidos; misma UX salvo que se apruebe fetch de tramos al click en grilla.
- **Deploy:** aplicar migraciones B **antes** de asumir que ILIKE es barato. Rollback de políticas: guardar el SQL `pg_policies` previo en el mismo archivo de migración como comentario.
- **Costo:** menos rows de `ventas` por navegación (el win más grande en tiendas ocupadas); menos CPU RLS; menos egress de catálogo si hay `next/image`.
- **Cajero hablado / MercadoPago / AFIP:** sin cambios.

---

## Lista de Validación

- [ ] `createClient` y `requireAuthCtx` cacheados; no hay `getCtx` duplicado en modules de queries
- [ ] Layout + AvisoCajaCerrada no leen la tabla `ventas`
- [ ] `obtenerSesionAbiertaLite` no materializa N filas de ventas
- [ ] Políticas RLS de aislamiento usan `(select public.get_tienda_id())`
- [ ] `pg_trgm` + índices creados; búsqueda POS por nombre no hace seq scan en catálogo grande (EXPLAIN)
- [ ] `buscarVariantes` lookups exactos en paralelo; contrato `VarianteResultado` igual
- [ ] Catálogo: un fetch de tienda por request; categorías sin scan completo
- [ ] Listado productos: no embebe todas las variantes de cada ítem
- [ ] Humo: POS cobro, stock, catálogo, cajero vs owner
- [ ] No se modificó markup de impresión ni PrintBridge
- [ ] `CLAUDE.md` + `referencia/rendimiento-escala.md` + `contexto/proyectos.md`
- [ ] Plan POS offline no quedó contradicho (sigue siendo capa aparte)

---

## Criterios de Éxito

1. **Navegación dashboard:** 0 lecturas de `ventas` en layout/aviso. Totales de turno en Inicio/Caja = 1 agregado SQL.
2. **Auth por request:** como máximo un `getUser` + un `perfiles` (más `tiendas` si hace falta nombre/plan).
3. **Búsqueda POS:** match EAN exacto sigue siendo 1–2 queries (no 6 en serie); ILIKE usa índice GIN en tenant con miles de productos.
4. **Catálogo `/c/{slug}`:** categorías O(categorías), no O(productos visibles); tapas no descargan 1200 px en un thumb de 160 px si se aprueba `next/image`.
5. **Regresión funcional:** cobro, descuento por tramo/pack, stock ∞, CC/remito, RLS (un tenant no ve al otro) — iguales que antes.
6. **100 tenants:** el diseño no introduce trabajo O(todos los tenants) en una query (todo filtrado por `tienda_id` + índice).

---

## Notas

- **Medición:** sin producción real (`contexto/datos-actuales.md` = 0 tenants). Validar con un tenant seed grande (ropa 500×20 variantes **o** 5.000 SKUs) en staging, no solo con 20 productos de demo.
- **Supabase Query Performance:** post-deploy, ordenar por `total_time` / `calls`. Candidatos esperables hoy: `ventas` por `sesion_caja_id`, `get_tienda_id` en policies, `ILIKE` productos, `listar_stock_bajo_ids` (hace `count(*)` + select; el índice parcial ayuda).
- **Vercel:** menos trabajo por RSC = menos GB-s. No hace falta cambiar tamaño de función.
- **Realtime a 100 × 2 usuarios:** 200 canales postgres_changes es razonable en Pro. Si duele, pasar la campana a poll 60 s only; no es el primer palanca.
- **Fotos:** el upload ya comprime. El gasto es **cuántas** tapas se piden por página (grilla POS 100, catálogo 20 + destacados).
- **No mezclar con `/implementar` del plan offline** el mismo día: conflicto en `pos/queries.ts` y `pos/page.tsx`.
- Si en el futuro hay 500+ tenants o reportes históricos de años, entonces sí: partición de `ventas`/`movimientos_*` y retención. No ahora.

---

## Notas de Implementación

**Implementado:** 2026-08-29

### Resumen

Fases A–E del plan aplicadas en código: `requireAuthCtx` + `createClient` cacheados; layout/aviso de caja sin leer ventas; totales de turno vía RPC; migraciones RLS/trigram y RPC totales; POS con lookups exactos en paralelo (grilla conservadora); catálogo con `React.cache`/`unstable_cache`, categorías por join, `next/image`, `invalidarCacheCatalogo`; listado productos con agregado de variantes por página; taxonomías con select explícito; docs en `referencia/rendimiento-escala.md`.

### Desviaciones del Plan

- Grilla POS: opción conservadora (sin fetch extra al click); no se recortó hidratación tramos/packs en `listarProductosPOS`.
- `obtenerSesionAbiertaLite` en dashboard de caja sigue usando RPC de totales (no materializa filas de ventas).
- `queries-sesion-dia.ts`: solo migrado a `requireAuthCtx`; agregación de ventas del día sin RPC (fuera del alcance del shell).

### Problemas Encontrados

- Ninguno en typecheck local. **Pendiente en entorno:** aplicar migraciones `20260829000002` y `20260829000003` en Supabase y validación de humo manual.
