# Plan: Edición de pedidos (mobile) y remito al aceptar

**Creado:** 2026-09-02
**Estado:** Implementado
**Pedido:** Mejorar visual y usabilidad de “modificar el pedido” (sobre todo teléfono); al aceptar, generar remito sin descontar stock ni cobrar; al confirmar el remito, seña o método de pago + stock + venta.

---

## Descripción General

### Qué Logra Este Plan

El inbox de pedidos se puede editar de verdad en el teléfono (cantidades, agregar, quitar, guardar) sin que la barra de Aceptar ni el BottomNav tapen los controles. Al **Aceptar**, en rubros con remitos (distribuidora) se emite el remito de inmediato para armar/imprimir; el stock no se mueve. Al **Confirmar remito** se abre el cobro (seña a cuenta o métodos de pago), se descuenta stock y se registra la venta, reutilizando ese mismo remito (no se duplica).

### Por Qué Importa

LaDistry arma pedidos del catálogo y los ajusta en el local, a menudo desde el celular. Hoy la ficha de edición es un `flex-wrap` de escritorio, el CTA fijo “Aceptar” cubre Guardar, y el cobro/remito/stock ocurren juntos al final. El comercio necesita el remito **antes** de salir a entregar, y cobrar recién cuando confirma esa entrega.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Dónde | Qué hay hoy |
|------|--------|-------------|
| Detalle | `PedidoDetalle.tsx` | Stepper Recibido → Aceptado → Listo → Cobrar. CTA fijo `bottom-0` (solo `sm:hidden`). Edición si no hay `venta_id`. Convertir desde confirmado/listo/entregado. |
| Edición | `EditarPedidoForm.tsx` | Líneas `flex-wrap` + `CatalogoQtyStepper` + Quitar. Buscador con dropdown `absolute z-10`. Guardar al final del form. Recosteo tramos + CC. |
| Cobro | `ConvertirPedidoModal.tsx` | “Confirmar envío/retiro y cobrar” → `CobroPagoModal` → `convertirPedidoAVenta`. Caja abierta. Seña solo si A cuenta. |
| Convertir | `actions/catalogo.ts` `convertirPedidoAVenta` | `registrarVenta` (stock + caja + pagos). Remito extra si envío y **no** `remitoAutoVenta`; si sí, el remito lo crea `registrarVenta`. |
| Remito auto POS | `actions/ventas.ts` | `remitoAutoVenta` crea remito **con** `venta_id` al cobrar. |
| Remito | `crearRemitoDesdeVenta` | `venta_id` obligatorio en la práctica; `remitos.venta_id` ya es nullable. Estados: borrador / emitido / entregado / anulado. |
| Layout | `AppShell` | BottomNav mobile `pb-16`. PedidoDetalle suma `pb-28` + barra fija → overlap. |
| Schema | `pedidos_catalogo.remito_id` | Se llena **después** de la venta. |

### Brechas o Problemas que se Abordan

1. **Mobile edición rota:** fila de producto no cabe a 360px; stepper/Quitar se apilan mal; Guardar queda bajo el CTA fijo + BottomNav; hits del buscador no son 44px y el overlay se corta.
2. **Aceptar no genera remito:** solo cambia `estado` a `confirmado`.
3. **Stock y cobro van juntos** al convertir; no hay documento de entrega previo.
4. **Riesgo de remito duplicado** si se crea uno al aceptar y `registrarVenta` vuelve a emitir por `remitoAutoVenta`.
5. Pasos Listo / Entregado sobran en este flujo (el hito es confirmar remito).

---

## Cambios Propuestos

### Resumen de Cambios

- Rehacer la UI de edición: cards mobile-first, buscador usable, barra de Guardar por encima del BottomNav (no tapada por Aceptar).
- **Aceptar** (si el rubro usa remitos y el plan tiene feature `remitos`): crear remito emitido **sin venta**, vincular `pedidos_catalogo.remito_id`. Stock intacto.
- Si se edita el pedido con remito aún sin venta: sincronizar ítems/montos del remito.
- **Confirmar remito** reemplaza “Confirmar envío/retiro y cobrar”: cobro (seña o métodos) + `registrarVenta` **sin** segundo remito + `UPDATE remitos SET venta_id` + estado pedido `convertido`. Remito pasa a `entregado`.
- Cancelar pedido con remito sin venta: anular remito.
- Rubros **sin** remitos: Aceptar sigue siendo solo estado; el cobro queda como hoy (sin generar remito al aceptar).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260902000002_remito_sin_venta_pedido.sql` | Índice único parcial: un remito “vivo” por pedido; comentario. `venta_id` ya es null. |
| `app/lib/catalogo/aceptar-pedido.ts` | Helper puro: si el rubro debe emitir remito al aceptar (`usarRemitos`). |
| `app/lib/catalogo/aceptar-pedido.test.ts` | Casos distribuidora vs ropa. |
| `app/components/pedidos/PedidoLineaEditor.tsx` | Card de línea (foto, qty, quitar) mobile-first. |
| `app/components/pedidos/PedidoBuscarProducto.tsx` | Buscador: lista/drawer bottom en mobile, dropdown en desktop. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/pedidos/EditarPedidoForm.tsx` | Layout nuevo; usa LineaEditor + Buscar; sticky Guardar; `scroll-mb` para teclado. |
| `app/components/pedidos/PedidoDetalle.tsx` | Stepper de 3 pasos si hay remitos; Aceptar llama action que crea remito; CTA fijo no tapa Guardar (`bottom-16` + gap); link/imprimir remito; Confirmar remito. |
| `app/components/pedidos/ConvertirPedidoModal.tsx` | Copy “Confirmar remito y cobrar”; hint de seña vs contado. |
| `app/app/actions/catalogo.ts` | `aceptarPedidoCatalogo`; sync remito en `actualizarPedidoCatalogo`; `convertirPedidoAVenta` vincula remito existente y pasa `omitirRemitoAuto`. Cancelar anula remito. |
| `app/app/actions/remitos.ts` | `crearRemitoDesdePedido` (`venta_id` null); `sincronizarRemitoPedido`; no `vincularCargoVentaAlRemito` hasta haber venta. |
| `app/app/actions/ventas.ts` | `RegistrarVentaInput.omitirRemitoAuto?: boolean`. |
| `app/app/(dashboard)/pedidos/page.tsx` | Copy: remito al aceptar; stock al confirmar remito. |
| `app/app/(dashboard)/pedidos/[id]/page.tsx` | Pasar `usarRemitos` / plan si hace falta (o leer de `useRubro` + `puedeUsar` en server). |
| `CLAUDE.md` + `referencia/catalogo-publico.md` + `contexto/proyectos.md` | Flujo: aceptar → remito; confirmar → cobro/stock. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Confirmar remito = cobro + stock + venta** (confirmado por el usuario). Reemplaza el botón actual de confirmar envío/retiro. No hay un paso extra de “marcar entregado” en el pedido.

2. **Remito al aceptar solo si `usarRemitos` y el plan tiene feature remitos.** Ropa/catálogo sin remitos no cambia el contrato (aceptar = estado; cobro descuenta stock como hoy).

3. **Remito sin `venta_id` hasta confirmar.** `estado = emitido` para poder imprimir. `estado_cobro = pendiente` si A cuenta, `no_aplica` si contado (hasta cobrar). No se llama al ledger CC hasta la venta.

4. **Edición permitida hasta confirmar** (mientras no hay `venta_id`). Guardar el pedido reescribe `remito_items` y `monto_total`.

5. **No duplicar remito:** `registrarVenta({ omitirRemitoAuto: true })` cuando el pedido ya tiene `remito_id`. Luego `UPDATE remitos SET venta_id, monto_cobrado, estado_cobro, estado = 'entregado'`.

6. **Seña:** igual que POS. A cuenta = seña opcional (pagos parciales). Contado = hay que cubrir el total con métodos (el “método de pago a elegir”). No inventar un tercer tipo `seña_contado` en este plan.

7. **CTA mobile:** barra inferior **una sola acción primaria contextual**. Si el pedido es editable y hay cambios pendientes, la barra es **Guardar**. Si está limpio y es Recibido, es **Aceptar pedido**. Si ya está aceptado con remito, es **Confirmar remito**. `bottom-[calc(4rem+env(safe-area-inset-bottom))]` para no tapar BottomNav. Padding del contenido equivalente.

8. **Buscar producto en mobile:** Drawer `side="bottom"` (ya existe) con filas `min-h-11`. Desktop mantiene dropdown.

9. **Cajeros:** no hace falta entrar a `/remitos`. Desde el pedido: link “Ver remito” + imprimir (componente de impresión existente). No tocar markup de `print.css`.

### Alternativas Consideradas

- **Remito en borrador hasta confirmar:** rechazado; el comercio quiere imprimir al aceptar.
- **Reservar stock al aceptar:** rechazado; el usuario pidió explícitamente no descontar hasta confirmar.
- **Confirmar remito desde `/remitos/[id]`:** posible extra, pero el flujo principal vive en `/pedidos/[id]` (cajeros).
- **Dejar pasos Listo/Entregado:** ruido. Se colapsan cuando hay remitos.

### Preguntas Abiertas (si las hay)

Ninguna bloqueante. Asunciones: seña solo en A cuenta; contado paga el total; edición post-aceptar sincroniza el remito.

---

## Tareas Paso a Paso

### Paso 1: Migración mínima

No hace falta `pedido_id` en `remitos` si `pedidos_catalogo.remito_id` es la fuente. Agregar índice único parcial para no duplicar remitos vivos:

```sql
create unique index if not exists pedidos_catalogo_remito_id_uidx
  on public.pedidos_catalogo (remito_id)
  where remito_id is not null;
```

Comentario en `remitos.venta_id`: null = emitido desde pedido, venta pendiente.

**Archivos afectados:**

- `supabase/migrations/20260902000002_remito_sin_venta_pedido.sql`

### Paso 2: Crear remito desde pedido (sin venta, sin stock)

`crearRemitoDesdePedido({ pedidoId, clienteId, tipo, destinatario, direccion, telefono, observaciones, montoTotal, items })`:

- Insert remito `venta_id = null`, `estado = 'emitido'`.
- Insert `remito_items`.
- **No** `vincularCargoVentaAlRemito`.
- Return `remitoId`.

`sincronizarRemitoPedido(remitoId, items, montoTotal, tipo)`: delete items + insert; update montos/tipo. Solo si `venta_id is null`.

**Archivos afectados:**

- `app/app/actions/remitos.ts`

### Paso 3: Aceptar pedido

Nueva action `aceptarPedidoCatalogo(pedidoId)`:

1. Transición `nuevo|visto → confirmado` (reusar `TRANSICIONES`).
2. Si no corresponde remito (`!usarRemitos` o plan sin feature): solo `update estado`.
3. Si ya tiene `remito_id`: no crear otro; sync ítems y `update estado`.
4. Asegurar `cliente_id` (mismo upsert por teléfono que en convertir).
5. Recostear líneas (misma `recostearLineasPedido`).
6. `crearRemitoDesdePedido` + `pedidos_catalogo.remito_id`.
7. `cambiarEstadoPedido` deja de ser el botón Aceptar en UI cuando hay remitos (sigue existiendo para listo si rubro sin remitos).

Helper `debeRemitoAlAceptar(rubro, planTieneRemitos)`.

**Archivos afectados:**

- `app/app/actions/catalogo.ts`
- `app/lib/catalogo/aceptar-pedido.ts` + test

### Paso 4: Sync al editar y al cancelar

En `actualizarPedidoCatalogo`, después de persistir ítems: si `remito_id` y `venta_id` null → `sincronizarRemitoPedido`.

En `cambiarEstadoPedido(..., 'cancelado')` o botón cancelar: si remito sin venta → `estado = anulado`.

**Archivos afectados:**

- `app/app/actions/catalogo.ts`

### Paso 5: Confirmar remito = venta

`RegistrarVentaInput.omitirRemitoAuto?: boolean`. En el bloque `if (configRubro.remitoAutoVenta)` saltar si omitir.

`convertirPedidoAVenta`:

- Permitir desde `confirmado` (y `listo`/`entregado` por compat).
- Pasar `omitirRemitoAuto: Boolean(p.remito_id)`.
- Tras venta ok: si hay `remito_id`, `UPDATE remitos SET venta_id, monto_cobrado, estado_cobro, estado = 'entregado'` + `vincularCargoVentaAlRemito`.
- No llamar `crearRemitoDesdeVenta` si ya había remito.
- Pedido → `convertido`.

Copy del modal: “Confirmar remito y cobrar”. Texto: “El stock se descuenta ahora. El remito ya está emitido.”

**Archivos afectados:**

- `app/app/actions/ventas.ts`
- `app/app/actions/catalogo.ts`
- `app/components/pedidos/ConvertirPedidoModal.tsx`

### Paso 6: UI edición mobile

`PedidoLineaEditor`:

- Grid: foto 56×56; nombre (2 líneas); eje1/eje2 vía `useRubro()` labels; precio u.; total.
- Fila inferior: stepper full-left; trash icon `min-h-11 min-w-11` a la derecha. Nunca `flex-wrap` del stepper con el título.
- Tope de stock visible.

`PedidoBuscarProducto`:

- Input `text-base` (ya en fieldStyles).
- Mobile: al tener hits o focus, Drawer bottom con lista.
- Desktop: dropdown actual pero filas `min-h-11`.

`EditarPedidoForm`:

- Quitar el botón Guardar del fondo del card; exponer `onDirtyChange` / `guardar` vía callback o barra interna sticky **dentro** del detalle (`sticky bottom-...` no `fixed` si choca con PedidoDetalle). Preferencia: PedidoDetalle posee **una** barra fija con la acción contextual (ver decisión 7).
- Condición CC + retiro/envío/notas en un bloque “Entrega” debajo de productos.
- Dirty: comparar lineas/notas/entrega/condicion con el snapshot inicial.

**Archivos afectados:**

- `app/components/pedidos/PedidoLineaEditor.tsx` (nuevo)
- `app/components/pedidos/PedidoBuscarProducto.tsx` (nuevo)
- `app/components/pedidos/EditarPedidoForm.tsx`

### Paso 7: UI detalle / stepper / CTAs

Si `usarRemitos`:

- Steps: Recibido → Aceptado → Cobrar (labels). Aceptado = hay remito o estado confirmado.
- Botón Aceptar → `aceptarPedidoCatalogo`. Toast/error si falla.
- Tras aceptar: badge + link `/remitos/[id]` + imprimir (reusar botón de descarga/impresión de remito si es client-safe; si la impresión es página `/remitos/[id]`, link “Abrir remito” basta).
- Mostrar `ConvertirPedidoModal` desde confirmado (no exigir listo). Ocultar “Marcar listo / entregado”.
- Barra mobile: ver decisión 7. Nunca `bottom-0` a pelo: dejar hueco para BottomNav (`h-16` + safe-area).
- `pb-[calc(8rem+env(safe-area-inset-bottom))]` en el scroller.

Si no hay remitos: stepper y CTAs actuales, pero **misma** barra que no tape BottomNav ni Guardar.

**Archivos afectados:**

- `app/components/pedidos/PedidoDetalle.tsx`
- `app/app/(dashboard)/pedidos/page.tsx` (descripción)

### Paso 8: Docs

Una línea en CLAUDE (flujo pedidos catálogo). Actualizar `referencia/catalogo-publico.md` (stock al confirmar remito, no al WhatsApp ni al aceptar). `contexto/proyectos.md`.

**Archivos afectados:**

- `CLAUDE.md`
- `referencia/catalogo-publico.md`
- `contexto/proyectos.md`

### Paso 9: Verificar

- `npx tsc --noEmit` en `app/`.
- Test `debeRemitoAlAceptar`.
- Viewport 360px: editar qty, agregar producto (drawer), Guardar visible y clickeable por encima del nav; Aceptar no tapa el stepper.
- Distribuidora: Aceptar crea remito (stock igual); Confirmar remito con caja abierta descuenta stock, un solo remito, venta vinculada.
- Ropa (sin remitos): Aceptar no crea remito; cobro como hoy.
- Cancelar pedido aceptado anula el remito.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

`registrarVenta` (POS mostrador) no debe cambiar salvo el flag opt-in `omitirRemitoAuto`. `RemitoAcciones` “Marcar entregado” en `/remitos` puede quedar; el pedido ya marca entregado al confirmar. Impresión: no tocar `styles/print.css` ni `RemitoImprimible*`.

### Actualizaciones Necesarias para Consistencia

Correr la SQL en Supabase antes de deploy (índice). Feature remitos = Pro; LaDistry Pro.

### Impacto en Flujos de Trabajo Existentes

POS de mostrador: igual. Pedidos catálogo en distribuidora: el remito aparece **antes** de la venta. Cajeros confirman y cobran desde el pedido. Pedidos viejos en `listo`/`entregado` sin remito: `convertirPedidoAVenta` sigue creando remito al cobrar (compat).

---

## Lista de Validación

- [ ] Migración aplicada en Supabase (`20260902000002`); `venta_id` null permitido en remitos de pedido.
- [ ] Teléfono 360px: qty +/− y Quitar usables; Guardar no tapado por nav ni por Aceptar.
- [ ] Agregar producto en el teléfono (drawer) suma la línea.
- [ ] Distribuidora: Aceptar → remito emitido, stock sin cambio.
- [ ] Editar qty después de aceptar actualiza el remito.
- [ ] Confirmar remito (caja abierta): venta + stock −qty + un remito con `venta_id`.
- [ ] A cuenta: seña parcial; resto en ledger.
- [ ] Contado: exige cubrir el total con método(s).
- [ ] Cancelar pedido aceptado anula el remito.
- [x] Ropa/sin remitos: no se crea remito al aceptar (helper `debeRemitoAlAceptar`).
- [x] `npx tsc --noEmit` ok.
- [x] CLAUDE.md y `referencia/catalogo-publico.md` actualizados.

---

## Criterios de Éxito

1. En un iPhone (o DevTools 360×800) se puede cambiar cantidades, agregar un SKU y guardar el pedido sin overlays que bloqueen los botones.
2. Aceptar un pedido LaDistry deja un remito imprimible y el stock de las variantes no baja.
3. Confirmar ese remito registra la venta (seña o pago completo), descuenta stock y no genera un segundo remito.

---

## Notas

- Correr `20260902000002_remito_sin_venta_pedido.sql` en Supabase.
- Caja sigue siendo requisito para **confirmar** (es una venta). Aceptar/imprimir remito no exige caja.
- Si el dashboard de remitos lista documentos sin venta, mostrar badge “Pedido #N · pendiente de cobro”. Si el listado actual rompe al no tener venta, filtrar o mostrar “—” en ticket; revisar `listarRemitos` en el paso 5 si aparece error.
- No reintroducir `lime-*`; primitives-first.

---

## Notas de Implementación

**Implementado:** 2026-09-02

### Resumen

Edición de pedidos mobile-first (cards, drawer de búsqueda, una barra contextual sobre el BottomNav). Aceptar en rubros con remitos emite un remito `emitido` sin `venta_id` ni movimiento de stock. Confirmar remito reusa `convertirPedidoAVenta` con `omitirRemitoAuto`, vincula la venta y marca el remito entregado. Cancelar anula el remito vivo.

### Desviaciones del Plan

- Al aceptar se recostean y persisten las líneas del pedido (no solo el remito), para que total y remito no diverjan.
- En el listado de remitos, sin venta y `estado = emitido`, el badge es **Pendiente de cobro** (no “Pedido #N”) porque el listado no trae el número de pedido.
- Tests del helper: `npx tsx --test lib/catalogo/aceptar-pedido.test.ts` (Node puro no resuelve alias `@/`).

### Problemas Encontrados

Ninguno bloqueante. Falta correr la SQL en Supabase y validar el flujo en un pedido real (caja abierta, 360px).
