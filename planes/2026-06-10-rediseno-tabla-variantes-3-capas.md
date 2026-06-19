# Plan: Rediseño tabla de variantes — 3 capas (entendimiento, UX/UI, velocidad)

**Creado:** 2026-06-10
**Estado:** Implementado
**Pedido:** rediseño en 3 capas para las filas de variantes — mejorar entendimiento, UX/UI y velocidad de carga (con stock inicial protagonista en alta de prendas)

---

## Descripción General

### Qué Logra Este Plan

Rediseña `VariantesEditor` y componentes satélite en **tres capas**: (1) barra de estado que muestra qué falta completar, (2) filas más legibles en notebook con modos **Carga** vs **Mantenimiento**, y (3) flujos batch para completar códigos/stock en segundos. **No oculta el stock inicial en el alta** — lo refuerza como columna central; el menú ⋮ solo agrupa acciones secundarias de post-carga (etiquetas, ir al módulo Stock en edición).

### Por Qué Importa

La tabla actual concentra demasiada UI por fila (input código + 🔍 + botón “Generar EAN-13” + links apilados Etiquetas/Stock/Quitar), obliga scroll horizontal en notebook y mezcla **carga de catálogo** con **operación diaria**. En ropa, declarar stock por talle/color al ingresar mercadería es tan importante como el código de barras. Un rediseño acotado puede reducir una carga de 12 variantes de ~3–5 min a ~1 min sin tocar el schema de DB.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/components/productos/VariantesEditor.tsx` | Tabla principal: talla, color, código, precio, stock, stock mín, pack/kit, acciones |
| `app/components/productos/BulkFill.tsx` | Precio/stock masivo + generar N códigos (loop secuencial a server) |
| `app/components/productos/MatrizGenerador.tsx` | Matriz talla×color — **solo si `usarHexVar2`** (ropa) |
| `app/components/productos/BarcodeButton.tsx` | Botón “Generar EAN-13” por fila |
| `app/components/productos/BotonImprimirEtiquetas.tsx` | Etiquetas — solo variantes con `id` (edición) |
| `app/components/productos/ProductoForm.tsx` | Monta `VariantesEditor`; valida código obligatorio al guardar |
| `app/app/actions/productos.ts` | `generarCodigoBarrasUnico()` — 1 código por request |
| `planes/2026-05-16-agilidad-carga-productos-todos-rubros.md` | Matriz, BulkFill, modo simple — **implementado parcialmente** |
| `planes/2026-05-28-velocidad-ux-crear-producto.md` | Toggle variantes, guardar y crear otro — **implementado parcialmente** |

### Brechas o Problemas que se Abordan

#### UX / entendimiento

1. **Sin feedback global:** no hay resumen “12 variantes, 2 sin código, 10 sin stock”.
2. **Dos “stocks” confusos:** columna **Stock inicial** (input) vs link **Stock** en acciones (navega a `/stock/{id}` en edición).
3. **Acciones apiladas:** Etiquetas + Stock + Quitar en columna estrecha; mezcla alta y operación.
4. **Precio “auto”** poco claro en celda (hint solo al pie de tabla).

#### UI / layout

5. **Columna código sobrecargada:** input + 🔍 + `BarcodeButton` full-width por fila.
6. **Tabla ancha:** scroll horizontal en notebook; stock mín siempre visible (casi siempre 0).
7. **Indigo legacy** en BulkFill, Matriz, InlineCreate — inconsistente con POS lime/black.

#### Velocidad

8. **Generar códigos:** N requests secuenciales (`generarCodigoBarrasUnico` en loop).
9. **Matriz solo ropa:** ferretería con var1×var2 no tiene generador matricial.
10. **Enter solo en código:** no hay Tab order talla → color → código → stock → precio.
11. **Sin “Completar variantes”:** no hay un clic que aplique códigos + stock default post-matriz.

---

## Cambios Propuestos

### Resumen de Cambios

**Capa 1 — Entendimiento**
- Barra `VariantesResumenBar`: contadores + barra de progreso + chips clicables (“2 sin código” → scroll/foco).
- Badge por fila: `M · Negro` además de selects.
- Hint inline de precio cuando usa precio del producto.

**Capa 2 — UX/UI**
- Modos **`carga`** (crear / alta mercadería) vs **`mantenimiento`** (editar producto guardado).
- En **carga:** columnas visibles = Variante · Código · **Stock** · Precio (opc.) · Quitar. Stock mín colapsable.
- En **mantenimiento:** stock actual read-only + link claro “Ajustar stock →”; menú ⋮ con Etiquetas (+ pack si aplica).
- Código: icono ⚡ generar (tooltip) + bulk arriba; quitar 🔍 redundante.
- Toggle “Vista compacta” / cards en `< lg`.
- Lime/black en componentes de variantes.

**Capa 3 — Velocidad**
- Server action `generarCodigosBarrasBatch(cantidad)` — 1 round-trip.
- Botón **“Completar variantes”** (códigos faltantes + stock default desde BulkFill + precio producto).
- Matriz para **cualquier rubro** con `usarVar1 && usarVar2`, no solo `usarHexVar2`.
- Tab order y Enter en stock para saltar fila.
- Opcional al guardar: “Auto-generar códigos faltantes” (checkbox en ProductoForm, default off).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/productos/variantes-estado.ts` | Funciones puras: contadores, % completo, primera fila incompleta, labels variante |
| `app/lib/productos/variantes-estado.test.ts` | Tests de regresión para resumen |
| `app/components/productos/VariantesResumenBar.tsx` | Barra progreso + chips + botón “Siguiente incompleta” |
| `app/components/productos/VariantesAccionesMenu.tsx` | Menú ⋮ (Etiquetas, Ajustar stock) — solo mantenimiento |
| `app/components/productos/VarianteFila.tsx` | Fila unificada tabla/card (props modo carga/mantenimiento) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/productos/VariantesEditor.tsx` | Orquestador: modos, resumen, delegar filas, matriz condicional ampliada |
| `app/components/productos/BulkFill.tsx` | Batch códigos, botón “Completar variantes”, lime theme, exponer stock default |
| `app/components/productos/MatrizGenerador.tsx` | Lime theme; usable sin `usarHexVar2` |
| `app/components/productos/BarcodeButton.tsx` | Variante icon-only `BarcodeIconButton` o prop `compact` |
| `app/components/productos/ProductoForm.tsx` | Pasar `modoEdicion`; checkbox auto-generar códigos (opcional P2) |
| `app/app/actions/productos.ts` | `generarCodigosBarrasBatch(n: number)` |

### Archivos a Eliminar (si aplica)

Ninguno. Refactor incremental dentro de componentes existentes.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Stock inicial NUNCA va al menú ⋮ en modo carga:** al cargar prendas, stock por variante es dato primario. La columna **Stock** permanece visible, ancha y en el flujo Tab/Enter. *Feedback usuario 2026-06-10.*

2. **Menú ⋮ solo para acciones secundarias en mantenimiento:**
   - Etiquetas (requiere `variante.id`)
   - “Ajustar stock” → `/stock/{id}` (reemplaza link suelto apilado)
   - **Quitar** queda **fuera del menú** (destructivo, siempre visible)

3. **Dos modos explícitos (no confundir con “ocultar stock”):**

   | Modo | Cuándo | Stock en fila | Acciones |
   |------|--------|---------------|----------|
   | **Carga** | `modoEdicion === false` | Input **Stock inicial** editable | Solo Quitar |
   | **Mantenimiento** | `modoEdicion === true` | Read-only + badge cantidad | ⋮ Etiquetas, Ajustar stock · Quitar |

4. **Capas implementadas en fases P0→P2** (mismo plan, entregas incrementales):
   - **P0:** Capa 1 + barcode compacto + modos carga/mantenimiento + stock protagonista
   - **P1:** Capa 2 visual (lime, stock mín colapsable, cards mobile)
   - **P2:** Capa 3 velocidad (batch, completar, matriz multi-rubro, teclado)

5. **Batch de códigos en server:** una action que genera `n` EAN-13 únicos en un loop server-side (máx. ej. 50 por call) evita N round-trips desde `BulkFill`.

6. **“Completar variantes”** ejecuta en orden: (a) batch códigos para filas sin código, (b) aplicar stock default si BulkFill tiene valor, (c) opcional precio producto del padre. No guarda — solo prepara filas antes de submit.

7. **Matriz multi-rubro:** mostrar `MatrizGenerador` cuando `usarVar1 && tallas.length > 0 && (usarVar2 ? colores.length > 0 : true)`, no solo `usarHexVar2`.

8. **Auto-generar al guardar (P2, opt-in):** checkbox desmarcado por default; si faltan códigos, ProductoForm los genera antes de `crearProducto` en lugar de error bloqueante.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Menú ⋮ incluye stock | Contradice flujo real de carga de mercadería |
| Eliminar columna stock en carga | Mismo motivo |
| Cards-only (sin tabla) | Pierde escaneo secuencial; tabla compacta + cards mobile es híbrido |
| Quitar validación código obligatorio | Rompe POS/escaneo; mejor auto-generar opt-in |
| Refactor a grid CSS sin componente fila | Más riesgo; `VarianteFila` encapsula tabla/card |

### Preguntas Abiertas (si las hay)

1. **Stock default en “Completar variantes”:** ¿usar último valor del input BulkFill, o prompt modal “¿Cuántas unidades por variante?” (Recomendación: valor BulkFill si existe; si no, no tocar stock).

2. **Auto-generar códigos al guardar:** ¿default ON u OFF? (Recomendación: **OFF**, con tooltip explicando POS).

3. **Vista cards en notebook:** ¿solo `< md` o `< lg`? (Recomendación: `< lg` igual que POS).

4. **Límite batch:** ¿50 códigos por request suficiente? (Recomendación: sí; matriz típica ropa < 30 combos).

---

## Tareas Paso a Paso

### Paso 1: Helper `variantes-estado.ts` + tests

Crear funciones puras:

```typescript
export interface ResumenVariantes {
  total: number
  conCodigo: number
  conStock: number
  completas: number // código + (stock > 0 OR modoEdicion)
  sinCodigo: number
  sinStock: number
  porcentajeListo: number
  primeraIncompletaIdx: number | null
}

export function calcularResumenVariantes(
  variantes: VarianteInput[],
  opts: { modoEdicion: boolean; requiereStockPositivo?: boolean }
): ResumenVariantes

export function labelVariante(
  v: VarianteInput,
  tallas: Talla[],
  colores: Color[],
  labels: { var1: string; var2: string; usarVar2: boolean }
): string
```

Tests: 12 variantes, 2 sin código → `sinCodigo=2`, `primeraIncompletaIdx` correcto.

**Archivos afectados:**
- `app/lib/productos/variantes-estado.ts` (nuevo)
- `app/lib/productos/variantes-estado.test.ts` (nuevo)

---

### Paso 2: `VariantesResumenBar.tsx` (Capa 1)

Props: `resumen`, `onIrIncompleta`, `modoEdicion`.

UI:

```
12 variantes · 10 con código · 8 con stock · 2 pendientes
[████████░░] 83%
[ 2 sin código ] [ 4 sin stock ]     [ Ir a la siguiente → ]
```

- Chips filtran/scroll — mínimo: click → `onIrIncompleta(idx)`.
- Colores: pendientes ámbar, OK lime.

Integrar en `VariantesEditor` **debajo del header, arriba de BulkFill**.

**Archivos afectados:**
- `app/components/productos/VariantesResumenBar.tsx` (nuevo)
- `app/components/productos/VariantesEditor.tsx`

---

### Paso 3: `generarCodigosBarrasBatch` (Capa 3 base)

En `productos.ts`:

```typescript
export async function generarCodigosBarrasBatch(
  cantidad: number
): Promise<ActionResult<{ codigos: string[] }>> {
  if (cantidad < 1 || cantidad > 50) return { ok: false, error: '...' }
  // loop generateEAN13 + uniqueness check, acumular cantidad códigos
}
```

Actualizar `BulkFill.generarCodigos()` para una sola llamada.

**Archivos afectados:**
- `app/app/actions/productos.ts`
- `app/components/productos/BulkFill.tsx`

---

### Paso 4: Modos Carga vs Mantenimiento + `VarianteFila` (Capa 2)

Extraer fila a `VarianteFila.tsx`:

**Modo carga (`!modoEdicion`):**
- Columnas: badge variante · selects talla/color · código compacto · **stock input ancho** · precio · quitar
- Sin Etiquetas, sin link Stock
- `stock_minimo` oculto (default 0); toggle “Más columnas” revela stock mín + pack

**Modo mantenimiento (`modoEdicion`):**
- Stock: read-only `stock_inicial` o prop `stockActual` si se pasa del server
- Texto: “Ajustá en Stock →” visible (no escondido en ⋮)
- `VariantesAccionesMenu`: Etiquetas
- Quitar / Restaurar visible

**Código compacto:**

```tsx
<div className="flex items-center gap-1 min-w-0">
  <Input className="flex-1 min-w-[120px]" ... />
  <BarcodeButton compact onGenerated={...} /> {/* icon ⚡ */}
</div>
```

Eliminar botón 🔍 (el input recibe foco al click; BulkFill ya tiene flujo escaneo).

**Archivos afectados:**
- `app/components/productos/VarianteFila.tsx` (nuevo)
- `app/components/productos/VariantesAccionesMenu.tsx` (nuevo)
- `app/components/productos/BarcodeButton.tsx`
- `app/components/productos/VariantesEditor.tsx`

---

### Paso 5: Botón “Completar variantes” en BulkFill (Capa 3)

Debajo de “Aplicar a todas”, botón primario lime:

**Completar variantes** — para filas activas sin código:
1. `generarCodigosBarrasBatch(sinCodigo.length)`
2. Si input stock BulkFill tiene valor → aplicar a todas
3. Toast: “12 códigos generados, stock 5 aplicado”

**Archivos afectados:**
- `app/components/productos/BulkFill.tsx`
- `app/components/productos/VariantesEditor.tsx` (pasar `precioProducto?` si se quiere completar precio)

---

### Paso 6: Matriz multi-rubro (Capa 3)

En `VariantesEditor.tsx`, cambiar:

```tsx
// ANTES
{usarHexVar2 && ( <MatrizGenerador ... /> )}

// DESPUÉS
{usarVar1 && tallasLocales.length > 0 && (
  <MatrizGenerador ... usarVar2={usarVar2} ... />
)}
```

Actualizar estilos Matriz indigo → lime (P1 visual).

**Archivos afectados:**
- `app/components/productos/VariantesEditor.tsx`
- `app/components/productos/MatrizGenerador.tsx`

---

### Paso 7: Teclado y escaneo secuencial (Capa 3)

En `VarianteFila`:
- `Tab` natural entre campos
- `Enter` en **código** → foco stock misma fila (nuevo)
- `Enter` en **stock** → foco código siguiente fila (extiende flujo actual)

Registrar refs en `VariantesEditor` como `codigoRefs` / `stockRefs`.

**Archivos afectados:**
- `app/components/productos/VarianteFila.tsx`
- `app/components/productos/VariantesEditor.tsx`

---

### Paso 8: Vista cards en `< lg` (Capa 2)

En `VariantesEditor`, si `window` o CSS `lg:hidden`:
- Renderizar lista de `VarianteFila` con `layout="card"` en lugar de `<table>`
- Misma props, distinto markup (stack vertical: Variante, Código, Stock, Precio)

**Archivos afectados:**
- `app/components/productos/VarianteFila.tsx`
- `app/components/productos/VariantesEditor.tsx`

---

### Paso 9: Auto-generar códigos al guardar — opcional P2

En `ProductoForm.tsx`:
- Checkbox “Generar códigos EAN-13 automáticamente si faltan” (localStorage `cvalle:auto-codigos`)
- En `handleSubmit`, si activo y faltan códigos → llamar batch antes de `crearProducto`

**Archivos afectados:**
- `app/components/productos/ProductoForm.tsx`
- `app/app/actions/productos.ts`

---

### Paso 10: Validación manual y build

**Checklist operativo (ropa, 4 tallas × 3 colores = 12 variantes, notebook 1366px):**

1. Matriz genera 12 filas → resumen “12 variantes, 12 sin código”
2. “Completar variantes” + stock 5 en bulk → 12 códigos + stock 5 en **una acción**
3. Barra progreso 100% → guardar producto OK
4. Modo carga: columna Stock visible, ancha, Enter avanza fila
5. Modo edición: stock read-only, link “Ajustar stock”, Etiquetas en ⋮
6. Ferretería: matriz medida×material visible
7. `< lg`: cards sin scroll horizontal brutal
8. `npx tsx --test lib/productos/variantes-estado.test.ts`
9. `npm run build`

**Archivos afectados:** ninguno (pruebas)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/components/productos/ProductoForm.tsx` | Monta editor; validación códigos |
| `app/app/actions/productos.ts` | `crearProducto`, movimientos stock inicial |
| `app/app/(dashboard)/productos/[id]/page.tsx` | Edición con `modoEdicion` |
| `app/app/(dashboard)/stock/[varianteId]/page.tsx` | Destino link “Ajustar stock” |
| `planes/2026-05-16-agilidad-carga-productos-todos-rubros.md` | Antecedente matriz/bulk |
| `planes/2026-05-28-velocidad-ux-crear-producto.md` | Antecedente toggle/guardar otro |

### Actualizaciones Necesarias para Consistencia

- Nota en `planes/2026-05-28-velocidad-ux-crear-producto.md` → tabla variantes cubierta por este plan
- No requiere migraciones SQL ni CLAUDE.md

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Alta ropa con matriz | **Más rápido** (completar + batch) |
| Alta con escaneo fila a fila | **Mejor** (Enter código→stock→siguiente) |
| Edición / etiquetas | **Más claro** (menú vs columna stock) |
| Ferretería multi-var | **Nuevo** acceso a matriz |
| POS / códigos obligatorios | Sin cambio de contrato; auto-gen opt-in |

---

## Lista de Validación

- [x] `calcularResumenVariantes` cuenta sin código / sin stock correctamente
- [x] Barra resumen visible con chips clicables
- [x] Modo carga: stock editable y prominente; sin link Stock en acciones
- [x] Modo mantenimiento: stock read-only + ajustar; Etiquetas en ⋮
- [x] Quitar siempre visible (no dentro de ⋮)
- [x] Código: botón compacto por fila; bulk batch 1 request
- [x] “Completar variantes” genera códigos + aplica stock bulk
- [x] Matriz visible en ferretería (var1×var2)
- [x] Enter en stock salta a siguiente fila
- [x] Cards en viewport `< lg`
- [x] Tests unitarios pasan
- [x] `npm run build` OK

---

## Criterios de Éxito

1. Un operador carga **12 variantes** (matriz + completar + stock) en **≤ 90 segundos** sin scroll horizontal excesivo en 1366px.
2. En modo **carga**, el stock por variante es **tan visible y editable** como el código de barras (nunca relegado a menú).
3. La barra de resumen permite saber **qué falta** antes de intentar guardar, sin leer 12 filas.

---

## Notas

- Este plan **no** reemplaza mejoras pendientes de `ProductoForm` (reorden campos, botón primario “Guardar y crear otro”) — son complementarias.
- Implementación recomendada: **P0 Pasos 1–4**, deploy/test, luego **P1 Pasos 5–8**, luego **P2 Paso 9**.
- Ejecutar con: `/implementar planes/2026-06-10-rediseno-tabla-variantes-3-capas.md`

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Rediseño completo de la tabla de variantes en 3 capas: barra de resumen con progreso y chips, filas unificadas (`VarianteFila`) con modos carga/mantenimiento, botón compacto de código, menú ⋮ para etiquetas en edición, batch de códigos vía `generarCodigosBarrasBatch`, botón “Completar variantes”, matriz multi-rubro, teclado Enter código→stock→siguiente, cards en `< lg`, tema lime, y checkbox opt-in de auto-generación al guardar.

### Desviaciones del Plan

- Link “Ajustar stock →” queda visible en la celda de stock (modo mantenimiento), no dentro del menú ⋮ — alineado con decisión de diseño #3 del plan.
- Toggle “Más columnas” reemplaza columna stock mín. siempre visible; por defecto oculta stock mín. y pack en ambos modos.

### Problemas Encontrados

Ninguno — tests y build OK.
