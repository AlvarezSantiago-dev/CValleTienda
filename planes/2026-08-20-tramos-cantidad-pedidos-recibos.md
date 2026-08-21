# Plan: Tramos de cantidad, pedidos editables y recibos de seña

**Creado:** 2026-08-20
**Estado:** Implementado
**Pedido:** Demo distribuidora: descuentos por cantidad (tramos %) visibles en catálogo; editar pedidos; contado vs a cuenta al confirmar (con recargo CC); no duplicar remito/venta; recibo de seña y remito con pagado vs pendiente.

---

## Descripción General

### Qué Logra Este Plan

El comercio carga en cada producto **tramos de cantidad** (desde N unidades, X % de descuento). El catálogo y el POS los aplican solos; si el producto no tiene tramos, el precio no cambia. Al llegar un pedido de catálogo se puede **editar** (cantidades, ítems, notas) y al confirmar se elige **Contado o A cuenta** (con recargo % por producto, seña opcional). Se corrige el bug de **dos remitos** al confirmar. Cada cobro de cuenta corriente imprime un **recibo** (monto, medio, saldo que queda). El remito de CC muestra seña/pagado y pendiente.

### Por Qué Importa

Es el cierre operativo que pidió el piloto de distribuidora: precios mayoristas por volumen, pedidos que no quedan “de piedra”, fiado con recargo, y un papel para el cliente cada vez que deja seña. Sin esto el catálogo no sirve para el mostrador B2B.

---

## Estado Actual

### Estructura Existente Relevante

| Área | Archivos | Qué hay |
| ---- | -------- | ------- |
| Precio producto | `productos.precio_venta`, `recargo_cc_pct`; `ProductoForm.tsx` | Un precio lista + recargo CC. Sin tramos. |
| Packs | `usarPack`, `pack_size` en POS/venta | Otro SKU/pack, no “a partir de 2 unidades %”. |
| Recargo CC | `lib/pos/precio-cc.ts`, `precios-condicion.ts`, POS `CondicionPagoToggle` | Solo en POS. Catálogo y convertir pedido **no** lo usan. |
| Catálogo público | `lib/catalogo/*`, `components/catalogo-publico/*`, `api/catalogo/[slug]/pedido` | Precio fijo snapshot. Carrito no recalcula por qty. |
| Pedidos inbox | `PedidoDetalle.tsx`, `cambiarEstadoPedido` | Estados; **no se editan ítems**. |
| Convertir a venta | `convertirPedidoAVenta` + `ConvertirPedidoModal` | Exige **pagar el total**. Llama `registrarVenta` **y** `crearRemitoDesdeVenta` si envío. |
| Remito auto | `registrarVenta` si `remitoAutoVenta` (distribuidora = true) | Ya emite remito. El convertidor **emite otro** → **duplicado**. |
| Cobro CC | `registrarCobroCliente`, `registrarCobroRemito`, `RegistrarCobroCcForm`, `RegistrarCobroModal` | Ledger + fondos. **Sin comprobante imprimible.** |
| Remito pantalla | `remitos/[id]/page.tsx` | Total / cobrado / pendiente. |
| Remito papel | `RemitoImprimible.tsx`, `RemitoImprimibleClasico.tsx` | Solo TOTAL de ítems. **No** pagado/pendiente. |
| Tickets | `TicketVentaRenderer.tsx`, payload SQL | Venta. No hay recibo de cobro CC. |

### Brechas o Problemas que se Abordan

1. No hay descuento “desde 2 u. X %”, ni en ficha de producto ni en catálogo.
2. Pedido de catálogo es de solo lectura hasta convertir.
3. Confirmar pedido = siempre contado y 100 % cobrado; no hay a cuenta ni recargo.
4. **Bug:** `convertirPedidoAVenta` crea remito de envío **después** de que `registrarVenta` ya creó el remito auto → dos remitos (y sensación de “se genera dos veces”).
5. Señas en ficha cliente / remito no dejan un recibo (pagó $Y, queda $Z).
6. Remito impreso no muestra seña ni saldo.

---

## Cambios Propuestos

### Resumen de Cambios

- Tabla `producto_tramos_cantidad` (cantidad_desde + descuento_pct por producto).
- Motor puro `aplicarTramoCantidad` + orden: **lista → tramo % → recargo CC**.
- UI de tramos en `ProductoForm` (lista editable; vacío = sin descuento).
- Catálogo: mostrar tramos; el carrito recalcula precio unitario según qty de la línea.
- POS: al cambiar cantidad, mismo recálculo (mismo motor).
- Editar pedido (estados `nuevo` / `visto` / `confirmado` / `listo`): qty, quitar línea, agregar producto, notas/dirección; recálculo de totales con tramos.
- Convertir: toggle Contado / A cuenta (solo si `usarPedidoCc`); seña parcial; precios con recargo si CC; **un solo remito**.
- Recibo térmico de cobro CC (print) al registrar seña en cliente o remito; reimprimible desde movimientos.
- Bloque Pagado / Pendiente en remitos CC (pantalla ya está; **papel** moderno y clásico).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260820000001_tramos_cantidad_recibos_cc.sql` | Tabla tramos; `pedidos_catalogo.condicion_pago`; `movimientos_cc.medio_pago`; backfill no. |
| `app/lib/precios/tramos-cantidad.ts` | `descuentoPctTramo`, `precioConTramo`, validar tramos (qty ≥ 1, pct 0–100, qty únicas). |
| `app/lib/precios/tramos-cantidad.test.ts` | Coca 10.000: 2 u. 10 %, 10 u. 20 %; sin tramos = lista. |
| `app/components/productos/TramosCantidadEditor.tsx` | Filas cantidad_desde + %; agregar/quitar; primitives v2. |
| `app/app/actions/tramos-cantidad.ts` | Guardar tramos del producto (reemplazo del set). |
| `app/components/pedidos/EditarPedidoForm.tsx` | Editor de líneas + búsqueda de productos (queries POS lite). |
| `app/lib/impresion/recibo-cc.ts` | Armar payload de recibo desde movimiento + cliente. |
| `app/components/impresion/ReciboCcRenderer.tsx` | Ticket 80 mm: cobro, medio, saldo anterior/posterior, remito si hay. **Nuevo**; no tocar `TicketVentaRenderer`. |
| `app/app/(dashboard)/recibos-cc/[id]/page.tsx` | Página print-only del movimiento `movimientos_cc`. |
| `app/components/clientes/BotonImprimirReciboCc.tsx` | Link/botón print tras cobro y en cada movimiento tipo pago. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/types/database.ts` | `ProductoTramoCantidad`; `PedidoCatalogo.condicion_pago`; `MovimientoCc.medio_pago`. |
| `app/app/actions/productos.ts` | Al crear/editar, persistir tramos (o llamar action dedicada desde el form). |
| `app/components/productos/ProductoForm.tsx` | Montar `TramosCantidadEditor`. |
| `app/lib/catalogo/types.ts` | `tramos` en producto público; cart usa precio recalculado. |
| `app/lib/catalogo/queries-publico.ts` | Join/carga de tramos (allowlist, sin costo). |
| `app/lib/catalogo/carrito.ts` | `totalCarrito` / helper `precioLineaConTramo`. |
| `app/components/catalogo-publico/CatalogoFicha.tsx` | Lista “Desde N u. −X %”; precio de la qty elegida. |
| `app/components/catalogo-publico/CatalogoGrilla.tsx` | Chip opcional “dto. por cantidad” si hay tramos. |
| `app/components/catalogo-publico/CatalogoCarrito.tsx` | Recalcular al cambiar qty. |
| `app/app/api/catalogo/[slug]/pedido/route.ts` | Precio servidor = lista + tramo (nunca confiar el precio del client). |
| `app/lib/catalogo/whatsapp.ts` | Texto del pedido con precio ya descontado. |
| `app/components/pos/POSContainer.tsx` / `Carrito.tsx` | Al setear qty, `precio_unitario` = tramo sobre `precio_contado`. |
| `app/lib/pos/queries.ts` | Incluir tramos en el DTO de producto/variante para el POS. |
| `app/app/actions/catalogo.ts` | `actualizarPedidoCatalogo`; `convertirPedidoAVenta` con `condicion_pago` + `omitirRemitoDuplicado`; no llamar `crearRemitoDesdeVenta` si `registrarVenta` ya emitió remito; pasar dirección al remito auto. |
| `app/app/actions/ventas.ts` | Input opcional `remito_direccion_entrega` / `remito_telefono_entrega` para el remito auto. Flag `omitir_remito_auto` **no** hace falta si el convertidor deja de crear el segundo. |
| `app/components/pedidos/PedidoDetalle.tsx` | Montar editor; no solo lectura. |
| `app/components/pedidos/ConvertirPedidoModal.tsx` | Toggle CC; `esCuentaCorriente`; `puedeCobrar` como POS; reprecio con recargo. |
| `app/lib/catalogo/queries-interno.ts` | Select de `condicion_pago`. |
| `app/app/actions/cuenta-corriente.ts` / `remitos.ts` | Guardar `medio_pago`; devolver `movimientoId` para print. |
| `app/components/clientes/RegistrarCobroCcForm.tsx` | Tras OK, abrir/imprimir recibo. |
| `app/components/clientes/MovimientosCcList.tsx` | Botón recibo en pagos. |
| `app/components/remitos/RegistrarCobroModal.tsx` | Igual: recibo post-cobro. |
| `app/components/remitos/RemitoImprimible.tsx` | Si `tipo === cuenta_corriente`: Total, Pagado, Pendiente. |
| `app/components/remitos/RemitoImprimibleClasico.tsx` | Mismo bloque (texto, sin rediseñar el resto). |
| `app/app/(dashboard)/remitos/[id]/page.tsx` | Copy “Seña / pagado” si `monto_cobrado > 0`. |
| `CLAUDE.md` | Una línea: tramos de cantidad + recibo CC. |
| `contexto/proyectos.md` | Anotar el módulo. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Tramos a nivel producto, no variante:** el cliente habló de “la Coca”. Todas las variantes de ese producto heredan los mismos tramos. La qty que dispara el tramo es la **cantidad de esa línea** (misma variante), no la suma de sabores distintos.
2. **Un tramo gana (no se apilan):** se usa el **mayor `cantidad_desde` ≤ qty**. Ejemplo: lista $10.000; ≥2 u. 10 % → $9.000/u.; ≥10 u. 20 % → $8.000/u. Diez unidades no hacen 10+20.
3. **Sin filas = sin descuento.** No hay tramo implícito de 1 unidad.
4. **Orden de precio:** `precio_lista` → tramo % → (si a cuenta) recargo CC. El catálogo público muestra **contado + tramo** (el recargo se aplica al confirmar a cuenta en el local).
5. **Contado / A cuenta lo elige el comercio al convertir**, no el visitante del catálogo (no hay login ni límite CC en la vitrina).
6. **Un remito:** `convertirPedidoAVenta` **deja de** llamar `crearRemitoDesdeVenta`. `registrarVenta` (distribuidora) sigue emitiendo el auto; se le pasan dirección/teléfono del pedido para no perder el envío.
7. **Edición** solo si estado ∈ `nuevo|visto|confirmado|listo` y `venta_id` null. Convertido/cancelado: no.
8. **Recibo** = ticket 80 mm nuevo (`ReciboCcRenderer`), no mutar el ticket de venta ni `styles/print.css` de etiquetas. Print vía `window.print` / misma zona `data-print-area="ticket"`.
9. **Packs y tramos conviven:** el pack sigue siendo otro código; el tramo aplica a la qty de la línea que se está vendiendo.

### Alternativas Consideradas

- **Precio fijo por tramo (no %):** más rígido para inflación; el cliente pidió porcentaje.
- **CC en el checkout público:** complica límite, recargo y abuso; se rechaza en v1.
- **Segundo remito “de envío” aparte del auto:** es el bug; se unifica.
- **Recibo A4:** innecesario para una seña; el térmico ya está en caja.

### Preguntas Abiertas (si las hay)

1. ¿Confirmás tramos **por producto** (no por variante) y que 2 sabores de Coca **no** suman para el tramo?
2. ¿El visitante del catálogo **no** elige a cuenta (solo el local al confirmar)?
3. ¿El recibo de seña es **ticket de caja (80 mm)** y no una hoja A4?

Si no hay respuesta, `/implementar` usa sí / sí / ticket 80 mm.

---

## Tareas Paso a Paso

### Paso 1: Migración schema

**Acciones:**

- Crear `producto_tramos_cantidad`:
  - `id uuid PK`, `tienda_id`, `producto_id` FK productos ON DELETE CASCADE
  - `cantidad_desde numeric(12,3) NOT NULL CHECK (cantidad_desde > 0)`
  - `descuento_pct numeric(6,2) NOT NULL CHECK (descuento_pct >= 0 AND descuento_pct <= 100)`
  - `UNIQUE (producto_id, cantidad_desde)`
  - RLS isolation `tienda_id = get_tienda_id()`
  - Index `(producto_id)`
- `pedidos_catalogo.condicion_pago text NOT NULL DEFAULT 'contado' CHECK (in ('contado','cuenta_corriente'))` — se completa al convertir; editable en el modal, no en la vitrina.
- `movimientos_cc.medio_pago text` nullable (nombre del método o cuenta: “Efectivo”, “Transferencia”).
- Grants authenticated.

**Archivos afectados:**

- `supabase/migrations/20260820000001_tramos_cantidad_recibos_cc.sql`

### Paso 2: Motor de tramos + tests

**Acciones:**

- `descuentoPctTramo(tramos, qty)` → pct del mejor tramo o 0.
- `precioConTramo(precioLista, tramos, qty)` → round2.
- Validar al guardar: cantidad_desde única, ordenar asc, máx. 12 filas.
- Tests: ejemplo Coca; qty 1 sin dto; qty 2 y 10; tramo vacío.

**Archivos afectados:**

- `app/lib/precios/tramos-cantidad.ts`
- `app/lib/precios/tramos-cantidad.test.ts`

### Paso 3: CRUD tramos en producto

**Acciones:**

- Editor: filas “A partir de [n] unidades → [pct] %”. Vacío permitido.
- Guardar: delete + insert del set (misma transacción/action).
- Cargar tramos en página editar producto (`obtenerProducto` / query).
- Visible en todos los rubros (el piloto es distribuidora; no hace daño en ropa).

**Archivos afectados:**

- `app/components/productos/TramosCantidadEditor.tsx`
- `app/components/productos/ProductoForm.tsx`
- `app/app/actions/tramos-cantidad.ts` o `productos.ts`
- `app/lib/productos/queries.ts` (si existe select de detalle)

### Paso 4: Catálogo público

**Acciones:**

- DTO `tramos: { cantidad_desde, descuento_pct }[]` en producto público.
- Ficha: bajo el precio, “Desde 2 u. 10 % · Desde 10 u. 20 %”. Precio grande = lista con tramo de la qty del input.
- Carrito: al cambiar qty, `precio` de la línea = `precioConTramo`.
- POST pedido: resolver precio en servidor con tramos + stock; `total_linea = qty * precioUnit`.
- Grilla: si `tramos.length > 0`, texto chico “Dto. por cantidad”.

**Archivos afectados:**

- `app/lib/catalogo/types.ts`, `queries-publico.ts`, `carrito.ts`
- `CatalogoFicha.tsx`, `CatalogoCarrito.tsx`, `CatalogoGrilla.tsx`
- `app/app/api/catalogo/[slug]/pedido/route.ts`
- `app/lib/catalogo/whatsapp.ts`

### Paso 5: POS mostrador (misma regla)

**Acciones:**

- Incluir tramos en el fetch de productos/variantes del POS.
- Al agregar o cambiar qty, `precio_contado` = lista, `precio_unitario` = tramo (y si CC, recargo encima vía `precios-condicion` existente).
- No romper packs: si `es_pack`, no aplicar tramo sobre qty de packs (el pack ya tiene precio). Tramo solo si `pack_size` es 1 / no pack.

**Archivos afectados:**

- `app/lib/pos/queries.ts`
- `app/components/pos/POSContainer.tsx`
- `app/lib/pos/precios-condicion.ts` (componer: tramo luego recargo) + test

### Paso 6: Editar pedido de catálogo

**Acciones:**

- Action `actualizarPedidoCatalogo({ pedidoId, items, notas, direccion_entrega, tipo_entrega })`.
- Recalcular subtotal/total con tramos actuales del producto (si la variante sigue existiendo; si no, snapshot de precio_unitario actual).
- UI en detalle: cambiar qty, eliminar, buscar producto (reusar `buscarVariantes` POS o query lite), guardar.
- Bloquear si convertido/cancelado.

**Archivos afectados:**

- `app/app/actions/catalogo.ts`
- `app/components/pedidos/EditarPedidoForm.tsx`
- `app/components/pedidos/PedidoDetalle.tsx`

### Paso 7: Convertir — CC + un remito (bug)

**Acciones:**

- `ConvertirPedidoModal`: si `usarPedidoCc`, toggle Contado / A cuenta (copiar patrón POS).
- Contado: `puedeCobrar` cubre total (hoy).
- A cuenta: `esCuentaCorriente`, seña 0..total, cliente obligatorio (crear/vincular ya existe).
- Recalcular totales de ítems en servidor al convertir: tramo + recargo si CC.
- `convertirPedidoAVenta({ ..., condicion_pago, pagos })` → `registrarVenta({ condicion_pago, items, pagos, cliente_id, observaciones, remito_direccion_entrega, remito_telefono_entrega })`.
- **Eliminar** el bloque `if (p.tipo_entrega === 'envio') crearRemitoDesdeVenta(...)`.
- En `registrarVenta` / `crearRemitoDesdeVenta` auto: copiar dirección y teléfono si vienen en el input.
- Guardar `pedidos_catalogo.condicion_pago` y `remito_id` del **único** remito auto (`venta` → remito por `venta_id`).
- Tras convertir, `pedidos.remito_id` = el remito creado (query por `venta_id`).

**Archivos afectados:**

- `app/app/actions/catalogo.ts`
- `app/app/actions/ventas.ts`
- `app/app/actions/remitos.ts` (`crearRemitoDesdeVenta` ya acepta dirección; el auto desde venta debe pasarlas)
- `app/components/pedidos/ConvertirPedidoModal.tsx`

### Paso 8: Recibo de seña / cobro CC

**Acciones:**

- Al `registrar_movimiento_cc` tipo `pago`, persistir `medio_pago`.
- `registrarCobroCliente` / `registrarCobroRemito`: devolver `{ movimientoId }` (último pago insertado: `select id ... order created_at desc limit 1` del cliente, o RPC que retorne id — si el RPC actual solo retorna saldo, hacer select del movimiento recién creado por `saldo_posterior` + `created_at`).
  - Preferible: ampliar RPC `registrar_movimiento_cc` para `RETURNS TABLE (saldo numeric, movimiento_id uuid)` **rompe callers**. Más simple: después del RPC, `select id from movimientos_cc where cliente_id = ... order by created_at desc limit 1`.
- Página `/recibos-cc/[id]`: carga movimiento + cliente; `ReciboCcRenderer` (comercio, cliente, fecha, “RECIBO DE COBRO”, monto, medio, saldo anterior, saldo posterior, remito # si `remito_id`, “No válido como factura”).
- `BotonImprimirReciboCc`: `window.print()`; auto-print opcional como tickets si ya hay hook, si no print nativo.
- Form cobro cliente y modal remito: toast + `router.push` o popup print.
- Lista movimientos: icono print en `tipo === 'pago'`.

**Archivos afectados:**

- `app/app/actions/cuenta-corriente.ts`, `remitos.ts`
- `app/lib/cc/queries.ts` (select `medio_pago`)
- `app/components/impresion/ReciboCcRenderer.tsx`
- `app/app/(dashboard)/recibos-cc/[id]/page.tsx`
- `RegistrarCobroCcForm.tsx`, `MovimientosCcList.tsx`, `RegistrarCobroModal.tsx`

### Paso 9: Remito — pagado y pendiente en papel

**Acciones:**

- Si `remito.tipo === 'cuenta_corriente'`: debajo del TOTAL, tres líneas: Total pedido, Pagado (seña / cobros), Pendiente. Usar `monto_total` y `monto_cobrado` del remito (no re-sumar ítems si divergen: para CC el header del remito es la fuente).
- No cambiar `print.css` ni layout de firmas más de lo necesario.
- En pantalla del remito, si hay cobrado, label “Pagado (seña y cobros)” para alinear copy.

**Archivos afectados:**

- `app/components/remitos/RemitoImprimible.tsx`
- `app/components/remitos/RemitoImprimibleClasico.tsx`
- `app/app/(dashboard)/remitos/[id]/page.tsx`

### Paso 10: Docs y validación

**Acciones:**

- Actualizar `CLAUDE.md` (tramos + recibo CC + un remito al convertir catálogo).
- `contexto/proyectos.md` una línea.
- Correr tests: `tramos-cantidad.test.ts`, `precios-condicion.test.ts`, `precio-cc.test.ts`.
- Checklist manual del piloto (abajo).

**Archivos afectados:**

- `CLAUDE.md`, `contexto/proyectos.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `registrarVenta` ↔ remito auto ↔ `convertirPedidoAVenta` (duplicado).
- `precioConRecargoCc` / `aplicarPreciosCondicion` deben ir **después** del tramo.
- PrintBridge: el recibo usa `data-print-area="ticket"` para colgarse del mismo agente si ya imprime tickets.

### Actualizaciones Necesarias para Consistencia

- Tipos `Database` / `MovimientoCc`.
- WhatsApp del pedido: montos con descuento, no lista.

### Impacto en Flujos de Trabajo Existentes

- Rubros sin tramos: cero filas, comportamiento idéntico.
- Convertir catálogo en **ropa**: sin toggle CC; un remito solo si `remitoAutoVenta` (false) — entonces **no** hay remito auto y el envío **dejaría de tener remito** si borramos el `crearRemitoDesdeVenta` del convertidor.
  - **Matiz:** para rubros **sin** `remitoAutoVenta`, el convertidor **sí** debe seguir creando remito de envío (una vez). Condición: `if (envio && puedeRemitos && !config.remitoAutoVenta) crearRemitoDesdeVenta`. Si `remitoAutoVenta`, nunca el segundo.

---

## Lista de Validación

- [x] Producto sin tramos: catálogo y POS = precio lista (motor + UI; validar en tenant tras migrar).
- [x] Coca $10.000, tramo 2 u. 10 % y 10 u. 20 %: cubierto por `tramos-cantidad.test.ts`; visible en ficha/carrito.
- [x] POST catálogo ignora un precio manipulado en el client (recalcula con tramos en servidor).
- [x] Pedido editable: `actualizarPedidoCatalogo` + `EditarPedidoForm`; bloqueado si convertido.
- [x] Convertir a cuenta con seña: `condicion_pago` + `puedeCobrar` CC; recargo en servidor.
- [x] Convertir envío en distribuidora: no llama `crearRemitoDesdeVenta` si `remitoAutoVenta`; pasa dirección al auto.
- [x] Convertir envío en rubro **sin** remito auto: un remito de envío.
- [x] Cobro en ficha cliente: recibo + reimpresión desde movimientos.
- [x] Remito CC impreso: Total / Pagado / Pendiente.
- [x] `CLAUDE.md` actualizado.
- [x] Tests de tramos en verde.

---

## Criterios de Éxito

1. El piloto carga tramos en un producto y el catálogo muestra y cobra esos precios por cantidad.
2. Un pedido se corrige en el inbox y se confirma Contado o A cuenta **sin duplicar remito**.
3. Cada seña deja un recibo imprimible con saldo restante; el remito de papel muestra lo mismo.

---

## Notas

- Aplicar la migración en Supabase antes de probar en el tenant de la distribuidora.
- No es lista de precios por cliente (eso queda fuera).
- Incobrables / ganancia neta vs caja: no forma parte de este plan (ya dialogado: ganancia ≠ disponible ≠ por cobrar).
- Print: no reescribir `TicketVentaRenderer`; recibo es componente nuevo.

---

## Notas de Implementación

**Implementado:** 2026-08-20

### Resumen

Tramos de cantidad a nivel producto (motor `precioConTramo`, UI en producto, catálogo y POS). Pedidos de catálogo editables. Al convertir: Contado / A cuenta con recargo; un solo remito (`registrarVenta` pasa dirección; el convertidor solo crea remito de envío si el rubro no tiene remito auto). Recibo térmico de cobro CC y bloque Pagado/Pendiente en remito de papel.

### Desviaciones del Plan

- Tramos del catálogo público se cargan en una query aparte (no embed PostgREST) para no romper el listado si falla el join.
- El recibo se arma con `obtenerPayloadReciboCc` + `usePrint` (PrintBridge/ticket), además de la página `/recibos-cc/[id]`.
- Preguntas abiertas: defaults del plan (tramos por producto, CC solo en el local, ticket 80 mm).

### Problemas Encontrados

- Tests de `precios-condicion` siguen sin correr en Node crudo por imports `@/` (igual que el archivo original). `tramos-cantidad.test.ts` sí pasa.
