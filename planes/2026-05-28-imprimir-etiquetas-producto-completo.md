# Plan: Imprimir etiquetas de producto completo (todas las variantes × stock)

**Creado:** 2026-05-28  
**Estado:** Borrador  
**Pedido:** Atajo para imprimir todas las etiquetas de un producto de una vez, usando el stock actual de cada variante como cantidad (en vez de ir variante por variante).

---

## Descripción General

### Qué Logra Este Plan

Agrega un botón "Imprimir etiquetas del producto" en la tabla de variantes del formulario de edición de producto. Al pulsarlo, abre un mini-panel que lista cada variante con su stock actual como cantidad sugerida (editable), y genera el lote completo de etiquetas con un solo clic de "Imprimir".

### Por Qué Importa

Hoy el operador tiene que ir variante por variante para imprimir etiquetas (`BotonImprimirEtiquetas`), lo cual es tedioso cuando un producto tiene 3-10 variantes. Con este atajo el flujo se reduce a: abre producto → un clic → ajusta cantidades si quiere → imprime todo.

---

## Estado Actual

### Estructura Existente Relevante

| Archivo | Rol |
|---|---|
| `app/components/productos/BotonImprimirEtiquetas.tsx` | Botón por variante: popover, input cantidad, llama `obtenerPayloadEtiquetasVariante` |
| `app/app/actions/impresion.ts` | `obtenerPayloadEtiquetasVariante(varianteId, cantidad)` — una variante |
| `app/lib/impresion/payload-etiqueta.ts` | `buildPayloadEtiquetas(supabase, tiendaId, items[], plantilla, sym, nombreTienda)` — multi-item |
| `app/components/productos/VariantesEditor.tsx` | Tabla de variantes; ya integra `BotonImprimirEtiquetas` en la columna de acciones |
| `app/lib/impresion/usePrint.tsx` | Hook de impresión client-side |
| `app/components/impresion/HojaEtiquetas.tsx` | Renderer multi-etiqueta |

### Brechas o Problemas que se Abordan

- No existe acción server para obtener el payload de todas las variantes de un producto de una sola query.
- No existe componente UI que muestre las cantidades de todas las variantes y permita editarlas antes de imprimir.
- `BotonImprimirEtiquetas` recibe `v.stock_inicial` (valor de form, no necesariamente stock real); la nueva acción hace query del `stock_actual` real desde la DB.

---

## Cambios Propuestos

### Resumen de Cambios

- **Nueva server action** `obtenerPayloadEtiquetasProducto(productoId)` en `actions/impresion.ts`  
- **Nuevo componente** `BotonImprimirEtiquetasProducto` — botón + panel de revisión de cantidades  
- **Modificar** `VariantesEditor.tsx` — agregar el botón encima de la tabla de variantes

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/components/productos/BotonImprimirEtiquetasProducto.tsx` | Botón + modal de revisión de cantidades para imprimir todas las variantes del producto |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/app/actions/impresion.ts` | Agregar `obtenerPayloadEtiquetasProducto(productoId: string)` |
| `app/components/productos/VariantesEditor.tsx` | Agregar `productoId?: string` a las props; renderizar `BotonImprimirEtiquetasProducto` sobre la tabla |
| `app/app/(dashboard)/productos/[id]/page.tsx` | Pasar `productoId` a `VariantesEditor` si todavía no lo hace (verificar en implementación) |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Nueva action separada `obtenerPayloadEtiquetasProducto`**: En vez de reutilizar `obtenerPayloadEtiquetasVariante` en loop desde el cliente (N round-trips), la action hace UNA sola query a `variantes_producto` filtrando por `producto_id`, toma el `stock_actual` directamente y construye el payload multi-item. Esto es consistente con cómo funciona `buildPayloadEtiquetas` (diseñado para múltiples items).

2. **El botón muestra un panel editable antes de imprimir**: El usuario puede ver y ajustar las cantidades por variante (default = stock_actual, mínimo 1 para las que tienen stock > 0, excluye variantes eliminadas/sin stock si stock_actual = 0). Esto evita imprimir de más por error. Las variantes con stock = 0 se muestran con cantidad 0 y pueden habilitarse manualmente.

3. **Variantes activas solamente**: La query filtra `eliminado = false` (o columna equivalente) para no incluir variantes archivadas.

4. **Máximo 500 etiquetas totales** (suma de cantidades): Mismo límite que la action individual. Si se supera, mostrar error.

5. **Ubicación del botón**: En el header de la sección de variantes del `VariantesEditor`, no en una fila nueva. Solo visible cuando el producto ya existe (tiene `productoId`).

6. **`productoId` vs. pasar las variantes**: La action recibe solo el `productoId` y hace sus propias queries. Así la acción siempre refleja el estado real de la DB (no el estado del form no guardado), que es lo correcto para imprimir etiquetas del inventario.

### Alternativas Consideradas

- **Botón en la página de listado de productos**: Tendría que navegar fuera del contexto de edición. El formulario de edición ya es el lugar natural donde el operador revisa variantes y stock.
- **Sin panel de revisión (un clic directo)**: Demasiado arriesgado imprimir cantidades incorrectas sin confirmación, especialmente con stocks grandes.

---

## Tareas Paso a Paso

### T1 — Server action `obtenerPayloadEtiquetasProducto`

Agregar la función en `app/app/actions/impresion.ts`, después de `obtenerPayloadEtiquetasVariante`.

**Acciones:**

```typescript
export async function obtenerPayloadEtiquetasProducto(
  productoId: string
): Promise<ActionResult<{ payload: PayloadEtiquetaProducto; variantes: Array<{ id: string; nombre: string; stock: number }> }>>
```

Lógica interna:
1. `requireTiendaId()` — auth guard
2. Query plantilla predeterminada (igual que `obtenerPayloadEtiquetasVariante`)
3. Query a `variantes_producto` con JOIN a `tallas`, `colores`, `productos`:
   ```sql
   SELECT id, codigo_barras, precio_venta, stock_actual,
          producto:productos!inner(id, nombre, precio_venta),
          talla:tallas(nombre), color:colores(nombre)
   FROM variantes_producto
   WHERE tienda_id = $tiendaId
     AND producto_id = $productoId
     AND eliminado = false   -- o el campo de soft-delete equivalente
   ORDER BY created_at
   ```
4. Para cada variante, construir el `PayloadEtiquetaItem` con `cantidad = Math.max(0, stock_actual)`.
5. Query `configuracion_tienda` para `simbolo_moneda` y `tiendas` para `nombre` (igual que la action individual).
6. Retornar tanto el `payload` (para imprimir) como el array `variantes` (para mostrar en el panel de revisión con nombre legible como `"M · Negro"` o solo el nombre del producto si no tiene talla/color).

**Nombre de variante para el panel:** `[talla][" · " + color]` si tiene alguno; si no, `nombre_producto`.

**Validación:** Si no hay plantilla, retornar error igual que la action individual.

**Archivos afectados:**
- `app/app/actions/impresion.ts`

---

### T2 — Componente `BotonImprimirEtiquetasProducto`

Crear `app/components/productos/BotonImprimirEtiquetasProducto.tsx`.

**Props:**
```typescript
interface Props {
  productoId: string
}
```

**Estado interno:**
- `abierto: boolean` — visibilidad del panel
- `cargando: boolean` — mientras se fetch el payload
- `error: string | null`
- `variantes: Array<{ id: string; nombre: string; stock: number; cantidad: number; activa: boolean }>`
  - `cantidad` inicia en `Math.max(1, stock)` si `stock > 0`, en `0` si `stock = 0`
  - `activa` inicia en `stock > 0` (solo se imprime si está activa)
- El payload base se guarda en un `ref` al cargarlo para no volver a fetchearlo si el usuario solo cambia cantidades

**Flujo de UI:**

1. Botón trigger: `"🏷️ Imprimir etiquetas del producto"` — solo texto, mismo estilo que el `BotonImprimirEtiquetas` individual pero más prominente (puede ser un `Button` con `variant="secondary" size="sm"`).

2. Al abrir: llama `obtenerPayloadEtiquetasProducto(productoId)` → muestra spinner → carga variantes.

3. Panel (overlay + popover o modal small, similar al existente):
   - Título: "Etiquetas del producto"
   - Tabla compacta de variantes:
     ```
     [✓] M · Negro   stock: 5   [input: 5]
     [✓] M · Blanco  stock: 3   [input: 3]
     [ ] L · Negro   stock: 0   [input: 0]  ← deshabilitada
     ```
   - Checkbox para habilitar/deshabilitar cada variante.
   - Input numérico de cantidad (min: 1, max: 200) por variante.
   - Variantes con stock = 0 aparecen con checkbox desmarcado (se pueden marcar manualmente).
   - Footer: `Total: N etiquetas` + botones `Cancelar` / `Imprimir`.

4. Al imprimir:
   - Calcular total: `variantes.filter(v => v.activa).reduce((acc, v) => acc + v.cantidad, 0)`
   - Si total = 0: error "Seleccioná al menos una variante"
   - Si total > 500: error "El total supera 500 etiquetas"
   - Reconstruir el payload usando el snapshot base + las cantidades editadas:
     ```typescript
     const itemsAjustados = payloadBase.items
       .filter((item) => variantes.find(v => v.id === item.variante_id)?.activa)
       .map((item) => ({
         ...item,
         cantidad: variantes.find(v => v.id === item.variante_id)!.cantidad,
       }))
     const payloadFinal = { ...payloadBase, items: itemsAjustados }
     ```
   - Llamar `imprimir(<HojaEtiquetas payload={payloadFinal} />)`

**Imports:**
```typescript
'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { obtenerPayloadEtiquetasProducto } from '@/app/actions/impresion'
import { usePrint } from '@/lib/impresion/usePrint'
import { HojaEtiquetas } from '@/components/impresion/HojaEtiquetas'
import type { PayloadEtiquetaProducto } from '@/lib/impresion/types'
```

**Archivos afectados:**
- `app/components/productos/BotonImprimirEtiquetasProducto.tsx` (nuevo)

---

### T3 — Integrar en `VariantesEditor`

**Acciones:**
1. Agregar prop opcional `productoId?: string` a la interfaz de props de `VariantesEditor`.
2. Agregar import del nuevo componente.
3. Justo antes del `<table>` (o encima del bloque de variantes), renderizar condicionalmente:
   ```tsx
   {productoId && (
     <div className="flex justify-end mb-2">
       <BotonImprimirEtiquetasProducto productoId={productoId} />
     </div>
   )}
   ```
4. Verificar que la página de edición de producto `app/app/(dashboard)/productos/[id]/page.tsx` ya pase `productoId` al `VariantesEditor` (si no, agregar el prop). El `id` del producto está disponible en los params de la página.

**Archivos afectados:**
- `app/components/productos/VariantesEditor.tsx`
- `app/app/(dashboard)/productos/[id]/page.tsx` (solo si falta pasar `productoId`)

---

### T4 — QA TypeScript

Verificar:
```
cd app
npx tsc --noEmit
```

Archivos a chequear específicamente:
- `app/app/actions/impresion.ts`
- `app/components/productos/BotonImprimirEtiquetasProducto.tsx`
- `app/components/productos/VariantesEditor.tsx`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/productos/VariantesEditor.tsx` — punto de integración principal
- `app/lib/impresion/types.ts` — `PayloadEtiquetaProducto`, `PayloadEtiquetaItem` (sin cambios)
- `app/components/impresion/HojaEtiquetas.tsx` — renderer final (sin cambios)

### Actualizaciones Necesarias para Consistencia

- Ninguna en `CLAUDE.md` por ser una adición de feature interna.

### Impacto en Flujos de Trabajo Existentes

- `BotonImprimirEtiquetas` (por variante) sigue intacto y disponible como siempre.
- No hay cambios en rutas, DB, ni migraciones.

---

## Lista de Validación

- [ ] `obtenerPayloadEtiquetasProducto` retorna las variantes activas con `stock_actual`
- [ ] El panel muestra todas las variantes con su stock como cantidad default
- [ ] Variantes con stock 0 aparecen deshabilitadas pero pueden activarse
- [ ] El total se actualiza en tiempo real al editar cantidades
- [ ] Total > 500 muestra error y bloquea el botón Imprimir
- [ ] Total = 0 muestra error
- [ ] Al imprimir, cada variante activa genera su lote de etiquetas
- [ ] El botón no aparece en modo "crear producto" (solo cuando `productoId` está disponible)
- [ ] `npx tsc --noEmit` sin errores

---

## Criterios de Éxito

El operador puede abrir un producto, presionar "Imprimir etiquetas del producto", ver el listado de variantes con stock sugerido, ajustar si lo desea, y generar todas las etiquetas en un solo lote sin navegar variante por variante.
