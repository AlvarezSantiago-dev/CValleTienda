# Plan: Fix Devoluciones — Relación con Clientes y Ventas (Completo)

**Creado:** 2026-06-03  
**Estado:** Borrador  
**Pedido:** Corregir 3 bugs relacionados: (1) crash "Event handlers cannot be passed to Client Component" en TablaDevoluciones, (2) saldo_a_favor no se limpia al anular una venta, (3) cliente inactivo sigue apareciendo en Top Clientes del Dashboard.

---

## Descripción General

### Qué Logra Este Plan

Corrige los tres problemas reportados de una sola vez:
1. **Bug React Server Component**: `TablaDevoluciones` es un Server Component pero pasa un `onClick` como prop a un `<div>` renderizado dentro de un `<Link>`. Eso causa el crash cuando `showPrint=true`.
2. **Saldo a favor inconsistente**: Al anular una venta, si el cliente tenía saldo_a_favor acumulado vía devoluciones de esa venta, ese saldo no se revierte. El saldo queda "flotando" aunque la venta original sea inválida.
3. **Dashboard Top Clientes filtra por activo=true pero no recarga cuando se desactiva un cliente**: La query ya filtra correctamente por `activo`, pero el problema es que después de desactivar a Corina Fritz el dashboard no se invalidó (cache). Además hay que confirmar que `anularVenta` invalida la ruta `/dashboard`.

### Por Qué Importa

El crash de React bloquea la carga del detalle de la venta para cualquier venta que tenga devoluciones con `showPrint=true`. El saldo fantasma genera inconsistencias contables. El dashboard mostrando clientes inactivos confunde a la usuaria.

---

## Estado Actual

### Estructura Existente Relevante

- `app/components/devoluciones/TablaDevoluciones.tsx` — Server Component, usa `showPrint` y pasa `onClick` a un div dentro de un Link
- `app/app/(dashboard)/ventas/[id]/page.tsx` — usa `<TablaDevoluciones showPrint />` (línea 130)
- `app/app/actions/ventas.ts` → `anularVenta()` — hace update de estado pero no revierte saldo_a_favor
- `app/lib/dashboard/queries.ts` → `obtenerTopClientesHistorico()` — ya filtra `.eq('activo', true)` ✓
- `app/app/(dashboard)/dashboard/page.tsx` — llama a `obtenerTopClientesHistorico(5)`
- `supabase/migrations/20260510000003_saldo_a_favor.sql` — define RPC `incrementar_saldo_favor` y `descontar_saldo_favor`
- No existe un RPC `revertir_saldo_favor_por_venta` todavía

### Brechas o Problemas que se Abordan

1. `TablaDevoluciones` no tiene `'use client'` y pasa `onClick` → error React RSC
2. `anularVenta` no consulta devoluciones `tipo_resolucion='saldo_a_favor'` de esa venta para revertirlas
3. `anularVenta` no llama a `revalidatePath('/dashboard')`, por lo que el cache del dashboard no se limpia

---

## Cambios Propuestos

### Resumen de Cambios

- Extraer la lógica del botón de reimpresión de `TablaDevoluciones` a un nuevo Client Component `PrintDevolucionCell`
- Añadir revalidación de `/dashboard` en `anularVenta`
- Añadir reversión de saldo_a_favor en `anularVenta` consultando devoluciones de esa venta con `tipo_resolucion='saldo_a_favor'`
- Crear una nueva función SQL `revertir_saldo_favor` (o manejar en aplicación) para decrementar el saldo de forma segura
- Revalidar también `/clientes` y `/clientes/${clienteId}` en `anularVenta`

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/components/devoluciones/PrintDevolucionCell.tsx` | Client Component que wrappea el `PrintButtonClient` para usarlo dentro de TablaDevoluciones (RSC) sin pasar handlers |
| `supabase/migrations/20260603000001_revertir_saldo_favor.sql` | RPC `revertir_saldo_favor_de_venta(p_venta_id, p_tienda_id)` que descuenta de `clientes.saldo_favor` la suma de devoluciones `saldo_a_favor` de esa venta |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/components/devoluciones/TablaDevoluciones.tsx` | Reemplazar el `<div onClick>` con `<PrintDevolucionCell id={d.id} />` (Client Component) |
| `app/app/actions/ventas.ts` → `anularVenta` | (1) Consultar devoluciones `saldo_a_favor` de la venta; (2) Llamar RPC `revertir_saldo_favor_de_venta`; (3) Agregar `revalidatePath('/dashboard')` |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Extraer `PrintDevolucionCell` en lugar de marcar todo `TablaDevoluciones` como `'use client'`**: TablaDevoluciones es un Server Component por diseño (renderiza datos directamente). Marcarla `'use client'` requeriría pasar todos los `items` como props serializables desde un Client parent, lo cual es innecesario. Solo el botón de print necesita ser client-side.

2. **Manejar la reversión del saldo en la action de `anularVenta`, no en un trigger**: La reversión es un efecto de negocio (anular = deshacer todo lo contable), no un efecto de base de datos puro. Mantenerlo en la action es más mantenible y auditale.

3. **RPC `revertir_saldo_favor_de_venta` en lugar de `descontar_saldo_favor` directamente**: Necesitamos calcular el total a descontar sumando las devoluciones. Es más limpio hacerlo en SQL con SECURITY DEFINER para evitar race conditions.

4. **`revalidatePath('/dashboard')` en `anularVenta`**: Actualmente falta. Al anular una venta se modifica el estado y potencialmente el ranking de clientes. Sin esto, el dashboard queda stale.

### Alternativas Consideradas

- Marcar TablaDevoluciones como `'use client'` completo → descartado, demasiado invasivo
- Manejar el revert de saldo en el cliente (frontend) → descartado, inseguro y sin atomicidad

---

## Tareas Paso a Paso

### Paso 1: Crear `PrintDevolucionCell` (Client Component)

Crear un pequeño Client Component que wrappea `PrintButtonClient` para ser usado dentro de un Server Component sin pasar `onClick`.

**Acciones:**

- Crear `app/components/devoluciones/PrintDevolucionCell.tsx`
- Contenido: `'use client'`, recibe `id: string`, renderiza `<PrintButtonClient tipo="devolucion" id={id} />` dentro de un `<div>` con `onClick={(e) => e.stopPropagation()}`
- No necesita estado propio; solo es un wrapper que absorbe el event handler

**Archivos afectados:**

- `app/components/devoluciones/PrintDevolucionCell.tsx` (nuevo)

---

### Paso 2: Actualizar `TablaDevoluciones` para usar `PrintDevolucionCell`

Reemplazar el bloque problemático `<div onClick={(e) => e.preventDefault()}>` por `<PrintDevolucionCell id={d.id} />`.

**Acciones:**

- En la vista mobile (sm:hidden), reemplazar:
  ```tsx
  {showPrint && (
    <div className="mt-2" onClick={(e) => e.preventDefault()}>
      <PrintButtonClient tipo="devolucion" id={d.id} />
    </div>
  )}
  ```
  por:
  ```tsx
  {showPrint && (
    <div className="mt-2">
      <PrintDevolucionCell id={d.id} />
    </div>
  )}
  ```
- Agregar import de `PrintDevolucionCell` al inicio del archivo
- Eliminar el import de `PrintButtonClient` si ya no se usa directamente en este archivo
- En la vista desktop (hidden sm:block) verificar si también hay `PrintButtonClient` con handlers — si es así, también reemplazar

**Archivos afectados:**

- `app/components/devoluciones/TablaDevoluciones.tsx`

---

### Paso 3: Crear migración SQL para `revertir_saldo_favor_de_venta`

Crear una función SQL que, dado un `venta_id` y `tienda_id`, calcule la suma de devoluciones `saldo_a_favor` completadas de esa venta y la reste del `saldo_favor` del cliente (sin bajar de 0).

**Acciones:**

- Crear `supabase/migrations/20260603000001_revertir_saldo_favor.sql`
- La función debe:
  1. Calcular `SUM(total_devuelto)` de `devoluciones` donde `venta_id = p_venta_id`, `tienda_id = p_tienda_id`, `tipo_resolucion = 'saldo_a_favor'`, `estado = 'completada'`
  2. Si el total es 0, no hacer nada (retornar)
  3. Hacer `UPDATE clientes SET saldo_favor = GREATEST(0, saldo_favor - v_total) WHERE id = v_cliente_id AND tienda_id = p_tienda_id`
  4. Obtener el `cliente_id` de la venta primero
- Usar `SECURITY DEFINER` para que la RPC tenga permisos aunque el usuario sea row-level-security restringido
- Aplicar la migración con `npx supabase db push` o ejecutar directamente en Supabase SQL editor

**Archivos afectados:**

- `supabase/migrations/20260603000001_revertir_saldo_favor.sql` (nuevo)

---

### Paso 4: Actualizar `anularVenta` en `ventas.ts`

Agregar en `anularVenta`:
1. Llamado a la RPC `revertir_saldo_favor_de_venta` después del update de estado
2. `revalidatePath('/dashboard')` al final junto con los otros revalidatePaths

**Acciones:**

- En `app/app/actions/ventas.ts`, función `anularVenta`, después de la línea del `update` de estado que comprueba `errUpd`:
  ```ts
  // Revertir saldo a favor si hubo devoluciones con tipo_resolucion='saldo_a_favor'
  await supabase.rpc('revertir_saldo_favor_de_venta', {
    p_venta_id: ventaId,
    p_tienda_id: tiendaId,
  })
  // No bloqueamos el flujo si falla — la venta ya está anulada
  ```
- Agregar `revalidatePath('/dashboard')` en el bloque de revalidaciones finales
- Agregar también `revalidatePath('/clientes')` si no está ya (verificar)

**Archivos afectados:**

- `app/app/actions/ventas.ts`

---

### Paso 5: Aplicar la migración SQL en Supabase

Ejecutar el SQL de la nueva función en el proyecto Supabase.

**Acciones:**

- Abrir Supabase SQL Editor (dashboard.supabase.com → proyecto → SQL Editor)
- Pegar y ejecutar el contenido de `supabase/migrations/20260603000001_revertir_saldo_favor.sql`
- Verificar que no hay errores de ejecución
- Alternativamente: `cd supabase && npx supabase db push --db-url <URL>`

---

### Paso 6: Verificación

**Acciones:**

- Abrir `/ventas/646920fb-1bbe-42a3-8b54-f46fc787f78a` en local → ya no debe crashear
- La sección de devoluciones con botón imprimir debe mostrarse correctamente
- Verificar que el dashboard no muestra a Corina Fritz en "Top Clientes" (ya está inactiva, la query filtra por `activo=true`)
- Verificar en la DB que el `saldo_favor` de Corina Fritz refleja el estado correcto después de anular

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/ventas/[id]/page.tsx` — usa `TablaDevoluciones` con `showPrint`
- `app/app/(dashboard)/devoluciones/page.tsx` — usa `TablaDevoluciones` en contexto global (sin showPrint usualmente)
- `app/app/actions/ventas.ts` → `anularVenta` — la acción central
- `app/lib/dashboard/queries.ts` → ya filtra activo=true, no necesita cambio

### Actualizaciones Necesarias para Consistencia

- Si en el futuro se agrega un botón de "desactivar cliente" que también debería limpiar saldo, hay que considerar un caso similar
- La migración SQL debe aplicarse en producción antes de deployar el código que la llama
