# Plan: Módulo Clientes (CRM)

**Creado:** 2026-04-29
**Estado:** Implementado
**Pedido:** Módulo Clientes — CRUD + historial de compras + integración con ficha desde POS y vista de venta.

---

## Descripción General

### Qué Logra Este Plan

Habilita la **gestión de clientes** desde la UI: alta/edición/baja, búsqueda y listado paginado con métricas (total compras, monto total, última compra), ficha de detalle con historial de ventas y datos personales editables. Mejora el POS exponiendo "crear cliente nuevo" desde el buscador y permite navegar de venta → cliente → otras ventas.

### Por Qué Importa

- **Datos del cliente para fidelización** y trazabilidad (DNI, teléfono, email).
- **Historial unificado:** ya existen los triggers que mantienen `total_compras`, `monto_total` y `ultima_compra` actualizados; falta exponerlos.
- **Productividad en POS:** hoy podemos asociar un cliente existente, pero no crearlo. En tiendas chicas el cajero suele necesitar agregar al cliente al momento de la venta.
- **Atención post-venta:** ver compras anteriores cuando el cliente vuelve por cambio o consulta.

---

## Estado Actual

### Estructura Existente Relevante

**DB (todo aplicado):**

- `clientes` (004): nombre + apellido + dni + telefono + email + dirección + ciudad + fecha_nacimiento + notas + total_compras + monto_total + ultima_compra + activo. Índices por nombre, teléfono, dni, activos. RLS por tienda.
- Trigger `ventas_actualizar_cliente` en `ventas` (005) ya mantiene `total_compras`, `monto_total`, `ultima_compra` automáticamente al completar/anular ventas.
- `ventas.cliente_id` → FK opcional con `on delete set null`.

**App (todo aplicado):**

- `/clientes/page.tsx` es un placeholder.
- `app/actions/ventas.ts` ya expone `buscarClientesAction(query)` (devuelve `id, nombre, apellido, dni, telefono`) usado por POS.
- `components/pos/PanelPago.tsx` permite asociar cliente existente, pero no crear nuevo.
- Patrones establecidos: queries en `lib/{dominio}/queries.ts`, server actions en `app/actions/{dominio}.ts`, ActionResult, traducirError, paginación con `Pagination`, búsquedas con searchParams (`/productos`, `/stock`).
- UI primitives: Button/LinkButton, Input, Select, Textarea, EmptyState, Pagination.
- `lib/format.ts` con `formatARS`, `formatDateTime`, `formatDate`, `formatNumber`.

### Brechas o Problemas que se Abordan

- No se puede listar/buscar/filtrar clientes desde la UI.
- No se puede crear ni editar ficha.
- No hay vista de detalle ni historial visible.
- POS no permite crear cliente al vuelo → fricción operativa.
- Las métricas (`total_compras`, `monto_total`, `ultima_compra`) no se muestran en ningún lado.

---

## Cambios Propuestos

### Resumen de Cambios

- **Lib:** `clientes/queries.ts` con listar, obtener, contar; reutiliza historial via `lib/ventas/queries.ts` con filtro nuevo `clienteId`.
- **Actions:** `actions/clientes.ts` con `crearCliente`, `actualizarCliente`, `desactivarCliente` (soft delete vía `activo=false`).
- **Páginas:**
  - `/clientes` listado con búsqueda, filtros (activo/todos), paginación, columnas con métricas, link a detalle, CTA "Nuevo cliente".
  - `/clientes/nuevo` form de alta.
  - `/clientes/[id]` detalle: card datos + stat cards métricas + historial de ventas + botón editar/desactivar.
  - `/clientes/[id]/editar` form de edición (mismo componente reusado).
- **Componentes:**
  - `ClienteForm.tsx` reusable (modo crear/editar).
  - `TablaClientes.tsx`.
  - `FiltrosClientes.tsx`.
  - `ClienteHistorial.tsx` (lista de ventas del cliente con link al ticket).
- **POS:**
  - `PanelPago.tsx`: agregar botón "Nuevo cliente" que abre `NuevoClienteModal` y, al guardar, lo deja seleccionado en la venta actual.
  - `NuevoClienteModal.tsx` (client) con form mínimo (nombre, apellido, dni, telefono).
- **Vista venta:**
  - En `/ventas/[id]`, si `cliente_id != null` → mostrar como link a `/clientes/[id]`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/lib/clientes/queries.ts` | `listarClientes(opts)`, `obtenerCliente(id)`, helpers de búsqueda. |
| `app/app/actions/clientes.ts` | `crearCliente`, `actualizarCliente`, `desactivarCliente`, `reactivarCliente`. Reusa traducirError. |
| `app/components/clientes/ClienteForm.tsx` | Form client reusable (crear/editar). Validaciones mínimas. |
| `app/components/clientes/TablaClientes.tsx` | Tabla server con métricas + link detalle + estado. |
| `app/components/clientes/FiltrosClientes.tsx` | Form client con búsqueda + switch "incluir inactivos". |
| `app/components/clientes/ClienteHistorial.tsx` | Lista de ventas del cliente (reusa `listarVentas` con `clienteId`). |
| `app/components/clientes/NuevoClienteModal.tsx` | Modal client para POS. |
| `app/app/(dashboard)/clientes/nuevo/page.tsx` | Page de alta. |
| `app/app/(dashboard)/clientes/[id]/page.tsx` | Detalle + historial + acciones. |
| `app/app/(dashboard)/clientes/[id]/editar/page.tsx` | Page de edición. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/(dashboard)/clientes/page.tsx` | Reemplaza placeholder por listado completo + filtros + paginación + CTA. |
| `app/lib/ventas/queries.ts` | `listarVentas` acepta opcional `clienteId` para filtrar el historial. |
| `app/components/pos/PanelPago.tsx` | Agrega botón "Nuevo" junto al buscador de cliente; al crear, lo deja seleccionado. |
| `app/components/ventas/TicketImprimible.tsx` y/o `app/app/(dashboard)/ventas/[id]/page.tsx` | Convierte el nombre del cliente en link a `/clientes/[id]` cuando exista. |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Soft delete (`activo=false`).** Las ventas referencian `cliente_id` con `on delete set null`. Si borramos físicamente, perdemos el historial visible desde el cliente. Soft delete preserva historial y permite reactivar.

2. **Form reusable `ClienteForm` con prop `mode: 'create' | 'edit'`.** Evita duplicación. El form recibe el cliente en modo edit y un `onSuccess` callback (en client wrappers) o redirige (en page wrappers).

3. **Validaciones mínimas en MVP:**
   - **Obligatorio:** `nombre`. Todo lo demás opcional.
   - **DNI/teléfono/email:** sanitizamos espacios, no validamos formato (las tiendas locales aceptan datos parciales).
   - **DNI único por tienda:** decisión sugerida = **no enforce** en MVP (algunas tiendas usan DNI fragmentario). Si se quiere enforce → agregar UNIQUE INDEX parcial en migration aparte.
   - **Email duplicado:** permitido (familias comparten email).

4. **Búsqueda multi-campo con OR.** El patrón ya existe en `buscarClientesAction`. Lo replicamos en `listarClientes` para búsqueda en `/clientes`. Soporta `nombre`, `apellido`, `dni`, `telefono`, `email`.

5. **Modal "Nuevo cliente" en POS** con campos mínimos (nombre + apellido + dni + telefono). Si se necesita completar más datos, se hace después desde `/clientes/[id]/editar`.

6. **Historial del cliente reusa `listarVentas`** agregando filtro `clienteId`. No duplicamos lógica de listado.

7. **`/clientes/[id]` muestra ventas anuladas también** pero con badge gris "Anulada", para trazabilidad. La fila tiene link al ticket.

8. **Estadísticas vienen directo de `clientes.*`** (mantenidas por trigger), no las recalculamos.

### Alternativas Consideradas

- **Inline editing en la tabla:** Rechazado — excesivo para MVP, complica RLS visual de errores.
- **Vista única `/clientes/[id]` con tabs (datos/historial/notas):** Se descarta en favor de una sola vista con secciones; menos chrome y menor cantidad de routes.
- **Quick add desde POS sin modal (inline):** Rechazado — el form requiere 3-4 campos; un panel inline rompe el layout del checkout.
- **Importación CSV:** Pospuesto.

### Preguntas Abiertas

- **¿Permitir cierre desde POS con cliente nuevo creado?** Default sugerido = **sí**: el modal lo crea y devuelve el id; PanelPago lo selecciona como cliente de la venta actual sin recargar.
- **¿Validar DNI numérico de 7-8 dígitos?** Default sugerido = **no**, dejar texto libre en MVP.
- **¿Mostrar cumpleaños / próximos cumpleaños en `/clientes`?** Default sugerido = **fuera del MVP** (irá a `/dashboard` con otras métricas).

---

## Tareas Paso a Paso

### Paso 1: `lib/clientes/queries.ts`

**Acciones:**

- `getCtx()` helper estándar.
- `listarClientes(opts: { search?, soloActivos?, page?, pageSize? })`:
  - SELECT con count exact, filtros, OR multi-campo (`nombre.ilike`, `apellido.ilike`, `dni.ilike`, `telefono.ilike`, `email.ilike`) cuando `search`.
  - Orden por `nombre, apellido`.
- `obtenerCliente(id)`: SELECT cliente completo + return `Cliente | null`.
- Tipos: `ClienteListItem`, `ClienteDetalle` (idénticos a `Cliente` con métricas explícitas).

**Archivos afectados:**

- `app/lib/clientes/queries.ts` (nuevo)

---

### Paso 2: `actions/clientes.ts`

**Acciones:**

- `'use server'` con `requireCtx()` y `traducirError()`.
- `crearCliente(input)` valida `nombre`, hace insert con `tienda_id`, devuelve `{ id }`.
- `actualizarCliente(id, input)` con UPDATE limitado a campos editables (no toca métricas).
- `desactivarCliente(id)` UPDATE `activo=false`.
- `reactivarCliente(id)` UPDATE `activo=true`.
- `revalidatePath('/clientes')` y `/clientes/[id]` cuando aplique.
- Sanitización: `trim()` en strings, conversión `'' → null` para campos opcionales.

**Archivos afectados:**

- `app/app/actions/clientes.ts` (nuevo)

---

### Paso 3: `ClienteForm.tsx` (componente reusable)

**Acciones:**

- Props: `{ mode: 'create' | 'edit', initial?: Cliente, onSuccess?: (cliente) => void, redirectOnSuccess?: string }`.
- `useState` controlado por cada campo + `useTransition`.
- Submit:
  - Si `create` → `crearCliente()` y `router.push(redirectOnSuccess ?? '/clientes/{id}')` o `onSuccess`.
  - Si `edit` → `actualizarCliente()` y refresh.
- Layout en grid 2 cols (responsive 1 en mobile).
- Feedback inline (verde/rojo) tras submit.

**Archivos afectados:**

- `app/components/clientes/ClienteForm.tsx` (nuevo)

---

### Paso 4: Tabla y filtros

**Acciones:**

- `TablaClientes.tsx`: columnas Nombre + apellido, DNI, Teléfono, Email, Total compras, Monto total (formatARS), Última compra (formatDate), Estado (badge activo/inactivo), link "Ver →".
- `FiltrosClientes.tsx`: input búsqueda + switch "Incluir inactivos" + botones aplicar/limpiar.

**Archivos afectados:**

- `app/components/clientes/TablaClientes.tsx` (nuevo)
- `app/components/clientes/FiltrosClientes.tsx` (nuevo)

---

### Paso 5: Listado `/clientes`

**Acciones:**

- Reemplazar placeholder.
- Server page con searchParams `{ q?, inactivos?, page? }`.
- Llama `listarClientes`. Renderiza `FiltrosClientes`, `TablaClientes`, `Pagination`.
- Header con CTA `LinkButton href="/clientes/nuevo"`.
- `EmptyState` cuando `total === 0` con CTA crear.

**Archivos afectados:**

- `app/app/(dashboard)/clientes/page.tsx` (modificar)

---

### Paso 6: Alta `/clientes/nuevo`

**Acciones:**

- Server page que renderiza `<ClienteForm mode="create" />`.
- Header con back link a `/clientes`.

**Archivos afectados:**

- `app/app/(dashboard)/clientes/nuevo/page.tsx` (nuevo)

---

### Paso 7: Detalle `/clientes/[id]` + historial

**Acciones:**

- `params: Promise<{ id }>`.
- Cargar cliente con `obtenerCliente`. Si null → `notFound()`.
- Cargar ventas con `listarVentas({ clienteId, pageSize: 20 })` (extender query — Paso 8).
- Layout:
  - Header: nombre completo + estado badge + botones "Editar" y "Desactivar"/"Reactivar".
  - Stat cards: Total compras, Monto total, Última compra, Cliente desde (`created_at`).
  - Card datos: dni, telefono, email, dirección, ciudad, fecha_nacimiento, notas.
  - Sección historial: `ClienteHistorial` con tabla.

**Archivos afectados:**

- `app/app/(dashboard)/clientes/[id]/page.tsx` (nuevo)
- `app/components/clientes/ClienteHistorial.tsx` (nuevo)

---

### Paso 8: Extender `lib/ventas/queries.ts` con filtro `clienteId`

**Acciones:**

- `listarVentas` acepta `opts.clienteId?`.
- Si presente, agrega `.eq('cliente_id', clienteId)`.
- Tests manuales: `/clientes/[id]` lista ventas correctamente.

**Archivos afectados:**

- `app/lib/ventas/queries.ts` (modificar)

---

### Paso 9: Edición `/clientes/[id]/editar`

**Acciones:**

- Server page carga cliente, pasa a `<ClienteForm mode="edit" initial={cliente} />`.
- Tras submit redirige a `/clientes/[id]`.

**Archivos afectados:**

- `app/app/(dashboard)/clientes/[id]/editar/page.tsx` (nuevo)

---

### Paso 10: POS — modal "Nuevo cliente"

**Acciones:**

- `NuevoClienteModal.tsx` (client): props `{ open, onClose, onCreated: (cliente) => void }`. Form mínimo en modal (overlay + card) con nombre, apellido, dni, telefono. Submit a `crearCliente`. En éxito, llama `onCreated` con `{ id, nombre, apellido, dni, telefono }`.
- `PanelPago.tsx`:
  - Botón "+ Nuevo" al lado del buscador de cliente.
  - Estado `mostrarModal`. Al `onCreated`, lo asigna como `cliente` activo de la venta y cierra modal.

**Archivos afectados:**

- `app/components/clientes/NuevoClienteModal.tsx` (nuevo)
- `app/components/pos/PanelPago.tsx` (modificar)

---

### Paso 11: Link cliente en venta

**Acciones:**

- En `/ventas/[id]/page.tsx`, donde se muestre `cliente_nombre`, envolver en `<Link href="/clientes/{cliente_id}">` cuando `cliente_id` no sea null. (Si el ticket imprimible no debe tener link, dejar el ticket como texto plano y agregar link solo en la vista admin.)

**Archivos afectados:**

- `app/app/(dashboard)/ventas/[id]/page.tsx` (modificar mínimo)

---

### Paso 12: Validación

**Acciones:**

- `tsc --noEmit` exit 0.
- Pruebas manuales:
  1. Crear cliente desde `/clientes/nuevo`.
  2. Buscar por nombre, dni, teléfono.
  3. Editar y verificar persistencia.
  4. Desactivar y reactivar.
  5. Vender desde POS asignando cliente existente → ver métrica actualizada en `/clientes/[id]`.
  6. Vender desde POS creando cliente nuevo via modal → la venta queda asociada y el cliente aparece en `/clientes`.
  7. Anular venta y ver métricas decrementarse (trigger ya hace eso).

---

### Paso 13: Cerrar plan

- Marcar Estado=Implementado y agregar Notas de Implementación.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/actions/ventas.ts` — `buscarClientesAction` y `registrarVenta` (cliente_id opcional). **Sin cambios necesarios.**
- `app/components/pos/PanelPago.tsx` — selector de cliente existente. Se le agrega "+ Nuevo".
- `app/lib/ventas/queries.ts` — extender con `clienteId` (Paso 8).
- `app/types/database.ts` — `Cliente` ya tipado.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` / `app/CLAUDE.md`: opcional mencionar módulo Clientes como Implementado al cierre.
- `contexto/datos-actuales.md`: opcional.

### Impacto en Flujos de Trabajo Existentes

- POS gana flujo "+ Nuevo cliente" sin recargar.
- `/ventas` y `/ventas/[id]` pueden enlazar al cliente.
- Triggers de ventas (`actualizar_metricas_cliente`) operan sin cambios.

---

## Lista de Validación

- [ ] `lib/clientes/queries.ts` con `listarClientes`, `obtenerCliente` tipados.
- [ ] `actions/clientes.ts` con `crearCliente`, `actualizarCliente`, `desactivarCliente`, `reactivarCliente`.
- [ ] `/clientes` lista con búsqueda, filtros y paginación.
- [ ] `/clientes/nuevo` crea correctamente y redirige al detalle.
- [ ] `/clientes/[id]` muestra datos, métricas e historial.
- [ ] `/clientes/[id]/editar` permite editar y refleja cambios.
- [ ] Soft delete (desactivar/reactivar) funciona.
- [ ] POS: botón "+ Nuevo" abre modal y, al crear, deja al cliente asignado a la venta.
- [ ] `listarVentas` acepta `clienteId`.
- [ ] `/ventas/[id]` enlaza al cliente cuando aplica.
- [ ] `tsc --noEmit` exit 0.

---

## Criterios de Éxito

- Una tienda puede gestionar su CRM básico sin tocar la DB: alta, búsqueda, edición, baja, historial.
- Operación rápida en POS: el cajero crea un cliente y cierra la venta sin perder el carrito.
- Métricas (`total_compras`, `monto_total`, `ultima_compra`) se ven y reflejan correctamente las operaciones.
- El historial por cliente facilita atención post-venta (cambios, consultas, devoluciones futuras).

---

## Notas de Implementación

- **`lib/clientes/queries.ts`**: `listarClientes` con búsqueda OR multi-campo (nombre/apellido/dni/telefono/email), filtro `incluirInactivos`, paginación. `obtenerCliente` devuelve la fila completa.
- **`actions/clientes.ts`**: `crearCliente`, `actualizarCliente`, `desactivarCliente`, `reactivarCliente`. `sanitize()` convierte `''` → `null` para opcionales. Validación: `nombre` ≥ 2 chars.
- **`ClienteForm`**: reusable con prop `mode` y `compact`. En modo `compact` muestra solo nombre/apellido/dni/teléfono. Soporta `onSuccess` (modal) y `redirectOnSuccess` (page).
- **`NuevoClienteModal`**: form interno propio (no reusa `ClienteForm`) para poder devolver al callback los valores tipeados, no solo el `id`. Cierra con Escape o click en overlay. Prellena `nombre` con la query del buscador del POS.
- **`PanelPago` (POS)**: el `ClienteSelector` ahora tiene botón `+ Nuevo` al lado del input. Al crear, el cliente queda asignado a la venta sin perder el carrito.
- **`listarVentas`** acepta `clienteId` opcional (filtro `.eq('cliente_id', ...)`). Se reusa en `/clientes/[id]` para el historial (pageSize: 50).
- **`/clientes/[id]`**: stat cards (compras, monto total, ticket promedio, última compra), card datos, historial con badge anulada/completada y link a ticket.
- **`/ventas/[id]`**: card adicional bajo el ticket (sólo en pantalla, `print:hidden`) con link al cliente cuando `cliente_id != null`.
- **No se creó ninguna RPC** ni migration. Operaciones simples de insert/update + trigger ya existente `actualizar_metricas_cliente`.
- **Validación**: `tsc --noEmit` exit 0.
