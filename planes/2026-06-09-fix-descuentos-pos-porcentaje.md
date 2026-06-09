# Plan: Fix descuentos POS — presets incorrectos y porcentaje personalizado

**Creado:** 2026-06-09
**Estado:** Implementado
**Pedido:** fix descuentos subtotal no funciona, aparece un numero random. Tampoco hay un input para poner un porcentaje personalizado

---

## Descripción General

### Qué Logra Este Plan

Corrige el cálculo de descuentos por porcentaje en el POS (presets 5/10/15% y futuros %) y agrega un campo para **porcentaje personalizado**. Extrae la lógica a un helper reutilizable y testeable para evitar regresiones.

### Por Qué Importa

Los presets de descuento se implementaron en P1 del plan POS notebook (`2026-06-08-pos-notebook-cobro-velocidad-ux.md`) con un **error de doble división por 100**: un 10% sobre $10.000 produce $10 en lugar de $1.000. Eso se percibe como un “número random” y rompe la confianza del cajero en el cobro. Además, sin input de % personalizado, cualquier descuento que no sea 5/10/15 obliga a calcular manualmente el monto fijo.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/components/pos/PanelPago.tsx` | Toolbar “Descuento”: presets 5/10/15%, input “Monto fijo”, badge y línea en resumen |
| `app/components/pos/POSContainer.tsx` | Estado `descuento`, cálculo `totalBruto`, envío `descuento_global` a `registrarVenta` |
| `app/app/actions/ventas.ts` | Valida `descuento_global >= 0`, calcula `total = subtotal - descuentoGlobal` |
| `planes/2026-06-08-pos-notebook-cobro-velocidad-ux.md` | Paso 6 define fórmula correcta pero la implementación la aplicó mal |

### Brechas o Problemas que se Abordan

#### 1. Bug raíz — doble división por 100

**Código actual** (`PanelPago.tsx` líneas 47–49 y 199):

```typescript
function presetDescuento(porcentaje: number, subtotal: number): number {
  return Math.round(subtotal * porcentaje) / 100
}

// Botón 5%:
onClick={() => onDescuentoChange(presetDescuento(pct / 100, subtotal))}
//                                    ^^^^^^^^^^^^  pct=5 → 0.05
```

**Fórmula efectiva al clickear 5%:**

```
Math.round(subtotal × 0.05) / 100
```

**Ejemplo** subtotal = $10.000, preset 10%:

| Esperado | Actual (bug) |
|----------|--------------|
| $1.000 | `Math.round(10000 × 0.10) / 100` = **$10** |

| Preset | Subtotal $10.000 | Esperado | Actual (bug) |
|--------|------------------|----------|--------------|
| 5% | $500 | $5 |
| 10% | $1.000 | $10 |
| 15% | $1.500 | $15 |

El patrón “número diminuto respecto al subtotal” explica el reporte de “número random”.

**Fórmula correcta** (como estaba en el plan original, paso 6):

```typescript
Math.round(subtotal * porcentajeEntero) / 100   // porcentajeEntero = 5, 10, 15
```

#### 2. Sin porcentaje personalizado

Solo existe input de **monto fijo** (`descuento_global` en pesos). No hay campo para ingresar, por ejemplo, 7% o 12,5% sobre el subtotal.

#### 3. Descuento puede superar el subtotal (secundario)

Si el cajero aplica 10% y luego quita ítems del carrito, `descuento` no se recalcula ni se limita. El total en UI queda en $0 (`Math.max(0, …)`) pero el monto de descuento mostrado puede ser incoherente. Conviene cap en UI al cambiar subtotal.

#### 4. Server no valida techo

`registrarVenta` acepta `descuento_global > subtotal` (total queda 0). No es bloqueante para este fix, pero el cap en cliente evita confusión.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear helper `app/lib/pos/descuento.ts` con funciones puras y tests unitarios
- Corregir llamada a presets: pasar `5 | 10 | 15` entero, no `pct / 100`
- Agregar input **“Porcentaje (%)”** con botón Aplicar (o Enter) para cualquier valor 0–100
- Mostrar preview del monto calculado al escribir el %
- Limitar `descuento` a `<= subtotal` cuando cambia el carrito
- Opcional en resumen: mostrar % efectivo cuando el descuento proviene de un preset o % custom

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/pos/descuento.ts` | Cálculo de descuento por %, cap al subtotal, redondeo ARS |
| `app/lib/pos/descuento.test.ts` | Tests de regresión para presets y % custom |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/pos/PanelPago.tsx` | Usar helper; fix presets; UI % personalizado; preview |
| `app/components/pos/POSContainer.tsx` | Cap `descuento` cuando `subtotal` baja (useEffect) |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Helper puro en `lib/pos/descuento.ts`**: centraliza la fórmula y evita repetir el bug. Misma convención que `pago-rapido.ts` y `hotkeys.ts`.

2. **Porcentaje como entero o decimal en input**: el input acepta `7`, `7.5`, `12.5` (step `0.1`, max `100`). Se parsea con `Number` y se valida finito.

3. **Dos modos de descuento en UI, un solo estado (`descuento` en pesos)**:
   - Presets / % custom → calculan monto y llaman `onDescuentoChange(monto)`
   - Monto fijo → escribe directo en `descuento`
   - No se persiste “modo” en state; el input de % puede quedar vacío tras aplicar (o mostrar % efectivo derivado: `descuento/subtotal*100`)

4. **Cap al subtotal en `POSContainer`**: `useEffect` que hace `setDescuento(d => Math.min(d, subtotal))` cuando `subtotal` cambia. Simple y no requiere cambios server.

5. **Redondeo**: `Math.round(subtotal * pct * 100) / 10000` equivalente a `Math.round(subtotal * pct) / 100` para pct entero; para decimales usar `Math.round(subtotal * pct * 100) / 10000` donde `pct` es 7.5 → factor 0.075.

   Función unificada:

   ```typescript
   export function descuentoDesdePorcentaje(subtotal: number, porcentaje: number): number {
     if (subtotal <= 0 || porcentaje <= 0) return 0
     return Math.min(subtotal, Math.round(subtotal * porcentaje) / 100)
   }
   ```

   `porcentaje` = 10 para 10%, 7.5 para 7,5%.

6. **Tests obligatorios**: caso $10.000 @ 10% → $1.000; @ 5% → $500; subtotal 0 → 0; cap al subtotal.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Guardar `descuentoPorcentaje` en state y recalcular en cada cambio de carrito | Más state; útil si se quiere “mantener 10%” al agregar ítems — scope mayor, no pedido |
| Presets configurables por tienda en DB | Over-engineering para v1; plan POS ya fijó 5/10/15 |
| Validación server `descuento <= subtotal` | Correcto a largo plazo pero cambia contrato; cap en cliente alcanza para UX |

### Preguntas Abiertas (si las hay)

1. **¿Recalcular % al cambiar el carrito?** (ej. mantener 10% fijo mientras se agregan ítems). Recomendación: **no en v1** — solo cap; el cajero reaplica si hace falta.

2. **¿Límite máximo de descuento?** (ej. 50% por política de tienda). Recomendación: **no en v1** — solo 0–100% en input.

---

## Tareas Paso a Paso

### Paso 1: Helper `descuento.ts` + tests

Crear `app/lib/pos/descuento.ts`:

```typescript
/** Monto de descuento en ARS a partir de subtotal y porcentaje (10 = 10%). */
export function descuentoDesdePorcentaje(subtotal: number, porcentaje: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0
  if (!Number.isFinite(porcentaje) || porcentaje <= 0) return 0
  const pct = Math.min(100, porcentaje)
  const monto = Math.round(subtotal * pct) / 100
  return Math.min(subtotal, Math.max(0, monto))
}

/** Limita descuento al subtotal actual. */
export function limitarDescuentoASubtotal(subtotal: number, descuento: number): number {
  if (!Number.isFinite(descuento) || descuento <= 0) return 0
  return Math.min(subtotal, descuento)
}

/** Porcentaje efectivo (para mostrar en UI), 0 si subtotal es 0. */
export function porcentajeEfectivo(subtotal: number, descuento: number): number | null {
  if (subtotal <= 0 || descuento <= 0) return null
  return Math.round((descuento / subtotal) * 1000) / 10 // 1 decimal
}
```

Crear `app/lib/pos/descuento.test.ts` con casos:

- `10000, 10` → `1000`
- `10000, 5` → `500`
- `10000, 15` → `1500`
- `1234.56, 10` → redondeo esperado
- `1000, 7.5` → `75`
- `500, 200` → cap `500` (100%)
- `0, 10` → `0`

**Archivos afectados:**
- `app/lib/pos/descuento.ts` (nuevo)
- `app/lib/pos/descuento.test.ts` (nuevo)

---

### Paso 2: Corregir presets en `PanelPago.tsx`

- Eliminar `presetDescuento` local
- Importar `descuentoDesdePorcentaje`
- Cambiar botones:

```typescript
// ANTES (bug):
onClick={() => onDescuentoChange(presetDescuento(pct / 100, subtotal))}

// DESPUÉS:
onClick={() => onDescuentoChange(descuentoDesdePorcentaje(subtotal, pct))}
```

**Archivos afectados:**
- `app/components/pos/PanelPago.tsx`

---

### Paso 3: Input de porcentaje personalizado

En la sección `seccionAbierta === 'descuento'`, debajo de presets y encima de “Monto fijo”:

```tsx
const [pctCustom, setPctCustom] = useState('')

function aplicarPorcentajeCustom() {
  const pct = Number(pctCustom.replace(',', '.'))
  if (!Number.isFinite(pct) || pct <= 0) return
  onDescuentoChange(descuentoDesdePorcentaje(subtotal, pct))
}

// UI:
<div className="flex items-center gap-2">
  <label htmlFor="descuento_pct" className="text-[13px] text-gray-600 shrink-0">
    Porcentaje
  </label>
  <input
    id="descuento_pct"
    type="number"
    min={0}
    max={100}
    step={0.1}
    value={pctCustom}
    onChange={(e) => setPctCustom(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), aplicarPorcentajeCustom())}
    placeholder="Ej. 7.5"
    className="w-24 h-9 px-2 border ... text-right"
  />
  <span className="text-[13px] text-gray-500">%</span>
  <button type="button" onClick={aplicarPorcentajeCustom} className="...">
    Aplicar
  </button>
</div>
{pctCustom && Number(pctCustom) > 0 && (
  <p className="text-[11px] text-gray-500">
    ≈ {formatARS(descuentoDesdePorcentaje(subtotal, Number(pctCustom)))} de descuento
  </p>
)}
```

Al clickear preset 5/10/15, opcionalmente sincronizar `pctCustom` con ese valor para feedback visual.

Mostrar bajo el resumen, si `descuento > 0 && subtotal > 0`:

```tsx
<span className="text-[11px] text-gray-400">
  ({porcentajeEfectivo(subtotal, descuento)}% del subtotal)
</span>
```

**Archivos afectados:**
- `app/components/pos/PanelPago.tsx`

---

### Paso 4: Cap descuento al cambiar subtotal

En `POSContainer.tsx`:

```typescript
import { limitarDescuentoASubtotal } from '@/lib/pos/descuento'

useEffect(() => {
  setDescuento((d) => limitarDescuentoASubtotal(subtotal, d))
}, [subtotal])
```

**Archivos afectados:**
- `app/components/pos/POSContainer.tsx`

---

### Paso 5: Validación manual y build

**Checklist:**

1. Carrito $10.000 → Descuento → 10% → total $9.000, badge “$1.000,00”
2. Mismo carrito → 5% → $500 dto; 15% → $1.500 dto
3. Porcentaje custom 7.5% sobre $10.000 → $750 dto
4. Monto fijo manual $200 sigue funcionando independiente
5. Aplicar 50% dto, quitar ítems hasta subtotal $100 → descuento cap a $100
6. Venta con descuento se registra correcto en `/ventas` y ticket
7. `npm run test` (o vitest/jest según proyecto) pasa tests de `descuento.test.ts`
8. `npm run build` sin errores

Verificar runner de tests en `app/package.json` — si no hay script test, agregar solo si ya existe vitest/jest en el repo; si no, documentar tests como script manual en validación.

**Archivos afectados:** ninguno (pruebas)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/app/actions/ventas.ts` | Recibe `descuento_global` — sin cambio de contrato |
| `app/components/impresion/TicketVentaRenderer.tsx` | Muestra `payload.descuento` — refleja fix automáticamente |
| `planes/2026-06-08-pos-notebook-cobro-velocidad-ux.md` | Origen del bug en Paso 6 P1 |

### Actualizaciones Necesarias para Consistencia

- Marcar en notas del plan POS que el checklist “Presets descuento 5/10/15% funcionan” tenía bug corregido en este plan
- No requiere cambios en DB, CLAUDE.md ni migraciones SQL

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Presets 5/10/15% | **Fix** — montos correctos |
| Monto fijo | Sin cambio |
| Cobro / F2 / pagos | Sin cambio (total recalculado bien) |
| Facturación | Sin cambio (`descuento` en payload ya existía) |

---

## Lista de Validación

- [x] `descuentoDesdePorcentaje(10000, 10)` retorna `1000`
- [x] Presets 5/10/15% en UI coinciden con helper
- [x] Input porcentaje custom aplica descuento correcto (Enter y botón Aplicar)
- [x] Monto fijo sigue editable independientemente
- [x] Descuento no supera subtotal al modificar carrito
- [x] Tests unitarios pasan (`npx tsx --test lib/pos/descuento.test.ts`)
- [x] `npm run build` compila sin errores
- [ ] Venta registrada muestra descuento correcto en listado y ticket (prueba humana)

---

## Criterios de Éxito

1. Un cajero aplica **10% sobre $10.000** y ve **−$1.000** de descuento y total **$9.000** (no $9.990 ni valores absurdos).
2. Puede ingresar **cualquier porcentaje** (ej. 7,5%) sin calcular pesos a mano.
3. Los tests de `descuento.ts` cubren el bug de doble división para que no vuelva a introducirse.

---

## Notas

- **Origen del bug:** discrepancia entre el plan (`presetDescuento(5, subtotal)`) y la implementación (`presetDescuento(5/100, subtotal)`) manteniendo la misma fórmula interna con `/100`.
- **Alcance mínimo:** no tocar descuento por línea en carrito (server ya lo soporta; fuera de scope).
- **Post-fix:** considerar marcar el ítem del checklist P1 en `2026-06-08-pos-notebook-cobro-velocidad-ux.md` con nota de hotfix.

---

## Notas de Implementación

**Implementado:** 2026-06-09

### Resumen

Helper `descuento.ts` con cálculo correcto de % (sin doble división), tests con `node:test`, presets 5/10/15 corregidos, input de porcentaje personalizado con preview y botón Aplicar, cap de descuento al subtotal en `POSContainer`, % efectivo visible en resumen.

### Desviaciones del Plan

- Tests ejecutados con `npx tsx --test` (no hay script `npm test` en `package.json`).
- Botón "Quitar" también limpia el input de % custom.

### Problemas Encontrados

Ninguno. Build OK, 10/10 tests OK.
