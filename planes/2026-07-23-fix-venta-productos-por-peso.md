# Plan: Fix completo venta por peso (coma, redondeo, balanza)

**Creado:** 2026-07-23
**Estado:** Implementado
**Pedido:** Solucionar de punta a punta la venta de productos por peso (coma, redondeo, balanza) y estabilizar la caja de la tienda Adonai (`e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498` / provisionesadonai@gmail.com) con auditoría + reparación one-shot de desfasajes detectables.

---

## Descripción General

### Qué Logra Este Plan

Hace que el POS acepte pesos con **coma o punto** (ej. `1,350` / `1.350`), calcule el **mismo total** que `registrarVenta` (redondeo por línea a 2 decimales), preserve **3 decimales** en cantidades al fusionar líneas, y convierta correctamente códigos de balanza cuando el producto está en **gramos**. Además incluye una **reparación one-shot** para la tienda Adonai: auditar desfasajes pago↔total y saldo↔movimientos, y aplicar ajustes solo donde haya evidencia numérica (centavos), sin inventar kilos históricos.

### Por Qué Importa

En carnicería/verdulería el cajero lee la balanza y escribe con coma argentina. Hoy `parseFloat('1,350')` → `1` (vende 1 kg en vez de 1,350). Además el carrito suma `precio × cantidad` sin redondear por línea y el servidor sí (`round2`), generando drifts de $0,01 que se acumulan en el efectivo esperado. Sin este fix, el módulo de peso queda operativo a medias y erosiona confianza en caja.

---

## Estado Actual

### Estructura Existente Relevante

| Pieza | Ubicación | Comportamiento |
| ----- | --------- | -------------- |
| Modal de peso | `app/components/pos/PesoModal.tsx` | `type="number"` + `parseFloat`; placeholder con punto; subtotal sin `round2` |
| Carrito decimal | `app/components/pos/Carrito.tsx` | Input cantidad con `parseFloat`; formato display `es-AR` |
| Agregar / merge | `app/components/pos/POSContainer.tsx` | `UNIDADES_MEDIBLES`; merge usa `round2(cant + nueva)` (mata milésimas); `subtotal` = Σ precio×cant sin round por línea |
| Cobro | `registrarVenta` en `app/app/actions/ventas.ts` | `total_linea = round2(precio × cantidad)`; `total = round2(Σ líneas − descuento)`; tolerancia pago $0,01 |
| Balanza EAN-13 | `app/lib/pos/balanza.ts` | Peso = valor/1000 **siempre en kg** |
| Scan balanza | `POSContainer` `useBarcodeScanner` | Formato `peso` → `cantidadOverride: balanza.peso` sin convertir a gramos |
| Parse dinero AR | `app/lib/format-moneda.ts` `parseARSInput` | Acepta coma; **no sirve para pesos**: `1.350` lo trata como miles → 1350 |
| DB | `detalles_venta.cantidad` | `numeric(10,3)` desde multi-rubro |
| Plan previo | `planes/2026-05-16-pos-barcode-first-y-peso.md` | Introdujo PesoModal + balanza; no cubrió coma ni redondeo unificado |

### Brechas o Problemas que se Abordan

| # | Problema | Efecto |
| - | -------- | ------ |
| 1 | Coma en peso → `parseFloat` trunca | Cobro erróneo (ej. 1 kg en vez de 1,350) |
| 2 | POS sin `round2` por línea; server sí | Display vs `ventas.total` / pagos pueden diferir $0,01 |
| 3 | Merge de cantidades con `round2` | `0.333+0.333` → `0.67` en vez de `0.666` |
| 4 | Balanza peso siempre en kg | Producto en `gramo` recibe cantidad ×1000 mal |
| 5 | `parseARSInput` no reutilizable para cantidad | Lógica de miles rompería `1.350` kg |
| 6 | Subtotal del PesoModal sin redondeo de moneda | Preview distinto al total de línea real |

---

## Cambios Propuestos

### Resumen de Cambios

- Crear `parseCantidadInput` + `round3` (y opcionalmente centralizar `round2`) en un helper compartido de formato/cantidad.
- Usar ese parseo en `PesoModal` y `Carrito` (inputs de cantidad decimal); preferir `type="text"` + `inputMode="decimal"` para permitir coma.
- Alinear subtotales POS: Σ `round2(precio × cantidad)` igual que `registrarVenta`.
- Al fusionar líneas medibles: `round3(prev + nueva)`, no `round2`.
- Al escanear balanza formato peso: si `unidad_de_medida === 'gramo'`, `cantidad = balanza.peso * 1000`.
- Tests unitarios del parseo y del redondeo de totales.
- Placeholders/copy con ejemplo en formato AR (`1,350`).
- **Reparación one-shot tienda Adonai** (`tienda_id = e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498`): script SQL de auditoría + ajustes seguros de centavos; reporte en `salidas/`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/format-cantidad.ts` | `parseCantidadInput`, `round3`, `sanitizeCantidadTyping`; reglas claras distintas de moneda |
| `app/lib/format-cantidad.test.ts` | Casos: coma, punto, inválidos, 3 decimales, no interpretar `1.350` como miles |
| `app/lib/pos/totales-carrito.ts` | `sumarSubtotalLineas(items)` = Σ `round2(precio × cant)` — una sola fuente para POS |
| `app/lib/pos/totales-carrito.test.ts` | Caso reproducible POS vs server (ej. 3×(10.10×0.333)) |
| `scripts/sql/adonai-auditoria-caja.sql` | Queries de auditoría + plantilla de ajuste (solo tienda Adonai) |
| `salidas/2026-07-23-adonai-auditoria-caja.md` | Reporte de hallazgos + qué se ajustó / qué quedó para revisión manual |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/pos/PesoModal.tsx` | Parse con `parseCantidadInput`; input text; subtotal `round2`; placeholder `1,350` |
| `app/components/pos/Carrito.tsx` | Parse cantidad decimal con `parseCantidadInput`; no `parseFloat` |
| `app/components/pos/POSContainer.tsx` | Subtotal vía `sumarSubtotalLineas`; merge `round3`; balanza→gramos |
| `app/lib/format.ts` | Re-exportar helpers de cantidad |
| `app/components/pos/UltimoAgregadoChip.tsx` | (menor) display de subtotal con `round2` si muestra monto |
| `app/components/devoluciones/DevolucionForm.tsx` | Solo si calcula subtotal de líneas pesables sin round — alinear a `round2` por línea si aplica |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **`parseCantidadInput` separado de `parseARSInput`**: En cantidad, el punto es decimal (`1.350` = 1.35 kg), nunca separador de miles. En plata AR, `1.350` puede ser 1350. Mezclarlos es un bug seguro.

2. **Misma regla de redondeo que el servidor**: `total_linea = round2(precio × cantidad)`; subtotal carrito = suma de esas líneas. El cajero ve y cobra lo que se va a guardar.

3. **Cantidades a 3 decimales (`round3`)**: Alineado a `numeric(10,3)`. Enteros (unidad/pack) siguen sumando 1 sin pasar por round3 innecesario, pero `round3(n+1)` es idempotente.

4. **Input `type="text"` + `inputMode="decimal"`**: Los `type="number"` de móvil/desktop pelean con la coma AR. Texto controlado + sanitize es el patrón ya usado en plata.

5. **Balanza: kg nativo, gramo = ×1000**: `balanza.peso` siempre es kg del EAN; solo convertir al agregar si la variante está en gramos. No cambiar el parser de EAN.

6. **Sin cambiar fórmula de cierre de caja**: El arqueo sigue sumando `movimientos_fondos`. Este plan elimina la causa (cobro desalineado), no agrega tolerancia artificial al cierre.

7. **Reparación histórica solo Adonai, solo evidencia numérica**: `tienda_id = e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498`. Auto-ajustar únicamente desfasajes de **centavos** (|diff| ≤ $1.00 por venta o por cuenta) con movimiento `ajuste` documentado. No reescribir cantidades de peso ni totales de tickets sin prueba.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
| ----------- | ------------------ |
| Reusar `parseARSInput` para peso | Interpreta `1.350` como 1350 |
| Redondear solo el total final (sin round por línea) | Rompe paridad con `registrarVenta` y con tickets ya emitidos |
| Forzar solo punto en UI | En AR el cajero escribe coma; pelear contra el hábito genera errores |
| Tolerancia de arqueo ±$1 | Enmascara el bug; no arregla ticket vs fondos |
| Recalcular todas las ventas históricas de Adonai “como si el peso fuera correcto” | Imposible: no hay registro del peso real tipeado mal |
| Migración automática global para todos los tenants | Riesgo alto; el problema operativo es de **una** tienda |

### Preguntas Abiertas (si las hay)

1. **¿Hay productos activos con `unidad_de_medida = 'gramo'` + balanza EAN?**  
   Propuesta: implementar conversión ×1000 igual; si no los usan, no rompe kg.

2. **¿Al editar cantidad en el carrito, mostrar con coma (`1,350`) o punto?**  
   Propuesta: al editar, mostrar el valor “crudo” con punto o el último texto tipeado; al blur, normalizar display con `toLocaleString('es-AR', { maximumFractionDigits: 3 })`.

3. **Umbral de auto-ajuste Adonai:** ¿máximo **$1,00** por diferencia (centavos de redondeo) o subir a **$5,00**?  
   Propuesta: **$1,00** auto; arriba de eso → solo listar en el reporte para decisión manual.

4. **¿Hay sesión de caja abierta en Adonai al momento de reparar?**  
   Si sí: cerrar o avisar antes de tocar saldos; los ajustes van a `movimientos_fondos` y mueven `saldo_actual`.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Helpers `format-cantidad` + tests

Crear `app/lib/format-cantidad.ts`:

```ts
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** Solo dígitos, una coma o punto decimal, sin signos raros. */
export function sanitizeCantidadTyping(raw: string): string { ... }

/**
 * Parsea cantidad (peso/medida).
 * - "1,350" → 1.35
 * - "1.350" → 1.35  (punto = decimal, NO miles)
 * - "1.350,5" no aplica; si hay coma, puntos previos son miles opcionales raros → preferir: si hay coma, quitar puntos y coma→punto
 * - Vacío / inválido → NaN
 * - Resultado con round3, >= 0
 */
export function parseCantidadInput(raw: string): number { ... }
```

**Reglas de parseo (implementar exactamente):**

1. Trim; vacío → `NaN`
2. Si contiene `,`: quitar todos los `.`, reemplazar `,` por `.`
3. Si solo `.`: dejar como decimal JS (`1.350` → 1.35)
4. `Number(...)`; si no finito o ≤ 0 al validar en UI → `NaN` aquí si no finito; permitir 0 solo si se necesita (UI exige > 0)
5. `return round3(n)`

**Tests** (`format-cantidad.test.ts`):

- `1,350` → `1.35`
- `1.350` → `1.35`
- `0,235` → `0.235`
- `350` → `350`
- `''` → `NaN`
- `abc` → `NaN`
- `1,350` ≠ `1350`

**Acciones:**

- Crear archivo + tests
- Re-exportar desde `app/lib/format.ts`

**Archivos afectados:**

- `app/lib/format-cantidad.ts`
- `app/lib/format-cantidad.test.ts`
- `app/lib/format.ts`

---

### Paso 2: Totales de carrito unificados

Crear `app/lib/pos/totales-carrito.ts`:

```ts
import { round2 } from '@/lib/format-cantidad'

export function totalLinea(precio: number, cantidad: number): number {
  return round2(Number(precio) * Number(cantidad))
}

export function sumarSubtotalLineas(
  items: Array<{ precio_unitario: number; cantidad: number }>
): number {
  return round2(items.reduce((acc, it) => acc + totalLinea(it.precio_unitario, it.cantidad), 0))
}
```

**Test:** `3 × (10.10 × 0.333)` → subtotal `10.08` (no `10.09`).

**Acciones:**

- Crear helper + test
- En `POSContainer`, reemplazar `items.reduce((acc, it) => acc + it.precio_unitario * it.cantidad, 0)` por `sumarSubtotalLineas(items)`
- En `Carrito.tsx`, mismo cambio para `totalBruto` y subtotales de fila mostrados (`totalLinea(...)`)

**Archivos afectados:**

- `app/lib/pos/totales-carrito.ts`
- `app/lib/pos/totales-carrito.test.ts`
- `app/components/pos/POSContainer.tsx`
- `app/components/pos/Carrito.tsx`

---

### Paso 3: `PesoModal` — coma + preview redondeado

**Acciones:**

- Cambiar input a `type="text"` `inputMode="decimal"` `autoComplete="off"`
- `onChange`: `setValor(sanitizeCantidadTyping(e.target.value))`
- `cantidadNum = parseCantidadInput(valor)`; válido si `Number.isFinite && > 0`
- `subtotal = esValido ? totalLinea(precio, cantidadNum) : null`
- Placeholder kg: `ej: 1,350`; litro `0,500`; gramo `350`
- Hint corto bajo el input: `Usá coma o punto (como en la balanza)`
- Al confirmar: `onConfirm(cantidadNum)` ya con `round3`

**Archivos afectados:**

- `app/components/pos/PesoModal.tsx`

---

### Paso 4: `Carrito` — editar cantidad decimal

**Acciones:**

- En inputs donde `esDecimal(unidad)`:
  - Dejar de usar `parseFloat`
  - Usar `parseCantidadInput`; si `NaN` o ≤ 0, no actualizar (o revertir)
  - Opcional: estado local de string mientras tipean (evita pelear el controlled number); si se mantiene controlled number string, guardar string en state local por fila o parsear onBlur
- Preferencia de implementación simple: `onChange` parsea; si válido → `onUpdate`; si el usuario está a mitad (`"1,"`) permitir string local:

Patrón recomendado (por ítem o un mapa `draftCantidad[id]`):
- Mientras hay draft, mostrar draft
- onBlur: parsear y commit / limpiar draft

Si el carrito ya es controlled solo con number, mínimo viable: parsear en onChange y **ignorar** valores inválidos intermedios sin pisar con NaN.

**Archivos afectados:**

- `app/components/pos/Carrito.tsx`

---

### Paso 5: Merge de cantidades con `round3` + balanza gramos

En `POSContainer.tsx` `agregarVariante`:

**Antes:**
```ts
cantidad: round2(next[idx].cantidad + cantidad),
```

**Después:**
```ts
cantidad: UNIDADES_MEDIBLES.has(v.unidad_de_medida)
  ? round3(next[idx].cantidad + cantidad)
  : round2(next[idx].cantidad + cantidad), // o Math para enteros: next + cantidad
```

Para unidades enteras (`unidad`, pack): preferir suma entera sin `round2` de cantidad:

```ts
const esMedible = UNIDADES_MEDIBLES.has(v.unidad_de_medida)
cantidad: esMedible
  ? round3(next[idx].cantidad + cantidad)
  : next[idx].cantidad + cantidad,
```

En el branch de balanza formato `peso`:

```ts
const qty =
  res2.data.unidad_de_medida === 'gramo'
    ? round3(balanza.peso * 1000)
    : balanza.peso
agregarVariante(res2.data, { cantidadOverride: qty })
```

Aplicar la misma lógica en cualquier otro call site que use `balanza.peso` como cantidad (buscar `cantidadOverride: balanza.peso` / `parseBalanza`).

**Acciones:**

- Cambiar merge
- Convertir gramos en scan (y en `BuscadorVariantes` si también resuelve balanza)
- Importar `round3` desde `format-cantidad`; se puede dejar de usar `round2` local del container para cantidades (mantener `round2` local solo si se usa para plata, o importar el compartido)

**Archivos afectados:**

- `app/components/pos/POSContainer.tsx`
- `app/components/pos/BuscadorVariantes.tsx` (si aplica balanza)

---

### Paso 6: Consistencia menor + verificación server

**Acciones:**

- Confirmar que `registrarVenta` ya hace `round2` por línea — **no cambiar la fórmula**, solo documentar en comentario que el POS debe espejar `totales-carrito`.
- `UltimoAgregadoChip`: si muestra subtotal, usar `totalLinea`.
- `DevolucionForm`: si lista líneas con `cantidad * precio` sin round, usar `round2` por línea (mismo criterio).
- Correr tests: `format-cantidad.test.ts`, `totales-carrito.test.ts`, suite pos existente (`descuento`, `puede-cobrar`, etc.).

**Archivos afectados:**

- `app/app/actions/ventas.ts` (comentario opcional)
- `app/components/pos/UltimoAgregadoChip.tsx`
- `app/components/devoluciones/DevolucionForm.tsx` (si aplica)

---

### Paso 7: Reparación one-shot tienda Adonai

**Target fijo (no parametrizar a otros tenants en esta corrida):**

| Campo | Valor |
| ----- | ----- |
| `tienda_id` | `e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498` |
| Email | `provisionesadonai@gmail.com` |
| Nombre esperado | Adonai / Provisiones Adonai (verificar en `tiendas`) |

**Acciones:**

1. Crear `scripts/sql/adonai-auditoria-caja.sql` con estas queries (todas filtradas por el UUID):

```sql
-- 0) Identidad
select id, nombre, email, rubro from tiendas
where id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498';

-- 1) Ventas completadas: total vs suma de pagos (desfase centavos)
select
  v.id,
  v.numero_ticket,
  v.created_at,
  v.total as venta_total,
  coalesce(sum(p.monto), 0) as pagos_sum,
  round(coalesce(sum(p.monto), 0) - v.total, 2) as diff_pagos_menos_total
from ventas v
left join pagos_venta p on p.venta_id = v.id
where v.tienda_id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
  and v.estado = 'completada'
group by v.id
having abs(coalesce(sum(p.monto), 0) - v.total) > 0.009
order by abs(coalesce(sum(p.monto), 0) - v.total) desc, v.created_at desc;

-- 2) Líneas: total_linea vs round(precio*cantidad,2)
select
  d.id,
  d.venta_id,
  d.cantidad,
  d.precio_unitario,
  d.total_linea,
  round(d.precio_unitario * d.cantidad - coalesce(d.descuento_linea, 0), 2) as esperado,
  round(d.total_linea - round(d.precio_unitario * d.cantidad - coalesce(d.descuento_linea, 0), 2), 2) as diff
from detalles_venta d
join ventas v on v.id = d.venta_id
where v.tienda_id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
  and v.estado = 'completada'
  and abs(d.total_linea - round(d.precio_unitario * d.cantidad - coalesce(d.descuento_linea, 0), 2)) > 0.009
limit 200;

-- 3) Saldo cuenta vs reconstrucción por movimientos
select
  c.id,
  c.nombre,
  c.tipo,
  c.saldo_actual,
  coalesce((
    select mf.saldo_posterior
    from movimientos_fondos mf
    where mf.cuenta_fondo_id = c.id
    order by mf.created_at desc, mf.id desc
    limit 1
  ), 0) as ultimo_saldo_posterior,
  round(
    c.saldo_actual - coalesce((
      select mf.saldo_posterior
      from movimientos_fondos mf
      where mf.cuenta_fondo_id = c.id
      order by mf.created_at desc, mf.id desc
      limit 1
    ), 0),
    2
  ) as diff_saldo
from cuentas_fondos c
where c.tienda_id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
  and c.activo = true;

-- 4) Sesión abierta (aviso)
select id, estado, fecha_apertura
from sesiones_caja
where tienda_id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498'
  and estado = 'abierta';
```

2. Correr la auditoría en SQL Editor de Supabase (service role / dashboard). Guardar resultados en `salidas/2026-07-23-adonai-auditoria-caja.md`.

3. **Clasificar hallazgos:**

| Tipo | Criterio | Acción |
| ---- | -------- | ------ |
| A — Centavos pago↔total | `0.01 ≤ \|diff\| ≤ 1.00` | Auto-ajuste de cuenta afectada vía `registrar_movimiento_fondo` tipo `ajuste` con concepto `Ajuste centavos auditoría Adonai ticket #N` **solo si** el desfase se refleja en fondos (vuelto fantasma / falta). Preferir alinear `saldo_actual` al físico informado por el cliente si difiere por ≤ $1 en efectivo. |
| B — Diff grande | `\|diff\| > 1.00` | Solo listar en reporte; **no** auto-fix. Pedir confirmación. |
| C — Saldo ≠ último `saldo_posterior` | cualquier | Setear `cuentas_fondos.saldo_actual = ultimo_saldo_posterior` **si** la cadena de movimientos es la fuente de verdad (o al revés: insertar ajuste al saldo declarado si el dueño confirma el físico). Default: **reconstruir desde último movimiento**. |
| D — Peso mal tipeado (cantidad 1 en vez de 1.35) | no detectable | No tocar. Reportar como “fuera de alcance histórico”. |

4. **Plantilla de ajuste seguro** (ejecutar solo tras revisar el reporte, una cuenta a la vez):

```sql
-- Ejemplo: alinear saldo_actual de efectivo al último movimiento
-- REEMPLAZAR :cuenta_id tras auditoría query 3
update cuentas_fondos c
set saldo_actual = (
  select mf.saldo_posterior
  from movimientos_fondos mf
  where mf.cuenta_fondo_id = c.id
  order by mf.created_at desc, mf.id desc
  limit 1
),
updated_at = now()
where c.id = ':cuenta_id'
  and c.tienda_id = 'e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498';
```

Si hace falta un movimiento de ajuste explícito (para que el ledger cuente el cambio):

```sql
select public.registrar_movimiento_fondo(
  ':cuenta_id'::uuid,
  'ajuste',
  'Ajuste auditoría caja Adonai 2026-07-23',
  :nuevo_saldo_absoluto,  -- según semántica de ajuste en la función (monto = saldo destino)
  null,
  null
);
```

**Ojo:** revisar la semántica de `tipo = 'ajuste'` en `registrar_movimiento_fondo` (setea `saldo_actual = p_monto`, no suma). Usar solo si el audit lo requiere; si no, preferir el `UPDATE saldo_actual` directo cuando el último `saldo_posterior` es correcto y el vivo está desfasado.

5. Documentar en `salidas/2026-07-23-adonai-auditoria-caja.md`:
   - Conteo de ventas con diff
   - Suma total de diffs
   - Cuentas tocadas
   - Qué quedó pendiente (tipo B/D)

6. **No** alterar `cierres_caja` históricos (son snapshots). Si el dueño necesita arqueo “limpio” desde hoy, alcanza con saldos vivos correctos + fix POS hacia adelante.

**Archivos afectados:**

- `scripts/sql/adonai-auditoria-caja.sql`
- `salidas/2026-07-23-adonai-auditoria-caja.md` (al ejecutar)

---

### Paso 8: Validación manual POS + Adonai

**Acciones:**

- En POS (rubro con kg): abrir producto, tipear `1,350` → subtotal = `round2(precio × 1.35)`; agregar; cobrar; verificar `ventas.total` = total de pantalla.
- Tipear `1.350` → mismo resultado.
- Agregar dos veces `0,333` del mismo producto → cantidad carrito `0.666` (no `0.67`).
- Caso centavos: precio 10.10 × 0.333 × 3 líneas equivalentes → total UI = total server.
- Si hay producto en gramos + balanza peso: escanear etiqueta → cantidad en gramos coherente.
- Tras repair Adonai: query 3 sin diffs materiales; caja abierta (si la hay) muestra saldos coherentes con el físico acordado.
- No hace falta tocar migraciones de schema globales (salvo que se elija versionar el SQL de audit en `supabase/migrations` — preferir `scripts/sql/`).

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/pos/puede-cobrar.ts` / `cobro-guiado-steps.ts` — consumen `subtotal` ya redondeado del container
- `app/lib/pos/balanza.ts` — sin cambio de contrato; solo consumo
- Triggers de fondos / cierre caja — indirectos vía `pagos_venta`
- Impresión ticket — usa totales guardados en DB (se benefician al alinearse)

### Actualizaciones Necesarias para Consistencia

- No requiere cambio de `CLAUDE.md` (feature POS, no estructura workspace).
- Opcional: nota en `contexto/proyectos.md` bajo POS — no obligatorio.

### Impacto en Flujos de Trabajo Existentes

- Cajero puede usar coma en peso sin miedo.
- Totales de pantalla pueden bajar/subir $0,01 vs antes en carritos con muchas líneas kg — **correcto** (igual que DB).
- Productos en gramos + balanza pasan a comportarse bien (cambio de comportamiento intencional).

---

## Lista de Validación

Cómo verificar que la implementación está completa y correcta:

- [x] `parseCantidadInput('1,350') === 1.35` y `('1.350') === 1.35` (tests verdes)
- [x] `parseCantidadInput` no convierte `1.350` en `1350`
- [x] PesoModal acepta coma y Enter agrega al carrito la cantidad correcta *(código)*
- [x] Subtotal POS = Σ `round2(precio×cant)` = total que persiste `registrarVenta` (mismo carrito)
- [x] Merge `0.333+0.333` → cantidad `0.666`
- [x] Balanza formato peso + unidad `gramo` → cantidad ×1000
- [x] Balanza + `kg` sin cambios de magnitud
- [x] Placeholders con ejemplo en coma AR
- [x] Tests nuevos cantidad/totales verdes (`npx tsx --test`)
- [x] No hay migración DB nueva de schema (repair Adonai vía script SQL one-shot)
- [ ] Auditoría Adonai corrida en Supabase — script listo, **falta ejecutar en SQL Editor**
- [ ] Ajustes tipo A aplicados; tipo B/D listados sin auto-fix
- [ ] Saldos de cuentas Adonai alineados al ledger (query 3 limpia o documentada)

---

## Criterios de Éxito

La implementación está completa cuando:

1. El cajero puede ingresar el número de la balanza con **coma o punto** y la cantidad/cobro son correctos.
2. El total mostrado en POS coincide con el total guardado en la venta (misma regla `round2` por línea).
3. Las cantidades por peso preservan **3 decimales** al acumular, y la balanza respeta unidad `kg` vs `gramo`.
4. La tienda Adonai tiene auditoría documentada y saldos/centavos detectables corregidos (o listados para decisión manual).

---

## Notas

- Este plan **no** cambia reabrir caja ni movimientos manuales; ataca la causa de drifts de centavos en ventas por peso **y** limpia evidencia numérica en Adonai.
- Mejora futura: lectura directa por puerto/driver de balanza (fuera de alcance).
- Al implementar: skills `senior-frontend` + tests; repair Adonai requiere acceso SQL al proyecto Supabase (no hay MCP DB en el workspace local).
- Defaults a preguntas abiertas: implementar ×1000 para gramo; display de edición con locale `es-AR` en blur; umbral auto-ajuste **$1,00**.
- **Tienda target repair:** `e0a9c8c7-2c7e-4e93-8f79-99fbc06a0498` · `provisionesadonai@gmail.com`

---

## Notas de Implementación

**Implementado:** 2026-07-23

### Resumen

- Helpers `parseCantidadInput` / `round3` + totales POS alineados a `registrarVenta`.
- PesoModal y Carrito aceptan coma/punto; merge medible con `round3`; balanza→gramos ×1000.
- Script SQL Adonai + plantilla de reporte en `salidas/` (auditoría pendiente de correr en Supabase).

### Desviaciones del Plan

- Tests con `node:test` + `tsx` (convención del repo), no Vitest.
- `totales-carrito.ts` importa `format-cantidad` con path relativo (para que corran los tests sin alias).
- Auditoría Adonai **no ejecutada** en DB (sin credenciales/MCP); queda como paso operativo.

### Problemas Encontrados

- Ninguno en código. Bloqueo externo: hace falta pegar `scripts/sql/adonai-auditoria-caja.sql` en el SQL Editor de Supabase y completar `salidas/2026-07-23-adonai-auditoria-caja.md`.
