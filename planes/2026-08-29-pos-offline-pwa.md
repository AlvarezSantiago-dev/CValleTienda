# Plan: POS offline (Capa 0 + Capa 1)

**Creado:** 2026-08-29
**Estado:** Borrador
**Pedido:** Que el punto de venta siga cobrando en cortes de internet de minutos, y que se pueda recargar `/pos` sin red (PWA + caché local). El resto de la app (stock, clientes, reportes, catálogo) espera la red.

---

## Descripción General

### Qué Logra Este Plan

La PC de caja, una vez que abrió `/pos` con internet, puede **seguir vendiendo** si se cae el WiFi/fibra unos minutos: el carrito no se pierde, el cobro entra en una cola local, el ticket se imprime por PrintBridge, y al volver la red las ventas se suben a Supabase. Además, **F5 / reabrir `/pos`** funciona offline gracias a un service worker que sirve la última copia de la caja y un snapshot en IndexedDB (catálogo, métodos de pago, clientes, config de ticket).

### Por Qué Importa

En un comercio físico un corte corto en hora pico no puede frenar la fila. CValleTienda hoy es 100 % nube (Next.js + Supabase): cualquier cobro, búsqueda o recarga muere sin red. Los competidores venden “offline parcial”; este plan cubre ese recorte (solo POS, cortes de minutos) sin convertir el SaaS en un ERP de escritorio.

---

## Estado Actual

### Estructura Existente Relevante

| Pieza | Comportamiento hoy |
| ----- | ------------------ |
| `app/app/(dashboard)/pos/page.tsx` | Server Component: exige caja abierta + métodos + `listarProductosPOS()` (grilla, **límite 100 productos**). |
| `app/app/(dashboard)/layout.tsx` | En cada request: auth, perfil, tienda, plan, acceso, caja. Sin red no hay shell. |
| `app/proxy.ts` + `lib/supabase/middleware.ts` | Auth Supabase en casi todas las navegaciones. |
| `POSContainer.tsx` → `registrarVenta` | Cobro 100 % server action. Tras OK: `emitirFactura` opcional, `router.refresh()`, `obtenerPayloadVenta(ventaId)` para imprimir. |
| `BuscadorVariantes.tsx` / scanner | Siempre `buscarVariantesAction` (red). La grilla local no alcanza para EAN de productos fuera del top 100. |
| `ClienteSelector` / `ClienteBusquedaInline` | `buscarClientesAction` (red). Alta de cliente = modal online. |
| PrintBridge | Ya es local (`127.0.0.1:9100`). Sigue andando sin internet **si hay payload**. |
| IndexedDB / PWA | No existen. `localStorage` solo para UI (sidebar, preferencias de formulario). |
| `ventas` | Unique `(tienda_id, numero_ticket)`. El número sale de `get_siguiente_numero_ticket` en el server. Sin idempotencia: un retry puede duplicar la venta. |

### Brechas o Problemas que se Abordan

1. Si el cajero ya está en `/pos` y se corta internet, **cobrar falla** y no hay reintento automático.
2. El **carrito vive en React state**: F5 o crash = venta perdida.
3. F5 / reabrir caja sin red: layout + page pegan a Supabase → pantalla muerta.
4. Búsqueda/scanner no usan el catálogo en memoria; dependen del server.
5. El ticket post-venta pide el payload por RPC; offline no hay `ventaId` real.
6. Un cobro que timeout-ea pero sí se grabó, reintentado, **duplica** la venta.

---

## Cambios Propuestos

### Resumen de Cambios

- Snapshot local del POS (variantes vendibles, métodos, clientes lite, config de ticket, `tienda_id`) en IndexedDB, refrescado cada vez que `/pos` carga online.
- Persistencia del carrito + estado de cobro (cliente, descuento, pagos, condición) por `tienda_id`.
- Cola de mutaciones con `client_mutation_id` (UUID). Sync al volver online.
- Idempotencia en `ventas` para que retry ≠ doble cobro.
- Búsqueda/scanner **local-first** sobre el snapshot; si hay red y no hay match, fallback al server (comportamiento actual).
- Ticket **provisional** armado en el cliente (PrintBridge / `window.print`) sin esperar `ventaId`.
- Banner de conexión + bloqueo de navegación a otros módulos mientras esté offline.
- Service worker solo para `/pos`: cache del documento + chunks `/_next/static`. Fallback offline. Manifest PWA con `start_url: /pos`.
- Bloqueo explícito offline: factura AFIP, alta de cliente, código desconocido, cajero hablado, `router.refresh`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260829000001_ventas_client_mutation_id.sql` | Columna `client_mutation_id uuid` + unique parcial `(tienda_id, client_mutation_id)`. |
| `app/lib/pos/offline/types.ts` | Tipos: snapshot, ítem de cola, estado de sync, carrito persistido. |
| `app/lib/pos/offline/idb.ts` | Wrapper IndexedDB (`cvalle-pos`, stores: `snapshot`, `carrito`, `cola`, `meta`). Clave por `tienda_id`. |
| `app/lib/pos/offline/buscar-local.ts` | Búsqueda local (EAN exacto, pack barcode, nombre/talla/color). Sin I/O de red. |
| `app/lib/pos/offline/buscar-local.test.ts` | Tests de matching (código, nombre, pack, vacío). |
| `app/lib/pos/offline/ticket-local.ts` | Arma `PayloadTicketVenta` desde carrito + snapshot (número `PEND-{HHmm}-{seq}`). |
| `app/lib/pos/offline/ticket-local.test.ts` | Totales, líneas, pagos, aviso de “sin conexión”. |
| `app/lib/pos/offline/cola.ts` | Encolar / listar / marcar synced\|failed. Decremento optimista de stock en snapshot. |
| `app/lib/pos/offline/cola.test.ts` | FIFO, idempotency key, stock local. |
| `app/lib/pos/offline/sync.ts` | Flush de cola → `registrarVenta` con `client_mutation_id`. Backoff. |
| `app/lib/pos/offline/conexion.ts` | `usePosConexion`: `online`/`offline` + probe `GET /api/pos/ping`. |
| `app/app/api/pos/ping/route.ts` | `204` sin auth. Solo para detectar red (no usar `navigator.onLine` solo). |
| `app/app/actions/pos-offline.ts` | Server action `obtenerSnapshotPos()`: catálogo completo vendible + clientes lite + config ticket. |
| `app/components/pos/OfflineBanner.tsx` | Banner semántico (tokens v2): sin red / sincronizando N / error de cola. |
| `app/components/pos/PosServiceWorker.tsx` | Registra `sw-pos.js` solo en `/pos`. |
| `app/public/sw-pos.js` | SW: NetworkFirst `/pos`; CacheFirst `/_next/static/*`; no cachear server actions ni otras rutas. |
| `app/public/offline-pos.html` | Fallback mínimo si no hay documento cacheado (instrucción: abrir caja con internet una vez). |
| `app/app/manifest.ts` | Web app manifest (`name`, `start_url: /pos`, `display: standalone`, iconos existentes o placeholder). |
| `app/lib/pos/offline/sync.test.ts` | Idempotencia: segunda llamada con el mismo `client_mutation_id` no crea otra venta (mock action). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/types/database.ts` | `Venta.client_mutation_id?: string \| null`. |
| `app/app/actions/ventas.ts` | `RegistrarVentaInput.client_mutation_id?: string`. Al inicio: si viene key, `select` por `(tienda_id, client_mutation_id)` y devolver la venta existente. Insertar la columna en el insert. |
| `app/lib/pos/queries.ts` | Extraer o reutilizar el mapeo de variantes para el snapshot (todas las activas vendibles, **sin** `limit 100`). Paginar de a 1000. Tope 5000 variantes; si se trunca, flag `catalogo_truncado` en el snapshot. |
| `app/app/(dashboard)/pos/page.tsx` | Tras data online, no cambia el contrato de props. El snapshot lo escribe el cliente. |
| `app/components/pos/POSContainer.tsx` | Hidratar/guardar snapshot y carrito; `finalizarVenta` → cola si falla red o `!online`; no `router.refresh` ni factura ni `obtenerPayloadVenta` offline; imprimir con ticket local; banner; skip refresh. |
| `app/components/pos/BuscadorVariantes.tsx` | Prop opcional `buscarLocal`. Local-first; fallback server si online y 0 resultados. |
| `app/components/pos/POSContainer.tsx` (scanner/balanza) | Misma regla para `buscarVariantesAction` / `buscarVarianteBalanzaAction`. |
| `app/components/clientes/ClienteSelector.tsx` | Si offline: filtrar snapshot de clientes. Ocultar “Nuevo cliente”. |
| `app/components/pos/cobro-guiado/ClienteBusquedaInline.tsx` | Igual. |
| `app/components/layout/AppShell.tsx` | Si offline: deshabilitar links del sidebar/bottom nav que no sean `/pos`; toast al intentar salir. |
| `app/components/layout/SidebarV2.tsx` | Aceptar `navegacionBloqueada?: boolean` o leer un `PosOfflineProvider`. |
| `app/app/(dashboard)/layout.tsx` | Montar `PosOfflineProvider` + `PosServiceWorker` (el SW solo registra si pathname `/pos`, el provider puede vivir en el shell). Preferible: provider en layout, SW en `pos/page` client wrapper. |
| `app/app/layout.tsx` | `metadata.manifest = '/manifest.webmanifest'` (Next genera desde `app/manifest.ts`). |
| `app/components/layout/Header.tsx` o logout | Al cerrar sesión, `clearPosOfflineDb()`. |
| `app/lib/cajero/tools.ts` | No cambia el contrato online. Fuera de alcance offline (cajero hablado requiere API). |
| `CLAUDE.md` | Párrafo POS offline (alcance, límites, PrintBridge). |
| `contexto/proyectos.md` | Mover “App móvil / PWA” a en desarrollo o anotar este recorte. |
| `referencia/` (opcional, solo si hace falta) | No crear doc nuevo salvo que el plan de implementación lo pida al final; el plan en `planes/` es la fuente. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Solo POS, no toda la app.** Stock, dashboard, config, catálogo público y reportes siguen online. Encaja con cortes de minutos y evita un sync engine de ERP.

2. **Capa 0 (pestaña abierta) y Capa 1 (F5 / reabrir `/pos`) juntas.** Capa 1 sin snapshot no sirve: el HTML cacheado trae datos viejos; IndexedDB es la fuente de productos/carrito/cola.

3. **Service worker casero (`public/sw-pos.js`), no Serwist/next-pwa.** Next.js 16 App Router + RSC pelea con precache de build. El SW solo intercepta GET `/pos` y estáticos; **nunca** POST ni server actions. Cache API ignora `no-store` (podemos `cache.put` del documento que acabamos de bajar).

4. **El layout server sigue existiendo.** F5 offline **no** re-ejecuta `proxy.ts` ni el layout: el SW devuelve el HTML de la última visita online. Primera visita a `/pos` en un navegador virgen **requiere internet**. Documentar esto en el banner de `offline-pos.html`.

5. **Snapshot ≠ grilla de 100.** `listarProductosPOS(100)` no alcanza para scanner. Snapshot = todas las variantes activas vendibles (paginado), tope 5000. La grilla UI no cambia.

6. **Número de ticket oficial solo en el server.** Offline se imprime `PEND-{HHmm}-{seq}` y leyenda “Sin conexión — se confirma al volver la red”. Tras sync, el ticket real queda en `/ventas`. No se reimprime solo (el cliente ya se fue).

7. **Idempotencia obligatoria.** `client_mutation_id` generado al encolar. `registrarVenta` si ya existe esa key en la tienda, devuelve `{ ok: true, data: venta existente }` sin insertar.

8. **Stock: snapshot optimista, server manda.** Al cobrar offline se descuenta en IDB. Al sync, `registrarVenta` valida de nuevo. Si no hay stock: ítem de cola `failed` + mensaje; no se borra solo (el cajero descarta o reintenta).

9. **Cuenta corriente permitida** si el cliente está en el snapshot. El server revalida límite. Alta de cliente bloqueada.

10. **Factura AFIP, MercadoPago live, cajero hablado: bloqueados offline.** Los métodos de pago tipo “Mercado Pago” que solo **registran** un monto en caja sí se encolan (hoy no hay charge de API en `registrarVenta`). El toggle “Emitir factura” se deshabilita y no se encola.

11. **PrintBridge primero.** Ticket local → mismo flujo `usePrint` / PrintBridge. No tocar `print.css` ni renderers.

12. **IndexedDB por `tienda_id`.** Logout borra todo. No guardar tokens; las cookies de sesión siguen en el navegador (válidas en cortes de minutos).

13. **Probe de red** `GET /api/pos/ping` (204). `navigator.onLine` es mentiroso (WiFi sin salida). Sync cuando el probe responde o en `online` + visibility.

14. **Primitives-first.** Banner/botones con tokens (`bg-warning-soft`, `text-fg`, `Button`). Cero `lime-*` / hex de marca.

### Alternativas Consideradas

| Enfoque | Por qué no |
| ------- | ---------- |
| App Electron/Tauri + SQLite | Otro producto (instaladores, conflictos, meses). Desproporcionado para cortes de minutos. |
| PowerSync / ElectricSQL / Réplica Postgres | Sync de todo el tenant. Fuera de alcance y de presupuesto de MVP. |
| Serwist wrapping toda la app | Cachearía dashboard/RSC mal; riesgo de servir HTML auth-stale en rutas que no son POS. |
| Esperar red para imprimir | Fracasa el caso “el cliente está en la caja ahora”. |
| Reservar rangos de `numero_ticket` por dispositivo | Complejo, huecos, dos cajas. Overkill con una PC de mostrador. |
| Solo Capa 0 (sin SW) | El usuario pidió poder recargar. Un F5 sin Capa 1 mata la caja. |

### Preguntas Abiertas (si las hay)

Defaults ya tomados; cambiar **antes** de implementar si no cierran:

- **Tope 5000 variantes** en el snapshot. ¿OK o subir (despensa grande)?
- **Fiado (CC) offline: sí.** ¿Preferís bloquearlo y solo contado?
- **Ticket provisional impreso al instante.** ¿Preferís no imprimir hasta sync?

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración idempotencia

Agregar a `ventas`:

```sql
alter table public.ventas
  add column if not exists client_mutation_id uuid;

create unique index if not exists ventas_tienda_client_mutation_uidx
  on public.ventas (tienda_id, client_mutation_id)
  where client_mutation_id is not null;
```

Actualizar `Venta` en `app/types/database.ts`.

**Archivos afectados:**

- `supabase/migrations/20260829000001_ventas_client_mutation_id.sql`
- `app/types/database.ts`

---

### Paso 2: `registrarVenta` idempotente

En `registrarVenta`, después de `requireCtx()` y **antes** de validar stock/insert:

- Si `input.client_mutation_id` es un UUID:
  - `select id, numero_ticket, … from ventas where tienda_id = $1 and client_mutation_id = $2`.
  - Si hay fila: devolver `{ ok: true, data: { ventaId, numeroTicket, remitoId? } }` (remito: buscar remito ligado si existe, igual que el return actual).
- En el `insert` de ventas, incluir `client_mutation_id` cuando venga.
- Si el unique pega por carrera: catch y re-select (mismo return).

`client_mutation_id` es opcional: POS online actual puede no enviarlo; la cola offline siempre lo envía.

**Archivos afectados:**

- `app/app/actions/ventas.ts`

---

### Paso 3: Snapshot server

Nueva action `obtenerSnapshotPos(): Promise<ActionResult<PosSnapshot>>`.

El snapshot incluye:

- `tienda_id`, `tienda_nombre`, `rubro`, `caja_abierta: boolean`
- `generado_en: string` (ISO)
- `catalogo_truncado: boolean`
- `productos: ProductoPOS[]` — misma forma que `listarProductosPOS`, **sin** limit 100. Cargar productos activos; variantes con el mismo pipeline (`mapVariante`, kits, tramos, packs, filtro vendible). Paginar variantes `.range()`. Tope 5000 variantes expandidas.
- `metodos: MetodoPago[]` (activos)
- `configuracion: ConfiguracionTienda` (campos de ticket: prefijo, ancho, textos, logo flags, redondeo, recargo CC, modo cobro)
- `clientes: ClienteLite[]` — `id, nombre, apellido, dni, telefono, saldo_favor, saldo_cc, limite_cc`, activos, order nombre, tope 2000
- `ticketPlantilla: Pick<TiendaPayload, ...>` para armar el ticket local (nombre, cuit, dirección, textos, ancho_mm, simbolo)

Reusar helpers de `lib/pos/queries.ts`; no duplicar `mapVariante`.

Llamar esta action **desde el cliente** al montar POS si hay red (no inflar el RSC de `pos/page.tsx` con 5000 filas). La page sigue pasando la grilla de 100 para el primer paint; el snapshot hidrata IDB en background.

**Archivos afectados:**

- `app/app/actions/pos-offline.ts`
- `app/lib/pos/queries.ts` (exportar helpers necesarios)

---

### Paso 4: IndexedDB + búsqueda local + tests

Stores:

- `snapshot`: key `tienda_id` → `PosSnapshot`
- `carrito`: key `tienda_id` → `{ items, pagos, cliente, descuento, observaciones, condicionPago, recargoPedido, saldoFavorAplicado }`
- `cola`: key `id` (UUID = `client_mutation_id`) → `{ tiendaId, input: RegistrarVentaInput, ticketLocal, createdAt, status: 'pending'|'syncing'|'failed', error?: string, ventaId?: string, numeroTicket?: number }`
- `meta`: `seqTicketLocal`, `sw`

API: `idbGet/Put`, `clearPosOfflineDb()`, `enqueueVenta`, `listarCola`, `marcarCola`.

`buscarVariantesLocal(productos, query, limit=20)`: si el query matchea `codigo_barras` / `pack_codigo_barras` exacto → esos. Si no, includes casefold en nombre, talla, color, codigo_base. Kits/packs ya vienen expandidos en el snapshot.

**Archivos afectados:**

- `app/lib/pos/offline/*`

---

### Paso 5: Ticket local + PrintBridge

`armarPayloadTicketLocal({ snapshot, items, pagos, cliente, descuento, observaciones, numeroLocal, fecha })` → `PayloadTicketVenta`.

- `numero_ticket` string = `PEND-HHMM-seq` (seq en `meta`).
- `observaciones`: prefijar `[Sin conexión]` si no venía.
- Líneas desde el carrito (nombre, talla, color, qty, precios).
- Pagos: resolver nombre de método desde snapshot.metodos.
- `estado: 'completada'` para que el renderer no se rompa; el renderer no debe exigir `ventaId`.

En `finalizarVenta` offline: `setPayloadPendiente(payloadLocal)` igual que hoy (dispara `PrintSelectionModal` / auto-print). **No modificar** `TicketVentaRenderer` ni `print.css`.

**Archivos afectados:**

- `app/lib/pos/offline/ticket-local.ts`
- `app/components/pos/POSContainer.tsx` (solo el caller)

---

### Paso 6: Integrar POSContainer (Capa 0)

Al montar (online):

1. `obtenerSnapshotPos()` → IDB. Si falla, conservar snapshot previo.
2. Restaurar carrito desde IDB si `items.length === 0` (no pisa un carrito en curso).
3. `flushCola()` en background.

Persistir carrito con debounce 300 ms al cambiar items/pagos/cliente/descuento.

`finalizarVenta`:

```
intentar registrarVenta({ ...input, client_mutation_id })
  ok → flujo actual (factura si toggle y online, refresh, payload server)
  fail por red (TypeError / Failed to fetch / timeout) o probe offline
    → encolar, stock local, ticket local, reset carrito, confirmación “Venta guardada — se sube al volver internet”
  fail de negocio (stock, validación) → setError como hoy, no encolar
```

Generar `client_mutation_id` **siempre** en el cobro (también online) para que un timeout + retry no duplique.

No llamar `router.refresh()` ni `emitirFactura` si se encoló.

Banner: `OfflineBanner` encima del grid.

**Archivos afectados:**

- `app/components/pos/POSContainer.tsx`
- `app/components/pos/OfflineBanner.tsx`

---

### Paso 7: Búsqueda y clientes offline

`BuscadorVariantes`: nueva prop `catalogo: ProductoPOS[] | null`. Si hay query:

1. `buscarVariantesLocal(catalogo, q)`
2. Si hay resultados, usarlos (scanner instantáneo).
3. Si 0 y online, `buscarVariantesAction` como hoy.
4. Si 0 y offline, `onCodigoNoEncontrado` **no** abre alta de producto; mensaje “No está en el catálogo local”.

`POSContainer` scanner/balanza: si offline, resolver PLU/código contra snapshot; no `buscarVarianteBalanzaAction`.

`ClienteSelector` / `ClienteBusquedaInline`: filtrar `snapshot.clientes`; esconder `NuevoClienteModal` si `!online`.

**Archivos afectados:**

- `app/components/pos/BuscadorVariantes.tsx`
- `app/components/pos/POSContainer.tsx`
- `app/components/clientes/ClienteSelector.tsx`
- `app/components/pos/cobro-guiado/ClienteBusquedaInline.tsx`

---

### Paso 8: Sync engine

`flushCola(tiendaId)`:

- Probe ping; si falla, return.
- Ítems `pending`/`failed` (failed solo con retry manual o al recuperar red, **una** vez automática).
- Status `syncing`; `registrarVenta` con el `input` guardado (incluye `client_mutation_id`).
- OK: guardar `ventaId`/`numeroTicket`, status synced (o borrar). Toast “Se sincronizó la venta PEND-… → T-1234”.
- Error de negocio: `failed` + `error`; banner persistente “Hay ventas que no se pudieron subir”.
- Error de red: volver a `pending`.

Disparadores: `online` event, `visibilitychange`, intervalo 15 s mientras haya cola, al montar POS.

Provider `PosOfflineProvider` (contexto: `{ online, colaCount, flush, snapshot }`) para banner + AppShell.

**Archivos afectados:**

- `app/lib/pos/offline/sync.ts`
- `app/lib/pos/offline/conexion.ts`
- `app/app/api/pos/ping/route.ts`
- wrapper client en POS o layout dashboard

---

### Paso 9: Service worker + manifest (Capa 1)

`public/sw-pos.js`:

- `install`: `skipWaiting`; no precache de build.
- `activate`: `clientsClaim`; borrar caches `cvalle-pos-*` viejos.
- `fetch`:
  - `POST` / `registrarVenta` / RSC mutations: `networkOnly`.
  - `GET` pathname `/pos` (document): NetworkFirst (timeout 3 s) → cache `cvalle-pos-pages`; si ambos fallan, `offline-pos.html`.
  - `GET` `/_next/static/*`: CacheFirst `cvalle-pos-assets`.
  - Resto: network; si falla navegación (mode `navigate`) y path ≠ `/pos`, no servir el POS cacheado (evita “estoy en stock pero veo caja”). Opcional: responder `offline-pos.html` con link a `/pos`.

`PosServiceWorker`: `useEffect` en `/pos` → `navigator.serviceWorker.register('/sw-pos.js', { scope: '/pos' })`. Scope `/pos` **no** controla `/_next/static` (otro origin path). **Usar `scope: '/'`** pero en el fetch handler **solo cachear** `/pos` y estáticos; no interceptar otras páginas salvo fallback explícito.

Decisión: `register('/sw-pos.js', { scope: '/' })` + filtro estricto en `fetch`. Más simple que pelear el scope.

`offline-pos.html`: HTML estático con copy “Abrí la caja con internet una vez en esta PC. Si ya lo hiciste, andá a /pos.” + link.

`app/manifest.ts`: `start_url: '/pos'`, `display: 'standalone'`, `lang: 'es'`.

Al logout: `registration.unregister()` opcional; sí `clearPosOfflineDb()`.

**Archivos afectados:**

- `app/public/sw-pos.js`
- `app/public/offline-pos.html`
- `app/components/pos/PosServiceWorker.tsx`
- `app/app/manifest.ts`
- `app/app/layout.tsx` (metadata)
- componente de logout

---

### Paso 10: Navegación bloqueada + logout

`PosOfflineProvider` expone `online`. `AppShell`/`SidebarV2`/`BottomNav`: si `!online && pathname === '/pos'`, `pointer-events-none` + `aria-disabled` en links ≠ `/pos`, click → no `router.push`.

Logout (owner/cajero): borrar IDB.

**Archivos afectados:**

- `app/components/layout/AppShell.tsx`
- `app/components/layout/SidebarV2.tsx`
- `app/components/layout/BottomNav.tsx` (POS ya oculta bottom nav)
- donde esté el botón de cerrar sesión

---

### Paso 11: Docs workspace

Actualizar `CLAUDE.md` (sección App CValleTienda): POS offline parcial, snapshot, cola, ticket PEND, límites.

`contexto/proyectos.md`: backlog PWA → este recorte en desarrollo / nota.

No actualizar design-system. No tocar impresión markup.

**Archivos afectados:**

- `CLAUDE.md`
- `contexto/proyectos.md`

---

### Paso 12: Tests y validación manual

- Unit: búsqueda local, ticket local, cola FIFO, `registrarVenta` idempotente (si hay harness de actions; si no, extraer helper `resolverVentaIdempotente` y testearlo).
- Manual (obligatorio, no hay browser tools de caja real): ver Lista de Validación.

Correr `npm test` / vitest existente en `app/`.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/cajero/tools.ts` — llama `registrarVenta` (online). El `client_mutation_id` opcional no rompe.
- `app/app/actions/catalogo.ts` — `registrarVenta` para convertir pedidos. No enviar mutation id (o sí, uuid fresco). Fuera de offline.
- `EditarPedidoForm` / `buscarVariantesAction` — no usar búsqueda local (sigue online).
- PrintBridge v3 — sin cambios; consume el mismo payload.
- `planes/2026-08-21-cajero-hablado.md` — voz sigue requiriendo API; documentar “no offline”.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` y `contexto/proyectos.md` (Paso 11).
- Aplicar la migración en el proyecto Supabase de desarrollo **antes** de probar cobros con `client_mutation_id`.

### Impacto en Flujos de Trabajo Existentes

- Cobro online: un UUID extra; si el insert funciona igual, UX idéntica.
- Timeout raro online: retry ya no duplica (mejora).
- Scanner online: puede resolver más rápido por local-first (efecto colateral positivo).
- Primera carga de `/pos` hará un fetch extra de snapshot (background). No bloquear el primer paint de la grilla.
- Install PWA: opcional; el SW funciona en Chrome de caja sin “instalar”.

---

## Lista de Validación

- [ ] Migración aplicada: unique `(tienda_id, client_mutation_id)` where not null.
- [ ] Dos `registrarVenta` seguidos con la misma key → una sola fila en `ventas`.
- [ ] POS online: cobro, ticket, stock, CC, packs, tramos, factura (si estaba) **igual que antes**.
- [ ] Cortar red con `/pos` abierto, carrito lleno: banner visible; F5 **no** pierde el carrito; cobro encola; ticket PEND imprime (PrintBridge o diálogo del browser).
- [ ] Volver la red: cola se vacía; aparece venta real en `/ventas` con número oficial; stock coherente.
- [ ] Retry tras timeout (throttling DevTools) no duplica ventas.
- [ ] Scanner EAN de un producto **fuera** del top 100 de la grilla funciona offline (está en snapshot).
- [ ] Buscar cliente por DNI offline funciona si estaba en el snapshot; “Nuevo cliente” no aparece.
- [ ] Toggle factura deshabilitado offline; no llama TusFacturas.
- [ ] Click en Stock/Dashboard con red caída no navega.
- [ ] `offline-pos.html` si nunca se cacheó `/pos`.
- [ ] Logout borra IndexedDB.
- [ ] Otra pestaña `/pos` ve la cola (mismo IDB).
- [ ] Build `next build` OK. Tests unitarios del módulo `offline/` pasan.
- [ ] `CLAUDE.md` refleja el recorte (POS only, ticket PEND, no ERP offline).
- [ ] No se tocó `styles/print.css` ni `components/impresion/**` markup.

---

## Criterios de Éxito

1. Un cajero con `/pos` ya usado hoy en esa PC vende en efectivo (y CC con cliente cacheado) durante un corte de ≥ 5 minutos, imprime ticket, y al volver internet la venta existe una sola vez en Supabase.
2. F5 durante el corte reabre la caja con catálogo + carrito + cola, sin pantalla de error de Next/Supabase.
3. El resto de módulos no pretenden funcionar offline; la UI no deja entrar en un callejón sin salida.
4. El cobro online no regresa (idempotencia + snapshot en background no cambian el happy path).

---

## Notas

- **Operación en el local:** un modem 4G de failover sigue siendo la mejor red de seguridad (MercadoPago/AFIP no tienen plan B en software). Este plan cubre el POS interno.
- **Límite honesto:** si el corte es “no hay internet nunca”, hace falta caja local (Tauri/SQLite). No está en este plan.
- **Dos dispositivos:** caja PC offline + dueño vendiendo en el celular online pueden pelear stock. En cortes de minutos con una sola caja el riesgo es bajo. El server gana; la cola `failed` es el escape.
- **Chrome kiosk** (auto-print): el SW + IDB viven en ese perfil de Chrome. No compartir perfil “invitado”.
- **Tamaño IDB:** 5000 variantes + 2000 clientes es holgado en PC. Fotos de Storage **no** se precargan (la grilla puede mostrar placeholder offline).
- Implementar solo tras **OK** a este plan (`/implementar planes/2026-08-29-pos-offline-pwa.md`).
