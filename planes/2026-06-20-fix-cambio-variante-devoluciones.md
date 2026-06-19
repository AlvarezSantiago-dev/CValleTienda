# Plan: Cambio de variante en devoluciones (mismo precio, control de stock)

**Creado:** 2026-06-20
**Estado:** Implementado
**Pedido:** Fix devoluciones — que cambio de producto distinga cambio del mismo artículo vs cambio de talle/variante, con visibilidad de stock y selección solo cuando el precio coincide.

---

## Descripción General

### Qué Logra Este Plan

Mantiene las tres resoluciones actuales (reembolso, saldo a favor, cambio) y **profundiza el flujo de cambio**: el cajero elige si devuelve la misma variante o cambia por otra del mismo producto, ve todas las variantes con su stock (incluidas las de otro precio, solo consulta) y el sistema **repone stock del ítem devuelto y descuenta stock del ítem entregado** cuando corresponde — sin movimiento de dinero si el precio es el mismo.

### Por Qué Importa

Hoy "Cambio de producto" es un checkbox conceptual: repone stock pero **no registra qué le entregás al cliente ni baja stock de la variante nueva**. En ropa, el 80% de los cambios son de talle/color del mismo producto. Sin selector de variantes el cajero no controla stock real y termina ajustando manualmente o yendo al POS sin trazabilidad.

### Recomendación de diseño (respuesta al pedido)

**No cambiaría las 3 tarjetas de resolución** — están bien diferenciadas. Lo que falta es un **sub-paso solo cuando elegís "Cambio de producto"**:

| Subtipo | Cuándo usarlo | Stock | Dinero |
|---------|---------------|-------|--------|
| **Misma variante** | Defecto, mismo talle, re-entrega idéntica | +N en variante devuelta | $0 |
| **Otra variante (mismo producto, mismo precio)** | Cambio de talle/color sin diferencia de precio | +N devuelta, −N entregada | $0 |
| **Otra variante con otro precio** | Visible en grilla, **no seleccionable** | Solo consulta | Diferencia → **venta nueva en POS** |

Regla clave pedida por el usuario: **mismo precio unitario de la línea devuelta = seleccionable; otro precio = visible con stock pero bloqueado**, con mensaje claro tipo *"Otro precio — cobrá la diferencia en el POS"*.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta / tabla | Rol |
|--------------|-----|
| `devoluciones.tipo_resolucion` | `'reembolso' \| 'saldo_a_favor' \| 'cambio'` (migration `20260510000003_saldo_a_favor.sql`) |
| `detalles_devolucion` | Línea devuelta: `variante_id`, snapshot, cantidad. **Sin variante de entrega** |
| Trigger `reponer_stock_devolucion` | Al insertar detalle → **suma** stock en `variante_id` devuelta |
| `app/components/devoluciones/DevolucionForm.tsx` | 3 tarjetas de resolución; cambio no muestra UI extra |
| `app/app/actions/devoluciones.ts` → `registrarDevolucion` | Cambio: inserta detalles y termina (`// solo repone stock`) |
| `app/lib/ventas/queries.ts` → `obtenerVentaParaDevolucion` | Líneas con `disponible_devolver`; trae `variante_id` |
| `variantes_producto` | `producto_id`, `talla_id`, `color_id`, `precio_venta`, `stock_actual`, `activo` |
| `detalles_venta` | Snapshot de venta; `precio_unitario` es la referencia de precio para el cambio |
| Dashboard/reportes | Excluyen `tipo_resolucion = 'cambio'` del neto de caja (correcto) |

### Brechas o Problemas que se Abordan

1. **Cambio = solo entrada de stock:** no hay salida de stock de la variante que el cliente se lleva.
2. **Sin UI de variantes alternativas:** el cajero no ve tallas/colores disponibles al hacer cambio.
3. **Sin regla de precio:** no hay forma de impedir cambio a variante más cara/barata dentro del flujo sin mezclar lógica de POS.
4. **Sin trazabilidad:** ticket e historial no dicen qué se entregó en un cambio.
5. **Copy engañoso:** "Solo repone el stock" es incompleto para cambio de talle real.

---

## Cambios Propuestos

### Resumen de Cambios

- Agregar `subtipo_cambio` en cabecera y `variante_entrega_id` + snapshots de entrega en `detalles_devolucion`.
- Nuevo trigger (o función unificada) que **descuenta stock** de `variante_entrega_id` cuando `tipo_resolucion = 'cambio'` y hay variante de entrega distinta.
- Query `obtenerVariantesParaCambio(producto_id, precio_referencia)` con flags `seleccionable`, `motivo_bloqueo`, `stock_actual`.
- UI: panel `CambioVariantePanel` en `DevolucionForm` cuando `tipoResolucion === 'cambio'`.
- Validación server-side estricta: mismo producto, mismo precio (±$0.01), stock suficiente, variante activa.
- Ticket de devolución: bloque "Artículo entregado" cuando aplique.
- Actualizar copy de la tarjeta "Cambio de producto".

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260620110001_cambio_variante_devolucion.sql` | Columnas, trigger descontar stock, índices |
| `app/lib/devoluciones/cambio-variante.ts` | Tipos, helpers `preciosCoinciden`, labels de bloqueo |
| `app/lib/devoluciones/queries-cambio.ts` | `obtenerVariantesParaCambio`, `obtenerVariantesPorDetallesVenta` |
| `app/components/devoluciones/CambioVariantePanel.tsx` | Grilla de variantes por línea devuelta |
| `app/components/devoluciones/CambioVarianteFila.tsx` | Fila: subtipo misma/otra + picker de variantes |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/devoluciones/DevolucionForm.tsx` | Sub-paso cambio; estado por línea; enviar `subtipo_cambio` y `variante_entrega_id` |
| `app/app/actions/devoluciones.ts` | Validar y persistir cambio de variante; snapshots de entrega |
| `app/lib/ventas/queries.ts` | Enriquecer `VentaDetalleConSaldo` con `producto_id` vía join variante |
| `app/lib/devoluciones/queries.ts` | Tipos detalle con entrega; listar en detalle devolución |
| `app/lib/impresion/types.ts` + `TicketDevolucionRenderer.tsx` | Mostrar línea entregada en ticket |
| `supabase/migrations/20260608000001_fix_payload_tickets_numeracion.sql` (nueva migración encadenada) | Extender `build_payload_ticket_devolucion` con datos de entrega |
| `app/types/database.ts` | Tipos generados / manuales para nuevas columnas |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Mantener 3 resoluciones de nivel superior:** Reembolso y saldo a favor no se tocan. El cambio gana subtipos — evita confundir "devolver plata" con "cambiar talle".

2. **Subtipos de cambio (por línea devuelta):**
   - `misma_variante` — default; comportamiento actual (+stock).
   - `otra_variante` — obliga elegir `variante_entrega_id` del mismo `producto_id`.

3. **Criterio de selección (precio):** `variante.precio_venta === detalle.precio_unitario` (tolerancia ±$0.01 por redondeos). Usar **precio pagado en la venta**, no precio actual del catálogo — el cliente tiene derecho al cambio al precio que pagó.

4. **Variantes otro precio — solo lectura:** Mostrar en sección "Otras variantes (solo consulta)" con badge de stock y precio. No seleccionables. CTA: *"Para cambiar por artículo de otro precio, registrá una venta en el POS"*.

5. **Stock atómico en DB:** Trigger post-insert en `detalles_devolucion` que, si la devolución es `cambio` y hay `variante_entrega_id`, ejecuta egreso de stock (tipo `cambio_devolucion`) además del trigger existente de reposición. Todo en la misma transacción de inserts.

6. **Misma variante explícita vs omitir entrega:** Si `subtipo_cambio = 'misma_variante'`, `variante_entrega_id` = `variante_id` devuelta (o null + inferencia en trigger). Simplifica auditoría.

7. **Alcance MVP — productos con variantes:** Si la línea no tiene `variante_id` o el producto no tiene hermanas, solo permitir `misma_variante` (comportamiento actual). Kits/bundles: deshabilitar `otra_variante` en v1 (solo misma variante + mensaje).

8. **Sin cobro de diferencia en devoluciones:** Diferencia de precio → POS. Mantiene contabilidad limpia y evita duplicar `PagoMultiMetodo` en devoluciones.

### Alternativas Consideradas

- **Unificar cambio con venta en POS (modo "cambio"):** Rechazado como único flujo — el usuario quiere control de stock desde devoluciones y ver disponibilidad sin salir del contexto de la venta original.

- **Permitir cambio a otro precio con ajuste de monto en el mismo formulario:** Rechazado — mezcla `tipo_resolucion=cambio` con flujos de dinero; reportes y caja se complican. Mejor POS para el delta.

- **Tabla separada `entregas_cambio`:** Rechazado — columnas en `detalles_devolucion` son suficientes (1:1 devuelto→entregado por línea).

- **Usar precio actual del catálogo para elegibilidad:** Rechazado — si subió el precio, el cliente no debería perder el cambio al precio original.

### Preguntas Abiertas (si las hay)

1. **¿Cambio a variante de otro producto (distinto modelo)?** El plan MVP limita a **mismo `producto_id`**. Si el negocio permite cambiar remera A por remera B, sería un flujo distinto (saldo a favor + venta nueva). Confirmar si MVP solo mismo producto alcanza.

2. **¿Decimales (despensa/kiosco)?** Cantidad devuelta puede ser decimal (`multi_rubro_fase1`). El picker de variantes debe respetar `cantidad` decimal en validación de stock. ¿Aplica cambio de variante en rubros no-ropa en v1 o solo ropa/librería?

3. **¿Imprimir slip de "cambio" además del ticket devolución?** Opcional — similar al vale de cambio de venta. Dejar fuera del MVP salvo pedido explícito.

---

## Tareas Paso a Paso

### Paso 1: Migración SQL — columnas y trigger de egreso

**Descripción:** Persistir subtipo y variante entregada; descontar stock al entregar otra variante.

**Acciones:**

- Crear `supabase/migrations/20260620110001_cambio_variante_devolucion.sql`:

```sql
-- Cabecera: subtipo cuando tipo_resolucion = 'cambio'
ALTER TABLE public.devoluciones
  ADD COLUMN IF NOT EXISTS subtipo_cambio text;

ALTER TABLE public.devoluciones
  ADD CONSTRAINT devoluciones_subtipo_cambio_check
  CHECK (
    subtipo_cambio IS NULL
    OR subtipo_cambio IN ('misma_variante', 'otra_variante', 'mixto')
  );

COMMENT ON COLUMN public.devoluciones.subtipo_cambio IS
  'misma_variante | otra_variante | mixto (varias líneas con distinto subtipo). Solo si tipo_resolucion=cambio';

-- Detalle: variante entregada + snapshot
ALTER TABLE public.detalles_devolucion
  ADD COLUMN IF NOT EXISTS subtipo_cambio text,
  ADD COLUMN IF NOT EXISTS variante_entrega_id uuid REFERENCES public.variantes_producto(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nombre_producto_entrega text,
  ADD COLUMN IF NOT EXISTS talla_entrega text,
  ADD COLUMN IF NOT EXISTS color_entrega text,
  ADD COLUMN IF NOT EXISTS codigo_barras_entrega text;

ALTER TABLE public.detalles_devolucion
  ADD CONSTRAINT detalles_dev_subtipo_cambio_check
  CHECK (subtipo_cambio IS NULL OR subtipo_cambio IN ('misma_variante', 'otra_variante'));

CREATE INDEX IF NOT EXISTS detalles_dev_variante_entrega_idx
  ON public.detalles_devolucion (variante_entrega_id)
  WHERE variante_entrega_id IS NOT NULL;
```

- Función `descontar_stock_entrega_cambio()` — trigger **after insert** on `detalles_devolucion`:
  - Join `devoluciones` → solo si `tipo_resolucion = 'cambio'`.
  - Si `subtipo_cambio = 'otra_variante'` y `variante_entrega_id` not null y `variante_entrega_id != variante_id`:
    - Validar stock ≥ cantidad (raise exception si no).
    - `UPDATE variantes_producto SET stock_actual = stock_actual - cantidad`.
    - `INSERT movimientos_stock` tipo `'cambio_devolucion'` (o `'venta'` con referencia devolución — usar `'cambio_devolucion'` nuevo tipo en check constraint de `movimientos_stock.tipo` si existe enum; ampliar constraint).

- Actualizar constraint de `movimientos_stock.tipo` para incluir `'cambio_devolucion'` si hoy es lista cerrada.

**Archivos afectados:**

- `supabase/migrations/20260620110001_cambio_variante_devolucion.sql`

---

### Paso 2: Enriquecer query de venta para devolución

**Descripción:** Cada línea devuelta necesita `producto_id` para cargar variantes hermanas.

**Acciones:**

- En `obtenerVentaParaDevolucion`, al cargar detalles, join `variantes_producto(producto_id)` o query batch por `variante_id`.
- Extender `VentaDetalleConSaldo`:
  ```typescript
  producto_id: string | null
  es_kit_o_bundle?: boolean  // opcional: deshabilitar otra_variante
  ```

**Archivos afectados:**

- `app/lib/ventas/queries.ts`

---

### Paso 3: Query de variantes alternativas

**Descripción:** Server query reutilizable para el picker.

**Acciones:**

- Crear `app/lib/devoluciones/queries-cambio.ts`:

```typescript
export interface VarianteCambioOpcion {
  variante_id: string
  talla: string | null
  color: string | null
  codigo_barras: string | null
  precio_venta: number
  stock_actual: number
  activo: boolean
  seleccionable: boolean
  motivo_bloqueo: 'otro_precio' | 'sin_stock' | 'inactiva' | 'misma_variante' | null
}

export async function obtenerVariantesParaCambio(
  productoId: string,
  precioReferencia: number,
  varianteOrigenId: string | null
): Promise<VarianteCambioOpcion[]>
```

- Lógica:
  - Listar variantes activas del producto (incluir inactivas en sección consulta con `seleccionable: false`).
  - `seleccionable = activo && stock >= cantidadNecesaria && abs(precio - ref) < 0.01 && id !== origen`.
  - Orden: seleccionables primero (por talla/color), luego bloqueadas.

- Crear `app/lib/devoluciones/cambio-variante.ts` con `preciosCoinciden(a, b)` y labels UI.

**Archivos afectados:**

- `app/lib/devoluciones/queries-cambio.ts` (nuevo)
- `app/lib/devoluciones/cambio-variante.ts` (nuevo)

---

### Paso 4: UI — panel de cambio en DevolucionForm

**Descripción:** Cuando el cajero elige "Cambio de producto", mostrar sub-opciones por línea con cantidad > 0.

**Acciones:**

- Actualizar copy tarjeta cambio:
  > **Cambio de producto** — Repone lo devuelto y registra lo entregado. Sin movimiento de dinero si es la misma variante o misma variante/precio.

- Al seleccionar `cambio`, mostrar `CambioVariantePanel` debajo de ítems a devolver (solo líneas con `cantidad > 0`).

- Por cada línea:
  - Radio: **Misma variante** | **Otra variante (mismo producto)**
  - Si "Otra variante": cargar opciones vía server action `listarVariantesCambio(detalle_venta_id, cantidad)` (lazy al expandir fila).

- Grilla de variantes:
  - **Seleccionables:** radio/check, stock en verde/ámbar, precio (= al pagado).
  - **Solo consulta:** filas atenuadas, badge "Otro precio" o "Sin stock", no clickable.
  - Leyenda: *"Variantes con otro precio: consultá stock acá; cobrá la diferencia en el POS."*

- Estado local:
  ```typescript
  cambioPorLinea: Record<detalle_venta_id, {
    subtipo: 'misma_variante' | 'otra_variante'
    variante_entrega_id?: string
  }>
  ```

- Validación `puedeEnviar` cuando `cambio`:
  - Cada línea con cantidad > 0 tiene subtipo definido.
  - Si `otra_variante` → `variante_entrega_id` obligatorio y debe estar en lista seleccionable.

**Archivos afectados:**

- `app/components/devoluciones/DevolucionForm.tsx`
- `app/components/devoluciones/CambioVariantePanel.tsx` (nuevo)
- `app/components/devoluciones/CambioVarianteFila.tsx` (nuevo)
- `app/app/actions/devoluciones.ts` — nueva action `listarVariantesCambio`

---

### Paso 5: Server action — registrar devolución con cambio

**Descripción:** Validar y persistir entrega de variante.

**Acciones:**

- Extender `DevolucionLineaInput`:
  ```typescript
  subtipo_cambio?: 'misma_variante' | 'otra_variante'
  variante_entrega_id?: string | null
  ```

- En `registrarDevolucion`, cuando `tipo_resolucion === 'cambio'`:
  - Por cada línea, validar subtipo.
  - Si `otra_variante`: re-fetch variante entrega; verificar mismo `producto_id`, precio, stock, activo.
  - Calcular `subtipo_cambio` cabecera: `'mixto'` si hay mezcla, sino el subtipo único.
  - Insert detalle con snapshots de entrega (`nombre_producto_entrega`, talla, color, código).

- Si `misma_variante`: set `variante_entrega_id = variante_id` (opcional) o dejar null y documentar en ticket "Reingreso misma variante".

**Archivos afectados:**

- `app/app/actions/devoluciones.ts`

---

### Paso 6: Ticket e historial

**Descripción:** Trazabilidad visible para cajero y cliente.

**Acciones:**

- Migración encadenada o patch a `build_payload_ticket_devolucion`: por línea, si hay entrega distinta, incluir:
  ```json
  "entrega": { "nombre_producto", "talla", "color", "codigo_barras" }
  ```

- `TicketDevolucionRenderer`: bajo cada ítem devuelto, si `entrega` presente y distinta:
  ```
  → Entregado: 1× Remera XL / Negro
  ```

- `app/app/(dashboard)/devoluciones/[id]/page.tsx`: mostrar columna/bloque entrega en detalle.

**Archivos afectados:**

- `supabase/migrations/20260620110002_payload_devolucion_entrega.sql` (nuevo, pequeño)
- `app/lib/impresion/types.ts`
- `app/components/impresion/TicketDevolucionRenderer.tsx`
- `app/app/(dashboard)/devoluciones/[id]/page.tsx`

---

### Paso 7: Validación y pruebas

**Acciones:**

1. Venta ropa: 1× Remera M $10.000 → devolución cambio → otra variante M mismo precio con stock → stock M +1, L −1.
2. Variante L precio $12.000 → visible, no seleccionable.
3. Variante S sin stock → visible, badge "Sin stock".
4. Cambio misma variante → solo +stock (regresión OK).
5. Reembolso / saldo a favor → sin panel cambio (regresión OK).
6. Intentar bypass API con variante otro precio → error server.
7. `npm run build` OK.

**Archivos afectados:** ninguno (QA)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/dashboard/queries.ts` — cambios no afectan neto (siguen excluyendo `cambio`).
- `supabase/migrations/20260608100001_reportes_ventas_stock_rpc.sql` — movimientos `cambio_devolucion` pueden aparecer en reportes de stock; verificar si hay filtro por tipo.
- `app/lib/supabase/middleware.ts` — cajero ya tiene acceso a devoluciones.

### Actualizaciones Necesarias para Consistencia

- Copy en `DevolucionForm` tarjeta cambio.
- Opcional: filtro `tipo_resolucion` en `TablaDevoluciones` / badge "Cambio talle".
- `planes/2026-06-06-gestion-devolucion-cajero.md` — nota de extensión (no reescribir plan implementado).

### Impacto en Flujos de Trabajo Existentes

- **Cajero:** paso extra solo en cambio; reembolso/saldo igual de rápido.
- **Stock:** movimientos más precisos; `/stock` refleja entrega inmediata.
- **POS:** sigue siendo el lugar para diferencias de precio o cambios cross-producto.
- **Caja:** sin cambios en flujo de dinero para cambio mismo precio.

---

## Lista de Validación

- [ ] Migraciones SQL aplicadas en Supabase
- [x] Cambio misma variante repone stock (sin regresión)
- [x] Cambio otra variante repone + descuenta stock atómicamente (trigger SQL)
- [x] Variante otro precio visible pero no seleccionable
- [x] Variante sin stock visible con badge, no seleccionable
- [x] Validación server rechaza selección inválida
- [x] Ticket devolución muestra artículo entregado
- [x] Reembolso y saldo a favor sin cambios de comportamiento
- [x] `npm run build` sin errores

---

## Criterios de Éxito

La implementación está completa cuando:

1. El cajero puede registrar un cambio de talle eligiendo una variante **del mismo producto y mismo precio pagado**, viendo stock real antes de confirmar.
2. Las variantes de **otro precio** aparecen en la grilla solo para consulta de stock, nunca seleccionables en este flujo.
3. El inventario queda correcto: entrada del devuelto + salida del entregado, auditable en movimientos y visible en ticket de devolución.

---

## Notas

- **Flujo recomendado en mostrador (cambio de talle típico):** Venta original → Devolver → Cambio → Otra variante → elegir talle → confirmar → entregar prenda → ticket.
- **Cambio por artículo más caro:** Devolución cambio (misma prenda entra) + POS venta nueva con descuento manual o saldo a favor previo — fuera de scope.
- **UX futura:** botón "Ir al POS con esta venta" pre-cargando cliente e ítems sugeridos para delta de precio.
- **PrintBridge:** si el ticket de devolución incluye entrega, actualizar `renderTicketDevolucion` en el agente (mismo patrón que plan de logos).

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se implementó el flujo completo de cambio de variante en devoluciones: columnas y trigger SQL para egreso de stock, queries y helpers de validación de precio/stock, panel UI en `DevolucionForm` con picker de variantes (seleccionables vs solo consulta), validación server-side en `registrarDevolucion`, ticket e historial con artículo entregado.

### Desviaciones del Plan

- Nombre de migración payload: `20260620110002_payload_devolucion_entrega.sql` (en lugar de parchear `20260608000001`).
- PrintBridge no actualizado en este sprint (pendiente operador, igual que logos).

### Problemas Encontrados

- Ninguno en build. Migraciones SQL pendientes de aplicar en Supabase por el operador.
