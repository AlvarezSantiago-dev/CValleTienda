# Plan: Módulo Devoluciones

**Creado:** 2026-04-29
**Estado:** Implementado
**Pedido:** Módulo Devoluciones — registrar devoluciones (totales / parciales) sobre ventas existentes, reponer stock, devolver fondos al cliente y emitir comprobante.

---

## Descripción General

### Qué Logra Este Plan

Habilita la operación diaria de **cambios y devoluciones**: el operador busca una venta, marca qué ítems se devuelven, define cómo le devuelve el dinero al cliente y emite un comprobante imprimible. El stock vuelve, los fondos salen de la cuenta correspondiente y las métricas del cliente se ajustan — todo automático vía triggers ya existentes.

### Por Qué Importa

- **Operación real:** las tiendas de ropa tienen cambios/devoluciones diarios (talle, color, defectos).
- **Ya está casi listo en DB:** migration 011 creó tablas, RLS, triggers y RPC. Solo falta UI + una server action que orqueste los inserts.
- **Cierra el flujo POS:** vender → cobrar → devolver. Sin esto, el operador tiene que hacer ajustes manuales de stock y movimientos de caja.

---

## Estado Actual

### Estructura Existente Relevante

**DB (todo en migration `20260419000011_devoluciones.sql`, ya aplicada):**

- `devoluciones`: cabecera con `numero_devolucion` único por tienda, `tipo` (total | parcial), `motivo` (NOT NULL), `total_devuelto`, `estado` (completada | anulada), FKs a venta, sesión, usuario, cliente.
- `detalles_devolucion`: línea por ítem con snapshot inmutable (nombre, codigo_barras, talla, color, cantidad, precio_unitario, total_linea) y FK opcional a `detalles_venta` y `variantes_producto`.
- `pagos_devolucion`: cómo se devuelve el dinero (FK a método de pago + cuenta de fondos, snapshots de nombre, monto, referencia).
- **Triggers automáticos** (no replicar lógica en TS):
  1. `pagos_devolucion_mover_fondos` → al insertar pago, hace egreso vía `registrar_movimiento_fondo`.
  2. `detalles_devolucion_reponer_stock` → al insertar detalle, suma stock de la variante y registra `movimientos_stock` con `tipo='devolucion'`.
  3. `devoluciones_actualizar_cliente` → al insertar cabecera, decrementa `total_compras` (si tipo='total') y `monto_total` del cliente.
- **RPC** `get_siguiente_numero_devolucion(p_tienda_id)` → numeración atómica.
- Enums TS ya definidos: `TipoDevolucion`, `EstadoDevolucion`, `TipoMovimientoStock` incluye `'devolucion'`.

**App:**

- `/devoluciones/*` no existe.
- `/ventas/[id]` ya muestra la venta completa con detalles + pagos. Falta botón "Devolver".
- `lib/configuracion/queries.ts` expone métodos de pago y cuentas de fondos (reusable).
- `components/ventas/TicketImprimible.tsx` y `PrintButtonClient.tsx` son patrones reusables para el ticket de devolución.

### Brechas o Problemas que se Abordan

- No hay forma de procesar una devolución desde la UI.
- El stock devuelto se ajusta manualmente desde `/stock/[id]` (impreciso).
- Los egresos de caja por devolución se registran a mano.
- El cliente no ve sus devoluciones en la ficha (en MVP no se muestran, ver Fuera de alcance).

### Cuidado: Doble Conteo de Métricas

Si el operador anulara la venta (`ventas.estado='anulada'`) además de hacer la devolución total, el trigger `actualizar_metricas_cliente` (en `ventas`) decrementaría las métricas, **y** el trigger `devoluciones_actualizar_cliente` también lo haría → doble decremento. **Decisión:** este módulo **NO toca `ventas.estado`**. Una devolución total deja la venta como `completada` y la devolución compensa el monto. Anular la venta queda como flujo separado (futuro).

---

## Cambios Propuestos

### Resumen de Cambios

- **Lib:** `devoluciones/queries.ts` con `listarDevoluciones`, `obtenerDevolucionCompleta`, `obtenerDevolucionesPorVenta`.
- **Lib (extender):** `ventas/queries.ts` ya tiene `obtenerVentaCompleta`. Agregar helper `calcularSaldoDevolverPorLinea(detalleVentaId)` que devuelve cuánto se puede aún devolver de cada línea (qty original − qty ya devuelta).
- **Action:** `actions/devoluciones.ts → registrarDevolucion(input)` que orquesta:
  1. RPC `get_siguiente_numero_devolucion`.
  2. Insert cabecera `devoluciones` (trigger ajusta cliente).
  3. Inserts `detalles_devolucion` (trigger repone stock + movimiento).
  4. Inserts `pagos_devolucion` (trigger egresa fondos).
  5. `revalidatePath` de `/ventas`, `/ventas/[id]`, `/devoluciones`, `/stock`, `/clientes/[id]`, `/caja`.
- **Pages:**
  - `/devoluciones` listado paginado.
  - `/devoluciones/nueva?venta_id=...` form.
  - `/devoluciones/[id]` detalle + ticket imprimible.
- **Components:**
  - `TablaDevoluciones.tsx`.
  - `FiltrosDevoluciones.tsx` (búsqueda por #, rango fechas, tipo).
  - `DevolucionForm.tsx` (cliente — selecciona líneas, cantidades, motivo y métodos de devolución).
  - `TicketDevolucion.tsx` (server, similar a `TicketImprimible`).
- **Ventas:**
  - En `/ventas/[id]` agregar botón "Devolver" (si la venta es `completada` y queda algo por devolver) → link a `/devoluciones/nueva?venta_id={id}`.
  - Mostrar listado de devoluciones existentes asociadas a la venta.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/lib/devoluciones/queries.ts` | `listarDevoluciones`, `obtenerDevolucionCompleta`, `obtenerDevolucionesPorVenta`, `calcularSaldoDevolverPorLinea`. |
| `app/app/actions/devoluciones.ts` | `registrarDevolucion`. |
| `app/components/devoluciones/TablaDevoluciones.tsx` | Server table con #, fecha, venta origen, cliente, total, tipo, link detalle. |
| `app/components/devoluciones/FiltrosDevoluciones.tsx` | Client form con búsqueda + rango fechas + tipo. |
| `app/components/devoluciones/DevolucionForm.tsx` | Client form principal: selección de líneas, cantidades, motivo, métodos de pago. |
| `app/components/devoluciones/TicketDevolucion.tsx` | Server component imprimible. |
| `app/app/(dashboard)/devoluciones/page.tsx` | Listado. |
| `app/app/(dashboard)/devoluciones/nueva/page.tsx` | Form de alta (lee `venta_id` de searchParams). |
| `app/app/(dashboard)/devoluciones/[id]/page.tsx` | Detalle + ticket + print. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/(dashboard)/ventas/[id]/page.tsx` | Botón "Devolver" si aplica + sección "Devoluciones de esta venta" con links. |
| `app/lib/ventas/queries.ts` | Agregar `obtenerVentaConDevoluciones(id)` o exponer `cantidades_ya_devueltas` en `VentaCompleta` (subquery a `detalles_devolucion`). |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **No tocar `ventas.estado`.** Las devoluciones (totales o parciales) no anulan la venta. Una venta `completada` con devolución total queda como `completada` + tiene `devoluciones[]` que netean el monto. La anulación de venta es un flujo aparte (no incluido).

2. **Confiar en triggers DB para efectos colaterales.** El TS solo orquesta inserts en orden. Stock, fondos y métricas del cliente los hace la base. Esto evita inconsistencias y duplica el modelo del módulo Stock (que ya usa RPC).

3. **`tipo` se calcula automáticamente:** si la suma de cantidades devueltas ahora + las ya devueltas previamente = total de la venta original, → `'total'`; si no, `'parcial'`. El usuario no elige el tipo manualmente.

4. **Saldo por línea visible en el form.** Cada línea muestra: cantidad vendida, cantidad ya devuelta, cantidad disponible para devolver. El operador no puede exceder lo disponible.

5. **Pagos de devolución sin restricción de método de pago original.** Aunque la venta se cobró 50% efectivo + 50% MP, la devolución puede ser 100% efectivo (común si el MP no se devuelve fácil). Validamos solo que `sum(pagos_devolucion.monto) == total_devuelto`.

6. **Sesión de caja:** si hay sesión abierta y el método incluye efectivo, asociamos `sesion_caja_id`. Si no hay sesión abierta y se requiere pago en efectivo → bloqueamos con mensaje claro (mismo patrón que ventas).

7. **Motivo obligatorio (texto libre).** Sin enums predefinidos en MVP. Después se puede agregar dropdown de motivos comunes.

8. **Numeración:** RPC ya implementada y atómica. No hace falta nada en TS.

9. **Devolución desde POS** → pospuesto. En MVP, se accede desde `/ventas/[id]` o `/devoluciones`. Esto evita meter más complejidad en el panel de cobro.

### Alternativas Consideradas

- **Reusar `registrar_venta` como RPC de devolución:** rechazado — los flujos son distintos (sentido del fondo, sin cobro de cliente).
- **Permitir devolver sin venta de origen (devolución "directa"):** rechazado para MVP — la migración exige `venta_id NOT NULL`.
- **Ticket combinado (venta + devolución):** rechazado — confunde al cliente.
- **Modal para crear devolución sin salir de `/ventas/[id]`:** descartado — el form tiene 2-3 secciones y tiene que respirar; mejor en su propia ruta.

### Preguntas Abiertas

- **¿Permitir devoluciones sin asociar a sesión de caja abierta cuando el pago de devolución NO incluye efectivo (ej: solo MP)?** Default sugerido = **sí**: solo bloquear cuando hay devolución de efectivo y no hay sesión.
- **¿Mostrar devoluciones en la ficha del cliente (`/clientes/[id]`)?** Default sugerido = **fuera del MVP**; suficiente con que `total_compras` y `monto_total` ya se decrementan.
- **¿Agregar columna "neto" en listado de ventas (`total - sum(devoluciones)`)?** Default sugerido = **fuera del MVP**, lo agregamos al hacer el dashboard.

---

## Tareas Paso a Paso

### Paso 1: `lib/devoluciones/queries.ts`

**Acciones:**

- `getCtx()` estándar.
- `listarDevoluciones(opts)` con paginación, filtros (`q` por número o ticket, `desde`, `hasta`, `tipo`). SELECT con joins a `ventas(numero_ticket)`, `clientes(nombre, apellido)`, `perfiles(nombre, apellido)`.
- `obtenerDevolucionCompleta(id)`: cabecera + detalles + pagos + datos de venta y cliente (mismo patrón que `obtenerVentaCompleta`).
- `obtenerDevolucionesPorVenta(ventaId)`: lista resumen para mostrar en `/ventas/[id]`.
- `calcularSaldoDevolverPorLinea(ventaId)`: devuelve `Map<detalle_venta_id, { vendida, devuelta, disponible }>`. Implementación: query a `detalles_devolucion` filtrando por `detalle_venta_id IN (ids de la venta)`, sumando cantidades agrupadas.

**Archivos afectados:**

- `app/lib/devoluciones/queries.ts` (nuevo)

---

### Paso 2: Extender `lib/ventas/queries.ts`

**Acciones:**

- Añadir `obtenerVentaParaDevolucion(id)` que devuelva la venta completa + para cada línea agrega `cantidad_ya_devuelta` y `disponible_devolver`.
- Reutiliza `calcularSaldoDevolverPorLinea` del Paso 1.

**Archivos afectados:**

- `app/lib/ventas/queries.ts` (modificar)

---

### Paso 3: `actions/devoluciones.ts`

**Acciones:**

- Tipo `RegistrarDevolucionInput`:
  ```ts
  {
    venta_id: string,
    motivo: string,
    cliente_id: string | null, // hereda de la venta
    lineas: Array<{
      detalle_venta_id: string,
      variante_id: string | null,
      nombre_producto: string,
      codigo_barras: string | null,
      talla: string | null,
      color: string | null,
      cantidad: number,
      precio_unitario: number,
    }>,
    pagos: Array<{
      metodo_pago_id: string,
      cuenta_fondo_id: string,
      monto: number,
      referencia?: string | null,
    }>,
  }
  ```
- Validaciones server-side:
  - `motivo.trim()` no vacío.
  - `lineas.length > 0` y cada `cantidad > 0`.
  - Para cada línea: `cantidad ≤ disponible_devolver` (re-checkear contra DB, no confiar en cliente).
  - `sum(pagos.monto) == total_devuelto` (con tolerancia 0.01).
  - Si algún pago es de cuenta efectivo → exigir sesión de caja abierta.
- Pasos:
  1. `requireCtx()` → `tiendaId`, `userId`.
  2. `obtenerSesionAbierta()` para `sesion_caja_id` opcional.
  3. RPC `get_siguiente_numero_devolucion`.
  4. Calcular `total_devuelto = sum(linea.cantidad * linea.precio_unitario)`.
  5. Determinar `tipo`: si la suma total devuelta (incluyendo previas) == total vendido → `'total'`, si no → `'parcial'`.
  6. Insert cabecera `devoluciones` → guarda id.
  7. Insert detalles (loop) — calculando `total_linea = cantidad * precio_unitario`.
  8. Insert pagos (loop) — snapshot `nombre_metodo`, `nombre_cuenta` desde la config.
  9. `revalidatePath` de rutas afectadas.
  10. Devolver `{ id, numero_devolucion }` para redirect.
- `traducirError` con mensajes específicos: stock_actual, sesión cerrada, sin permisos.

**Archivos afectados:**

- `app/app/actions/devoluciones.ts` (nuevo)

---

### Paso 4: `DevolucionForm.tsx`

**Acciones:**

- Recibe `venta` (con líneas + saldos) y `metodos`/`cuentas` para pagos.
- Por cada línea: input de cantidad (0 a `disponible_devolver`), checkbox "incluir".
- Campo `motivo` (textarea).
- Sección pagos: reusa `PagoMultiMetodo` del POS (ya existe) o duplica simplificado — preferimos **reusar** el componente existente porque ya maneja métodos múltiples.
- Suma calculada en tiempo real → muestra "Total a devolver: $X".
- Bloquea submit si:
  - Ninguna línea seleccionada con cantidad > 0.
  - Motivo vacío.
  - `sum(pagos) ≠ total`.
- Submit con `useTransition`; en éxito redirige a `/devoluciones/{id}`.

**Archivos afectados:**

- `app/components/devoluciones/DevolucionForm.tsx` (nuevo)

---

### Paso 5: Tabla y filtros

**Acciones:**

- `TablaDevoluciones.tsx`: columnas #Dev, fecha, #Venta, cliente, motivo (truncado), total, tipo (badge), link "Ver →".
- `FiltrosDevoluciones.tsx`: input búsqueda (# devolución o # venta), rango de fechas (desde/hasta), select tipo (todos / total / parcial), botones aplicar/limpiar.

**Archivos afectados:**

- `app/components/devoluciones/TablaDevoluciones.tsx` (nuevo)
- `app/components/devoluciones/FiltrosDevoluciones.tsx` (nuevo)

---

### Paso 6: `TicketDevolucion.tsx`

**Acciones:**

- Server component con datos de devolución completa.
- Estructura paralela a `TicketImprimible`: header con datos de tienda, # devolución, fecha, cliente, líneas devueltas, total, pagos (egresos), motivo, footer.
- Estilos `print:` para impresión 80mm.

**Archivos afectados:**

- `app/components/devoluciones/TicketDevolucion.tsx` (nuevo)

---

### Paso 7: Páginas

**Acciones:**

- `/devoluciones` (listado): mismo patrón de `/clientes` o `/ventas`. SearchParams `{ q?, desde?, hasta?, tipo?, page? }`. Renderiza filtros + tabla + paginación.
- `/devoluciones/nueva?venta_id=...`:
  - Lee searchParams. Si falta `venta_id` → `notFound()`.
  - Carga venta con saldos. Si no hay nada por devolver → muestra mensaje.
  - Carga métodos + cuentas.
  - Renderiza `DevolucionForm`.
- `/devoluciones/[id]`:
  - Carga devolución completa. Si null → `notFound()`.
  - Header con # devolución, link a venta origen, link a cliente.
  - `TicketDevolucion` + `PrintButtonClient`.

**Archivos afectados:**

- `app/app/(dashboard)/devoluciones/page.tsx` (nuevo)
- `app/app/(dashboard)/devoluciones/nueva/page.tsx` (nuevo)
- `app/app/(dashboard)/devoluciones/[id]/page.tsx` (nuevo)

---

### Paso 8: Integrar en `/ventas/[id]`

**Acciones:**

- Calcular si la venta tiene saldo a devolver.
- Mostrar botón "Devolver" → link a `/devoluciones/nueva?venta_id={id}` (deshabilitado si saldo = 0).
- Listar devoluciones de esta venta con link al detalle.

**Archivos afectados:**

- `app/app/(dashboard)/ventas/[id]/page.tsx` (modificar)

---

### Paso 9: Validación y QA manual

**Acciones:**

- `tsc --noEmit` exit 0.
- Casos:
  1. Devolver 1 ítem de 2 → tipo=parcial, stock sube +1, fondo egresa, cliente ajusta monto.
  2. Devolver todo → tipo=total, métricas decrementan.
  3. Intentar devolver más que disponible → bloqueo en form y server.
  4. Pago efectivo sin sesión abierta → error claro.
  5. Devolución con pago a cuenta MP → no bloquea aunque caja cerrada.
  6. Imprimir ticket de devolución.

---

### Paso 10: Cerrar plan

- Marcar Estado=Implementado y notas.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `lib/configuracion/queries.ts` — métodos de pago + cuentas (reuso).
- `lib/caja/queries.ts` — `obtenerSesionAbierta` (reuso para `sesion_caja_id`).
- `components/pos/PagoMultiMetodo.tsx` — reuso para sección de pagos del form.
- `components/ventas/TicketImprimible.tsx` y `PrintButtonClient.tsx` — patrón.

### Actualizaciones Necesarias para Consistencia

- `app/CLAUDE.md` (opcional): mencionar módulo Devoluciones como Implementado al cierre.

### Impacto en Flujos de Trabajo Existentes

- `/ventas/[id]` gana acción "Devolver" + sección de devoluciones asociadas.
- `/stock/movimientos` ya tipo `'devolucion'` listo (trigger lo registra automáticamente).
- `/caja` (cierres) ya considera devoluciones (`total_devoluciones_monto`) — la lógica de cierre ya existe.
- Cliente: `monto_total` y `total_compras` se ajustan automáticamente.

---

## Lista de Validación

- [ ] `lib/devoluciones/queries.ts` con listar, obtener, saldos por línea.
- [ ] `lib/ventas/queries.ts` extendido con `obtenerVentaParaDevolucion`.
- [ ] `actions/devoluciones.ts → registrarDevolucion` con validaciones server.
- [ ] `/devoluciones` con filtros y paginación.
- [ ] `/devoluciones/nueva` muestra venta + form bloqueando excesos.
- [ ] `/devoluciones/[id]` con ticket imprimible.
- [ ] `/ventas/[id]` con botón "Devolver" + lista de devoluciones.
- [ ] Stock se repone, fondos egresan, métricas del cliente ajustan.
- [ ] No se permiten devoluciones de más de lo disponible.
- [ ] No se permiten devoluciones en efectivo sin sesión abierta.
- [ ] `tsc --noEmit` exit 0.

---

## Criterios de Éxito

- Una tienda puede procesar un cambio o devolución completa desde la UI en menos de 1 minuto.
- El stock, los fondos y las métricas del cliente quedan consistentes sin intervención manual.
- El comprobante imprimible sirve como respaldo del egreso de caja.
- El flujo es robusto contra errores de operador (no permite devolver de más, no permite efectivo sin caja).

---

## Notas de Implementaci�n

- Implementado: 2026-04-29. tsc --noEmit exit 0.
- `app/lib/devoluciones/queries.ts`: listarDevoluciones, obtenerDevolucionCompleta, obtenerDevolucionesPorVenta, calcularSaldoDevolverPorLinea. Joins via PostgREST con !inner para devoluciones; conteo de items via segundo query agregado en JS (PostgREST no soporta count() en joins).
- `app/lib/ventas/queries.ts`: agregada VentaDetalleConSaldo + obtenerVentaParaDevolucion(id) que enriquece l�neas con cantidad_devuelta y disponible_devolver. Solo cuenta devoluciones con estado='completada'.
- `app/app/actions/devoluciones.ts`: registrarDevolucion orquesta validaci�n ? re-check de saldos contra DB (no confiar en cliente) ? match exacto suma pagos vs total ? exige sesi�n de caja abierta solo si pagos en efectivo ? RPC get_siguiente_numero_devolucion ? insert cabecera + detalles + pagos. Triggers DB se encargan de stock, fondos y m�tricas de cliente.
- `app/components/devoluciones/`: DevolucionForm (client, reusa PagoMultiMetodo), TablaDevoluciones (con prop contexto para reuso en /ventas/[id]), FiltrosDevoluciones, TicketDevolucion.
- P�ginas: /devoluciones (listado + filtros + paginaci�n), /devoluciones/nueva?venta_id= (form), /devoluciones/[id] (ticket imprimible).
- /ventas/[id]: ahora usa obtenerVentaParaDevolucion, agrega bot�n ? Devolver (si hay saldo) y secci�n 'Devoluciones de esta venta' con TablaDevoluciones contexto='venta'.
- Sidebar: agregado link /devoluciones entre Ventas y Caja.
- No tocamos ventas.estado para evitar doble-conteo en m�tricas de cliente (los triggers de devoluciones decrementan en el cliente; hacerlo tambi�n v�a anular_venta ser�a doble).

