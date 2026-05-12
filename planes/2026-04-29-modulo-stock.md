# Plan: Módulo Stock

**Creado:** 2026-04-29
**Estado:** Implementado
**Pedido:** Módulo de stock — listado consolidado por variante con alertas, ajustes manuales, ingresos y vista de historial de movimientos.

---

## Descripción General

### Qué Logra Este Plan

Habilita la **gestión operativa del inventario** desde la UI: listado consolidado de variantes con stock_actual vs stock_minimo (resaltando bajo stock), ajustes manuales (corrección por inventario físico) e ingresos de mercadería, además de un historial completo de movimientos (auditoría por venta, anulación, ingreso, ajuste).

Es el complemento natural del POS: el POS consume stock por trigger automático, pero hasta ahora no había manera de reponer, corregir errores ni ver el log de auditoría que ya genera el sistema.

### Por Qué Importa

- **Sin reposición la tienda no opera.** El POS bloquea ventas con `stock_actual < cantidad`; sin UI para entradas, los productos quedan en cero permanentemente.
- **Sin ajustes no hay inventario real.** Toda tienda tiene mermas, errores de carga, devoluciones físicas. Forzar al usuario a editar variantes a mano (lo que hoy no rastrea historial) rompe la auditoría.
- **El historial ya existe en la DB** (tabla `movimientos_stock` con triggers automáticos en venta y anulación). Solo falta exponerlo: trabajo de bajo costo, alto valor de transparencia.
- **Alertas de stock bajo** habilitan el reorden anticipado — un caso de uso explícito en el campo `stock_minimo` del schema.

---

## Estado Actual

### Estructura Existente Relevante

**DB (todo aplicado):**

- `variantes_producto` (003): tiene `stock_actual` (constraint `>= 0`), `stock_minimo` (default 0), índice parcial `variantes_con_stock_idx`.
- `movimientos_stock` (006):
  - Columnas: `tipo` (`entrada | salida | ajuste | devolucion | inicial`), `cantidad` (positivo entrada, negativo salida), `stock_anterior`, `stock_posterior`, `motivo`, `venta_id`, `usuario_id`.
  - Constraint `stock_posterior >= 0`.
  - Índices: por tienda, por variante, por fecha desc.
  - **RLS:** SELECT abierto a tienda; INSERT solo `entrada/ajuste/inicial` o cualquier tipo si sos owner/admin.
- **Triggers automáticos ya activos:**
  - `detalles_venta_salida_stock`: descuenta stock + log al insertar línea de venta (tipo='salida').
  - `ventas_revertir_stock`: devuelve stock + log al pasar venta a 'anulada' (tipo='devolucion').
- **No existe RPC** para entrada/ajuste manual. Habría que escribir las dos updates (variantes_producto + movimientos_stock) en JS o crear una RPC.

**App (todo aplicado):**

- `/stock/page.tsx` es un placeholder.
- Productos: catálogo + variantes + códigos de barras (`/productos`, `/productos/[id]`).
- Patrón establecido en `/lib/{dominio}/queries.ts` + `/app/actions/{dominio}.ts` + components server/client mixtos.
- UI primitives: `Button`, `Input`, `Select`, `Textarea`, `EmptyState`, `Pagination`.
- Helper `requireTiendaId()` y patrón `getCtx()` con `createClient()`.
- Helper `formatARS`, `formatDateTime` en módulo de caja (extraer a `lib/format.ts` si no existe).

### Brechas o Problemas que se Abordan

- No se puede ver el inventario consolidado por variante (hoy hay que abrir cada producto).
- No hay alerta visible de stock bajo.
- No se puede ingresar mercadería ni hacer ajustes desde la UI → variantes quedan estancadas.
- El log de movimientos no es accesible (existe en DB pero no hay vista).
- No hay exportación rápida para inventario físico.

---

## Cambios Propuestos

### Resumen de Cambios

- **DB:** una migration nueva con RPC atómica `ajustar_stock_variante(variante_id, tipo, cantidad_delta, motivo)` que actualiza `variantes_producto.stock_actual` + inserta en `movimientos_stock` en una sola transacción, validando RLS y stock no negativo.
- **Stock** (lib + actions + componentes + páginas):
  - `lib/stock/queries.ts`: listar variantes con stock + filtros, obtener variante con historial, listar movimientos paginado.
  - `actions/stock.ts`: `ingresarStock`, `ajustarStock` (vía RPC).
  - Página `/stock`: tabla de variantes con búsqueda, filtros (categoría, talla, color, solo bajo stock), columnas stock/mínimo/diferencia, badge alerta, acciones rápidas.
  - Página `/stock/movimientos`: historial paginado con filtros (tipo, variante, rango de fechas).
  - Página `/stock/[varianteId]`: detalle por variante con tarjetas de info, historial específico, formularios de entrada/ajuste.
- **Layout:** badge en sidebar mostrando cantidad de variantes bajo stock (opcional, decisión abajo).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `supabase/migrations/20260429000002_stock_rpc.sql` | RPC `ajustar_stock_variante` + permisos GRANT EXECUTE a `authenticated`. |
| `app/lib/stock/queries.ts` | `listarStock(opts)` (variantes con joins talla/color/producto + flag bajo_stock + paginación), `obtenerVarianteStock(id)` (variante completa + últimos N movimientos), `listarMovimientos(opts)` paginado, `contarVariantesBajoStock()`. |
| `app/app/actions/stock.ts` | `ingresarStock({ variante_id, cantidad, motivo })` y `ajustarStock({ variante_id, nuevo_stock, motivo })`, ambas vía RPC. |
| `app/components/stock/TablaStock.tsx` | Tabla server con badges de alerta, link al detalle. Usa `Pagination`. |
| `app/components/stock/FiltrosStock.tsx` | Form client de filtros (búsqueda nombre/código, categoría, talla, color, switch "solo bajo stock"). |
| `app/components/stock/IngresoForm.tsx` | Form client: cantidad + motivo. Submit a `ingresarStock`. |
| `app/components/stock/AjusteForm.tsx` | Form client: nuevo stock absoluto + motivo. Calcula y muestra delta antes de enviar. |
| `app/components/stock/MovimientosTabla.tsx` | Tabla server de movimientos: fecha, tipo (badge color), variante (link), cantidad signada, motivo, usuario. |
| `app/components/stock/AlertaStockBajo.tsx` | Badge reutilizable: "Bajo stock" rojo si `stock_actual <= stock_minimo` y `stock_minimo > 0`. |
| `app/app/(dashboard)/stock/movimientos/page.tsx` | Listado paginado con filtros. |
| `app/app/(dashboard)/stock/[varianteId]/page.tsx` | Detalle por variante: card resumen + historial + dos forms (ingreso/ajuste). |
| `app/lib/format.ts` *(si no existe)* | Centralizar `formatARS`, `formatDateTime`, `formatNumber` reutilizados. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/(dashboard)/stock/page.tsx` | Reemplaza placeholder por tabla + filtros + paginación + link a movimientos. |
| `app/components/layout/Sidebar.tsx` | (Opcional) agregar badge con contador de variantes bajo stock al ítem "Stock". |
| `app/lib/caja/queries.ts` | Si se extrae `formatARS/formatDateTime` a `lib/format.ts`, importarlo desde ahí. |
| `planes/2026-04-29-modulo-stock.md` | Marcar Estado=Implementado y agregar notas al cerrar. |

### Archivos a Eliminar

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **RPC `ajustar_stock_variante` en lugar de operaciones desde el cliente.** La actualización de `variantes_producto.stock_actual` + insert en `movimientos_stock` deben ser **atómicas** y consistentes con el modelo `stock_anterior/stock_posterior`. Una RPC `security definer` con `lock for update` sobre la fila de la variante evita race conditions y replica el estilo de `cerrar_caja` y `get_siguiente_numero_ticket`.

2. **Dos operaciones expuestas: ingreso y ajuste.**
   - **Ingreso** (`tipo='entrada'`): suma cantidad, motivo libre (ej. "Compra a proveedor X").
   - **Ajuste** (`tipo='ajuste'`): el usuario escribe el **stock final esperado**, la RPC calcula el delta. Más intuitivo para conteo físico ("contamos 12 unidades"). El motivo es obligatorio (ej. "Inventario físico, faltaban 3").
   - **No exponemos "salida manual"** en MVP: las salidas vienen siempre por venta o ajuste negativo. Mantiene la auditoría limpia.

3. **`stock_minimo` ya existe; lo aprovechamos sin nuevos campos.** La alerta es una vista derivada (`stock_actual <= stock_minimo` y `stock_minimo > 0`). No agregamos columnas. Si en el futuro se necesita umbral por categoría, se discute aparte.

4. **Filtro "solo bajo stock" como switch en URL** (`?bajo=1`), consistente con el patrón actual de filtros en `/productos`.

5. **Listado y filtros server-side.** Misma estrategia que `/productos`: SSR + server actions, sin client-side data fetching. Los filtros son links/forms con `searchParams` async.

6. **Permisos de ajuste/ingreso.** La RLS de `movimientos_stock` ya restringe inserciones manuales a owner/admin. La RPC respeta eso (no hace `security definer` permisivo: hereda permisos del caller). Si llegase a ser admin-only en MVP, lo controlamos también en el server action y ocultamos los botones a vendedores.

7. **`formatARS` y `formatDateTime` se extraen a `lib/format.ts`.** Hoy están duplicados en `caja/page.tsx` y `SesionAbiertaPanel.tsx`. Aprovechar este módulo para centralizar evita una nueva duplicación en `stock/`.

### Alternativas Consideradas

- **Hacer las dos updates desde Node sin RPC:** Rechazado. Sin transacción explícita en `@supabase/ssr`, un error entre el UPDATE y el INSERT dejaría inventario inconsistente.
- **Trigger `BEFORE INSERT` en `movimientos_stock` que actualice `variantes_producto`:** Rechazado. Mezcla responsabilidades, complica los triggers existentes (ya hay uno `AFTER INSERT detalles_venta` que también escribe en `movimientos_stock` — generaría loop o validaciones extra).
- **CSV export de stock:** Pospuesto a un módulo de reportes. No bloquea operación.
- **Página unificada con tabs (Stock | Movimientos)** vs **dos rutas separadas:** Elegimos rutas separadas porque la página de movimientos tendrá filtros distintos (rango de fechas, tipo) y se accede menos frecuentemente. Simplifica searchParams.

### Preguntas Abiertas

- **¿Restringir `ingresarStock` y `ajustarStock` a owner/admin en el MVP?** La RLS lo permite, pero ¿queremos que el vendedor pueda ingresar mercadería? Decisión sugerida: **sí, ambos roles pueden ingresar/ajustar en MVP** (tienda chica, todos hacen todo). Confirmar antes de implementar.
- **Badge de stock bajo en Sidebar:** suma valor pero requiere fetch adicional en cada layout render. Decisión sugerida: **dejarlo fuera del MVP**, exponerlo solo en `/dashboard` cuando se haga ese módulo.

---

## Tareas Paso a Paso

### Paso 1: Migration con RPC `ajustar_stock_variante`

Crear `supabase/migrations/20260429000002_stock_rpc.sql`.

**Acciones:**

- Definir función plpgsql con firma `(p_variante_id uuid, p_tipo text, p_cantidad_delta integer, p_motivo text) returns uuid`.
- Validaciones:
  - `p_tipo in ('entrada', 'ajuste', 'inicial')` (no permitimos `salida` ni `devolucion` por RPC manual).
  - Bloqueo `select ... for update` sobre la fila de la variante.
  - Verificar que la variante pertenezca a la `get_tienda_id()` actual.
  - Calcular `stock_posterior = stock_anterior + p_cantidad_delta`.
  - Si `stock_posterior < 0` → `raise exception 'Stock resultante negativo'`.
- Update `variantes_producto.stock_actual = stock_posterior`.
- Insert en `movimientos_stock` con `tienda_id`, `variante_id`, `tipo`, `cantidad = p_cantidad_delta`, `stock_anterior`, `stock_posterior`, `motivo`, `usuario_id = auth.uid()`.
- `return` el id del movimiento generado.
- `grant execute on function public.ajustar_stock_variante(...) to authenticated;`
- Registrar en `supabase/all_migrations.sql` si el repo usa ese archivo agregado (revisar).

**Archivos afectados:**

- `supabase/migrations/20260429000002_stock_rpc.sql` (nuevo)
- `supabase/all_migrations.sql` (append, si existe)

---

### Paso 2: Extraer helpers de formato a `lib/format.ts`

**Acciones:**

- Crear `app/lib/format.ts` con `formatARS(n: number)`, `formatDateTime(iso: string)`, `formatNumber(n: number)`.
- Reemplazar definiciones locales en `caja/queries.ts` (si las hay), `caja/page.tsx`, `SesionAbiertaPanel.tsx`, `CierreDetalle.tsx`.

**Archivos afectados:**

- `app/lib/format.ts` (nuevo)
- `app/app/(dashboard)/caja/page.tsx`
- `app/components/caja/SesionAbiertaPanel.tsx`
- `app/components/caja/CierreDetalle.tsx`
- (cualquier otro con definición duplicada que aparezca al buscar `formatARS`)

---

### Paso 3: `lib/stock/queries.ts`

**Acciones:**

- `listarStock(opts: { search?, categoriaId?, tallaId?, colorId?, soloBajoStock?, page?, pageSize? })`:
  - SELECT en `variantes_producto` con joins `producto:productos!inner(id,nombre,codigo_base,activo,categoria_id)`, `talla:tallas(id,nombre,orden)`, `color:colores(id,nombre,hex_color)`.
  - Filtros: `producto.activo = true`, `nombre ilike` (productos), `producto.categoria_id`, `talla_id`, `color_id`, `stock_actual <= stock_minimo and stock_minimo > 0` (cuando `soloBajoStock`).
  - Orden: bajo stock primero, luego nombre.
  - Paginación con count exact.
  - Devolver `{ items: VarianteStockItem[], total }`.
- `obtenerVarianteStock(id: string)`: SELECT variante completa + producto + talla + color, más últimos 20 movimientos.
- `listarMovimientos(opts: { tipo?, varianteId?, desde?, hasta?, page?, pageSize? })`: con joins variante (talla/color) y perfil de usuario (nombre, apellido).
- `contarVariantesBajoStock()`: count exact con filtro stock_minimo > 0 y stock_actual <= stock_minimo.
- Castear joins a `Record<string, unknown>` con `as unknown as`.

**Archivos afectados:**

- `app/lib/stock/queries.ts` (nuevo)

---

### Paso 4: `actions/stock.ts`

**Acciones:**

- `'use server'`.
- `ingresarStock({ variante_id, cantidad, motivo })`:
  - Validar `cantidad > 0`, `motivo` no vacío.
  - `supabase.rpc('ajustar_stock_variante', { p_variante_id, p_tipo: 'entrada', p_cantidad_delta: cantidad, p_motivo: motivo })`.
  - Devolver `ActionResult<{ movimiento_id: string }>`.
  - `revalidatePath('/stock')`, `revalidatePath('/stock/movimientos')`, `revalidatePath('/productos')`.
- `ajustarStock({ variante_id, nuevo_stock, motivo })`:
  - Validar `nuevo_stock >= 0`, `motivo` no vacío.
  - Leer `stock_actual` actual de la variante.
  - Calcular `delta = nuevo_stock - stock_actual`.
  - Si `delta === 0` → devolver `{ ok: true, data: null, info: 'Sin cambios' }`.
  - RPC con `p_tipo: 'ajuste'`, `p_cantidad_delta: delta`, `p_motivo: motivo`.
  - revalidatePath igual.
- Manejo de errores con `traducirError()` (errores comunes: 'Stock resultante negativo', 'permiso denegado').

**Archivos afectados:**

- `app/app/actions/stock.ts` (nuevo)

---

### Paso 5: Componentes de tabla y filtros

**Acciones:**

- `TablaStock.tsx` (server): props `{ items, total, page, pageSize, baseUrl }`. Columnas: producto + variante (talla/color con chip color), código_barras, stock_actual, stock_minimo, diferencia, badge alerta (`AlertaStockBajo`), link "Ver" → `/stock/[id]`.
- `FiltrosStock.tsx` (client): inputs sincronizados con searchParams; submit hace `router.push` con queries armadas. Switch "Solo bajo stock".
- `AlertaStockBajo.tsx` (server-safe): recibe `{ stockActual, stockMinimo }`, renderiza badge rojo si aplica, sino null.

**Archivos afectados:**

- `app/components/stock/TablaStock.tsx` (nuevo)
- `app/components/stock/FiltrosStock.tsx` (nuevo)
- `app/components/stock/AlertaStockBajo.tsx` (nuevo)

---

### Paso 6: Página `/stock` (listado principal)

**Acciones:**

- `page.tsx` async server component con `searchParams` (Next 16: tipo `Promise<{...}>`).
- Lee filtros, llama `listarStock`.
- Layout: header (`<h1>Stock</h1>` + link "Ver movimientos"), `FiltrosStock`, `TablaStock`, `Pagination`.
- Si `items.length === 0` → `EmptyState` apropiado.

**Archivos afectados:**

- `app/app/(dashboard)/stock/page.tsx` (modificar — reemplaza placeholder)

---

### Paso 7: Detalle por variante `/stock/[varianteId]`

**Acciones:**

- Page server con `params: Promise<{ varianteId: string }>`.
- Llama `obtenerVarianteStock`.
- Si no existe → `notFound()`.
- Layout:
  - Card: producto, talla/color/código de barras, precio.
  - Cards stat: stock_actual, stock_minimo, diferencia.
  - Dos forms (`IngresoForm`, `AjusteForm`) en grid.
  - `MovimientosTabla` con últimos 20 movimientos (sin paginación, link "Ver todos" filtrado).
- `IngresoForm.tsx` (client): inputs cantidad + motivo, useTransition + toast/feedback inline.
- `AjusteForm.tsx` (client): input nuevo_stock (default = actual) + motivo. Muestra delta calculado en vivo (`+5` verde, `-3` rojo). Submit con confirmación si delta significativo (ej. `Math.abs(delta) > stock_actual`).

**Archivos afectados:**

- `app/app/(dashboard)/stock/[varianteId]/page.tsx` (nuevo)
- `app/components/stock/IngresoForm.tsx` (nuevo)
- `app/components/stock/AjusteForm.tsx` (nuevo)
- `app/components/stock/MovimientosTabla.tsx` (nuevo)

---

### Paso 8: Historial general `/stock/movimientos`

**Acciones:**

- Page server con searchParams (tipo, varianteId, desde, hasta, page).
- Filtros: select tipo (entrada/salida/ajuste/devolucion/inicial/todos), date pickers desde/hasta, page.
- Llama `listarMovimientos`.
- `MovimientosTabla` reusable (acepta props de paginación).
- Link a detalle de venta cuando `venta_id` no es null.

**Archivos afectados:**

- `app/app/(dashboard)/stock/movimientos/page.tsx` (nuevo)
- `app/components/stock/MovimientosTabla.tsx` (reuso de Paso 7)

---

### Paso 9: Validación y QA

**Acciones:**

- `tsc --noEmit` exit 0.
- Verificar manualmente en dev:
  1. Crear migration en Supabase, comprobar RPC ejecuta.
  2. Abrir `/stock`, ver listado con joins correctos, filtrar por bajo stock.
  3. Entrar a una variante, ingresar +5 → ver stock actualizado y movimiento en historial.
  4. Hacer ajuste a un valor menor → ver delta negativo, motivo obligatorio.
  5. Vender una variante en POS → ver salida en `/stock/movimientos`.
  6. Anular una venta → ver devolución en `/stock/movimientos`.
- Validar UI responsive y empty states.

---

### Paso 10: Cerrar plan

**Acciones:**

- Marcar `Estado: Implementado` en este archivo.
- Agregar sección "Notas de Implementación" con archivos creados/modificados y decisiones técnicas relevantes.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/pos/queries.ts` — usa `variantes_producto.stock_actual` para filtrar buscador. **Sin cambios necesarios.**
- `app/lib/productos/queries.ts` — calcula `stock_total` por producto. **Sin cambios necesarios.**
- `app/components/layout/Sidebar.tsx` — link a `/stock` ya existe. Cambio opcional: badge con contador.

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` y `app/CLAUDE.md`: actualizar la sección de módulos al cierre si listan estado del MVP.
- `contexto/datos-actuales.md`: opcional, mencionar que el módulo de stock está operativo.

### Impacto en Flujos de Trabajo Existentes

- POS sigue funcionando igual; el trigger no se toca.
- Productos: el detalle ya muestra stock por variante; este módulo lo extiende con auditoría e ingresos sin cambiar productos.
- Caja/cierre: no impacta cálculos.

---

## Lista de Validación

- [ ] Migration `20260429000002_stock_rpc.sql` aplicada en Supabase y RPC invocable.
- [ ] `lib/stock/queries.ts` con `listarStock`, `obtenerVarianteStock`, `listarMovimientos`, `contarVariantesBajoStock` implementadas y tipadas.
- [ ] `actions/stock.ts` con `ingresarStock` y `ajustarStock` retornando `ActionResult` y revalidando rutas.
- [ ] Página `/stock` muestra tabla con filtros funcionando y paginación.
- [ ] Página `/stock/[varianteId]` permite ingreso y ajuste con feedback inline.
- [ ] Página `/stock/movimientos` lista historial con filtros tipo y fecha.
- [ ] Badge "Bajo stock" aparece cuando `stock_actual <= stock_minimo` y `stock_minimo > 0`.
- [ ] Ajuste con motivo vacío es rechazado.
- [ ] Ingreso con cantidad ≤ 0 es rechazado.
- [ ] RPC rechaza intento de stock_posterior negativo.
- [ ] Movimientos generados por venta y por anulación aparecen en `/stock/movimientos` con sus tipos correctos.
- [ ] `tsc --noEmit` exit 0.
- [ ] `lib/format.ts` centraliza `formatARS` y `formatDateTime`; sin duplicación.

---

## Criterios de Éxito

- El usuario puede entrar mercadería y corregir conteos físicos sin tocar la DB.
- Toda variante con `stock_minimo > 0` y `stock_actual <= stock_minimo` queda visible y filtrable.
- Toda alteración de stock (manual o automática) queda registrada en `movimientos_stock` con usuario, motivo y trazabilidad.
- El módulo respeta el patrón establecido (server pages + actions + queries + componentes mixtos) y no rompe POS, productos ni caja.


---

## Notas de Implementaci�n (2026-04-29)

Implementado en una sola pasada. Validaci�n `tsc --noEmit` OK (exit 0).

**Decisiones de las preguntas abiertas:**
- Vendedores **pueden** ingresar/ajustar (la RLS lo permite y simplifica la operativa MVP).
- Sidebar **sin badge** de bajo stock; se expondr� en `/dashboard` cuando se haga.

**Archivos creados:**
- `supabase/migrations/20260429000002_stock_rpc.sql` � RPC `ajustar_stock_variante` (security invoker, lock for update, validaci�n de stock no negativo, audita en `movimientos_stock`).
- `app/lib/format.ts` � helpers `formatARS`, `formatDateTime`, `formatDate`, `formatNumber`, `formatSignedDelta`.
- `app/lib/stock/queries.ts` � `listarStock`, `obtenerVarianteStock`, `listarMovimientos`, `contarVariantesBajoStock`.
- `app/app/actions/stock.ts` � `ingresarStock`, `ajustarStock` (v�a RPC; `ajustarStock` calcula delta).
- `app/components/stock/AlertaStockBajo.tsx` � badge con dos niveles (sin stock = rojo, bajo = �mbar).
- `app/components/stock/TablaStock.tsx` � tabla con columnas stock/m�nimo/diferencia + chip de color.
- `app/components/stock/FiltrosStock.tsx` � form client con b�squeda, categor�a, talla, color, "solo bajo stock".
- `app/components/stock/MovimientosTabla.tsx` � tabla reusable (`mostrarVariante` toggle).
- `app/components/stock/IngresoForm.tsx` � form ingresos (cantidad + motivo).
- `app/components/stock/AjusteForm.tsx` � form ajuste por inventario (stock final + motivo, calcula delta en vivo, confirm si `|delta| > max(actual, 5)`).
- `app/app/(dashboard)/stock/[varianteId]/page.tsx` � detalle con stat cards + dos forms + historial de la variante.
- `app/app/(dashboard)/stock/movimientos/page.tsx` � historial paginado con filtros tipo/fecha.

**Archivos modificados:**
- `app/app/(dashboard)/stock/page.tsx` � reemplaza placeholder por listado completo.
- `supabase/all_migrations.sql` � append de la nueva migration.

**Decisiones t�cnicas relevantes:**
1. **RPC `security invoker`, no `definer`.** Hereda RLS del usuario que la llama, as� la pol�tica `admin_inserta_movimientos` aplica naturalmente. Para que el insert funcione para vendedores, los tipos `entrada/ajuste/inicial` ya est�n permitidos por la policy existente.
2. **Filtro `bajo_stock` en dos pasos.** PostgREST no compara dos columnas directamente. Restringimos a `stock_minimo > 0` en la query y filtramos `stock_actual <= stock_minimo` en JS tras paginar. Para datasets chicos del MVP es suficiente.
3. **B�squeda por c�digo de barras vs texto.** Si el query es solo d�gitos, hace `eq('codigo_barras', term)` (escaneo). Si tiene letras, ILIKE en `producto.nombre` y `producto.codigo_base`.
4. **`AjusteForm` calcula delta en cliente.** Mejor UX: el usuario ve el `+5` o `-3` antes de confirmar. El server action recalcula igual con `select stock_actual` para evitar race conditions.
5. **No reemplazamos las copias inline de `formatARS` en POS/ventas/configuraci�n.** Para no expandir el alcance del plan; queda anotado para refactor futuro.
6. **`AlertaStockBajo` con dos niveles:** `stock_actual === 0` ? rojo "Sin stock"; `stock_actual <= stock_minimo` ? �mbar "Bajo stock". M�s �til que un solo nivel.
