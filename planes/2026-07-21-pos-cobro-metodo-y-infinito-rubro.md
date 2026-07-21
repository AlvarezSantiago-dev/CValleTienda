# Plan: POS — exigir método de pago + stock infinito solo despensa/carnicería

**Creado:** 2026-07-21
**Estado:** Implementado
**Pedido:** Revisar el POS a fondo: no cobrar sin método de pago; que stock infinito (-1) solo aplique en despensa/carnicería para no afectar otros rubros.

---

## Descripción General

### Qué Logra Este Plan

Restaura el comportamiento esperado del POS: **el botón Cobrar solo se habilita después de elegir forma de pago** (o si el saldo a favor cubre el total). Hoy, al agregar un producto, Cobrar ya queda clickeable por `puedeAutoSeed` — eso no es “autoseed al cobrar”, es **habilitar el botón sin método**. Además aísla stock infinito (`-1`) para que solo opere en despensa/carnicería.

### Por Qué Importa

**Causa raíz del “recién casi me deja”:** el fix de stock infinito hizo `stockOk = true` con productos `-1`. Antes, con `-1`, `stockFisicoValido` fallaba → Cobrar disabled. Al arreglar el stock, quedó expuesto `puedeAutoSeed`, que **desde antes** habilitaba Cobrar con `pagos.length === 0`. El cajero ve el botón activo sin tocar un chip — exactamente lo que reportás.

Cobrar sin método explícito es confuso y riesgoso. El infinito debe seguir siendo solo despensa/carnicería.

---

## Estado Actual

### Estructura Existente Relevante

**Cobro POS (problema principal)**

| Pieza | Archivo | Comportamiento |
| ----- | ------- | -------------- |
| `puedeAutoSeed` | `app/components/pos/POSContainer.tsx` ~382–386 | `pagos.length === 0 && totalAPagar > 0 && metodos.length > 0` → **habilita Cobrar sin método** |
| `cobrar()` | mismo archivo ~472–501 | Si `pagos` vacío: auto-seed con `metodoPorDefecto`; si no es efectivo → **cobra de inmediato** |
| `finalizarVenta` | mismo archivo | Valida montos si hay pagos; no exige “método elegido por el usuario” |
| Cobro guiado auto-seed | `app/components/pos/CobroGuiadoModal.tsx` ~90–96 | Al abrir modal, si no hay pagos → seed del método default |
| `pasoPagoValido` | `app/lib/pos/cobro-guiado-steps.ts` | Solo verifica cobertura de monto; con seed automático siempre pasa |
| Chips de pago | `PagoRapidoChips.tsx`, `PasoPago.tsx` | Forma correcta de elegir método |
| Server `registrarVenta` | `app/app/actions/ventas.ts` | Exige ≥1 pago (o saldo a favor); **no** es el bug de UI |

**Stock infinito (aislamiento incompleto)**

| Capa | Estado |
| ---- | ------ |
| UI set `-1` | Ya gated: `rubroPermiteStockInfinito` en formularios y actions |
| Helpers | `app/lib/stock/infinito.ts`: sin parámetro de rubro → cualquier `-1` = ∞ |
| POS queries/UI | Incluyen `-1` **sin** mirar rubro |
| `ventas.ts` | Skip stock con `-1` sin chequear rubro |
| Triggers SQL | `20260721000001_stock_infinito.sql`: `-1` = no-op para **todas** las tiendas |

**Rubro en POS:** `useRubro()` ya expone `rubro`. En server: `getContextoTienda()` / `tiendas.rubro`.

### Brechas o Problemas que se Abordan

1. **Bug reportado (prioritario):** con 1 producto en el carrito y **sin** elegir método, Cobrar ya está habilitado. Antes había que elegir método primero. Fix mínimo: **sacar `puedeAutoSeed` de `puedeCobrar`**.
2. Defensa en `cobrar()`: si alguien dispara F2/click con pagos vacíos, no vender en silencio (mensaje o seed+foco efectivo sin cobrar).
3. Cobro guiado: evita pre-armar método al abrir (consistencia).
4. Stock infinito runtime solo despensa/carnicería.
5. Checklist de regresión POS.

---

## Cambios Propuestos

### Resumen de Cambios

- Quitar `puedeAutoSeed` de `puedeCobrar`.
- Endurecer `cobrar()`: no vender con `pagos` vacíos (salvo saldo favor).
- Cobro guiado: sin auto-seed; exigir método en paso pago.
- Helpers de infinito con flag `permiteInfinito` (rubro).
- Migración SQL: triggers solo aplican ∞ si rubro es despensa/carnicería.
- Tests unitarios de cobro e infinito.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/pos/puede-cobrar.ts` | Función pura única fuente de verdad para habilitar Cobrar |
| `app/lib/pos/puede-cobrar.test.ts` | Casos: sin método → false; con método OK; solo saldo favor OK |
| `supabase/migrations/20260721000002_stock_infinito_solo_rubro.sql` | Triggers: ∞ solo si rubro ∈ {despensa, carniceria} |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/pos/POSContainer.tsx` | Quitar autoSeed de `puedeCobrar`; endurecer `cobrar()`; `stockFisicoValido(..., permiteInfinito)` |
| `app/components/pos/CobroGuiadoModal.tsx` | Eliminar `useEffect` auto-seed |
| `app/lib/pos/cobro-guiado-steps.ts` | `pasoPagoValido` exige `pagos.length >= 1` si hay monto a pagar |
| `app/lib/pos/cobro-guiado-steps.test.ts` | Tests del nuevo criterio |
| `app/lib/stock/infinito.ts` | `tieneStockSuficiente` / `esStockVendible` con `permiteInfinito` (default `false`) |
| `app/lib/stock/infinito.test.ts` | Casos con/sin permiso |
| `app/components/pos/Carrito.tsx` | Flag de rubro |
| `app/lib/pos/queries.ts` | Incluir `-1` en filtros solo si rubro permite |
| `app/lib/pos/aplicarPrecioPack.ts` | No promover `-1` a ∞ sin permiso |
| `app/app/actions/ventas.ts` | Validar stock infinito solo si rubro permite |
| `app/app/actions/devoluciones.ts` | Idem |
| `app/lib/devoluciones/queries-cambio.ts` | Idem |
| `app/components/pos/GrillaProductos.tsx` | Condicionar ∞ a rubro |
| `app/components/pos/VarianteSelector.tsx` | Idem |
| `app/components/pos/BuscadorVariantes.tsx` | Idem |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **`puedeCobrar` sin auto-seed:** Solo ítems + stock OK + (saldo favor cubre total **o** ≥1 pago que cubre). Sin método → disabled.

2. **`cobrar()` no cobra en silencio:** Si falta método y hay monto:
   - Default efectivo → seed + foco monto + `return` (no cobrar).
   - Default tarjeta/MP → `setError('Elegí una forma de pago')` + `return`.
   - Cobrar solo cuando ya hay pagos válidos.

3. **Cobro guiado sin seed al abrir:** Paso Pago vacío; no avanzar hasta elegir método (salvo total 0 por saldo favor).

4. **Infinito solo con `rubroPermiteStockInfinito`:** Si `permiteInfinito === false` y `stock === -1` → **sin stock suficiente** (bloquea), no ∞.

5. **Triggers SQL alineados:** Leer `tiendas.rubro`; rama infinito solo despensa/carnicería. Otros rubros con `-1` → excepción stock insuficiente.

6. **Saldo a favor completo:** Sigue permitiendo cobrar sin método monetario.

### Alternativas Consideradas

| Alternativa | Por qué se rechaza |
| ----------- | ------------------ |
| Mantener auto-seed + 2º F2 para confirmar | El usuario pidió no cobrar sin poner método |
| Solo arreglar UI y no tocar SQL | Agujero si alguien mete `-1` por SQL en otro rubro |
| Convertir `-1` a `0` en otros rubros | Destructivo; mejor bloquear venta |

### Preguntas Abiertas (si las hay)

Ninguna bloqueante. Confirmado por el usuario: el bug es **habilitar Cobrar sin método**, no “usar autoseed” como feature. Al implementar, F2 sin método → mensaje o seed efectivo+foco **sin** cobrar (no reintroducir botón enabled por autoSeed).

---

## Tareas Paso a Paso

### Paso 1: Extraer `puedeCobrarVenta` + tests

Crear `app/lib/pos/puede-cobrar.ts` con función pura (hayItems, stockOk, totalBruto, saldoFavor, pagos). Sin concepto de autoSeed.

Tests: vacío; sin pagos; pagos insuficientes; OK; solo saldo favor.

**Archivos afectados:** `puede-cobrar.ts`, `puede-cobrar.test.ts`

---

### Paso 2: Endurecer POSContainer

- Reemplazar `puedeCobrar` por `puedeCobrarVenta` — **eliminar** `puedeAutoSeed`.
- En `cobrar()`: si no hay pagos y hace falta pagar → efectivo seed+foco / else error; **nunca** `finalizarVenta` con pagos vacíos.
- `stockFisicoValido(items, permiteInfinito)` con `rubroPermiteStockInfinito(rubro)` desde `useRubro()`.

**Archivos afectados:** `POSContainer.tsx`

---

### Paso 3: Cobro guiado

- Borrar `useEffect` auto-seed en `CobroGuiadoModal.tsx`.
- `pasoPagoValido`: si `totalAPagar > 0` exigir `pagos.length >= 1` y cobertura.
- Actualizar `cobro-guiado-steps.test.ts`.

**Archivos afectados:** `CobroGuiadoModal.tsx`, `cobro-guiado-steps.ts`, tests

---

### Paso 4: Helpers infinito con flag

```ts
tieneStockSuficiente(stock, cantidad, permiteInfinito = false)
// si !permiteInfinito && stock === -1 → return false
```

Actualizar `esStockVendible` igual. Default **false** (safe). Callers pasan `rubroPermiteStockInfinito(rubro)`.

**Archivos afectados:** `infinito.ts`, `infinito.test.ts`

---

### Paso 5: Cablear rubro en POS / ventas / devoluciones

- Cliente: `permiteInfinito` desde `useRubro`.
- `queries.ts`: leer rubro en ctx; filtros `.or(...eq.-1)` solo si permite.
- `ventas.ts` / devoluciones: mismo flag; si `!permite && stock === -1` → error stock insuficiente.
- UI display ∞ solo si permite.

**Archivos afectados:** listados en “Archivos a Modificar”.

---

### Paso 6: Migración SQL

`supabase/migrations/20260721000002_stock_infinito_solo_rubro.sql`:

En triggers de salida/anulación/reposición/cambio, resolver:

```sql
v_permite := (SELECT rubro FROM tiendas WHERE id = ...) IN ('despensa', 'carniceria');
```

Solo entonces rama `stock = -1` = no-op. Si `stock = -1` y no permite → `RAISE` stock insuficiente.

Partir del cuerpo actual de `20260721000001_stock_infinito.sql`.

**Archivos afectados:** nueva migración

---

### Paso 7: Regresión

1. Ropa: sin chip → Cobrar disabled; F2 no vende.
2. Efectivo → monto → Cobrar OK.
3. Chip MP → Cobrar OK.
4. Guiado: sin método prearmado.
5. Saldo favor total → Cobrar sin método OK.
6. Despensa `-1` → vende, stock queda `-1`.
7. Staging ropa con `-1` → no vende / trigger falla.
8. Tests verdes.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- Flujo POS completo + `registrarVenta` + triggers stock.
- Plan `planes/2026-07-21-stock-infinito-menos-uno.md`.

### Actualizaciones Necesarias para Consistencia

- Mensaje de error “Elegí una forma de pago”.
- Deploy app + migración `0002` juntos.

### Impacto en Flujos de Trabajo Existentes

- Cajeros que usaban F2 = “cobra con default tarjeta” deben tocar el chip una vez (cambio intencional).
- Despensa/carnicería: ∞ se mantiene; cobro más estricto igual aplica.

---

## Lista de Validación

- [x] `puedeCobrar` false sin método (total > 0, sin saldo favor)
- [x] Click/F2 sin método no crea venta
- [x] Efectivo: seed+foco o mensaje; cobro solo con monto
- [x] Chip tarjeta/MP → cobro OK
- [x] Cobro guiado sin auto-seed
- [x] Saldo favor total → cobro sin método OK
- [x] `tieneStockSuficiente(-1, 1, false) === false`
- [x] Despensa: `-1` vendible
- [x] Trigger SQL no trata ∞ fuera de despensa/carnicería
- [x] Tests verdes
- [x] Plan → Implementado tras `/implementar`

---

## Criterios de Éxito

1. Imposible vender desde UI POS con `totalAPagar > 0` y `pagos.length === 0` (salvo saldo favor completo).
2. Stock `-1` solo es infinito en despensa/carnicería (app + DB).
3. Otros rubros no auto-cobran ni tratan `-1` como ∞.

---

## Notas

- El fix de `stockFisicoValido` vs `-1` se mantiene; este plan lo condiciona al rubro.
- Si se confirma pregunta abierta #1, implementar F2+efectivo según recomendación en Paso 2.

---

## Notas de Implementación

**Implementado:** 2026-07-21

### Resumen

- Extraída `puedeCobrarVenta` (sin auto-seed) y cableada en POSContainer.
- `cobrar()`: sin método → efectivo seed+foco o error "Elegí una forma de pago"; nunca finaliza con pagos vacíos.
- Cobro guiado: sin auto-seed; `pasoPagoValido` exige ≥1 pago si hay monto.
- Helpers de stock infinito con `permiteInfinito` (default false); callers POS/ventas/devoluciones/UI pasan `rubroPermiteStockInfinito`.
- Migración `20260721000002_stock_infinito_solo_rubro.sql`: triggers ∞ solo despensa/carnicería.

### Desviaciones del Plan

- También cableado `permiteInfinito` en `lib/precios/queries.ts` y `variantes-estado` / `VariantesEditor` para consistencia de display/resumen (no estaban en la tabla original).

### Problemas Encontrados

- Ninguno bloqueante. Tests unitarios (`puede-cobrar`, `infinito`, `aplicarPrecioPack`) verdes vía `npx tsx --test`. Migración SQL pendiente de aplicar en Supabase.
