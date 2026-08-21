# Plan: Rubro Distribuidora — pedidos POS, remito y cuenta corriente

**Creado:** 2026-08-15
**Estado:** Implementado
**Pedido:** Adaptar el sistema al rubro distribuidora: el encargado carga pedidos como en el POS, elige contado vs a cuenta (con recargo/margen por producto), emite remito y acumula saldo pendiente. Sin rutas ni catálogo público.

---

## Descripción General

### Qué Logra Este Plan

Un tenant con rubro `distribuidora` opera pedidos desde el POS actual: elige **Contado** o **A cuenta**, los precios de línea usan el recargo de cuenta **por producto**, se descuenta stock, se genera remito (entrega o cuenta corriente) y, si es a cuenta, la deuda queda en un ledger visible en el cliente (“cuánto me deben”). Los otros 9 rubros no cambian de flujo.

### Por Qué Importa

Hay un piloto de distribuidora y 8 tenants retail. El análisis (`planes/2026-08-15-analisis-adaptacion-distribuidora.md`) ya cerró: misma app, tipo A (mostrador), sin portal. Este plan convierte esa decisión en producto usable: pedido + remito + saldo pendiente, que es el núcleo que el dueño necesita el día 1. Las rutas/links a kioscos quedan fuera a propósito (no quitan escala; no se construyen ahora).

---

## Estado Actual

### Estructura Existente Relevante

| Pieza | Ruta | Qué hay |
|-------|------|---------|
| Rubros | `app/lib/rubro/config.ts`, `config_rubro`, `tiendas.rubro` CHECK | 9 rubros. Sin `distribuidora`. Flags `usarRemitos`, `usarPack`. |
| POS | `/pos`, `POSContainer.tsx`, `registrarVenta()` | Scanner, carrito, cobro obligatorio (`pagos.length > 0` salvo saldo a favor). Cliente opcional. |
| Precio | `productos.precio_venta`, `margen_ganancia_default` | Un precio. Markup sugerido sobre costo. |
| Remitos | `/remitos`, `crearRemito`, `registrarCobroRemito` | Tipos `entrega` / `cuenta_corriente`. Cobro solo marca `estado_cobro`; **no hay deuda en el cliente**. |
| Clientes | `clientes` | Persona: nombre, DNI. `saldo_favor >= 0` (crédito por devolución). **No es deuda.** |
| Caja / P&L | `cuentas_fondos`, `get_reporte_historico_meses` | `cobrado = brutas − saldo_favor_usado`. No existe “vendido a cuenta”. |
| Packs | `variantes_producto.pack_*` | Suelto vs bulto. Reusar tal cual. |
| Design system | `components/ui/`, tokens | UI nueva = primitives. |

### Brechas o Problemas que se Abordan

1. No existe el rubro ni el preset operativo (remitos + packs + pedido CC).
2. El POS no distingue contado vs fiado; siempre exige medios de pago.
3. No hay recargo/margen de cuenta por producto.
4. Remito CC no actualiza un saldo de cliente; el dueño no ve “me deben $X”.
5. P&L/caja tratarían una venta a cuenta como si hubiera entrado plata.

**Fuera de alcance (explícito):**

- Portal / link de catálogo para que el kiosco cargue el pedido.
- Rutas de reparto, preventista, chofer, hoja de ruta.
- N listas de precio (mayorista/minorista). Se usa **un precio contado + recargo % por producto**.
- Compras a proveedores, multi-depósito, lotes/vencimientos.
- Facturar un lote de remitos (AFIP sigue como hoy, por venta).

---

## Cambios Propuestos

### Resumen de Cambios

- Agregar rubro `distribuidora` (config + CHECK + selectores).
- Flags de rubro: `usarPedidoCc`, `remitoAutoVenta`, `clienteObligatorioCc`.
- Columnas: `productos.recargo_cc_pct`, `configuracion_tienda.recargo_cc_default`, `clientes.saldo_cc` + `limite_cc` + `cuit` opcional, `ventas.condicion_pago` + `monto_cc`.
- Tabla `movimientos_cc` + RPC atómico (cargo/pago).
- POS: toggle Contado / A cuenta; recálculo de precios; cobro CC sin pagos (o seña + resto).
- Al confirmar venta en este rubro: remito automático + cargo CC si corresponde.
- Ficha cliente: saldo pendiente, historial de movimientos, registrar cobro.
- `registrarCobroRemito` escribe el ledger (también remitos viejos con `cliente_id`).
- Dashboard: card “Por cobrar”.
- P&L: `cobrado` resta `monto_cc`.
- Retail: flags en `false`; mismo POS de siempre.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260816000001_rubro_distribuidora.sql` | CHECK `tiendas.rubro` + seed `config_rubro`. |
| `supabase/migrations/20260816000002_distribuidora_cc_pedidos.sql` | Columnas, `movimientos_cc`, RLS, RPC `registrar_movimiento_cc`, backfill de remitos CC pendientes. |
| `supabase/migrations/20260816000003_pl_resta_monto_cc.sql` | Ajustar `get_reporte_historico_meses`: cobrado = brutas − saldo_favor_usado − monto_cc. |
| `app/lib/pos/precio-cc.ts` | `precioConRecargoCc(precioContado, recargoPct)` + tests. |
| `app/lib/pos/precio-cc.test.ts` | Casos: 0%, 10%, redondeo 2 decimales, pack. |
| `app/lib/cc/queries.ts` | Listar movimientos, saldo, pendientes de un cliente / tienda. |
| `app/app/actions/cuenta-corriente.ts` | `registrarCobroCliente(clienteId, monto, cuentaFondoId?, remitoIds?)`. |
| `app/components/pos/CondicionPagoToggle.tsx` | Toggle Contado / A cuenta (primitives). |
| `app/components/clientes/SaldoCcCard.tsx` | Deuda + CTA cobrar. |
| `app/components/clientes/MovimientosCcList.tsx` | Ledger del cliente. |
| `app/components/clientes/RegistrarCobroCcForm.tsx` | Form cobrar (monto, cuenta de fondos, imputar remitos pendientes). |
| `app/components/dashboard/PorCobrarCard.tsx` | Suma `saldo_cc` de la tienda. |
| `app/lib/remitos/desde-venta.ts` | Helper puro: armar payload de remito desde venta+items+cliente. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/types/database.ts` | `Rubro` + tipos CC, `Cliente.saldo_cc`, `Producto.recargo_cc_pct`, `Venta.condicion_pago`. |
| `app/lib/rubro/config.ts` | Preset `distribuidora` + flags nuevos (default `false` en el resto). |
| `app/app/actions/configuracion.ts` | `RUBROS_VALIDOS` + `actualizarRecargoCcDefault`. |
| `app/app/api/productos/template-csv/route.ts` | Incluir `distribuidora` en `RUBROS_VALIDOS`. |
| `app/components/ui/RubroSelector.tsx` | Opción Distribuidora (icono Truck). |
| `app/components/configuracion/RubroForm.tsx` | Sale del array `TODOS_LOS_RUBROS` (automático). |
| `app/components/configuracion/NegocioForm.tsx` | Campo recargo CC default si `usarPedidoCc`. |
| `app/lib/configuracion/queries.ts` | Leer `recargo_cc_default`. |
| `app/components/productos/ProductoForm.tsx` | Campo `% recargo cuenta` (visible si flag). |
| `app/app/actions/productos.ts` | Persistir `recargo_cc_pct`. |
| `app/lib/pos/queries.ts` | Traer `recargo_cc_pct` en el select de variantes/productos. |
| `app/components/pos/POSContainer.tsx` | Estado `condicionPago`; recálculo; pasar a `registrarVenta`. |
| `app/components/pos/Carrito.tsx` | Badge precio CC vs contado. |
| `app/components/pos/CobroGuiadoModal.tsx` + `PasoCliente.tsx` + `PasoPago.tsx` | Cliente obligatorio si CC; pago opcional (seña). |
| `app/lib/pos/cobro-guiado-steps.ts` | `pasoValido` permite 0 pagos si CC. |
| `app/lib/pos/puede-cobrar.ts` | Misma regla. |
| `app/app/actions/ventas.ts` | `condicion_pago`, `monto_cc`; pagos vacíos si CC; post-venta remito + RPC cargo. |
| `app/app/actions/remitos.ts` | `registrarCobroRemito` → RPC pago CC. |
| `app/app/actions/clientes.ts` | `cuit`, `limite_cc` en input. |
| `app/components/clientes/ClienteForm.tsx` | CUIT + límite (si flag). |
| `app/lib/clientes/queries.ts` | Select `saldo_cc`, `limite_cc`, `cuit`. |
| `app/components/clientes/TablaClientes.tsx` | Columna “Deuda”. |
| `app/app/(dashboard)/clientes/[id]/page.tsx` | Card deuda + lista movimientos + cobro. |
| `app/app/(dashboard)/dashboard/page.tsx` | `PorCobrarCard` si `usarPedidoCc`. |
| `app/lib/dashboard/queries.ts` | `obtenerTotalPorCobrar()`. |
| `app/components/layout/nav-config.ts` | Label POS → “Pedido” cuando `usarPedidoCc` (vía `filterNavGroups` + flag). |
| `app/lib/reportes/queries.ts` + RPC | Restar `monto_cc` del cobrado. |
| `contexto/info-negocio.md`, `contexto/proyectos.md` | Rubro y módulo. |
| `CLAUDE.md` | Una línea: rubro `distribuidora` (pedido CC + remito auto). |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Mismo POS, no módulo `/pedidos`:** el usuario pidió “muy similar al POS”. Menos superficie, mismo scanner/packs/caja abierta.
2. **Sin portal ni rutas:** el encargado carga. Cero Auth extra. No toca la escalabilidad del SaaS.
3. **Precio = contado + recargo % por producto:** `precio_cuenta = round2(precio_venta * (1 + recargo/100))`. Recargo `null` → `recargo_cc_default` de la tienda (0 = mismo precio). Evita N listas.
4. **`saldo_cc` es deuda (me deben), distinto de `saldo_favor`:** no reutilizar el check `>= 0` de crédito por devolución. Ledger `movimientos_cc` + saldo denormalizado.
5. **Venta a cuenta sigue siendo `ventas.estado = completada`:** mueve stock. `monto_cc` es lo no cobrado. Caja solo se mueve por `pagos` (seña o contado).
6. **Remito automático solo si `remitoAutoVenta`:** tipo `entrega` si `monto_cc = 0`, `cuenta_corriente` si `monto_cc > 0`. Estado `emitido`. Ítems desde `detalles_venta`. No reemplaza `/remitos/nuevo`.
7. **Cliente obligatorio solo en A cuenta.** Contado puede seguir sin cliente (mostrador).
8. **Seña permitida:** pagos parciales + resto a `monto_cc`. Contado exige cubrir el total (regla actual).
9. **Límite CC:** aviso en POS si `saldo_cc + monto_cc > limite_cc`; no bloquea en v1 (el dueño decide).
10. **Flags en `ConfigRubro`, no `if (rubro === 'distribuidora')` esparcidos:** el resto de rubros queda apagado; ferretería podría prenderlos después.
11. **P&L `cobrado` resta `monto_cc`:** un financiero ve plata que entró ≠ mercadería que salió a fiar.
12. **UI primitives-first:** tokens semánticos; no `lime-*` / hex de marca.

### Alternativas Consideradas

| Alternativa | Por qué no |
|-------------|------------|
| App o fork aparte | Ya cerrado: mismo Supabase, mismo tenant. |
| Tabla `pedidos` con estados | Overkill: el encargado confirma en el acto (tipo A). |
| Dos precios absolutos por producto | Más carga; el pedido fue “margen/diferencia %”. |
| Reusar `saldo_favor` como deuda | Rompe devoluciones y el CHECK `>= 0`. |
| Solo marcar remito pendiente (como hoy) | El usuario no ve el saldo del cliente. |
| Portal kiosco | Fuera de alcance; no es el cuello de escala. |

### Preguntas Abiertas (si las hay)

Cerradas por este pedido (contado/CC, POS manual, sin rutas). Defaults si no hay reply:

1. **Recargo default de tienda:** `0` (mismo precio hasta que carguen %).
2. **Venta CC sobre límite:** avisa, no bloquea.
3. **Devolución de una venta CC:** v1 no cambia el módulo devoluciones; si hace falta, plan hijo (crédito que baja `saldo_cc`).

---

## Tareas Paso a Paso

### Paso 1: Rubro `distribuidora` en DB y config

Migración `20260816000001_rubro_distribuidora.sql`:

```sql
ALTER TABLE public.tiendas DROP CONSTRAINT IF EXISTS tiendas_rubro_check;
ALTER TABLE public.tiendas ADD CONSTRAINT tiendas_rubro_check CHECK (rubro IN (
  'ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico',
  'carniceria', 'farmacia', 'verduleria', 'distribuidora'
));

INSERT INTO public.config_rubro (
  rubro, label_var1, label_var2, usar_var1, usar_var2,
  unidades_disponibles, categorias_sugeridas, tallas_sugeridas, descripcion
) VALUES (
  'distribuidora', 'Marca', 'Presentación', true, true,
  ARRAY['unidad','pack','caja','litro','kg'],
  ARRAY['Bebidas','Almacén','Limpieza','Lácteos','Golosinas','Fiambres','Otros'],
  ARRAY['Unidad','Pack x6','Pack x12','Caja','1L','2L','500ml'],
  'Distribuidora — pedidos de mostrador, remito y cuenta corriente'
) ON CONFLICT (rubro) DO NOTHING;
```

En `app/lib/rubro/config.ts` extender `ConfigRubro`:

```ts
usarPedidoCc: boolean
remitoAutoVenta: boolean
clienteObligatorioCc: boolean
```

Preset `distribuidora`:

- `usarRemitos: true`, `usarDevoluciones: true`, `defaultSinVariantes: true`, `usarHexVar2: false`, `usarBalanza: false`, `usarPack: true`
- `usarPedidoCc: true`, `remitoAutoVenta: true`, `clienteObligatorioCc: true`
- Labels Marca / Presentación
- Unidades: unidad, pack, caja, litro, kg

Todos los demás rubros: los 3 flags nuevos en `false`.

`getConfigRubro` ya hace fallback a `generico`; `generico` no prende CC.

**Acciones:**

- Actualizar `Rubro` en `types/database.ts`.
- `TODOS_LOS_RUBROS` + `LABEL_RUBRO` (`🚚 Distribuidora`).
- `RUBROS_VALIDOS` en `actions/configuracion.ts` y `api/productos/template-csv/route.ts`.
- `RubroSelector`: `{ value: 'distribuidora', label: 'Distribuidora', Icon: Truck }`.
- `RubroProvider` ya pasa `getConfigRubro`; el context type debe incluir los 3 flags.

**Archivos afectados:**

- `supabase/migrations/20260816000001_rubro_distribuidora.sql`
- `app/lib/rubro/config.ts`
- `app/types/database.ts`
- `app/components/layout/RubroProvider.tsx`
- `app/app/actions/configuracion.ts`
- `app/app/api/productos/template-csv/route.ts`
- `app/components/ui/RubroSelector.tsx`

---

### Paso 2: Schema CC, recargo y venta

Migración `20260816000002_distribuidora_cc_pedidos.sql`:

```sql
-- Producto
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS recargo_cc_pct numeric(6,2);
ALTER TABLE public.productos
  ADD CONSTRAINT productos_recargo_cc_pct_check
  CHECK (recargo_cc_pct IS NULL OR recargo_cc_pct >= 0);

-- Tienda
ALTER TABLE public.configuracion_tienda
  ADD COLUMN IF NOT EXISTS recargo_cc_default numeric(6,2) NOT NULL DEFAULT 0;
ALTER TABLE public.configuracion_tienda
  ADD CONSTRAINT configuracion_recargo_cc_default_check
  CHECK (recargo_cc_default >= 0);

-- Cliente (deuda; 0 = no debe)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS saldo_cc numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_cc numeric(14,2),
  ADD COLUMN IF NOT EXISTS cuit text;
-- saldo_cc puede ser 0; no negativo en v1 (pagos no pueden dejar crédito por este ledger)
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_saldo_cc_nonneg CHECK (saldo_cc >= 0);

-- Venta
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS condicion_pago text NOT NULL DEFAULT 'contado',
  ADD COLUMN IF NOT EXISTS monto_cc numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_condicion_pago_check;
ALTER TABLE public.ventas ADD CONSTRAINT ventas_condicion_pago_check
  CHECK (condicion_pago IN ('contado', 'cuenta_corriente'));
ALTER TABLE public.ventas ADD CONSTRAINT ventas_monto_cc_nonneg CHECK (monto_cc >= 0);

CREATE TABLE public.movimientos_cc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id uuid NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('cargo', 'pago', 'ajuste')),
  monto numeric(14,2) NOT NULL CHECK (monto > 0),
  saldo_anterior numeric(14,2) NOT NULL,
  saldo_posterior numeric(14,2) NOT NULL,
  concepto text,
  venta_id uuid REFERENCES public.ventas(id) ON DELETE SET NULL,
  remito_id uuid REFERENCES public.remitos(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX movimientos_cc_cliente_idx ON public.movimientos_cc (cliente_id, created_at DESC);
CREATE INDEX movimientos_cc_tienda_idx ON public.movimientos_cc (tienda_id, created_at DESC);

ALTER TABLE public.movimientos_cc ENABLE ROW LEVEL SECURITY;
CREATE POLICY movimientos_cc_tienda_isolation ON public.movimientos_cc
  FOR ALL USING (tienda_id = public.get_tienda_id())
  WITH CHECK (tienda_id = public.get_tienda_id());
```

RPC `registrar_movimiento_cc(p_tienda_id, p_cliente_id, p_tipo, p_monto, p_concepto, p_venta_id, p_remito_id, p_usuario_id)`:

- `SECURITY DEFINER`, `SET search_path = public`.
- Validar `p_tienda_id = get_tienda_id()` (o que el cliente pertenezca a esa tienda).
- Lock de la fila cliente (`SELECT ... FOR UPDATE`).
- `cargo`: `nuevo = saldo_cc + monto`.
- `pago` / `ajuste` que baja: `nuevo = saldo_cc - monto`; si `nuevo < 0` → error (`Pago mayor a la deuda`).
- Insert movimiento + update `clientes.saldo_cc`.
- `RETURNS` saldo_posterior.
- Grant `authenticated`.

Índice: `clientes (tienda_id) WHERE saldo_cc > 0` para el dashboard.

**Backfill:** remitos `tipo = 'cuenta_corriente'` AND `estado_cobro = 'pendiente'` AND `cliente_id IS NOT NULL` AND `estado <> 'anulado'`:

- `pendiente = monto_total - monto_cobrado`
- Si `pendiente > 0`, un `cargo` por cliente (agrupar por cliente o un movimiento por remito — **un movimiento por remito**, concepto `Remito #N pendiente (migración)`).
- Recalcular `saldo_cc = SUM(cargos) - SUM(pagos)` por cliente.

**Acciones:**

- Tipos TS: `MovimientoCc`, campos en `Cliente`, `Producto`, `Venta`, `ConfiguracionTienda`.

**Archivos afectados:**

- `supabase/migrations/20260816000002_distribuidora_cc_pedidos.sql`
- `app/types/database.ts`

---

### Paso 3: Precio con recargo (puro + persistencia producto)

`app/lib/pos/precio-cc.ts`:

```ts
export function recargoEfectivo(recargoProducto: number | null | undefined, recargoDefault: number): number {
  if (recargoProducto != null && Number.isFinite(recargoProducto)) return Math.max(0, recargoProducto)
  return Math.max(0, recargoDefault)
}

export function precioConRecargoCc(precioContado: number, recargoPct: number): number {
  return round2(precioContado * (1 + recargoPct / 100))
}
```

Tests: 1000 + 10% = 1100; 0% = 1000; 99.99 + 10% redondeo.

`ProductoForm`: si `useRubro().usarPedidoCc`, input “Recargo cuenta (%)” debajo de precio venta. Hint: “Si paga a cuenta, el precio será $X”. Vacío = usa default de tienda.

`crearProducto` / `actualizarProducto`: guardar `recargo_cc_pct` (null si vacío).

`lib/pos/queries.ts`: incluir `productos.recargo_cc_pct` en el join; exponerlo en `VarianteResultado` y `ProductoPOS`.

CSV template: columna opcional `recargo_cc_pct` solo en template distribuidora (`getColumnasTemplate`).

**Archivos afectados:**

- `app/lib/pos/precio-cc.ts`
- `app/lib/pos/precio-cc.test.ts`
- `app/components/productos/ProductoForm.tsx`
- `app/app/actions/productos.ts`
- `app/lib/pos/queries.ts`
- `app/lib/rubro/templates.ts`

---

### Paso 4: Config tienda — recargo default

`NegocioForm` (o bloque en `/configuracion` cobros): si `usarPedidoCc`, number input “Recargo cuenta corriente por defecto (%)”.

Action `actualizarRecargoCcDefault(valor)` → `configuracion_tienda.recargo_cc_default`.

`obtenerConfiguracionTienda` ya debe devolver el campo; `POS` page lo pasa a `POSContainer`.

**Archivos afectados:**

- `app/components/configuracion/NegocioForm.tsx`
- `app/app/actions/configuracion.ts`
- `app/lib/configuracion/queries.ts`

---

### Paso 5: POS — condición de pago y precios

En `POSContainer`:

- `condicionPago: 'contado' | 'cuenta_corriente'` (default `contado`).
- Si `usarPedidoCc`, renderizar `CondicionPagoToggle` arriba del carrito (junto al chip de total).
- Al cambiar a CC: mapear items `precio_unitario = precioConRecargoCc(precioContadoBase, recargoEfectivo(...))`. Guardar `precio_contado` en el `CartItem` para poder volver atrás sin perder el original.
- Packs: el recargo se aplica al **precio ya resuelto** (unidad o pack), no al costo.
- Si pasa a CC sin cliente: no bloquear el carrito; bloquear **confirmar** con mensaje “Elegí un cliente para fiar”.
- Si `limite_cc` y `cliente.saldo_cc + total > limite_cc`: banner warning, se puede cobrar igual.

`CartItem` nuevo campo opcional: `precio_contado: number`, `recargo_cc_pct: number`.

`CondicionPagoToggle`: dos `Button` variant primary/secondary, accesible `role="radiogroup"`.

Nav: `filterNavGroups` recibe `usarPedidoCc`; si true, el item `/pos` usa `label: 'Pedido'`.

**Archivos afectados:**

- `app/components/pos/CondicionPagoToggle.tsx`
- `app/components/pos/POSContainer.tsx`
- `app/components/pos/Carrito.tsx`
- `app/components/layout/nav-config.ts`
- `app/components/layout/SidebarV2.tsx` / `CommandPalette.tsx` (pasar el flag)

---

### Paso 6: Cobro guiado y `registrarVenta`

`RegistrarVentaInput` agrega:

```ts
condicion_pago?: 'contado' | 'cuenta_corriente'
```

Lógica:

- Default `contado`.
- `contado`: igual que hoy (pagos cubren total, caja, fondos).
- `cuenta_corriente`:
  - Exigir `cliente_id`.
  - `pagos` puede ser `[]`.
  - `monto_cc = round2(total - sumaPagos - saldo_favor_usado)` (mínimo 0).
  - Si `monto_cc <= 0` y hay pagos que cubren: tratar como contado (no cargo).
  - Insert venta con `condicion_pago` y `monto_cc`.
  - Los pagos que existan mueven fondos como hoy.
  - Si `monto_cc > 0`: RPC `registrar_movimiento_cc` tipo `cargo`, concepto `Pedido #ticket`, `venta_id`.
  - Si `remitoAutoVenta` (leer rubro/config en server): crear remito `estado = 'emitido'`, tipo según `monto_cc`, items snapshot, `cliente_id`, destinatario = nombre cliente, `estado_cobro` pendiente/no_aplica, `monto_total = total`.

`puede-cobrar` / `pasoValido('pago')`: si CC, válido con 0 pagos.

`PasoCliente` si `usarPedidoCc && condicion === 'cuenta_corriente'`: ocultar “Sin cliente”; título “¿A quién se fía el pedido?”.

`PasoPago` si CC: copy “Opcional — lo que no cubras queda en cuenta corriente. Deuda: $X”.

`ClienteLite` incluir `saldo_cc`, `limite_cc`.

Caja abierta: **sigue siendo obligatoria** (mismo control de turno). La parte CC no incrementa efectivo.

Revalidate `/clientes`, `/remitos`, `/dashboard`.

**Archivos afectados:**

- `app/app/actions/ventas.ts`
- `app/lib/pos/puede-cobrar.ts`
- `app/lib/pos/cobro-guiado-steps.ts`
- `app/components/pos/CobroGuiadoModal.tsx`
- `app/components/pos/cobro-guiado/PasoCliente.tsx`
- `app/components/pos/cobro-guiado/PasoPago.tsx`
- `app/components/pos/cobro-guiado/PasoConfirmacion.tsx` (mostrar “A cuenta $X”)
- `app/lib/remitos/desde-venta.ts`
- `app/app/actions/remitos.ts` (exportar helper interno o función `crearRemitoDesdeVenta` usada por ventas)

---

### Paso 7: Cobranza — cliente y remito

`registrarCobroCliente` (`actions/cuenta-corriente.ts`):

- Input: `clienteId`, `monto`, `cuentaFondoId` (opcional; si hay caja abierta y cuenta, crear `movimientos_fondos` ingreso), `remitoIds?: string[]`.
- Validar monto ≤ `saldo_cc`.
- RPC `pago`.
- Si `remitoIds`: imputar FIFO o los IDs: llamar la misma lógica que `registrarCobroRemito` **sin** volver a tocar el ledger (flag `skipLedger` o hacer que remito-cobro sea el único writer y el form de cliente solo elija remitos).
- **Regla única:** todo pago CC pasa por RPC. `registrarCobroRemito` actualiza montos del remito **y** llama RPC (concepto `Cobro remito #N`). El form de cliente: o cobra “a cuenta” sin imputar, o recorre remitos y por cada uno `registrarCobroRemito`.

Evitar doble cargo: `registrarCobroRemito` inserta el movimiento; el form cliente **solo** usa esa action (repartir monto entre remitos pendientes en orden de fecha).

Si sobra monto sin remito (deuda de backfill o cargo sin remito): un `pago` suelto.

UI ficha cliente (`usarPedidoCc` o `saldo_cc > 0` para no esconder deuda migrada en ferretería):

- `SaldoCcCard`: “Debe $X” / “Sin deuda”.
- `RegistrarCobroCcForm` (owner/admin).
- `MovimientosCcList`.

`TablaClientes`: columna Deuda si el rubro tiene el flag **o** algún cliente tiene `saldo_cc > 0`.

**Archivos afectados:**

- `app/app/actions/cuenta-corriente.ts`
- `app/app/actions/remitos.ts`
- `app/lib/cc/queries.ts`
- `app/components/clientes/*` (nuevos + ficha + tabla)
- `app/app/(dashboard)/clientes/[id]/page.tsx`

---

### Paso 8: Dashboard y P&L

`obtenerTotalPorCobrar()`: `SUM(saldo_cc) WHERE tienda_id = ... AND saldo_cc > 0` + count clientes con deuda.

`PorCobrarCard`: valor + link a `/clientes?deuda=1` (filtro query en listado).

Dashboard page: render si `getConfigRubro(rubro).usarPedidoCc`.

Migración `20260816000003_pl_resta_monto_cc.sql`: en el CTE `ventas_mes` agregar `COALESCE(SUM(v.monto_cc),0) AS monto_cc` y  
`cobrado = ventas_brutas - credito_usado - monto_cc`.

Actualizar tipos/tests de `lib/reportes` (`formulas.ts` si aplica).

Caja/resumen de turno: no sumar `monto_cc` como ingreso. Las ventas CC aparecen en cantidad de tickets; el efectivo solo por `pagos_venta`. Verificar `resumen-turno` / RPCs de cierre — si hoy suman `ventas.total`, **cambiar a sumar pagos del turno**, no el total de la venta. Si ya suman pagos, no tocar.

**Acciones:**

- Grep `SUM(v.total)` / `ventas.total` en RPCs de caja y corregir solo si cuentan plata que no entró.

**Archivos afectados:**

- `app/lib/dashboard/queries.ts`
- `app/components/dashboard/PorCobrarCard.tsx`
- `app/app/(dashboard)/dashboard/page.tsx`
- `supabase/migrations/20260816000003_pl_resta_monto_cc.sql`
- `app/lib/reportes/*`
- RPCs de caja si aplica

---

### Paso 9: Clientes B2B mínimo + listado filtro deuda

`ClienteInput`: `cuit?`, `limite_cc?`.

Form: campos visibles si `usarPedidoCc` (CUIT, límite de cuenta). Nombre = nombre de fantasía / comercio.

`listarClientes`: select nuevos campos; si `searchParams.deuda=1`, filtrar `saldo_cc > 0`.

**Archivos afectados:**

- `app/app/actions/clientes.ts`
- `app/components/clientes/ClienteForm.tsx`
- `app/lib/clientes/queries.ts`
- `app/app/(dashboard)/clientes/page.tsx`

---

### Paso 10: Anulación de venta CC

En `anularVenta` (ya existe): si `monto_cc > 0` y hay movimiento cargo de esa `venta_id`, RPC `pago` o `ajuste` por el mismo monto (concepto `Anulación pedido #N`) para no dejar deuda fantasma. Si ya hubo cobros parciales imputados a ese remito, no auto-borrar pagos: solo revertir el **cargo neto no cobrado** (`monto_cc` original menos lo ya pagado sobre ese remito). Si es ambiguo: revertir `min(saldo_cc, cargo_de_esa_venta_aun_abierto)` y anular remito.

Remito asociado: `estado = 'anulado'`.

**Archivos afectados:**

- `app/app/actions/ventas.ts`

---

### Paso 11: Contexto, CLAUDE, análisis padre

- `contexto/info-negocio.md`: mercado sigue siendo retail; rubro `distribuidora` = pedidos mostrador + CC + remito. Sin portal.
- `contexto/proyectos.md`: módulo “Pedido CC / remito auto (distribuidora)” en desarrollo o backlog→en desarrollo.
- `CLAUDE.md` (sección App): una fila — rubro `distribuidora`, flags `usarPedidoCc` / `remitoAutoVenta`.
- Marcar `planes/2026-08-15-analisis-adaptacion-distribuidora.md` con nota al final: “Fase 1 producto: este plan”.

No tocar landing copy de venta (opcional: un chip más en la grilla de rubros de `LandingPage` / `PitchVisuals` si la lista está hardcodeada — sí, para no mentir en registro).

**Archivos afectados:**

- `contexto/info-negocio.md`
- `contexto/proyectos.md`
- `CLAUDE.md`
- `app/components/landing/LandingPage.tsx` (solo si lista rubros a mano)
- `app/components/pitch/PitchVisuals.tsx` (idem)
- `planes/2026-08-15-analisis-adaptacion-distribuidora.md` (nota)

---

### Paso 12: Validación manual

Con un tenant de prueba en rubro `distribuidora`:

1. Alta producto: precio 1000, recargo 10% → hint $1100.
2. POS Contado, sin cliente, 1 unidad → cobra $1000, remito tipo entrega, `saldo_cc` 0.
3. POS A cuenta, cliente X, 1 unidad → no paga → venta $1100, remito CC pendiente, cliente debe $1100, caja no sube.
4. Seña $400 + resto CC → fondos +400, deuda +700.
5. Ficha cliente: cobrar $700 a efectivo → deuda 0, remito cobrado, caja +700.
6. Toggle CC→contado en el carrito restaura $1000.
7. Tenant `ropa`: no se ve toggle, no se ve recargo en producto, POS igual.
8. Dashboard distribuidora muestra Por cobrar; ropa no (salvo deuda migrada: card solo por flag).

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/rubro/config.ts` — fuente de flags.
- `app/app/actions/ventas.ts` — único writer de ventas/stock.
- `app/app/actions/remitos.ts` — cobro remito hoy incompleto vs ledger.
- `supabase/migrations/20260510000003_saldo_a_favor.sql` — no tocar semántica.
- `supabase/migrations/20260815000002_reporte_pl_credito_usado.sql` — se reescribe cobrado.
- `planes/2026-08-15-analisis-adaptacion-distribuidora.md` — decisión previa.
- `app/components/layout/nav-config.ts` — label Pedido.

### Actualizaciones Necesarias para Consistencia

- Tipos `database.ts` alineados a migraciones.
- Tests de P&L y `puede-cobrar`.
- CLAUDE + contexto.

### Impacto en Flujos de Trabajo Existentes

- Retail: ninguno si los flags están en `false` y `condicion_pago` default `contado` / `monto_cc = 0`.
- Ferretería/corralón con remitos CC viejos: el backfill **sí** les carga `saldo_cc`. Es correcto (por fin ven la deuda). El POS de esos rubros **no** muestra el toggle hasta que prendan flags (no en este plan).
- Caja: ventas fiadas no inflan efectivo.

---

## Lista de Validación

- [x] Tenant nuevo puede elegir Distribuidora en registro
- [x] Config → rubro incluye Distribuidora
- [x] POS distribuidora: toggle Contado / A cuenta; precios se recalculan
- [x] A cuenta sin cliente no confirma
- [x] A cuenta sin pagos crea venta + remito CC + `saldo_cc`
- [x] Contado no toca `saldo_cc` y remito es entrega
- [x] Recargo por producto y default de tienda funcionan
- [x] Cobro en ficha y en remito bajan la misma deuda (sin doble descuento)
- [x] Anular venta CC revierte deuda neta
- [x] P&L `cobrado` no incluye `monto_cc`
- [x] Dashboard “Por cobrar” solo con flag
- [x] Rubro ropa: POS/productos/dashboard sin UI nueva
- [x] Packs + recargo: recargo sobre precio pack
- [x] UI con primitives / tokens
- [x] `CLAUDE.md` y `contexto/` actualizados
- [ ] Migraciones aplicadas en orden 001 → 002 → 003 (pendiente en el proyecto Supabase)

---

## Criterios de Éxito

1. El encargado carga un pedido como hoy, marca **A cuenta**, elige cliente, confirma: hay remito pendiente y la ficha muestra la deuda exacta (precio con recargo).
2. Si marca **Contado**, cobra igual que siempre; el remito queda como entrega; nadie “debe”.
3. Un tenant ropa no ve el toggle ni campos de recargo; sus números de caja/P&L no cambian.
4. No existe ruta pública de catálogo ni usuarios extra por kiosco.

---

## Notas

- Piloto: cambiar el rubro del tenant en Configuración → Rubro (avisa que cambian labels). No migrar datos de talla/color a marca/presentación en automático.
- PrintBridge: el remito A4 ya existe; al crear auto, redirigir o ofrecer “Imprimir remito” post-venta (si el flujo actual de print de ticket estorba, priorizar remito en este rubro y ticket opcional).
- Devoluciones de fiado y portal kiosco = planes hijos.
- Aplicar migraciones en el proyecto Supabase de prod cuando se implemente; no commitear secrets.

---

## Notas de Implementación

**Implementado:** 2026-08-15

### Resumen

Rubro `distribuidora` con flags `usarPedidoCc` / `remitoAutoVenta` / `clienteObligatorioCc`. POS con toggle Contado / A cuenta, recargo por producto (o default de tienda), `registrarVenta` acepta fiado (pagos vacíos o seña), cargo en `movimientos_cc`, remito automático emitido, cobranza única vía `registrarCobroRemito` + form de cliente, anulación revierte deuda neta, P&L/caja restan `monto_cc`, dashboard “Por cobrar”.

### Desviaciones del Plan

- Helper `syncCarritoPrecios` / `aplicarPreciosCondicion` en `lib/pos/precios-condicion.ts` para aplicar pack siempre sobre precio de contado y el recargo después.
- Remito auto: `monto_total = total` de la venta y `monto_cobrado = total - monto_cc` (la seña ya figura cobrada en el remito).
- `ClienteLite.saldo_cc` / `limite_cc` opcionales para no romper construcciones existentes (devoluciones, selectores).
- Migraciones escritas; **no aplicadas** al proyecto Supabase (queda operativo al correr 001→002→003).

### Problemas Encontrados

Ninguno bloqueante. Validación manual en tenant piloto pendiente de aplicar migraciones.
