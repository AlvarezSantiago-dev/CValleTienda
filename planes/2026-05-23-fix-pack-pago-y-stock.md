# Fix: Pack/Bulto — Error de pago y validaciones en toda la cadena

**Fecha:** 2026-05-23  
**Prioridad:** CRÍTICA — bloquea ventas de pack  

---

## Diagnóstico del bug reportado

### Síntoma
> "El total cobrado ($16.000) es menor al total de la venta ($96.000)"

Pack ×6 de Cerveza Quilmes a $16.000 por pack. El usuario paga $16.000 y el sistema rechaza.

### Causa raíz: `cobrar()` en `POSContainer.tsx` línea 225

```ts
// ESTADO ACTUAL (buggy):
cantidad: it.es_pack && it.pack_cantidad ? it.cantidad * it.pack_cantidad : it.cantidad,
// → cantidad = 1 × 6 = 6 unidades  ← para descontar stock ✓
precio_unitario: it.precio_unitario,
// → precio = $16.000 (precio del PACK) ← INCORRECTO para 6 unidades ✗
```

`registrarVenta` (servidor) recalcula: `6 × $16.000 = $96.000`.  
Pago recibido: `$16.000`.  
Validación: `$16.000 + $0.01 < $96.000` → **FALLA**.

### Análisis completo de la cadena

| Punto | Estado actual | Problema |
|-------|--------------|---------|
| Cart `subtotal` (POSContainer) | `1 × $16.000 = $16.000` | ✅ Correcto (cliente ve $16.000) |
| `puedeCobrar` | `$16.000 >= $16.000` | ✅ Pasa (por eso el botón está activo) |
| `cobrar()` payload cantidad | `1 × 6 = 6` | ✅ Correcto para deducción de stock |
| `cobrar()` payload precio | `$16.000` (precio pack) | ❌ Debería ser precio/unidad |
| `registrarVenta` total | `6 × $16.000 = $96.000` | ❌ Incorrecto |
| Validación pago | `$16.000 < $96.000` | ❌ FALLA |
| Validación stock | `stock_actual < cantidad` | ⚠️ Bug 2 (ver abajo) |
| Trigger deducción stock | usa `detalles_venta.cantidad` | ⚠️ Depende del fix |

### Bug 2 (silencioso): validación de stock en `registrarVenta`

Con el fix de Bug 1 (si solo corregimos el precio), la `cantidad` en el payload bajaría a 1 (pack).  
La validación en `ventas.ts`:
```ts
if (v.stock_actual < cantidad)  // si cantidad = 1 pack: 4 unidades < 1 → FALSE → deja pasar ✗
```
Si hay solo 4 unidades en stock y se intenta vender 1 pack de 6, **el sistema dejaría pasar** cuando debería rechazar.

Además, el trigger de DB descuenta `detalles_venta.cantidad` unidades del stock. Si `cantidad = 1`, descuenta 1 unidad en vez de 6. **Stock quedaría erróneo.**

---

## Solución diseñada

### Principio: separar cantidad-financiera de cantidad-física

- **Financiero** (para calcular el total): `cantidad = N packs`, `precio = pack_precio` → total correcto sin redondeo.  
- **Físico** (para stock): `cantidad_fisica = N_packs × pack_cantidad` = unidades reales a descontar.

### Cambios requeridos

#### Cambio 1 — `POSContainer.tsx` `cobrar()`
Dejar de expandir la cantidad. Pasar un nuevo campo `pack_size`:

```ts
// ANTES (buggy):
cantidad: it.es_pack && it.pack_cantidad ? it.cantidad * it.pack_cantidad : it.cantidad,
precio_unitario: it.precio_unitario,

// DESPUÉS:
cantidad: it.cantidad,               // siempre packs/unidades visibles (1 pack)
precio_unitario: it.precio_unitario, // precio del pack ($16.000) — sin tocar
pack_size: it.es_pack && it.pack_cantidad ? it.pack_cantidad : undefined,
// pack_size = 6 → "cada 1 pack = 6 unidades físicas"
```

#### Cambio 2 — `ventas.ts` `RegistrarVentaInput`
Agregar `pack_size` al tipo de cada ítem:

```ts
interface ItemVenta {
  variante_id: string
  cantidad: number
  precio_unitario?: number | null
  descuento_linea?: number | null
  pack_size?: number   // NEW: cuántas unidades físicas hay en 1 pack
}
```

#### Cambio 3 — `ventas.ts` `registrarVenta` (3 sub-cambios)

**a) Validación de stock** (usa unidades físicas):
```ts
const cantidadFisica = Math.round(cantidad * (it.pack_size ?? 1))
// ANTES: if (v.stock_actual < cantidad)
// DESPUÉS:
if (v.stock_actual < cantidadFisica) {
  return { ok: false, error: `Stock insuficiente para "${v.producto_nombre}". Disponible: ${Math.floor(v.stock_actual / (it.pack_size ?? 1))} pack(s)` }
}
```

**b) Cálculo del total** (usa cantidad-pack × precio-pack → sin redondeo):
```ts
// ANTES: const totalLinea = round2(precio * cantidad - descLinea)
// DESPUÉS: igual pero con cantidad = 1 pack × precio = $16.000 ✓
// No cambia código, solo cambia los valores recibidos.
```

**c) `detalles_venta` — cantidad e precio_unitario para stock trigger y reportes**:
```ts
const cantidadFisica = Math.round(cantidad * (ln.pack_size ?? 1))
const precioUnitarioFisico = ln.pack_size && ln.pack_size > 1
  ? round2(ln.precio_unitario / ln.pack_size)   // precio por unidad individual
  : ln.precio_unitario

// INSERT detalles_venta:
{
  cantidad: cantidadFisica,                  // 6 → trigger descuenta 6 unidades ✓
  precio_unitario: precioUnitarioFisico,     // $2.666,67/u → referencia para reportes
  total_linea: ln.total_linea,               // $16.000 (calculado desde precio_pack × 1)
}
```

---

## Impacto en otras partes del sistema

### Afectadas positivamente ✅

| Módulo | Situación antes del fix | Después del fix |
|--------|------------------------|-----------------|
| POS - cobrar | ❌ Falla al pagar pack | ✅ Funciona correctamente |
| Stock - deducción | ❌ Descontaría 1 unidad en lugar de 6 (si solo corriges precio) | ✅ Descuenta las 6 unidades correctamente |
| Stock - validación | ❌ Pasaría pack aunque no haya stock suficiente | ✅ Verifica unidades físicas |
| Reporte de ventas | ❌ Datos inconsistentes | ✅ Muestra unidades físicas reales |

### No afectadas / sin cambios ✅

| Módulo | Estado |
|--------|--------|
| Cart display (Carrito.tsx) | ✅ Muestra "Pack ×6" con $16.000 — no cambia |
| `listarProductosPOS` / grilla | ✅ No involucra pack_size |
| Búsqueda por barcode pack | ✅ Ya implementado en queries.ts |
| Anular venta | ✅ El trigger revierte `detalles_venta.cantidad` (6 unidades) → stock se restaura correctamente |
| Facturación electrónica (AFIP) | ✅ Usa datos de la venta ya confirmada, no interviene en cobrar() |
| Módulo de Devoluciones | ✅ Trabaja con `detalles_venta`, corrección solo mejora la data |
| Movimientos de caja | ✅ Usa `ventas.total`, que queda correcto con el fix |
| Email cierre de caja | ✅ Agrega `ventas.total` — sin cambios necesarios |
| Clientes - saldo a favor | ✅ Usa `ventas.total` — beneficia del fix |
| Importación masiva productos | ✅ No involucra ventas |
| Módulo de Remitos | ✅ No involucra packs actualmente |

---

## Pasos de implementación

### Paso 1 — `app/components/pos/POSContainer.tsx` (en `cobrar()`)
**Archivo:** `app/components/pos/POSContainer.tsx`  
**Línea:** ~225  
Cambiar el mapping de items en `registrarVenta`:
- Quitar la multiplicación de cantidad
- Agregar `pack_size`

### Paso 2 — `app/app/actions/ventas.ts` (interface + registrarVenta)
**Archivo:** `app/app/actions/ventas.ts`

**2a)** Agregar `pack_size?: number` al tipo inline de `RegistrarVentaInput.items`.

**2b)** En el bucle de validación de stock:  
Reemplazar `v.stock_actual < cantidad` por `v.stock_actual < Math.round(cantidad * (it.pack_size ?? 1))`.

**2c)** En el cálculo de `lineas` (`input.items.map`):  
Incluir `pack_size: Number(it.pack_size ?? 1)` en el objeto `linea` retornado.

**2d)** En el INSERT de `detalles_venta`:  
Usar `cantidadFisica = Math.round(ln.cantidad * (ln.pack_size ?? 1))` como `cantidad`.  
Usar `round2(ln.precio_unitario / (ln.pack_size ?? 1))` como `precio_unitario`.

### Paso 3 — Verificar TypeScript
`npx tsc --noEmit`

### Paso 4 — Pruebas manuales
1. Agregar 1 pack de Cerveza Quilmes ×6 a $16.000 → cobrar $16.000 → debe completarse.  
2. Verificar que el stock bajó 6 unidades (no 1).  
3. Intentar vender pack con stock insuficiente (ej. 3 unidades, pack de 6) → debe rechazarse.  
4. Venta normal (sin pack) → debe funcionar igual.  
5. Mezclar pack + unidad normal en el mismo carrito → total y stock correctos.

---

## Estado de implementación

- [ ] Paso 1: POSContainer.tsx — cobrar() sin multiplicación, con pack_size
- [ ] Paso 2a: RegistrarVentaInput — agregar pack_size al tipo
- [ ] Paso 2b: validación de stock con cantidadFisica
- [ ] Paso 2c: propagación de pack_size a lineas
- [ ] Paso 2d: detalles_venta con cantidadFisica y precioUnitarioFisico
- [ ] Paso 3: TypeScript clean
- [ ] Paso 4: Pruebas
