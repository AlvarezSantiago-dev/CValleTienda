# Plan: Análisis — stock infinito (-1) no se mueve en venta / anulación / devolución

**Creado:** 2026-07-21
**Estado:** Borrador
**Pedido:** Confirmar que al registrar venta, anular venta o hacer devolución el `stock_actual = -1` no se modifica y sigue funcionando como infinito (despensa/carnicería).

---

## Descripción General

### Qué Logra Este Plan

Documenta y verifica (con checklist ejecutable) que **sí: en despensa/carnicería el sentinel `-1` no se descuenta ni se suma** en venta, anulación, devolución ni cambio de variante. El producto permanece ilimitado. Si la migración `0002` está aplicada, no hace falta cambiar código de triggers; el trabajo es **confirmar en runtime** y dejar el contrato claro.

### Por Qué Importa

Sin esta garantía, un producto “infinito” dejaría de serlo tras la primera venta (pasaría a `-1 - N`) o se “inflaría” al anular/devolver (`-1 + N` → valor absurdo o constraint). El cliente de despensa/carnicería necesita vender, anular y devolver sin tocar el inventario de esos ítems.

---

## Estado Actual

### Estructura Existente Relevante

**Contrato ya implementado** (migraciones `20260721000001` + `20260721000002` + app):

| Flujo | Pieza | Comportamiento con `stock_actual = -1` y rubro ∈ {despensa, carniceria} |
| ----- | ----- | ----------------------------------------------------------------------- |
| **Registrar venta** | Trigger `registrar_salida_stock_venta` | **No** hace `UPDATE` de stock. Solo inserta `movimientos_stock` con `stock_anterior = -1`, `stock_posterior = -1` y `RETURN`. |
| **Registrar venta (kit)** | `app/app/actions/ventas.ts` | Si componente es `-1` y `permiteInfinito`: movimiento con -1/-1 y `continue` (sin descontar). |
| **Anular venta** | Trigger `revertir_stock_anulacion` (al pasar `estado → anulada`) | **No** suma stock. Solo movimiento de auditoría `-1 → -1`. |
| **Devolución (reintegro)** | Trigger `reponer_stock_devolucion` | **No** suma stock. Solo movimiento `-1 → -1`. |
| **Cambio (entrega otra variante)** | Trigger `descontar_stock_entrega_cambio` | Si la variante entregada es `-1`: no descuenta; movimiento `-1 → -1`. |
| **Rubro no permitido** | `tienda_permite_stock_infinito(tienda_id)` | Si hay `-1` fuera de despensa/carnicería → `RAISE` stock insuficiente (no trata como ∞). |

Fragmento típico (venta normal):

```sql
IF v_stock_anterior = -1 THEN
  -- …chequeo rubro…
  INSERT INTO movimientos_stock (…, stock_anterior, stock_posterior, …)
  VALUES (…, -1, -1, …);
  RETURN new;  -- sin UPDATE variantes_producto
END IF;
```

**App:** helpers en `app/lib/stock/infinito.ts`; POS/ventas pasan `rubroPermiteStockInfinito`. Documentado en `contexto/proyectos.md` (stock ilimitado despensa/carnicería).

### Brechas o Problemas que se Abordan

1. **Duda del usuario:** ¿el `-1` se “mueve”? → Respuesta de diseño: **no**, en los flujos citados (con migraciones aplicadas).
2. **Riesgo operativo:** si solo está aplicada `0001` y no `0002`, el ∞ aplica a todos los rubros; si no está `0001`, el `-1` ni siquiera se puede persistir bien. Este plan exige verificar deploy SQL.
3. **Sin smoke test formal** en el repo que demuestre “antes/después = -1” en venta → anulación → devolución.
4. **Caso borde (documentar, no “fix” ahora):** si se vendió con stock finito y **después** se pasó el producto a `-1`, al anular la venta vieja el trigger ve `-1` actual y **no** repone unidades (no-op). Aceptable para ilimitados; raro en operación.

---

## Cambios Propuestos

### Resumen de Cambios

- **No reescribir triggers** si el análisis en DB confirma el cuerpo de `0002`.
- Ejecutar **checklist de verificación** (manual o SQL) en una tienda despensa/carnicería de staging.
- Opcional: nota corta en `contexto/` o comentario en plan de stock infinito apuntando a este contrato.
- Solo si la verificación falla → abrir fix puntual (fuera del alcance feliz de este plan).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| (ninguno obligatorio) | La verificación puede vivir en las Notas de Implementación de este plan |

Opcional si se quiere trazabilidad:

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `salidas/2026-07-21-verificacion-stock-infinito.md` | Resultado del smoke test (antes/después por flujo) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `contexto/proyectos.md` | Una línea explícita: venta/anulación/devolución **no modifican** `-1` (solo movimiento de auditoría). |
| Este plan | Pasar a Implementado + notas con resultados del smoke test |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **`-1` es sentinel, no cantidad:** no se hace aritmética sobre él. Auditoría sí (movimientos con cantidad de la venta/devolución y posterior `-1`).
2. **Anular / devolver tampoco “suman” al infinito:** devolver a un ilimitado no tiene sentido inventariable; se registra el movimiento y se deja `-1`.
3. **Verificación > reimplementación:** el código/SQL ya expresa el contrato; el valor del plan es probarlo en DB real y documentarlo.
4. **Scope:** solo despensa/carnicería (alineado a `0002` y `rubroPermiteStockInfinito`).

### Alternativas Consideradas

| Alternativa | Por qué se rechaza |
| ----------- | ------------------ |
| Volver a tocar triggers “por las dudas” | Riesgo de regresiones; ya están en `0002` |
| Convertir `-1` a un stock alto ficticio | Peor UX y mentira de inventario |
| No registrar movimientos en ∞ | Pierde auditoría de ventas/devoluciones |

### Preguntas Abiertas (si las hay)

Ninguna bloqueante para confirmar el diseño.

Opcional antes de smoke test:

1. ¿Hay ambiente staging con migraciones `0001` + `0002` ya aplicadas?
2. ¿Querés el artefacto en `salidas/` o alcanza con notas en este plan?

---

## Tareas Paso a Paso

### Paso 1: Confirmar migraciones en la DB objetivo

**Acciones:**

- En Supabase SQL, verificar que existen:
  - `public.tienda_permite_stock_infinito(uuid)`
  - Cuerpo de `registrar_salida_stock_venta` / `revertir_stock_anulacion` / `reponer_stock_devolucion` con rama `IF v_stock_anterior = -1` y **sin** `UPDATE` en esa rama.
- Si falta `0001` o `0002`: aplicarlas antes de seguir (sin eso el análisis de runtime no vale).

**Archivos afectados:**

- `supabase/migrations/20260721000001_stock_infinito.sql`
- `supabase/migrations/20260721000002_stock_infinito_solo_rubro.sql`

---

### Paso 2: Smoke test — venta

**Acciones:**

1. En tienda despensa o carnicería, elegir (o crear) variante con `stock_actual = -1`.
2. Anotar `id` y stock.
3. Registrar venta POS de N unidades.
4. Releer `variantes_producto.stock_actual` → debe ser **`-1`**.
5. En `movimientos_stock`: fila con `stock_anterior = -1`, `stock_posterior = -1`, `cantidad = -N` (o equivalente), motivo con “ilimitado”.

**Archivos afectados:** ninguno (runtime).

---

### Paso 3: Smoke test — anulación

**Acciones:**

1. Anular la venta del Paso 2 (`anularVenta` / UI ventas).
2. Releer stock → sigue **`-1`** (no `-1 + N`).
3. Movimiento de anulación/devolución con `-1` / `-1`.

**Archivos afectados:** ninguno (runtime). Trigger vía `UPDATE ventas.estado = 'anulada'`.

---

### Paso 4: Smoke test — devolución

**Acciones:**

1. Vender de nuevo un ítem `-1`.
2. Crear devolución (reintegro / misma variante) de esa venta.
3. Stock sigue **`-1`**.
4. (Opcional) Cambio a otra variante también `-1`: stock de entrega permanece `-1`.

**Archivos afectados:** ninguno (runtime).

---

### Paso 5: Documentar contrato

**Acciones:**

- Actualizar `contexto/proyectos.md` (módulo Stock) con: *“`-1` no se modifica al vender, anular ni devolver; solo se registran movimientos.”*
- Completar Notas de Implementación de este plan con resultados (OK / fail por paso).
- Si falló algún paso: **no** marcar éxito; crear plan de fix o corregir en el mismo ciclo `/implementar` con evidencia.

**Archivos afectados:**

- `contexto/proyectos.md`
- `planes/2026-07-21-analisis-infinito-no-mueve-stock.md` (este archivo)

---

### Paso 6: (Solo si falla) Diagnóstico

**Acciones:**

- Comparar definición en DB vs archivo `0002`.
- Revisar si el rubro de la tienda no es despensa/carnicería (entonces `-1` no es ∞ y la venta debe fallar).
- Revisar kits: descuento manual en `ventas.ts` debe respetar `permiteInfinito`.

**Archivos afectados (solo en fallo):** triggers SQL y/o `app/app/actions/ventas.ts`.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/actions/ventas.ts` — `registrarVenta`, `anularVenta`
- `app/app/actions/devoluciones.ts` — alta de devoluciones (dispara triggers de detalle)
- `app/lib/stock/infinito.ts` — semántica app
- Planes: `planes/2026-07-21-stock-infinito-menos-uno.md`, `planes/2026-07-21-pos-cobro-metodo-y-infinito-rubro.md`

### Actualizaciones Necesarias para Consistencia

- `contexto/proyectos.md` (una frase sobre no-op)
- CLAUDE.md: **no** requiere cambio estructural

### Impacto en Flujos de Trabajo Existentes

- Ninguno si la verificación pasa: el comportamiento esperado ya es el de producción post-migración.
- Cajeros verán movimientos de stock “raros” (`-1 → -1`) en el historial: es intencional (auditoría sin cambiar inventario).

---

## Lista de Validación

- [ ] Migraciones `0001` y `0002` presentes en la DB usada para el test
- [ ] Tras venta de producto `-1` (despensa/carnicería): `stock_actual` sigue `-1`
- [ ] Tras anular esa venta: sigue `-1`
- [ ] Tras devolución sobre venta de `-1`: sigue `-1`
- [ ] Movimientos de auditoría existen con anterior/posterior `-1`
- [ ] `contexto/proyectos.md` menciona el no-op
- [ ] Plan marcado Implementado con resultados del smoke test

---

## Criterios de Éxito

1. Queda **confirmado por evidencia** (query o UI) que venta / anulación / devolución **no cambian** `stock_actual` cuando es `-1` en rubro permitido.
2. El contrato queda escrito en contexto del workspace.
3. Si algo falla, hay causa y next step claros (no se asume “ya está” a ciegas).

---

## Notas

### Respuesta directa al pedido

**Sí:** al anular, devolver y registrar venta, el sistema **no debe “mover”** el `-1`. Se deja en `-1` para que siga siendo infinito. Lo que sí se registra es un **movimiento de stock** (historial) con anterior y posterior en `-1`.

### Prerrequisito crítico

Sin aplicar `20260721000002_stock_infinito_solo_rubro.sql` (y antes `0001`), el comportamiento en producción puede no coincidir con el código del repo.

### Relación con planes previos

- `2026-07-21-stock-infinito-menos-uno.md` — introdujo el no-op.
- `2026-07-21-pos-cobro-metodo-y-infinito-rubro.md` — acotó ∞ al rubro; no cambió la idea de “no mover `-1`”.
