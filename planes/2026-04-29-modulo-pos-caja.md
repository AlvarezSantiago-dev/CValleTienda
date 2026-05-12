# Plan: Módulo POS + Caja

**Creado:** 2026-04-29
**Estado:** Implementado
**Pedido:** POS + Caja: apertura de sesión + flujo de venta + cobro multi-método.

---

## Descripción General

### Qué Logra Este Plan

Habilita el **flujo completo de venta** del MVP: apertura/cierre de sesión de caja, búsqueda y carga de productos al carrito (incluyendo escaneo por código de barras), cobro con uno o varios métodos de pago (split) y registro de la venta con descuento automático de stock + actualización de saldos por cuenta de fondos. Al finalizar muestra una vista de ticket lista para imprimir.

### Por Qué Importa

Es **el corazón del producto**. Sin POS no hay generación de ingresos, ni triggers de stock que se disparen, ni movimientos de fondos, ni cierres de caja útiles. Toda la infraestructura ya está construida (productos, configuración, métodos de pago, schema de ventas/sesiones/triggers/RPC). Esto convierte el sistema de "configurable" a "operativo".

---

## Estado Actual

### Estructura Existente Relevante

**DB (todo aplicado):**
- `ventas` + `detalles_venta` (migration 005): cabecera + líneas con snapshots inmutables.
- `movimientos_stock` (006): trigger `detalles_venta_salida_stock` descuenta stock automáticamente al insertar línea, y el trigger valida `stock_actual >= cantidad` (lanza excepción si no hay stock).
- `metodos_pago` + `pagos_venta` (009): trigger `pagos_venta_mover_fondos` registra el movimiento en `movimientos_fondos` y suma al saldo de la cuenta.
- `sesiones_caja` + `cierres_caja` + `cierres_caja_detalle` (010): única sesión abierta por tienda (UNIQUE INDEX parcial). Columna `ventas.sesion_caja_id` agregada por ALTER en esta migración.
- **RPCs disponibles:**
  - `get_siguiente_numero_ticket(tienda_id) → integer` (atómico).
  - `cerrar_caja(sesion_id, efectivo_declarado, observaciones) → uuid` (genera cierre completo con desglose por cuenta).
- **Triggers automáticos:**
  - Stock descuento + auditoría al insertar `detalles_venta`.
  - Movimiento de fondos al insertar `pagos_venta`.
  - Métricas del cliente (`total_compras`, `monto_total`, `ultima_compra`) al completar venta.

**App (todo aplicado):**
- Páginas placeholder: `/pos`, `/caja`, `/ventas`.
- Productos completos (catálogo + variantes + códigos de barras únicos).
- Configuración completa (métodos de pago activables + cuentas de fondos).
- Componentes UI base: `Button`, `Input`, `Select`, `Textarea`, `EmptyState`.
- Patrón establecido: server pages + actions con `'use server'`, `useState` + `useTransition`, `requireTiendaId()`.

### Brechas o Problemas que se Abordan

- No se puede vender → todo el schema está esperando el primer INSERT.
- No hay forma de abrir/cerrar caja desde la UI.
- No se puede escanear ni buscar variantes por código de barras desde una pantalla de venta.

---

## Cambios Propuestos

### Resumen de Cambios

- **Caja** (4 archivos): queries, server actions (abrir/cerrar/cancelar), página principal con vista de "abierta" o "cerrada", componentes para apertura y cierre.
- **POS** (8 archivos): queries (buscar variantes, sesión activa), server actions (registrar venta), página `/pos` con layout dos columnas (buscador+carrito | totales+pago), componentes (`Buscador`, `Carrito`, `Totales`, `PagoMultiMetodo`, `TicketModal`).
- **Listado de ventas** mínimo viable: `/ventas` con tabla simple + link a detalle/ticket.
- **Layout dashboard:** banner sutil cuando no hay sesión abierta, con CTA a `/caja`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/lib/caja/queries.ts` | `obtenerSesionAbierta`, `listarSesiones`, `obtenerCierre(id)` con detalle por cuenta |
| `app/lib/pos/queries.ts` | `buscarVariantes(query)` (por código de barras exacto + LIKE en nombre/código_base), `obtenerVariantePorCodigoBarras(code)` |
| `app/lib/ventas/queries.ts` | `listarVentas({page, pageSize})`, `obtenerVentaCompleta(id)` (con detalles + pagos para ticket) |
| `app/app/actions/caja.ts` | `abrirSesion({ monto_apertura_efectivo, observaciones })`, `cerrarSesion({ efectivo_declarado, observaciones })` (vía RPC `cerrar_caja`) |
| `app/app/actions/ventas.ts` | `registrarVenta({ items, pagos, cliente_id?, descuento_global, observaciones? })` — inserta venta + detalles + pagos en transacción lógica (secuenciada en JS, abortando ante error de trigger) |
| `app/components/caja/AbrirSesionForm.tsx` | Form simple: monto efectivo apertura + observaciones |
| `app/components/caja/CerrarSesionForm.tsx` | Form: efectivo declarado + observaciones; muestra preview de totales del turno |
| `app/components/caja/SesionAbiertaPanel.tsx` | Tarjeta con info de sesión activa (apertura, usuario, ventas del turno, saldo por cuenta vivo) |
| `app/components/caja/CierreDetalle.tsx` | Vista del cierre generado (totales + tabla por cuenta + diferencia efectivo) |
| `app/components/pos/BuscadorVariantes.tsx` | Input con autocomplete + soporte de "Enter" para escaneo (matchea EAN-13 exacto y agrega al carrito) |
| `app/components/pos/Carrito.tsx` | Lista de líneas con variante (nombre + talla + color), cantidad editable, precio editable, descuento por línea, botón eliminar |
| `app/components/pos/PanelPago.tsx` | Resumen de totales + selector de cliente + descuento global + sección de pagos múltiples + botón "Cobrar" |
| `app/components/pos/PagoMultiMetodo.tsx` | Lista de pagos parciales: select método + monto + referencia. Calcula "Resta cobrar" / "Vuelto" en vivo |
| `app/components/pos/TicketModal.tsx` | Modal post-venta con número de ticket, líneas, totales y pagos. Botones "Imprimir" (window.print con CSS print) y "Nueva venta" |
| `app/components/layout/AvisoCajaCerrada.tsx` | Banner condicional en layout de dashboard: "Necesitás abrir caja para vender" |
| `app/app/(dashboard)/ventas/[id]/page.tsx` | Detalle de venta con ticket reimprimible |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/(dashboard)/caja/page.tsx` | Reemplazar placeholder: server page que carga sesión activa + lista de últimas sesiones; renderiza `AbrirSesionForm` o `SesionAbiertaPanel + CerrarSesionForm` |
| `app/app/(dashboard)/pos/page.tsx` | Reemplazar placeholder: server page que verifica sesión activa (si no hay, redirige a `/caja` con mensaje) y renderiza el contenedor cliente del POS |
| `app/app/(dashboard)/ventas/page.tsx` | Reemplazar placeholder: tabla de ventas con paginación y link a `/ventas/[id]` |
| `app/app/(dashboard)/layout.tsx` | Agregar `AvisoCajaCerrada` arriba del `<main>` |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Sesión de caja obligatoria para vender.** El POS chequea `obtenerSesionAbierta()` y bloquea si no hay. Se persiste `ventas.sesion_caja_id` para que el RPC `cerrar_caja` funcione correctamente.
2. **Cierre vía RPC, no Server Action que duplique lógica.** `cerrar_caja(sesion_id, efectivo_declarado, observaciones)` ya hace todo el trabajo (totales, desglose por cuenta, marca sesión cerrada). El server action solo invoca el RPC y revalida.
3. **Stock validado por trigger, no en JS.** El trigger `detalles_venta_salida_stock` lanza excepción si no hay stock. El server action captura la excepción y traduce a un error legible. Cero race condition.
4. **Triggers manejan fondos.** No se actualiza `cuentas_fondos.saldo_actual` desde la app; se inserta en `pagos_venta` y el trigger `pagos_venta_mover_fondos` se encarga.
5. **Número de ticket vía RPC atómico.** `get_siguiente_numero_ticket(tienda_id)` evita colisiones bajo concurrencia. El prefijo (`T`, `V`, etc.) se concatena en la UI del ticket leyendo `configuracion_tienda.prefijo_ticket`.
6. **Búsqueda con doble lógica.**
   - Si el query matchea **exactamente** un código de barras EAN-13 (13 dígitos) → autoselecciona y agrega al carrito.
   - Si no, hace LIKE sobre `nombre` del producto y `codigo_base`.
   - Resultado paginado a 20.
7. **Carrito en estado del cliente, sin persistencia.** No hay "ventas en curso" en DB. Si el usuario refresca, se pierde el carrito (aceptable en MVP). Persistir requiere tabla extra que no aporta al flujo principal.
8. **Pagos múltiples como lista mutable.** Patrón `id local + método + monto + referencia`. Validación: suma debe igualar total con tolerancia 0.01. Si supera, se considera "vuelto" pero solo válido si **todo el exceso está en efectivo** (no se da vuelto desde MP/banco).
9. **Cliente opcional.** El POS permite venta anónima (cliente_id null). Se carga lista de clientes vía un autocomplete simple. **Decisión:** dejar para una iteración posterior — en MVP solo input de "DNI o teléfono" que busca y lo asocia. Si no encuentra, se ignora (NO se crea cliente desde el POS para no enredar).
10. **Sin descuento por línea en MVP.** Solo descuento global de la venta. Líneas tienen `descuento_linea = 0` siempre. Reduce complejidad UI sin perder valor real (descuentos por línea son raros en retail de ropa).
   - **Modificación:** revisado — schema soporta ambos. Aceptado dejar `descuento_linea` posible pero la UI MVP solo expone descuento global.
11. **Precio unitario editable en línea.** Permite "venta especial" (ajustar precio bajo coordinación con cliente). Por defecto = `variante.precio_venta ?? producto.precio_venta`.
12. **Anulación NO entra en MVP.** Crear venta sí; anular venta lo dejamos para iteración con módulo de devoluciones.
13. **Ticket = HTML imprimible.** Usar `window.print()` + CSS `@media print` con tamaño 80mm. Contenido: encabezado fiscal (de `configuracion_tienda`), líneas, totales, pagos, pie. Sin PDF, sin librerías externas.

### Alternativas Consideradas

- **Stored Procedure `registrar_venta` en Postgres.** Encapsularía toda la inserción en una transacción atómica. **Rechazado para MVP**: requiere migration nueva con función SECURITY DEFINER compleja; el flujo actual con triggers más server action es suficiente y más fácil de iterar. Si surgen problemas de consistencia (parcial: venta creada sin pagos), se migra a SP en V2.
- **Estado del carrito con Zustand/Jotai.** Innecesario — `useState` con un objeto reducer-like alcanza para una sola pantalla.
- **Búsqueda con Postgres full-text.** Demasiado para MVP. `ILIKE '%query%'` en nombre + igualdad en código_barras es suficiente para los volúmenes esperados (cientos de productos).
- **Modal de confirmación previo al cobro.** Descartado — el botón "Cobrar" del panel de pagos ya es la confirmación; no hay paso intermedio.
- **Soporte para hardware de scanner.** Los scanners USB emulan teclado → no requieren código especial. Solo asegurar que el input del buscador esté siempre enfocado (auto-focus on mount + tras cada agregado).

### Preguntas Abiertas

- **¿Permitir venta sin sesión de caja en el MVP?** Propongo **no** (más limpio para reportes y arqueo). Si el usuario lo pide, se cambia con un toggle.
- **¿Generar etiquetas/QR del ticket?** No — el ticket es solo texto/HTML. La impresora térmica de 80mm renderiza HTML directo desde el navegador.
- **¿Permitir múltiples vendedores en una sesión?** El schema lo permite (cada venta tiene `usuario_id`). En MVP el usuario único es el founder, no aplica.

---

## Tareas Paso a Paso

### Paso 1: Queries de Caja

Crear `app/lib/caja/queries.ts`.

**Interfaces:**
- `SesionCaja` — id, fecha_apertura, monto_apertura_efectivo, estado, observaciones_apertura, usuario_apertura (con join a perfiles para nombre).
- `SesionConTotales` — extiende `SesionCaja` con `total_ventas`, `cantidad_ventas`, `saldos_actuales: { cuenta_fondo_id, nombre, saldo_actual }[]` (para mostrar en panel de sesión abierta).
- `Cierre` y `CierreDetalle` — para reimpresión post-cierre.

**Funciones:**
- `obtenerSesionAbierta(): Promise<SesionConTotales | null>` — `select * from sesiones_caja where estado='abierta' and tienda_id=...`. Si existe, hace queries adicionales: count + sum de `ventas` con `sesion_caja_id`, lista de cuentas de fondos activas con `saldo_actual` actual.
- `listarSesiones(limit = 20)` — últimas sesiones cerradas con totales del cierre.
- `obtenerCierre(sesionId)` — cierre + detalles por cuenta.

**Archivos afectados:**
- `app/lib/caja/queries.ts`

---

### Paso 2: Server Actions de Caja

Crear `app/app/actions/caja.ts` con `'use server'`.

**`abrirSesion({ monto_apertura_efectivo, observaciones })`:**
- Validar: monto >= 0.
- Verificar que no haya sesión abierta (la UNIQUE INDEX lo garantiza, pero mejor un mensaje claro antes).
- INSERT con `usuario_apertura_id = auth.uid()`, `estado = 'abierta'`.
- `revalidatePath('/caja')` y `revalidatePath('/pos')`.

**`cerrarSesion({ sesion_id, efectivo_declarado?, observaciones? })`:**
- Llamar `supabase.rpc('cerrar_caja', { p_sesion_id, p_efectivo_declarado, p_observaciones })`.
- Devolver `{ ok: true, data: { cierreId } }`.
- Revalidar `/caja`, `/pos`, `/ventas`.

**Archivos afectados:**
- `app/app/actions/caja.ts`

---

### Paso 3: Componentes de Caja

**`AbrirSesionForm.tsx`** (client):
- Inputs: `monto_apertura_efectivo` (number), `observaciones` (textarea opcional).
- Botón "Abrir caja" → llama `abrirSesion`, revalida y refresca.

**`SesionAbiertaPanel.tsx`** (server o client — server alcanza):
- Card con: hora apertura, usuario, monto apertura, ventas del turno (cantidad + monto), tabla de cuentas con saldo actual.

**`CerrarSesionForm.tsx`** (client):
- Muestra **preview**: efectivo esperado calculado en JS (apertura + ventas en cuentas tipo `efectivo` del turno) — pero como ya lo calcula el RPC, mostramos solo el resumen real al cerrar.
- Inputs: `efectivo_declarado` (number, opcional — si lo deja en blanco no se calcula diferencia), `observaciones`.
- Botón "Cerrar caja" → confirmación inline, luego llama `cerrarSesion` y redirige a `/caja/cierre/[id]` o muestra `CierreDetalle` inline.

**`CierreDetalle.tsx`** (server):
- Tabla con totales, desglose por cuenta, diferencia efectivo, observaciones.

**Archivos afectados:**
- `app/components/caja/AbrirSesionForm.tsx`
- `app/components/caja/SesionAbiertaPanel.tsx`
- `app/components/caja/CerrarSesionForm.tsx`
- `app/components/caja/CierreDetalle.tsx`

---

### Paso 4: Página `/caja`

Reemplazar placeholder. Server page:

```tsx
const sesion = await obtenerSesionAbierta()
return (
  <div>
    <h1>Caja</h1>
    {sesion ? (
      <>
        <SesionAbiertaPanel sesion={sesion} />
        <CerrarSesionForm sesion={sesion} />
      </>
    ) : (
      <AbrirSesionForm />
    )}
    <h2>Sesiones recientes</h2>
    <TablaSesiones items={await listarSesiones(10)} />
  </div>
)
```

**Archivos afectados:**
- `app/app/(dashboard)/caja/page.tsx`

---

### Paso 5: Banner global "Caja cerrada"

`AvisoCajaCerrada.tsx` (server):
- Llama `obtenerSesionAbierta()`.
- Si null: render banner amarillo "No tenés caja abierta. Abrí una sesión para vender." con link a `/caja`.
- Si existe: nada (return null).

Modificar `app/app/(dashboard)/layout.tsx`: insertar `<AvisoCajaCerrada />` arriba del contenido.

**Archivos afectados:**
- `app/components/layout/AvisoCajaCerrada.tsx`
- `app/app/(dashboard)/layout.tsx`

---

### Paso 6: Queries POS

Crear `app/lib/pos/queries.ts`.

**Interfaces:**
- `VarianteResultado` — `{ id, producto_id, nombre_producto, codigo_base, talla, color, codigo_barras, precio_venta, stock_actual, imagen_url }`.

**Funciones:**
- `buscarVariantes(query: string, limit = 20): Promise<VarianteResultado[]>`
  - Trim. Si vacío, retorna [].
  - Si matchea `^\d{13}$` (EAN-13), buscar por `codigo_barras` exacto. Si encuentra, retorna ese único.
  - Si no, query con join: `variantes_producto` ← `productos` ← `tallas`/`colores`. Filtros: `productos.activo = true`, `productos.nombre ilike %q%` OR `productos.codigo_base ilike %q%` OR `variantes.codigo_barras ilike %q%`. Solo variantes con `stock_actual > 0` (o configurable).
  - Limit 20.

**Archivos afectados:**
- `app/lib/pos/queries.ts`

---

### Paso 7: Queries Ventas

Crear `app/lib/ventas/queries.ts`.

- `listarVentas({ page, pageSize=20 })` — ventas + count, ordenadas por created_at desc, con join mínimo a cliente.nombre.
- `obtenerVentaCompleta(id)` — venta + detalles + pagos + configuracion_tienda (para encabezado fiscal del ticket).

**Archivos afectados:**
- `app/lib/ventas/queries.ts`

---

### Paso 8: Server Action `registrarVenta`

Crear `app/app/actions/ventas.ts` con `'use server'`.

**Input:**
```ts
interface RegistrarVentaInput {
  items: Array<{ variante_id: string; cantidad: number; precio_unitario: number }>
  pagos: Array<{ metodo_pago_id: string; monto: number; referencia?: string }>
  cliente_id?: string | null
  descuento_global?: number
  observaciones?: string | null
}
```

**Flujo:**
1. `requireTiendaId()` — auth + tienda.
2. Verificar **sesión abierta** (`obtenerSesionAbierta`); si no, error.
3. Validaciones:
   - Al menos 1 item con cantidad > 0.
   - Al menos 1 pago.
   - Suma pagos ≥ total (margen 0.01).
   - El exceso (vuelto) sólo permitido sobre métodos vinculados a cuenta tipo `efectivo`.
4. Cargar variantes seleccionadas (con producto, talla, color para snapshot).
5. Cargar métodos de pago seleccionados (con cuenta_fondo, comision, dias) para snapshot.
6. Calcular totales: `subtotal = Σ item.cantidad * item.precio_unitario`, `descuento = descuento_global`, `total = subtotal - descuento`.
7. **Obtener número de ticket:** `supabase.rpc('get_siguiente_numero_ticket', { p_tienda_id })`.
8. INSERT `ventas` (con sesion_caja_id, cliente_id, usuario_id = auth.uid()).
9. INSERT bulk `detalles_venta` (un row por item, con snapshot de nombre/talla/color/codigo_barras). **Si el trigger de stock falla, capturar y abortar:** intentar borrar la venta recién creada (best-effort) y devolver error legible.
10. INSERT bulk `pagos_venta` (con snapshots, comisiones calculadas, monto_neto). El trigger `pagos_venta_mover_fondos` actualiza saldos.
11. `revalidatePath('/pos')`, `/caja`, `/ventas`.
12. Devolver `{ ok: true, data: { ventaId, numeroTicket } }`.

**Manejo de errores específicos:**
- Excepción "Stock insuficiente" del trigger → traducir a "No hay stock suficiente de [variante]".
- Excepción "Sesión de caja no encontrada" → "Necesitás abrir caja antes de vender".

**Archivos afectados:**
- `app/app/actions/ventas.ts`

---

### Paso 9: Componentes POS — buscador y carrito

**`BuscadorVariantes.tsx`** (client):
- Input controlado, debounce 250ms.
- Llama un endpoint o (preferible) recibe como prop una función `onBuscar(query)` que llama a una **route handler** o a una server action de búsqueda → ver alternativa abajo.
- **Decisión:** crear server action `buscarVariantesAction(query)` que envuelve la query (las server actions soportan retornar datos). Más simple que un route handler para MVP.
- Lista de resultados debajo con: imagen mini + nombre + talla/color + stock + precio.
- Al click → llama `onSeleccionar(variante)`. Limpia query + reenfoca input.
- Si query es EAN-13 exacto y match único → autoselecciona sin click.

**`Carrito.tsx`** (client):
- Recibe `items: CarritoItem[]` y handlers `onCambiarCantidad`, `onCambiarPrecio`, `onEliminar`.
- Tabla: Variante (con thumbnail, nombre, talla/color), Cantidad (input number), Precio unit. (input number), Subtotal (calculado), botón eliminar.
- Empty state: "Buscá un producto o escaneá un código".

**Archivos afectados:**
- `app/components/pos/BuscadorVariantes.tsx`
- `app/components/pos/Carrito.tsx`

---

### Paso 10: Componentes POS — pagos y panel

**`PagoMultiMetodo.tsx`** (client):
- Recibe `metodosPago: MetodoPago[]` y `total`, devuelve `pagos: PagoLinea[]` vía callback `onCambio`.
- Lista de pagos parciales editables.
- Botón "+ Agregar método".
- Cada línea: select método, monto, input referencia (texto libre — número de transacción).
- Footer: "Cobrado: $X · Resta: $Y" (o "Vuelto: $Z" si excede).
- Botón "Auto-completar": agrega un pago con el primer método activo cubriendo el resto.

**`PanelPago.tsx`** (client):
- Resumen: subtotal, descuento (input editable), total.
- Selector de cliente (input "DNI o teléfono"; en MVP solo guarda el id si encuentra match — autocomplete con 5 resultados).
- Renderiza `PagoMultiMetodo`.
- Observaciones (textarea, opcional).
- Botón "Cobrar (Enter)" — disabled hasta que `Σ pagos ≥ total`.
- Al clickear: llama `registrarVenta(...)`. Si ok → muestra `TicketModal`. Si no → toast/banner de error.

**`TicketModal.tsx`** (client):
- Modal centrado, con HTML formateado para impresión 80mm.
- Header: razón social, CUIT, dirección, condición IVA (de configuracion_tienda).
- Cuerpo: número ticket, fecha, líneas (qty × producto = subtotal), total.
- Pagos: lista con método y monto.
- Pie: texto_pie de configuración.
- Botones: "Imprimir" → `window.print()`. "Nueva venta" → cierra modal + reset carrito.
- CSS print: oculta sidebar/header, fija ancho a 80mm.

**Archivos afectados:**
- `app/components/pos/PagoMultiMetodo.tsx`
- `app/components/pos/PanelPago.tsx`
- `app/components/pos/TicketModal.tsx`

---

### Paso 11: Página `/pos`

Reemplazar placeholder. Server page:

```tsx
const sesion = await obtenerSesionAbierta()
if (!sesion) {
  return (
    <EmptyState
      titulo="No hay caja abierta"
      mensaje="Necesitás abrir caja para vender."
      cta={<LinkButton href="/caja">Ir a caja</LinkButton>}
    />
  )
}
const metodos = await listarMetodosPago(true)
const config = await obtenerConfiguracionTienda()
return <POSContainer sesion={sesion} metodosPago={metodos} configTienda={config} />
```

**`POSContainer.tsx`** (client) — orquestador:
- Estado: `items: CarritoItem[]`, `pagos: PagoLinea[]`, `clienteId`, `descuento`, `obs`.
- Layout grid 2 columnas: izquierda (buscador + carrito) | derecha (panel pago, sticky).
- Pasa handlers a los hijos.

**Archivos afectados:**
- `app/app/(dashboard)/pos/page.tsx`
- `app/components/pos/POSContainer.tsx` (nuevo, NO listado antes — agregar a la tabla "Nuevos archivos")

> **Corrección al listado:** agregar `app/components/pos/POSContainer.tsx` a los archivos nuevos.

---

### Paso 12: Listado de ventas + detalle

**`/ventas/page.tsx`** (reemplazar placeholder):
- Server page con `listarVentas({ page })`.
- Tabla: Nº ticket · Fecha · Cliente · Total · Estado · Acciones (link "Ver").
- Paginación.

**`/ventas/[id]/page.tsx`** (nuevo):
- Server page con `obtenerVentaCompleta(id)` + `obtenerConfiguracionTienda()`.
- Renderiza `TicketImprimible` (se puede reusar la misma estructura HTML del `TicketModal` extrayéndola a un componente).
- Botón "Imprimir" + link "← Volver".

**Refactor sugerido:** extraer la marca-up del ticket a `app/components/ventas/TicketImprimible.tsx` y reutilizarlo desde el modal y la página de detalle.

**Archivos afectados:**
- `app/app/(dashboard)/ventas/page.tsx`
- `app/app/(dashboard)/ventas/[id]/page.tsx`
- `app/components/ventas/TicketImprimible.tsx`

---

### Paso 13: Validación

- `node ./node_modules/typescript/bin/tsc --noEmit` debe pasar.
- Manual end-to-end:
  1. Sin sesión: `/pos` redirige/muestra estado vacío. Banner global aparece.
  2. Abrir caja con monto efectivo $5000.
  3. Banner desaparece. POS habilitado.
  4. Buscar producto por nombre → click → aparece en carrito.
  5. Escanear (pegar) un EAN-13 → autoselecciona.
  6. Ajustar cantidad y precio. Verificar subtotal.
  7. Probar split: $3000 efectivo + $2000 MP. Verificar "Cobrado / Resta".
  8. Probar exceso en efectivo (vuelto).
  9. Probar exceso en MP → debe rechazar.
  10. Cobrar → ticket se muestra → imprimir.
  11. Verificar en `/ventas` que aparece la venta con número correlativo.
  12. Verificar en `/configuracion/cuentas-fondos` que el saldo de Efectivo y MP aumentó.
  13. Verificar en `/productos` que el stock del producto bajó.
  14. Cerrar caja con efectivo declarado distinto al esperado → ver diferencia.
  15. Verificar que el cierre detalle muestra MP como ingreso del turno.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/layout/Sidebar.tsx` — links existentes a `/pos`, `/caja`, `/ventas` (sin cambios).
- `app/lib/configuracion/queries.ts` — el POS consume `listarMetodosPago(true)` y `obtenerConfiguracionTienda()`.
- `app/types/database.ts` — sin cambios.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` (workspace): no requiere actualización (módulos de la app no se documentan ahí).
- `contexto/proyectos.md`: opcionalmente mover progreso del MVP. No bloqueante.

### Impacto en Flujos de Trabajo Existentes

Ninguno — todo es nuevo sobre placeholders. Configuración y Productos siguen funcionando igual.

---

## Lista de Validación

- [ ] `tsc --noEmit` exit 0
- [ ] Banner "no hay caja" aparece cuando `sesiones_caja` está vacía o todas cerradas
- [ ] Apertura de caja crea fila con `estado='abierta'` y desactiva el banner
- [ ] Búsqueda por nombre devuelve resultados con stock visible
- [ ] Escaneo de código EAN-13 (paste) agrega item directo al carrito
- [ ] Crear venta con 2 items y 2 métodos de pago genera 1 venta + 2 detalles + 2 pagos
- [ ] Stock de las variantes vendidas se descuenta
- [ ] Saldos de cuentas de fondos se incrementan
- [ ] Métricas del cliente se actualizan (si se eligió cliente)
- [ ] Vuelto solo se permite si el exceso es a método con cuenta tipo efectivo
- [ ] Ticket post-venta muestra encabezado fiscal correcto
- [ ] `window.print()` produce salida legible (manual)
- [ ] `/ventas` lista la venta con su número correlativo
- [ ] Cierre de caja vía RPC genera fila en `cierres_caja` con desglose por cuenta
- [ ] Diferencia efectivo se calcula correctamente (declarado − esperado)

---

## Criterios de Éxito

1. **Una operación de venta completa** se puede ejecutar de extremo a extremo desde `/pos` y queda persistida con su impacto en stock + fondos + cliente.
2. **Multi-método** funciona: una venta puede tener N pagos y los snapshots quedan inmutables en `pagos_venta`.
3. **Caja** controla quién puede vender (sesión abierta) y permite cerrar el turno con arqueo.
4. **Ticket impreso** trae los datos fiscales y de personalización configurados en el módulo Configuración.
5. **Trigger errors** (stock insuficiente, etc.) llegan al usuario como mensajes en español, no como excepciones SQL crudas.
6. El flujo es **rápido**: agregar items con teclado/scanner, cobrar con un click, ticket en menos de 1s.

---

## Estimación de Alcance

- **Archivos nuevos:** 17
- **Archivos modificados:** 4 (3 placeholders + layout)
- **Migraciones:** 0 (toda la lógica vive en migrations 005-010)
- **RPCs usadas:** 2 (`get_siguiente_numero_ticket`, `cerrar_caja`)
- **Triggers que dependemos:** 4 (`detalles_venta_salida_stock`, `pagos_venta_mover_fondos`, `actualizar_metricas_cliente`, `revertir_stock_anulacion` — el último no se usa en MVP).
- **Complejidad:** media-alta. La pantalla `/pos` concentra ~70% del esfuerzo (estado complejo, varios componentes interrelacionados, validaciones de pago).

### Sugerencia de orden de implementación

1. Caja completa (Pasos 1-5) — habilita el bloqueo del POS.
2. Queries POS + Ventas (Pasos 6-7).
3. Server action `registrarVenta` (Paso 8) — testear con datos hardcodeados antes de tocar UI.
4. UI POS (Pasos 9-11).
5. Listado y detalle de ventas (Paso 12).
6. Validación (Paso 13).


---

## Notas de Implementaci�n (2026-04-29)

Implementado en una sola pasada. Validaci�n `tsc --noEmit` OK (exit 0).

**Archivos creados:**
- `app/lib/caja/queries.ts` � `obtenerSesionAbierta`, `listarSesiones`, `obtenerCierre`.
- `app/lib/pos/queries.ts` � `buscarVariantes` (EAN-13 exacto + ILIKE en productos por nombre/codigo_base + variantes por codigo_barras, merge �nico por id), `obtenerVariantePorCodigoBarras`.
- `app/lib/ventas/queries.ts` � `listarVentas` (paginado), `obtenerVentaCompleta` (venta + detalles + pagos).
- `app/app/actions/caja.ts` � `abrirSesion`, `cerrarSesion` (RPC `cerrar_caja`).
- `app/app/actions/ventas.ts` � `registrarVenta`, `buscarVariantesAction`, `buscarClientesAction`.
- `app/components/caja/{AbrirSesionForm,SesionAbiertaPanel,CerrarSesionForm,CierreDetalle}.tsx`.
- `app/components/layout/AvisoCajaCerrada.tsx` � banner amarillo cuando no hay caja abierta.
- `app/components/pos/{BuscadorVariantes,Carrito,PagoMultiMetodo,PanelPago,TicketModal,POSContainer}.tsx`.
- `app/components/ventas/{TicketImprimible,PrintButtonClient}.tsx`.
- `app/app/(dashboard)/ventas/[id]/page.tsx` � detalle/ticket reimprimible.

**Archivos modificados:**
- `app/app/(dashboard)/layout.tsx` � agrega `<AvisoCajaCerrada />` arriba del `<main>`.
- `app/app/(dashboard)/caja/page.tsx` � reemplaza placeholder.
- `app/app/(dashboard)/pos/page.tsx` � reemplaza placeholder.
- `app/app/(dashboard)/ventas/page.tsx` � reemplaza placeholder.

**Decisiones t�cnicas relevantes:**
1. **B�squeda OR sobre tabla referenciada:** PostgREST no soporta de forma confiable OR sobre joins embebidos. Se reemplaz� por dos queries (productos por nombre/c�digo + variantes por c�digo_barras) y merge en memoria con `Map`.
2. **Casts v�a `unknown`:** El cliente Supabase sin generic `<Database>` tipa los joins como `GenericStringError[]`. Se castea con `as unknown as Array<Record<string, unknown>>` para mantener strict TS sin perder seguridad pr�ctica.
3. **PrintButton de la vista detalle:** componente client aislado en `PrintButtonClient.tsx` para evitar marcar la page entera como client.
4. **Validaci�n de `registrarVenta`:**
   - Si suma de pagos > total, el exceso (vuelto) debe caber en m�todos `efectivo`. Caso contrario se rechaza con mensaje claro.
   - Tolerancia �0.01 en comparaciones de montos para evitar problemas de redondeo flotante.
   - Si falla un INSERT en `detalles_venta`, se intenta borrar la venta hu�rfana. Si falla un pago tras detalles ya insertados, no se revierte (el trigger ya descont� stock) y se devuelve error legible para anulaci�n manual.
5. **`buscarVariantes`** filtra `stock_actual > 0` y `activo = true` para que no aparezcan productos sin stock en POS.
6. **AvisoCajaCerrada** atrapa errores de query (try/catch) para no romper layout si el m�dulo a�n no fue desplegado.
