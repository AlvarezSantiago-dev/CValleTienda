# Plan: Wipe operativo Provisiones Adonai (datos transaccionales)

**Creado:** 2026-09-01
**Estado:** Implementado
**Pedido:** SQL one-shot que borre ventas, clientes, caja, remitos, pedidos y todo lo que alimenta reportes de Provisiones Adonai (User UID `e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498`), sin tocar configuración, productos, cuentas de fondo ni métodos de pago.

---

## Descripción General

### Qué Logra Este Plan

Un script SQL **one-shot**, **fuera de migraciones**, que deja a Provisiones Adonai como tienda “lista para operar de cero”: catálogo, precios, stock actual, logo, ticket, cobros y usuarios intactos; historial de ventas/caja/clientes/reportes vacío. Se ejecuta una vez en el SQL Editor de Supabase (rol `postgres`), en una sola transacción, con guards para no tocar otro tenant.

### Por Qué Importa

Adonai ya operó en el sistema (auditorías de caja 2026-07-23). Un wipe de datos operativos permite arrancar reportes, dashboard, kardex de movimientos y numeración de tickets en limpio sin re-cargar el surtido ni reconfigurar caja/cobros. Un DELETE mal ordenado o un script sin filtro de `tienda_id` destruiría otro comercio o el stock.

---

## Estado Actual

### Estructura Existente Relevante

| Pieza | Ubicación | Nota |
| ----- | --------- | ---- |
| Identidad | User UID `e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498` | Es `auth.users.id` = `perfiles.id`. **No asumir que es `tiendas.id`.** Un repair previo usó `tienda_id = 97d8103b-75c0-4944-a6b7-bf76231500a0`. El script **resuelve** `tienda_id` vía `perfiles`. |
| Tenant | `tiendas` + `perfiles` | Owner + cajeros. Conservar. |
| Productos | `productos`, `variantes_producto`, `categorias`, `tallas`, `colores`, packs, tramos, kits, bundles, `historial_precios`, Storage `productos/` | Conservar filas y `stock_actual`. |
| Config | `configuracion_tienda`, `configuracion_etiquetas`, `facturacion_config`, columnas de catálogo en `tiendas` | Conservar. Contadores `ultimo_numero_*` viven acá (ver decisión). |
| Cobros | `cuentas_fondos` (definición + `saldo_actual`), `metodos_pago` | Conservar **filas**. Resetear solo `saldo_actual`. |
| Operativo | ventas, pagos, devoluciones, remitos, caja, fondos (ledger), stock (ledger), clientes, CC, pedidos catálogo, notificaciones | Borrar. |
| One-shots previos | `salidas/2026-07-23-adonai-repair-saldos.sql`, `supabase/fix-fondos-ventas-anuladas.sql` | Patrón: SQL pegable en dashboard, **no** migration. |
| Baja de cuenta | `app/lib/cuenta/borrar-tienda.ts` | Borra la tienda entera + storage + auth. **No usar.** |

### Inventario de tablas (schema actual)

**Conservar (identidad / config / catálogo):**

- `tiendas`, `perfiles`
- `configuracion_tienda`, `configuracion_etiquetas`, `facturacion_config`
- `cuentas_fondos` (filas), `metodos_pago`
- `categorias`, `tallas`, `colores`
- `productos`, `variantes_producto` (incluye `stock_actual`, `stock_minimo`, barcodes, fotos, pack 1:1)
- `producto_tramos_cantidad`, `producto_packs`, `producto_pack_tramos`
- `producto_componentes`, `kit_componentes`
- `historial_precios`
- `config_rubro` (tabla global, no es de tenant)
- `solicitudes_upgrade` (billing)
- Storage buckets `productos` y `logos` (fotos de mercadería y logo)

**Borrar (operativo / reportes):**

| Tabla | Por qué |
| ----- | ------- |
| `notificaciones` | Campana pedidos |
| `pedido_catalogo_items` | Ítems WhatsApp |
| `pedidos_catalogo` | Pedidos públicos (inbox `/pedidos`) |
| `pagos_devolucion`, `detalles_devolucion`, `devoluciones` | Devoluciones + reintegros |
| `pagos_venta`, `detalles_venta`, `ventas` | POS, tickets, ganancia, tops |
| `remito_items`, `remitos` | Remitos A4 / CC |
| `movimientos_cc` | Ledger cuenta corriente + recibos CC |
| `movimientos_fondos` | Ledger de caja / P&L egresos |
| `movimientos_stock` | Kardex (reportes de stock). **No** cambia `variantes_producto.stock_actual` |
| `cierres_caja_detalle`, `cierres_caja`, `sesiones_caja` | Turnos e historial de caja |
| `clientes` | CRM, `saldo_cc`, `saldo_favor`, métricas |

`cola_impresion` **ya no existe** (drop 20260429000004). No referenciarla.

### FKs que imponen orden de DELETE

| Restricción | Implicación |
| ----------- | ----------- |
| `devoluciones.venta_id` **ON DELETE RESTRICT** | Borrar devoluciones **antes** que ventas |
| `pagos_venta` / `detalles_venta` CASCADE desde ventas | Alcanza con borrar `ventas` si los hijos no se borran antes; igual borrar explícito por claridad |
| `sesiones_caja.usuario_apertura_id` RESTRICT hacia `perfiles` | No borrar perfiles |
| `metodos_pago.cuenta_fondo_id` RESTRICT | No borrar cuentas de fondo |
| Triggers de stock/fondos son **AFTER INSERT/UPDATE**, no DELETE | Borrar ventas **no** repone stock ni revierte fondos. Hay que resetear `saldo_actual` a mano |

### Brechas o Problemas que se Abordan

- No hay un wipe tenant-scoped: `borrar-tienda` es destrucción total.
- Confusión histórica UID vs `tienda_id` (docs 2026-07-23). Un hardcoded de `tienda_id` equivocado wipea el tenant incorrecto o no wipea Adonai.
- `cuentas_fondos.saldo_actual` no se actualiza al DELETE de `movimientos_fondos` (el RPC de eliminar movimiento sí; un DELETE crudo no). Sin reset, caja mostraría plata sin ledger.
- Contadores de ticket/remito/devolución viven en config: hay que resetear **solo esas tres columnas**, no el resto de la fila.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear `scripts/sql/2026-09-01-wipe-operativo-adonai.sql`: guards + conteo previo + DELETE ordenado + reset de saldos/contadores + verificación.
- Crear `scripts/sql/2026-09-01-wipe-operativo-adonai-precheck.sql`: solo SELECT (dry-run) para pegar **antes** del wipe y confirmar tenant/conteos.
- No tocar app, migraciones, RLS ni Storage de productos.
- Anotar en `CLAUDE.md` que los SQL one-shot de tenant viven en `scripts/sql/` y **nunca** se aplican como migration.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `scripts/sql/2026-09-01-wipe-operativo-adonai-precheck.sql` | Auditoría de solo lectura: resuelve tienda, lista conteos, aborta visualmente si el nombre no parece Adonai |
| `scripts/sql/2026-09-01-wipe-operativo-adonai.sql` | Wipe destructivo en una transacción, con los mismos guards |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `CLAUDE.md` | Una viñeta en Notas: scripts SQL operativos one-shot en `scripts/sql/`; no son migraciones; no reutilizar el wipe Adonai en otro tenant |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Resolver `tienda_id` desde el User UID, no hardcodear tienda:** `SELECT tienda_id FROM perfiles WHERE id = 'e0a9c8c7-…'`. Guard extra: `tiendas.nombre` debe contener `adonai` (case-insensitive). Si 0 filas, >1 tienda inesperada, o nombre no matchea → `RAISE EXCEPTION` y rollback.
2. **No es migration.** Vive en `scripts/sql/`. Aplicarlo con `supabase db push` rompería (o intentaría wipear) cualquier entorno.
3. **Una transacción `BEGIN`/`COMMIT`.** Fallo a mitad = nada aplicado.
4. **No deshabilitar triggers con `session_replication_role`.** Los DELETE de ventas/devoluciones no disparan reposición de stock ni movimientos de fondos. Más seguro que apagar triggers globales.
5. **Conservar `stock_actual`.** El inventario físico ya está en las variantes. Se borra el kardex (`movimientos_stock`) y se inserta **un** movimiento `tipo = 'inicial'` por variante con `stock_actual >= 0` (saltar `stock_actual = -1`, despensa ilimitada) para que el próximo reporte de stock no parta vacío e inconsistente.
6. **Reset `cuentas_fondos.saldo_actual = 0`.** Las cuentas (Efectivo, MP, banco: nombre, tipo, color, icono, activo, orden) no se tocan. El saldo es estado operativo; sin ledger tiene que ir a cero o caja miente.
7. **Reset solo contadores:** `ultimo_numero_ticket`, `ultimo_numero_devolucion`, `ultimo_numero_remito` → `0`. El resto de `configuracion_tienda` (prefijo, pie, ancho, redondeo, recargo CC, balanza, modo cobro, textos) **intacto**. Pedidos de catálogo numeran con `max(numero)+1`, así que al vaciar la tabla el próximo pedido es `#1` sin columna extra.
8. **Borrar sesiones de caja abiertas.** Después del wipe hay que abrir un turno nuevo. Documentarlo en el header del SQL.
9. **No tocar Storage.** Fotos de producto y logo son configuración de catálogo.
10. **No tocar `historial_precios`.** Es historial del producto, no de ventas.
11. **Ejecutar como `postgres` en SQL Editor** (bypassa RLS). Un usuario `authenticated` no puede borrar cross-table con este script.

### Alternativas Consideradas

| Enfoque | Por qué se rechaza |
| ------- | ------------------ |
| `DELETE FROM tiendas` / `borrarTiendaYLogins` | Borra productos, config, usuarios y auth |
| Anular ventas en vez de borrar | Dispara `ventas_revertir_stock` y **sube el stock**; deja basura en reportes |
| Hardcodear `tienda_id` del repair `97d8103b-…` | Puede estar desfasado; el usuario dio UID |
| Dejar `saldo_actual` como está | Caja/dashboard mostrarían plata sin movimientos ni ventas |
| `TRUNCATE … CASCADE` | No es tenant-scoped; mata todos los comercios |
| Poner el SQL en `supabase/migrations/` | Se aplicaría en cada entorno y en tenants futuros |
| Vaciar solo ventas y dejar clientes | Pedido explícito: “datos clientes todo lo que genere reportes” |

### Preguntas Abiertas (si las hay)

Resueltas al implementar (2026-09-01):

1. **Numeración** → **sí**, tickets/devoluciones/remitos a 0.
2. **Saldos de cuentas** → **sí**, `saldo_actual = 0`; las filas de cuentas se conservan.
3. **UID es owner de Adonai** → **sí**. El SQL además exige `perfiles.rol = 'owner'`.
4. **Caja abierta** → el script borra sesiones; reabrir después. Coordinar no vender durante el wipe.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Crear carpeta y precheck de solo lectura

Crear `scripts/sql/` si no existe. El precheck **no** hace DELETE.

**Acciones:**

- Archivo: `scripts/sql/2026-09-01-wipe-operativo-adonai-precheck.sql`
- Constante al tope:

```sql
-- User UID (perfiles.id / auth.users.id) — NO es necesariamente tiendas.id
-- provisionesadonai@gmail.com / Provisiones Adonai
\set IGNORE_THIS 0
```

En SQL Editor de Supabase no hay `\set` fiable. Usar un bloque `DO` + queries sueltas. Especificación completa:

```sql
-- PRECHECK wipe Adonai — SOLO LECTURA. No borra nada.
-- Pegar en SQL Editor (rol postgres). Revisar NOTICE y result sets antes del wipe.

DO $$
DECLARE
  c_user_uid constant uuid := 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498';
  v_tienda_id uuid;
  v_nombre text;
  v_email text;
  n int;
BEGIN
  SELECT p.tienda_id, t.nombre, t.email
    INTO v_tienda_id, v_nombre, v_email
  FROM public.perfiles p
  JOIN public.tiendas t ON t.id = p.tienda_id
  WHERE p.id = c_user_uid;

  IF v_tienda_id IS NULL THEN
    RAISE EXCEPTION 'No hay perfil para UID %. Abort.', c_user_uid;
  END IF;

  IF position('adonai' in lower(coalesce(v_nombre, ''))) = 0 THEN
    RAISE EXCEPTION 'La tienda "%" (id %) no parece Adonai. Abort.', v_nombre, v_tienda_id;
  END IF;

  RAISE NOTICE 'OK tenant: nombre=% email=% tienda_id=% user_uid=%',
    v_nombre, v_email, v_tienda_id, c_user_uid;
END $$;
```

Luego un único `SELECT` con conteos filtrados por `tienda_id` resuelto en subquery:

```sql
WITH t AS (
  SELECT tienda_id FROM public.perfiles
  WHERE id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
)
SELECT 'ventas' AS tabla, count(*) FROM public.ventas WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'detalles_venta', count(*) FROM public.detalles_venta WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'pagos_venta', count(*) FROM public.pagos_venta WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'devoluciones', count(*) FROM public.devoluciones WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'detalles_devolucion', count(*) FROM public.detalles_devolucion WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'pagos_devolucion', count(*) FROM public.pagos_devolucion WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'remitos', count(*) FROM public.remitos WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'remito_items', count(*) FROM public.remito_items WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'sesiones_caja', count(*) FROM public.sesiones_caja WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'sesiones_caja_abiertas', count(*) FROM public.sesiones_caja WHERE tienda_id = (SELECT tienda_id FROM t) AND estado = 'abierta'
UNION ALL SELECT 'cierres_caja', count(*) FROM public.cierres_caja WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'movimientos_fondos', count(*) FROM public.movimientos_fondos WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'movimientos_stock', count(*) FROM public.movimientos_stock WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'movimientos_cc', count(*) FROM public.movimientos_cc WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'clientes', count(*) FROM public.clientes WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'pedidos_catalogo', count(*) FROM public.pedidos_catalogo WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'pedido_catalogo_items', count(*) FROM public.pedido_catalogo_items WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'notificaciones', count(*) FROM public.notificaciones WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'productos (NO borrar)', count(*) FROM public.productos WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'variantes (NO borrar)', count(*) FROM public.variantes_producto WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'cuentas_fondos (NO borrar filas)', count(*) FROM public.cuentas_fondos WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'metodos_pago (NO borrar)', count(*) FROM public.metodos_pago WHERE tienda_id = (SELECT tienda_id FROM t)
ORDER BY 1;
```

Segundo result set: saldos actuales de cuentas (para que el operador sepa qué se va a cero):

```sql
SELECT cf.nombre, cf.tipo, cf.saldo_actual, cf.activo
FROM public.cuentas_fondos cf
WHERE cf.tienda_id = (
  SELECT tienda_id FROM public.perfiles
  WHERE id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
)
ORDER BY cf.orden;
```

Tercer result set: contadores actuales:

```sql
SELECT ultimo_numero_ticket, ultimo_numero_devolucion, ultimo_numero_remito,
       prefijo_ticket, razon_social
FROM public.configuracion_tienda
WHERE tienda_id = (
  SELECT tienda_id FROM public.perfiles
  WHERE id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
);
```

**Archivos afectados:**

- `scripts/sql/2026-09-01-wipe-operativo-adonai-precheck.sql`

---

### Paso 2: Escribir el SQL de wipe (especificación completa)

Archivo: `scripts/sql/2026-09-01-wipe-operativo-adonai.sql`

Header (comentarios obligatorios):

```
-- ONE-SHOT DESTRUCTIVO — Provisiones Adonai
-- NO es una migración. NO correr en otro tenant.
-- User UID: e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498
-- Conserva: productos, variantes, stock_actual, config, cuentas, métodos, perfiles, fotos.
-- Borra: ventas, caja, clientes, remitos, pedidos, ledgers, notificaciones.
-- Después: abrir un turno de caja nuevo. Saldos de cuentas quedan en $0.
-- Próximo ticket/devolución/remito: 1 (contadores a 0).
```

Cuerpo: un solo `BEGIN` … `COMMIT`. Usar `DO $$ … $$` para guards + DELETE, o SQL plano con CTE no sirve para DELETE multi-tabla fácilmente. Patrón recomendado:

```sql
BEGIN;

DO $$
DECLARE
  c_user_uid constant uuid := 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498';
  v_tienda_id uuid;
  v_nombre text;
  v_n_prod int;
  v_n_cuentas int;
  v_n_metodos int;
BEGIN
  SELECT p.tienda_id, t.nombre INTO v_tienda_id, v_nombre
  FROM public.perfiles p
  JOIN public.tiendas t ON t.id = p.tienda_id
  WHERE p.id = c_user_uid;

  IF v_tienda_id IS NULL THEN
    RAISE EXCEPTION 'No hay perfil para UID %', c_user_uid;
  END IF;
  IF position('adonai' in lower(coalesce(v_nombre, ''))) = 0 THEN
    RAISE EXCEPTION 'Tienda "%" no parece Adonai (id %)', v_nombre, v_tienda_id;
  END IF;

  SELECT count(*) INTO v_n_prod FROM public.productos WHERE tienda_id = v_tienda_id;
  SELECT count(*) INTO v_n_cuentas FROM public.cuentas_fondos WHERE tienda_id = v_tienda_id;
  SELECT count(*) INTO v_n_metodos FROM public.metodos_pago WHERE tienda_id = v_tienda_id;
  RAISE NOTICE 'Wipe Adonai tienda_id=% productos=% cuentas=% metodos=%',
    v_tienda_id, v_n_prod, v_n_cuentas, v_n_metodos;

  -- 1) Notificaciones + pedidos catálogo
  DELETE FROM public.notificaciones WHERE tienda_id = v_tienda_id;
  DELETE FROM public.pedido_catalogo_items WHERE tienda_id = v_tienda_id;
  DELETE FROM public.pedidos_catalogo WHERE tienda_id = v_tienda_id;

  -- 2) Devoluciones (RESTRICT sobre ventas)
  DELETE FROM public.pagos_devolucion WHERE tienda_id = v_tienda_id;
  DELETE FROM public.detalles_devolucion WHERE tienda_id = v_tienda_id;
  DELETE FROM public.devoluciones WHERE tienda_id = v_tienda_id;

  -- 3) Ledgers que referencian ventas/remitos/sesiones (SET NULL, pero vaciar igual)
  DELETE FROM public.movimientos_cc WHERE tienda_id = v_tienda_id;
  DELETE FROM public.movimientos_fondos WHERE tienda_id = v_tienda_id;
  DELETE FROM public.movimientos_stock WHERE tienda_id = v_tienda_id;

  -- 4) Remitos
  DELETE FROM public.remito_items WHERE tienda_id = v_tienda_id;
  DELETE FROM public.remitos WHERE tienda_id = v_tienda_id;

  -- 5) Ventas (hijos CASCADE, borrar explícito igual)
  DELETE FROM public.pagos_venta WHERE tienda_id = v_tienda_id;
  DELETE FROM public.detalles_venta WHERE tienda_id = v_tienda_id;
  DELETE FROM public.ventas WHERE tienda_id = v_tienda_id;

  -- 6) Caja
  DELETE FROM public.cierres_caja_detalle WHERE tienda_id = v_tienda_id;
  DELETE FROM public.cierres_caja WHERE tienda_id = v_tienda_id;
  DELETE FROM public.sesiones_caja WHERE tienda_id = v_tienda_id;

  -- 7) Clientes (después de ventas/remitos/pedidos/cc)
  DELETE FROM public.clientes WHERE tienda_id = v_tienda_id;

  -- 8) Reset saldos de cuentas — NO borrar filas
  UPDATE public.cuentas_fondos
  SET saldo_actual = 0, updated_at = now()
  WHERE tienda_id = v_tienda_id;

  -- 9) Reset SOLO contadores (el resto de configuracion_tienda intacto)
  UPDATE public.configuracion_tienda
  SET
    ultimo_numero_ticket = 0,
    ultimo_numero_devolucion = 0,
    ultimo_numero_remito = 0,
    updated_at = now()
  WHERE tienda_id = v_tienda_id;

  -- 10) Kardex inicial = stock actual (no toca stock_actual)
  INSERT INTO public.movimientos_stock (
    tienda_id, variante_id, tipo, cantidad,
    stock_anterior, stock_posterior, motivo
  )
  SELECT
    v.tienda_id,
    v.id,
    'inicial',
    v.stock_actual,
    0,
    v.stock_actual,
    'Stock inicial post-wipe 2026-09-01'
  FROM public.variantes_producto v
  WHERE v.tienda_id = v_tienda_id
    AND v.stock_actual >= 0;  -- excluye ∞ despensa (-1)

  -- 11) Guards post-delete: catálogo y cobros siguen ahí
  IF (SELECT count(*) FROM public.productos WHERE tienda_id = v_tienda_id) IS DISTINCT FROM v_n_prod THEN
    RAISE EXCEPTION 'Guard: cambió el conteo de productos. ROLLBACK.';
  END IF;
  IF (SELECT count(*) FROM public.cuentas_fondos WHERE tienda_id = v_tienda_id) IS DISTINCT FROM v_n_cuentas THEN
    RAISE EXCEPTION 'Guard: cambió el conteo de cuentas_fondos. ROLLBACK.';
  END IF;
  IF (SELECT count(*) FROM public.metodos_pago WHERE tienda_id = v_tienda_id) IS DISTINCT FROM v_n_metodos THEN
    RAISE EXCEPTION 'Guard: cambió el conteo de metodos_pago. ROLLBACK.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ventas WHERE tienda_id = v_tienda_id) THEN
    RAISE EXCEPTION 'Guard: siguen existiendo ventas. ROLLBACK.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clientes WHERE tienda_id = v_tienda_id) THEN
    RAISE EXCEPTION 'Guard: siguen existiendo clientes. ROLLBACK.';
  END IF;

  RAISE NOTICE 'Wipe OK. Reabrir caja. Saldos en 0. Ticket próximo = 1.';
END $$;

COMMIT;
```

Notas de implementación:

- `stock_actual` en variantes de peso es `numeric`; el INSERT a `movimientos_stock.cantidad` debe coincidir el tipo de la columna (hoy `numeric` post multi-rubro; si la columna sigue `integer` en prod, castear o usar la misma precisión). Al implementar, leer el tipo real en `20260509000001` / `database.ts` (`VarianteProducto.stock_actual: number`) y alinear. Si `movimientos_stock.cantidad` es integer y hay kilos con decimales, **no insertar inicial** para esas filas o alterar el INSERT a numeric — verificar en `supabase/migrations/20260509000001_multi_rubro_fase1.sql` qué tipo quedó. Preferir: si `cantidad` es numeric, copiar tal cual; si es integer, `WHERE stock_actual >= 0 AND stock_actual = trunc(stock_actual)` y omitir decimales, O ampliar el INSERT solo si el tipo ya es numeric.
- No usar `DELETE FROM clientes` antes de ventas: `ventas.cliente_id` es SET NULL, funcionaría, pero el orden de arriba es más claro.
- `LOCK TABLE` no hace falta si Adonai no opera durante 1 minuto. Documentar “no vender mientras corre”.
- `SET LOCAL statement_timeout = '120s'` al inicio del bloque por si hay muchas filas.

**Archivos afectados:**

- `scripts/sql/2026-09-01-wipe-operativo-adonai.sql`

---

### Paso 3: Verificación post-wipe (incluido en el mismo archivo, después del COMMIT)

Queries de validación (corridas **después** del COMMIT, en el mismo pegado o aparte):

```sql
WITH t AS (
  SELECT tienda_id FROM public.perfiles
  WHERE id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
)
SELECT 'ventas' t, count(*) FROM public.ventas WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'clientes', count(*) FROM public.clientes WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'sesiones', count(*) FROM public.sesiones_caja WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'mov_fondos', count(*) FROM public.movimientos_fondos WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'mov_cc', count(*) FROM public.movimientos_cc WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'pedidos', count(*) FROM public.pedidos_catalogo WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'productos', count(*) FROM public.productos WHERE tienda_id = (SELECT tienda_id FROM t)
UNION ALL SELECT 'cuentas', count(*) FROM public.cuentas_fondos WHERE tienda_id = (SELECT tienda_id FROM t);
```

Esperado: operativas en 0; productos y cuentas > 0. `cuentas_fondos.saldo_actual` todos 0. `configuracion_tienda.ultimo_numero_*` = 0.

**No** hay verificación en browser desde este workspace (wipe es SQL en prod). Checklist manual para el operador:

1. Login Adonai → Inicio: ventas $0, por cobrar $0, tops vacíos.
2. `/ventas`, `/devoluciones`, `/clientes`, `/pedidos`, `/caja` historial vacíos.
3. `/productos` y `/stock`: mismos SKUs y cantidades que antes.
4. Configuración → cobros: mismas cuentas y métodos; saldos $0.
5. Abrir caja e intentar una venta de prueba (ticket #1).

**Archivos afectados:**

- Mismos SQL (bloque final comentado `--- VERIFICACIÓN ---`)

---

### Paso 4: Actualizar CLAUDE.md

En la sección **Notas**, agregar:

```
- Scripts SQL one-shot de tenant (wipe, repair) viven en `scripts/sql/`. No son migraciones: no correrlos con `db push`. El wipe Adonai 2026-09-01 borra solo datos operativos de ese comercio.
```

No publicar el UUID en CLAUDE.md (queda en el SQL y en este plan).

**Archivos afectados:**

- `CLAUDE.md`

---

### Paso 5: Qué NO hacer

- No commit del SQL a un flujo que lo ejecute solo.
- No modificar RLS.
- No tocar `app/lib/cuenta/borrar-tienda.ts`.
- No resetear `tiendas.plan`, `trial_hasta`, `acceso_hasta`, slug de catálogo, WhatsApp.
- No borrar cajeros.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
| ------- | -------- |
| `app/lib/cuenta/borrar-tienda.ts` | Baja total de tenant — no usar |
| `salidas/2026-07-23-adonai-repair-saldos.sql` | Repair previo; `tienda_id` distinto al UID |
| `planes/2026-07-23-fix-venta-productos-por-peso.md` | Documentó el UID como si fuera `tienda_id` |
| RPCs dashboard (`get_dashboard_inicio`, `get_ganancia_periodo`, …) | Leen ventas/clientes; quedarán en cero sin cambio de código |
| `referencia/modelo-saldos-cuentas.md` | Tras wipe, al momento = proyectado = $0 |

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` (viñeta scripts/).
- Este plan → `**Estado:** Implementado` + notas de implementación cuando el SQL esté en disco (la **ejecución** en Supabase es operativa y puede quedar pendiente).

### Impacto en Flujos de Trabajo Existentes

Ningún comando `/iniciar` `/crear-plan` cambia. Adonai pierde historial de reportes a propósito. PrintBridge y etiquetas no se tocan.

---

## Lista de Validación

- [x] Existen `scripts/sql/2026-09-01-wipe-operativo-adonai-precheck.sql` y `…-adonai.sql`
- [x] Guards: UID → perfil → nombre contiene `adonai`; si no, EXCEPTION
- [x] DELETE filtrado siempre por `v_tienda_id` (ningún `DELETE` sin WHERE de tienda)
- [x] Orden: notificaciones/pedidos → devoluciones → ledgers → remitos → ventas → caja → clientes
- [x] `productos`, `variantes_producto`, `cuentas_fondos` (filas), `metodos_pago`, `configuracion_tienda` (salvo 3 contadores), `perfiles` no se borra
- [x] `saldo_actual = 0` en cuentas de esa tienda
- [x] Contadores ticket/devolución/remito = 0
- [x] `movimientos_stock` post-wipe = solo `inicial` (numeric(10,3); excluye `stock_actual = -1`)
- [x] Guard post: conteo productos/cuentas/métodos igual al pre
- [x] No hay archivo nuevo en `supabase/migrations/`
- [x] `CLAUDE.md` menciona `scripts/sql/`
- [x] Header del SQL advierte: reabrir caja, no vender durante el wipe

---

## Criterios de Éxito

1. Precheck resuelve una tienda cuyo nombre incluye “Adonai” y muestra conteos > 0 en ventas/clientes (si aún hay datos).
2. Tras COMMIT del wipe: tablas operativas de ese `tienda_id` en 0; productos, variantes, métodos y cuentas con el mismo recuento de filas; `saldo_actual` 0; próximo ticket 1.
3. Otras tiendas en el mismo proyecto Supabase **sin cambios** (verificación: `count(*)` global de `ventas` baja solo en la delta de Adonai).
4. El script no está en migraciones y no se puede aplicar por accidente con `db push`.

---

## Notas

- **Ejecución:** el implementador deja el SQL en el repo. Correrlo en producción es un paso **humano** en Supabase SQL Editor. `/implementar` no tiene MCP DB; no inventar que “ya se wipeó”.
- Coordinar con Adonai: backup (Supabase PITR o dump de las tablas operativas de ese `tienda_id`) **antes** del COMMIT. El plan no automatiza backup.
- Si el precheck falla por nombre (p. ej. “Provisiones ADONAI S.R.L.” sigue matcheando `adonai`; “Despensa Centro” no). Si el local está mal cargado, ajustar el guard **solo** tras confirmar `tienda_id` a ojo.
- Recibos CC no tienen tabla propia: se renderan desde `movimientos_cc`. Al borrar el ledger, `/recibos-cc/[id]` 404 — correcto.
- Dashboard Inicio lee `clientes.saldo_cc` y RPCs de ventas: ambos quedan en cero.
- No revalidar tags de catálogo: el catálogo público no lista ventas.
- Skill SQL: al implementar, respetar lowercase identifiers y `tienda_id` en todo predicado (índices existentes).

---

## Notas de Implementación

**Implementado:** 2026-09-01

### Resumen

SQL one-shot en `scripts/sql/` (precheck + wipe). `cantidad`/`stock_*` de `movimientos_stock` son `numeric(10,3)` (migración multi-rubro): el kardex inicial copia `stock_actual` tal cual. Confirmado por el usuario: reset de numeración, saldos de cuentas a $0, UID owner. **No ejecutado en Supabase** — falta pegar precheck y luego wipe en SQL Editor (postgres), con backup/PITR antes.

### Desviaciones del Plan

- Guard extra: `perfiles.rol = 'owner'` además del nombre `adonai` (el usuario confirmó que el UID es el owner).
- Precheck omite la variable `n` no usada del borrador.

### Problemas Encontrados

Ninguno. La ejecución en producción queda pendiente del operador.
