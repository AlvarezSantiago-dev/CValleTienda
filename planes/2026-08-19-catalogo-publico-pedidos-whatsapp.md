# Plan: Catálogo público con pedidos por WhatsApp

**Creado:** 2026-08-19
**Estado:** Implementado
**Pedido:** Catálogo compartible por URL con el nombre del negocio; el cliente arma un pedido (retiro o envío), se notifica por WhatsApp al comercio, y el equipo gestiona esos pedidos hasta convertirlos en venta y remito.

---

## Descripción General

### Qué Logra Este Plan

Cada tienda obtiene un link público tipo `https://app.cvalletienda.com/c/boutique-luna` para mostrar productos con foto, precio y variantes. El cliente arma un carrito, elige retiro en local o envío a domicilio (con dirección) y confirma: el sistema **guarda el pedido** y abre WhatsApp al número que configuró el comercio, con el detalle listo para enviar. En el dashboard aparece un inbox de pedidos con campana de notificaciones; desde ahí se confirma, se marca listo/entregado y se **convierte a venta** (caja abierta + cobro) y, si es envío y el plan tiene remitos, a **remito** con la dirección del cliente.

### Por Qué Importa

CValleTienda hoy es 100 % mostrador: el cliente no ve el stock ni puede encargar sin ir al local o escribir a ciegas. Un catálogo con pedido por WhatsApp es el canal que ya usan las tiendas de Cinco Saltos / Río Negro (Instagram → WA), sin MercadoPago ni cuenta de cliente. Cierra el ciclo operativo: el pedido no queda en un chat suelto, entra al mismo sistema de ventas, caja, stock y remitos. Encaja con la oferta Pro única y con las fotos de producto recién implementadas.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Qué hay | Cómo se reutiliza |
| ---- | ------- | ----------------- |
| Fotos públicas | Bucket Storage `productos`, `productos.imagen_url`, `variantes_producto.imagen_url` | Miniaturas del catálogo (URLs públicas) |
| Tenant | `tiendas.nombre`, `telefono`, `direccion`, `logo_url`, `acceso_hasta`, `plan` / `trial_hasta` | Nombre y logo en vitrina; **no hay slug ni WhatsApp de pedidos** |
| Auth / middleware | `app/lib/supabase/middleware.ts` — rutas públicas: `/`, `/presentacion`, legales, auth | Hay que agregar `/c/*` o el catálogo redirige a `/login` |
| Layout público | `app/app/(public)/` usa header/footer de **landing CValle** | **No** usarlo para el catálogo (mezclaría marca SaaS con la tienda) |
| Productos RLS | `productos_tienda_isolation` = solo `get_tienda_id()` | Anon **no** puede listar productos. `precio_compra` no debe filtrarse nunca |
| Admin client | `app/lib/supabase/admin.ts` (`createAdminClient`) | Lectura/escritura pública **solo en server**, con columnas allowlist |
| Ventas | `registrarVenta` en `app/app/actions/ventas.ts` | Requiere **caja abierta** y, en contado, **al menos un pago**. Descuenta stock |
| Remitos | `crearRemito` / `crearRemitoDesdeVenta` en `app/app/actions/remitos.ts` | Feature Pro `remitos`. `crearRemitoDesdeVenta` **no** persiste `direccion_entrega` / `telefono_entrega` hoy |
| Clientes | `crearCliente` + búsqueda por teléfono en POS | No hay unique de teléfono; upsert = buscar exacto por tienda + teléfono, si no existe crear |
| POS cobro | `CobroPagoModal` | Reutilizar al convertir pedido → venta |
| Config | Tabs en `TabsConfiguracion.tsx`: Mi negocio / Ticket / Cobros / Equipo / Avanzado | Nueva pestaña **Catálogo**. `tiendas.nombre` y `direccion` casi no se editan (teléfono solo en onboarding) |
| Nav | `nav-config.ts`, `BottomNav.tsx`, `Header.tsx` | Header **sin campana**. Cajeros no entran a `/productos`, `/remitos`, `/configuracion` |
| Planes | `lib/planes/config.ts` — Pro vs Básico; venta comercial = solo Pro | Catálogo como feature Pro (trial incluido). Si `acceso` vencido → catálogo 404 |
| WhatsApp CValle | `pitch-content.ts` (`wa.me/549299…`) | Es el WA **de CValle**, no del tenant. No reutilizar ese número |

### Brechas o Problemas que se Abordan

- No existe vitrina anónima ni URL por nombre de negocio.
- No hay tabla de pedidos de clientes ni inbox.
- No hay notificaciones in-app.
- `tiendas.telefono` es genérico; el pedido WA necesita un número dedicado (formato `549…`).
- Abrir RLS anónimo en `productos` filtraría `precio_compra` (costo). Hay que leer por RPC o service role con allowlist.
- Un pedido por WhatsApp “suelto” no descuenta stock ni genera ticket/remito; hay que convertirlo de forma explícita.

---

## Cambios Propuestos

### Resumen de Cambios

- Columnas de catálogo en `tiendas` + tablas `pedidos_catalogo`, `pedido_catalogo_items`, `notificaciones`.
- Ruta pública `/c/[slug]` (vitrina + producto + carrito + checkout) **sin** chrome de dashboard ni landing.
- API pública `POST /api/catalogo/[slug]/pedido`: valida precios/stock en servidor, inserta pedido + notificación, devuelve `wa.me`.
- Configuración en `/configuracion/catalogo` (activar, slug, WhatsApp, retiro/envío, copiar link).
- Inbox `/pedidos` (cajeros incluidos) con estados y conversión a venta + remito.
- Campana en `Header` con conteo de no leídas (poll).
- Extender `crearRemitoDesdeVenta` para copiar dirección/teléfono del pedido.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260819000003_catalogo_publico_pedidos.sql` | Schema, índices, RLS tenant, **sin** policies anon en productos |
| `app/lib/catalogo/slug.ts` | `slugifyNombre`, reserved list, validación `[a-z0-9-]{3,48}` |
| `app/lib/catalogo/whatsapp.ts` | Normalizar dígitos AR (`549…`), armar texto y URL `wa.me` |
| `app/lib/catalogo/types.ts` | DTOs públicos (tienda vitrina, producto, variante, item carrito) — **sin** `precio_compra` |
| `app/lib/catalogo/queries-publico.ts` | Server-only: lookup slug via admin client, productos allowlist, `tieneAcceso` |
| `app/lib/catalogo/queries-interno.ts` | Listado/detalle pedidos, notificaciones (sesión tenant) |
| `app/lib/catalogo/const.ts` | Límites: 30 ítems, qty 20, notas 500, rate 8/10 min |
| `app/app/api/catalogo/[slug]/pedido/route.ts` | POST pedido público (honeypot + rate limit + insert) |
| `app/app/api/notificaciones/route.ts` | GET no leídas + PATCH marcar leídas (auth) |
| `app/app/actions/catalogo.ts` | Guardar config catálogo, cambiar estado pedido, convertir a venta |
| `app/app/(catalogo)/layout.tsx` | Layout mínimo (tokens, sin AppShell ni LandingHeader) |
| `app/app/(catalogo)/c/[slug]/page.tsx` | Grilla de productos |
| `app/app/(catalogo)/c/[slug]/p/[productoId]/page.tsx` | Ficha + selector variante |
| `app/app/(catalogo)/c/[slug]/carrito/page.tsx` | Carrito (client) |
| `app/app/(catalogo)/c/[slug]/checkout/page.tsx` | Checkout + redirect WA |
| `app/app/(catalogo)/c/[slug]/pedido-enviado/page.tsx` | Gracias + botón “abrir WhatsApp de nuevo” |
| `app/components/catalogo-publico/CatalogoHeader.tsx` | Logo, nombre, link carrito |
| `app/components/catalogo-publico/CatalogoGrilla.tsx` | Cards foto 4:5, precio, sin stock |
| `app/components/catalogo-publico/CatalogoFicha.tsx` | Variantes (talla/color), qty, agregar |
| `app/components/catalogo-publico/CatalogoCarrito.tsx` | localStorage por slug |
| `app/components/catalogo-publico/CatalogoCheckout.tsx` | Nombre, tel, retiro/envío, dirección, notas |
| `app/components/catalogo-publico/CatalogoPlaceholder.tsx` | Placeholder si no hay foto |
| `app/app/(dashboard)/configuracion/catalogo/page.tsx` | Página config |
| `app/components/configuracion/CatalogoForm.tsx` | Form activar/slug/WA/toggles + copiar URL |
| `app/app/(dashboard)/pedidos/page.tsx` | Lista pedidos |
| `app/app/(dashboard)/pedidos/[id]/page.tsx` | Detalle + acciones |
| `app/components/pedidos/TablaPedidos.tsx` | Tabla/filtros por estado |
| `app/components/pedidos/PedidoDetalle.tsx` | Ítems, cliente, entrega, timeline estados |
| `app/components/pedidos/ConvertirPedidoModal.tsx` | Cliente + `CobroPagoModal` + confirmar |
| `app/components/layout/NotificacionesBell.tsx` | Campana + dropdown |
| `referencia/catalogo-publico.md` | Cómo compartir el link, estados, conversión (1 página operativa) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/supabase/middleware.ts` | `pathname.startsWith('/c/')` en `isPublicRoute` |
| `app/types/database.ts` | Campos nuevos en `Tienda`; tipos `PedidoCatalogo`, `PedidoCatalogoItem`, `Notificacion` |
| `app/components/configuracion/TabsConfiguracion.tsx` | Tab `{ href: '/configuracion/catalogo', label: 'Catálogo' }` |
| `app/components/layout/nav-config.ts` | Ítem `/pedidos` en grupo Ventas, **sin** `soloRoles` (cajeros sí). `ROUTE_LABELS.pedidos`, `catalogo` |
| `app/components/layout/BottomNav.tsx` | Cajeros: reemplazar slot Precios por Pedidos |
| `app/components/layout/Header.tsx` | Montar `NotificacionesBell` |
| `app/lib/voz/comandos.ts` | Keywords `pedidos`, `pedido whatsapp` → `/pedidos` |
| `app/app/actions/remitos.ts` | `crearRemitoDesdeVenta`: aceptar y persistir `direccion_entrega`, `telefono_entrega` |
| `app/lib/planes/config.ts` | Feature `'catalogo_publico'` en Pro + `DESCRIPCION_FEATURE` |
| `app/app/actions/auth.ts` / registro | Tras crear tienda, setear `catalogo_slug` único desde `nombre` (inactivo hasta que configuren WA) |
| `CLAUDE.md` | Una línea: catálogo `/c/[slug]`, config, inbox `/pedidos` |
| `contexto/proyectos.md` | Mover “Catálogo público” de backlog a implementados (al cerrar `/implementar`) |
| `app/lib/productos/imagen-const.ts` | Sin cambio funcional; catálogo consume las mismas URLs |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **URL `/c/[slug]`**: Corta, compartible en Instagram/WhatsApp. El slug es kebab del nombre (`Boutique Luna` → `boutique-luna`), único global, editable. Prefijo `/c/` evita colisión con `/pos`, `/productos`, etc.

2. **Pedido se persiste antes de WhatsApp**: El inbox es la fuente de verdad. Si el cliente no toca “enviar” en WA, el comercio igual ve el pedido. WA es el aviso al dueño + canal de conversación.

3. **Sin MercadoPago en v1**: El cobro ocurre en el local / contra entrega, vía `registrarVenta` + `CobroPagoModal`. Encaja con “informarlo por WPP”.

4. **No descontar stock al pedir**: WhatsApp no es un compromiso firme. Stock se descuenta al **convertir a venta**. En vitrina: variantes con stock 0 no se pueden agregar (infinito `-1` sí). Al POST, revalidar precio y stock; si no alcanza, 409 con mensaje claro.

5. **Lectura pública con service role + allowlist** (no RLS anon en `productos`): el admin client ya existe; `SELECT` explícito de columnas públicas. Nunca `select *` sobre `productos`. Alternativa RPC `security definer` queda como mejora si se quiere endurecer.

6. **Kits/packs/bundles fuera del catálogo v1**: Solo productos `activo`, `es_kit = false`, `es_bundle = false`, variantes “unidad” (no entradas virtuales de pack). Evita stock compuesto y precios pack.

7. **Cajeros ven `/pedidos`**: Es operación de mostrador (como ventas). Configuración del catálogo = owner/admin. Convertir a venta usa la misma caja que el POS. El remito de envío se crea en el **server action** aunque el cajero no pueda abrir `/remitos`.

8. **Remito automático al convertir envíos**: Si `tipo_entrega = envio` y `puedeUsar(..., 'remitos')`, llamar `crearRemitoDesdeVenta` con destinatario = nombre del cliente, dirección y teléfono del pedido. Retiro: solo venta (el cliente pasa a buscar).

9. **Notificaciones v1 = tabla + poll 20s** en Header. Realtime de Supabase queda fuera (menos infra, suficiente para 1–3 usuarios por tienda).

10. **Catálogo apagado o acceso vencido = 404 genérico** (“Este catálogo no está disponible”), sin filtrar si el slug existe. Sin WhatsApp configurado no se puede activar.

11. **UI catálogo**: tokens semánticos v2 (`bg-background`, `text-fg`, `bg-primary`), primitives `Button`/`Input`. Mobile-first. No `lime-*`. No tocar `styles/print.css` ni componentes de impresión.

12. **Carrito en `localStorage`** clave `cvalle-cat:{slug}`: anónimo, sin cuenta. Precios se revalidan en checkout/POST.

### Alternativas Consideradas

| Enfoque | Por qué se rechazó |
| ------- | ------------------ |
| Slug = UUID o `/?tienda=` | Feo para compartir; el pedido pide “nombre del negocio en el link” |
| Ruta `/{slug}` en raíz | Choca con `/login`, `/pos`, futuras landings |
| Layout `(public)` actual | Header/footer de CValle, no de la tienda |
| RLS anon en `productos` | Leak de `precio_compra` y de tiendas inactivas |
| Reservar stock al pedir | Pedidos fantasma (WA no enviado, arrepentimiento) traban inventario |
| Pago online MP | Fuera de alcance v1; suma checkout, webhooks, conciliación |
| Portal con login de cliente | Fricción; el canal es WhatsApp |
| Realtime obligatorio | Complejidad extra; poll alcanza |
| Feature SKU extra “Catálogo” | La venta comercial es Pro único; se marca Pro por si vuelve Básico |

### Preguntas Abiertas (si las hay)

Respuestas por defecto si no hay input antes de implementar:

1. **¿Pago online (MercadoPago) en el catálogo?** Default: **no**. Solo WA + cobro al convertir.
2. **¿Reservar stock al crear el pedido?** Default: **no**. Se descuenta al convertir a venta.
3. **¿Los cajeros ven y gestionan pedidos?** Default: **sí** (no config).
4. **¿Remito automático en envíos al convertir?** Default: **sí**, si el plan efectivo tiene remitos.
5. **¿Mostrar productos sin foto?** Default: **sí**, con placeholder (iniciales / pack icon).
6. **¿El cliente debe mandar el WhatsApp para que el pedido exista?** Default: **no**. El POST ya crea el pedido; WA es el aviso.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración SQL

Crear `supabase/migrations/20260819000003_catalogo_publico_pedidos.sql`.

**Acciones:**

- `alter table public.tiendas` agregar:
  - `catalogo_slug text`
  - `catalogo_activo boolean not null default false`
  - `whatsapp_pedidos text` (solo dígitos, doc: incluir 54)
  - `catalogo_retiro boolean not null default true`
  - `catalogo_envio boolean not null default true`
  - `catalogo_mensaje_bienvenida text`
- Unique parcial: `create unique index tiendas_catalogo_slug_uidx on public.tiendas (catalogo_slug) where catalogo_slug is not null;`
- Check opcional: slug `~ '^[a-z0-9]+(-[a-z0-9]+)*$'` y length 3–48 (validar también en app).
- Tabla `pedidos_catalogo`:
  - `id uuid pk`, `tienda_id` FK cascade, `numero int not null`
  - `estado text not null default 'nuevo'` check: `nuevo | visto | confirmado | listo | entregado | cancelado | convertido`
  - `cliente_nombre text not null`, `cliente_telefono text not null`, `cliente_id uuid` FK `clientes` on delete set null
  - `tipo_entrega text` check `retiro | envio`
  - `direccion_entrega text` (requerido en app si envío)
  - `notas text`
  - `subtotal numeric(12,2)`, `total numeric(12,2)`
  - `venta_id uuid` FK `ventas` on delete set null, `remito_id uuid` FK `remitos` on delete set null
  - `created_at` / `updated_at` + trigger `set_updated_at`
  - `unique (tienda_id, numero)`
- Tabla `pedido_catalogo_items`:
  - `tienda_id`, `pedido_id` cascade, `variante_id` set null
  - snapshots: `producto_nombre`, `talla`, `color`, `imagen_url`
  - `cantidad int check > 0`, `precio_unitario`, `total_linea`
- Tabla `notificaciones`:
  - `tienda_id`, `tipo text not null` (v1: `pedido_catalogo`), `titulo`, `cuerpo`, `leida boolean default false`, `pedido_id` cascade, `created_at`
- Índices:
  - `pedidos_catalogo (tienda_id, created_at desc)`
  - `pedidos_catalogo (tienda_id, estado)`
  - `pedido_catalogo_items (pedido_id)`
  - `notificaciones (tienda_id, leida, created_at desc)`
  - `clientes (tienda_id, telefono)` si no existe (búsqueda al convertir)
- RLS enable + policies **solo** `tienda_id = public.get_tienda_id()` for all/select/insert/update (mismo patrón que `productos`). **Ninguna policy para `anon`.**
- Grants: `authenticated` CRUD vía RLS; `anon` sin grant de escritura. El POST público usa service role.
- Comentarios SQL en tablas/columnas clave.

**Archivos afectados:**

- `supabase/migrations/20260819000003_catalogo_publico_pedidos.sql`

---

### Paso 2: Tipos y helpers de dominio

**Acciones:**

- Extender `Tienda` en `app/types/database.ts` con los 6 campos nuevos.
- Agregar interfaces `PedidoCatalogo`, `PedidoCatalogoItem`, `Notificacion`.
- `slug.ts`:
  - Quitar acentos, lowercase, reemplazar no alfanumérico por `-`, colapsar `--`, trim `-`.
  - Reserved: `c`, `api`, `login`, `registro`, `presentacion`, `superadmin`, `admin`, `www`, `catalogo`, `pedidos`, `pos`, `app`, `cvalle`, `cvalletienda`.
  - Si colisión: `boutique-luna`, `boutique-luna-2`, …
- `whatsapp.ts`:
  - `normalizarWhatsappAR(raw)`: dejar dígitos; si empieza con `15` y tiene 10 dígitos locales, no adivinar de más; si tiene 10 dígitos y no empieza con 54, prefijar `549` (móvil AR típico 11 / 299); si ya tiene 54, respetar. Si queda < 10 dígitos → inválido.
  - `armarMensajePedido(...)` texto plano con número de pedido, ítems, tipo entrega, dirección, total, nombre, tel, notas.
  - `waMeUrl(digits, text)`.
- `const.ts`: `MAX_ITEMS = 30`, `MAX_QTY = 20`, `MAX_NOTAS = 500`, `RATE_MAX = 8`, `RATE_VENTANA_MS = 10 * 60 * 1000`.

**Archivos afectados:**

- `app/types/database.ts`
- `app/lib/catalogo/slug.ts`
- `app/lib/catalogo/whatsapp.ts`
- `app/lib/catalogo/const.ts`
- `app/lib/catalogo/types.ts`

---

### Paso 3: Queries públicas (server-only)

**Acciones:**

- `queries-publico.ts` **solo importable desde Server Components / Route Handlers**. Usar `createAdminClient()`.
- `obtenerTiendaCatalogoPorSlug(slug)`:
  - Select allowlist: `id, nombre, logo_url, direccion, ciudad, catalogo_activo, catalogo_retiro, catalogo_envio, catalogo_mensaje_bienvenida, whatsapp_pedidos, acceso_hasta, trial_hasta, activo`.
  - Return null si no hay fila, `!activo`, `!catalogo_activo`, o `!tieneAcceso({ acceso_hasta, trial_hasta })`.
  - **No** devolver `whatsapp_pedidos` al client de la grilla (sí usarlo en el POST para armar WA). En DTO público de vitrina: nombre, logo, dirección de retiro, flags retiro/envío, mensaje, **no** el número (el cliente no necesita verlo; el redirect WA lo arma el server).
- `listarProductosCatalogo(tiendaId)`:
  - Productos `activo = true`, `es_kit = false`, `es_bundle = false`.
  - Join variantes + talla/color nombres, `imagen_url` (variante || producto).
  - Columnas: `id, nombre, descripcion, precio_venta, imagen_url, categoria_id` + variantes `id, precio_venta, stock_actual, talla, color, imagen_url`.
  - Filtrar variantes con `stock_actual > 0` o `stock_actual = -1`. Si un producto queda sin variantes vendibles, **igual listarlo** como “sin stock” (card disabled) **o** ocultarlo: **ocultar productos sin ninguna variante vendible**.
- `obtenerProductoCatalogo(tiendaId, productoId)`: misma allowlist; 404 si no pertenece o no es publicable.
- DTO `ProductoCatalogoPublico` / `VarianteCatalogoPublica` **sin** `precio_compra`, `codigo_barras` opcional oculto (no mostrar códigos en vitrina).

**Archivos afectados:**

- `app/lib/catalogo/queries-publico.ts`

---

### Paso 4: Middleware y layout del catálogo

**Acciones:**

- En `middleware.ts`, agregar `pathname.startsWith('/c/')` a `isPublicRoute`.
- Grupo `app/app/(catalogo)/layout.tsx`: `min-h-screen bg-background`, metadata default “Catálogo”, **sin** `AppShell`, **sin** `LandingHeader`.
- `generateMetadata` en `c/[slug]/page.tsx`: `title = nombre de tienda`, `description` mensaje o “Pedí por WhatsApp”, `openGraph` con logo si hay.
- Página 404 propia (no login) si slug inválido / inactivo.

**Archivos afectados:**

- `app/lib/supabase/middleware.ts`
- `app/app/(catalogo)/layout.tsx`
- páginas bajo `app/app/(catalogo)/c/[slug]/`

---

### Paso 5: UI pública (vitrina, ficha, carrito, checkout)

**Acciones:**

- Header: logo (o inicial), nombre, dirección corta, icono carrito con badge qty.
- Grilla: `aspect-[4/5]` como POS, precio `formatARS`, placeholder si no hay foto. Click → ficha.
- Ficha: chips talla/color (solo variantes con stock), qty, CTA “Agregar”. Si una sola variante, agregar directo desde grilla opcional (si hay varias, ir a ficha).
- Carrito client: persistir `{ varianteId, qty }[]` (no precios). Al montar checkout, `POST` no: hidratar precios con un GET interno — más simple: la ficha ya guarda `precio` snapshot **solo visual**; el POST ignora precios del client.
- Checkout campos:
  - Nombre (req), teléfono (req)
  - Radio retiro / envío según flags de la tienda (si solo uno, fijo)
  - Si envío: dirección (req), aclaración ciudad
  - Notas (opcional)
  - Honeypot input `website` `className="hidden"` / `tabIndex={-1}` `autoComplete="off"`
  - CTA “Enviar pedido por WhatsApp”
- Submit: `POST /api/catalogo/[slug]/pedido` → si ok, `window.location.href = data.waUrl` y también `router.push(/c/slug/pedido-enviado?n=)` por si el user vuelve atrás. Preferencia: **primero** navegar a `pedido-enviado` con `waUrl` en query o sessionStorage, botón primario “Abrir WhatsApp” auto-click una vez. Así el pedido no se pierde si el popup se bloquea. **Decisión de implementación:** página `pedido-enviado` guarda `{ numero, waUrl }` en sessionStorage; al montar intenta `window.location.assign(waUrl)` una vez (`sessionStorage` flag `waOpened`).
- Empty states: catálogo sin productos, carrito vacío.
- No indexar si se puede: `robots: { index: false }` en metadata v1 (evita listar tiendas en Google sin querer). Documentar; se puede abrir después.

**Archivos afectados:**

- Componentes `app/components/catalogo-publico/*`
- Páginas `(catalogo)/c/[slug]/**`

---

### Paso 6: API pública de pedido

**Acciones:**

- `POST /api/catalogo/[slug]/pedido`
- Body JSON: `{ cliente_nombre, cliente_telefono, tipo_entrega, direccion_entrega?, notas?, website?, items: [{ variante_id, cantidad }] }`
- Validar honeypot `website` vacío → 200 fake ok **sin insert** (bots).
- Rate limit in-memory `Map` keyed by `${ip}:${slug}` (header `x-forwarded-for`). 429 si excede.
- Cargar tienda (mismas reglas que vitrina) + `whatsapp_pedidos` válido; si no, 404.
- `tipo_entrega` debe estar permitido por flags; envío exige dirección trim length ≥ 8.
- Resolver ítems **en DB**: variante pertenece a `tienda_id`, producto publicable, qty 1..MAX_QTY, stock suficiente (infinito ok). Precio unitario = `variantes.precio_venta` o producto. Recalcular totales. Max 30 ítems.
- Número: `max(numero)+1` por tienda. Si unique race, reintentar 2 veces.
- Insert pedido + items + notificación `{ tipo: 'pedido_catalogo', titulo: 'Pedido #N', cuerpo: 'Nombre — $total — retiro|envío' }`.
- Respuesta `{ ok: true, numero, waUrl }` (no devolver `tienda_id` interno de más).
- Errores en español, genéricos hacia afuera (“No se pudo crear el pedido”).

**Archivos afectados:**

- `app/app/api/catalogo/[slug]/pedido/route.ts`

---

### Paso 7: Configuración del catálogo

**Acciones:**

- Tab “Catálogo” en `TabsConfiguracion`.
- Página carga `tiendas` campos catálogo + `nombre` + `direccion` (retiro).
- Form `CatalogoForm`:
  - Toggle `catalogo_activo` (disabled si WA inválido o slug vacío).
  - Slug + preview URL usando `process.env.NEXT_PUBLIC_APP_URL` (fallback `window.location.origin`).
  - Botón copiar link (`navigator.clipboard`).
  - WhatsApp (texto libre, hint “299 123-4567 — se guarda con 549…”).
  - Toggles retiro / envío (al menos uno true).
  - Campos **nombre público** y **dirección de retiro** escribiendo `tiendas.nombre` y `tiendas.direccion` (hoy no hay UI).
  - Mensaje de bienvenida opcional.
  - Link “Ver catálogo” `target=_blank` si activo.
- Action `guardarConfigCatalogo` (owner/admin): validar slug unique (si tomado por otra tienda, error), normalizar WA, impedir activo sin WA/slug, impedir ambos flags false.
- Al registro (`auth.ts` create tienda): generar slug único desde `nombre_tienda`, `catalogo_activo = false`.
- Feature: si se agrega `catalogo_publico` a Pro, wrap de UpgradeBanner (hoy todos los clientes pagos son Pro; igual sumarlo).

**Archivos afectados:**

- `app/components/configuracion/TabsConfiguracion.tsx`
- `app/app/(dashboard)/configuracion/catalogo/page.tsx`
- `app/components/configuracion/CatalogoForm.tsx`
- `app/app/actions/catalogo.ts`
- `app/app/actions/auth.ts`
- `app/lib/planes/config.ts`

---

### Paso 8: Inbox de pedidos (dashboard)

**Acciones:**

- `queries-interno.ts` con `createClient()` de sesión (RLS). Listar pedidos + count items; detalle con items.
- `/pedidos`: filtros chips `nuevos | en curso | convertidos | cancelados | todos`. Default: no convertidos/cancelados.
- Badge “nuevo” si `estado = nuevo`.
- Detalle `/pedidos/[id]`:
  - Datos cliente, tel (`wa.me` al **cliente**), tipo entrega, dirección, notas, ítems, total, timestamps.
  - Acciones de estado (botones, no dropdown escondido):
    - `nuevo` → Marcar visto | Confirmar | Cancelar
    - `visto` → Confirmar | Cancelar
    - `confirmado` → Listo | Cancelar
    - `listo` → Entregado | Convertir a venta
    - `entregado` → Convertir a venta (si aún no)
    - `convertido` / `cancelado` → solo lectura + links a venta/remito
  - Al abrir detalle si `nuevo`, auto `visto` (opcional pero recomendado) y marcar notificación leída.
- Action `cambiarEstadoPedido(id, estado)` con transiciones válidas (tabla en código). No permitir `convertido` por este action (solo el flujo de cobro).
- Nav: `/pedidos` en Ventas, icon `ClipboardList` o `Bell`, keywords pedido/whatsapp/catalogo. **Sin** `soloRoles`.
- `ROUTE_LABELS`.
- BottomNav cajero: Caja | **Pedidos** | POS | Ventas | Menú.
- Comando de voz.

**Archivos afectados:**

- `app/lib/catalogo/queries-interno.ts`
- `app/app/(dashboard)/pedidos/page.tsx`
- `app/app/(dashboard)/pedidos/[id]/page.tsx`
- `app/components/pedidos/*`
- `app/app/actions/catalogo.ts`
- `app/components/layout/nav-config.ts`
- `app/components/layout/BottomNav.tsx`
- `app/lib/voz/comandos.ts`

---

### Paso 9: Convertir pedido → venta (+ remito)

**Acciones:**

- `ConvertirPedidoModal`:
  - Requiere caja abierta (si no, mensaje + link `/caja`).
  - Resolver cliente: buscar `clientes` de la tienda con `telefono` igual (normalizado); si no, `crearCliente({ nombre, telefono, direccion si envío })` y guardar `cliente_id` en el pedido.
  - Cargar métodos de pago igual que POS.
  - `CobroPagoModal` con total = `pedido.total`.
  - `registrarVenta({ items: variantes+cantidades del pedido (precio_unitario snapshot), pagos, cliente_id, observaciones: 'Pedido catálogo #N. ' + notas + entrega })`.
  - Si venta ok y envío y `puedeUsar(plan, 'remitos')`: `crearRemitoDesdeVenta` con items snapshot, `destinatario = cliente_nombre`, **nueva** `direccion_entrega` / `telefono_entrega`.
  - Update pedido: `estado = convertido`, `venta_id`, `remito_id`.
  - `revalidatePath` `/pedidos`, `/ventas`, `/remitos`.
- Si `registrarVenta` falla por stock, mostrar error y **no** marcar convertido.
- Extender `crearRemitoDesdeVenta` insert con `direccion_entrega` y `telefono_entrega` opcionales (hoy se pierden).
- No cambiar markup de impresión.

**Archivos afectados:**

- `app/components/pedidos/ConvertirPedidoModal.tsx`
- `app/app/actions/catalogo.ts` (`convertirPedidoAVenta`)
- `app/app/actions/remitos.ts`
- `app/app/actions/clientes.ts` (reutilizar `crearCliente`; si hace falta helper `buscarClientePorTelefono` en `catalogo.ts`)

---

### Paso 10: Notificaciones in-app

**Acciones:**

- `GET /api/notificaciones?unread=1` → `{ items, unreadCount }` limit 20, RLS.
- `PATCH /api/notificaciones` body `{ ids?: string[], all?: true }` marca leídas.
- `NotificacionesBell` en Header (derecha, antes de búsqueda):
  - Poll 20s, `document.visibilityState === 'visible'`.
  - Badge numérico.
  - Dropdown: título, hace cuánto, click → `/pedidos/[id]` y marcar leída.
  - Vacío: “Sin avisos nuevos”.
- Cajeros también ven la campana (Header común).

**Archivos afectados:**

- `app/app/api/notificaciones/route.ts`
- `app/components/layout/NotificacionesBell.tsx`
- `app/components/layout/Header.tsx`

---

### Paso 11: Docs y consistencia

**Acciones:**

- `referencia/catalogo-publico.md`: URL, config mínima (slug + WA + activar), flujo cliente, estados, conversión, “el stock se mueve al cobrar”.
- `CLAUDE.md` sección App: una fila de tabla o bullet — catálogo `/c/[slug]`, no chrome dashboard, inbox `/pedidos`.
- `contexto/proyectos.md`: quitar backlog “Catálogo público”; al implementar, Completados.
- No actualizar print CSS.

**Archivos afectados:**

- `referencia/catalogo-publico.md`
- `CLAUDE.md`
- `contexto/proyectos.md`

---

### Paso 12: Validación técnica

**Acciones:**

- `npx tsc --noEmit` en `app/`.
- Recordatorio: **aplicar la migración** en el proyecto Supabase remoto (`supabase db push` o SQL Editor). Sin eso, 500 en config/pedidos.
- Probar mentalmente / a mano:
  - Visitante sin login ve `/c/slug`.
  - Middleware no manda a login.
  - POST crea fila y WA.
  - Precio manipulado en el body se ignora.
  - Cajero abre `/pedidos`, no `/configuracion/catalogo`.
  - Convertir sin caja falla; con caja descuenta stock y crea venta.

**Archivos afectados:**

- Ninguno de producto, salvo fixes de tipos.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/supabase/middleware.ts` — sin `/c/` el catálogo es inutilizable.
- `app/app/actions/ventas.ts` — conversión depende de caja + pagos.
- `app/app/actions/remitos.ts` — envíos Pro.
- `app/components/pos/CobroPagoModal.tsx` — UI de cobro.
- `app/lib/planes/acceso.ts` — catálogo cae si venció el mes.
- Fotos: `20260819000002_storage_bucket_productos.sql` debe estar aplicada para que la vitrina tenga imágenes.

### Actualizaciones Necesarias para Consistencia

- Tipos `database.ts` alineados a la migración.
- Nav + breadcrumbs + voz.
- Docs `CLAUDE.md` / `contexto/proyectos.md` / `referencia/catalogo-publico.md`.

### Impacto en Flujos de Trabajo Existentes

- POS, tickets e impresión: **sin cambios**.
- Pedido CC de distribuidora: **no se mezcla** (B2B mostrador ≠ catálogo público).
- Cajeros ganan una pantalla (`/pedidos`); BottomNav cambia Precios → Pedidos.
- Service role se usa en un camino de cliente anónimo: hay que ser estricto con allowlist (mismo cuidado que superadmin).
- Volumen: rate limit básico; no es marketplace.

---

## Lista de Validación

- [ ] Migración aplicada: columnas en `tiendas`, tablas `pedidos_catalogo`, `pedido_catalogo_items`, `notificaciones`, RLS tenant, unique slug
- [ ] Anon **no** puede `select` costo ni listar productos por PostgREST
- [ ] `/c/mi-negocio` accesible sin login; slug inválido/inactivo/vencido → 404 genérico
- [ ] Middleware no redirige `/c/*` a `/login`
- [ ] Catálogo usa tokens v2; sin landing header; sin `precio_compra` en network tab de las APIs públicas
- [ ] Productos kit/bundle no aparecen; sin stock no se agregan
- [ ] Checkout retiro vs envío (dirección requerida en envío)
- [ ] POST crea pedido + notificación aunque no se abra WA; `wa.me` usa el número **de la tienda**
- [ ] Rate limit y honeypot no insertan basura obvia
- [ ] Config: copiar link, no activar sin WA, slug único, al menos un modo de entrega
- [ ] `/pedidos` visible para cajero; `/configuracion/catalogo` no
- [ ] Campana muestra no leídas y navega al pedido
- [ ] Convertir: caja abierta, cliente por teléfono, venta, stock, ticket vía flujo existente
- [ ] Envío + Pro remitos → remito con dirección/teléfono; retiro → sin remito auto
- [ ] `crearRemitoDesdeVenta` persiste dirección
- [ ] `tsc --noEmit` ok
- [ ] `CLAUDE.md` y `referencia/catalogo-publico.md` actualizados

---

## Criterios de Éxito

1. Un comercio activa el catálogo, copia `https://<host>/c/<slug>` y un celular sin cuenta ve productos con foto y precio.
2. Un cliente completa checkout (retiro o envío con dirección) y el dueño recibe el hilo de WhatsApp **y** ve el pedido en `/pedidos` con campana.
3. Desde el inbox, con caja abierta, el pedido se convierte en venta (y remito si es envío Pro); el stock baja en ese momento, no antes.
4. No se filtra costo de productos ni el WhatsApp de CValle (pitch); cada tenant usa su número.

---

## Notas

- **Migración remota:** igual que las fotos, el SQL hay que aplicarlo en Supabase o fallará todo lo nuevo.
- **Slug al cambiar el nombre:** no auto-renombrar el slug (rompe links ya compartidos). El nombre público sí se puede editar aparte.
- **PWA / Instagram in-app browser:** `wa.me` suele funcionar; la página “pedido enviado” es el fallback.
- **Horarios / zona de envío / costo de envío:** fuera de v1 (el total es solo mercadería; el comercio acuerda flete por WA).
- **MP / seña / cuenta corriente desde catálogo:** fuera de v1.
- **Realtime, email, push:** fase 2.
- **SEO indexable por tienda:** v1 `noindex`; si se quiere vidriera Google, plan aparte.
- **Distribuidora:** el catálogo público no usa recargo CC ni “pedido a cuenta”; es consumidor final.
- Tras implementar: marcar este plan **Estado: Implementado** y notas (migración push, decisiones finales).

---

## Notas de Implementación

**Implementado:** 2026-08-19

### Resumen

Catálogo público `/c/[slug]`, productos opt-in (`visible_en_catalogo` default false), pedidos por WhatsApp del tenant, inbox `/pedidos` + campana, conversión a venta (stock) y remito si es envío. Sin pago online.

### Desviaciones del Plan

- Productos: hay que marcarlos para el catálogo; default siempre desactivado (pedido del usuario al implementar).
- Stock: no se descuenta al pedir ni al “aceptar”; baja al **confirmar envío/retiro** vía `registrarVenta` (después de gestionar, con caja abierta).
- Sin MercadoPago / cobro en el catálogo: el cobro es el modal de venta en Pedidos.
- Slug de tiendas nuevas: se sugiere al guardar config (no se tocó `handle_new_user` para no pisar la lista de rubros incompleta del trigger).

### Problemas Encontrados

- La migración hay que aplicarla en Supabase remoto (`supabase db push` o SQL Editor). Sin eso fallan config, pedidos y el flag de producto.

)
