# Plan: Fix UX cobro guiado — cliente, descuento y montos ARS

**Creado:** 2026-06-19
**Estado:** Implementado
**Pedido:** Arreglar scroll incómodo al buscar cliente en cobro guiado; descuento con % o monto fijo (excluyentes) y poder quitarlo; formatear en ARS los campos de montos en ambos modos de cobro del POS.

---

## Descripción General

### Qué Logra Este Plan

Corrige tres fricciones del POS recién implementado (`2026-06-08-pos-cobro-guiado-modal.md`):

1. **Búsqueda de cliente en el wizard** sin scroll anidado incómodo — resultados visibles e integrados al paso.
2. **Descuento claro y reversible** — elegir **porcentaje O monto fijo** (no ambos a la vez), con botón **Quitar**, mismo comportamiento en modo guiado y clásico.
3. **Inputs de dinero formateados en ARS** — montos de pago y descuento fijo se leen como `$ 12.450,00` mientras se cargan, en panel lateral y wizard.

### Por Qué Importa

El cobro guiado apunta a cajeros en pantalla grande con **un paso = una decisión**. Hoy el paso Cliente fuerza scroll dentro del modal; el paso Descuento confunde porque el monto fijo muestra el valor calculado del % y no se puede limpiar para pasar a monto manual; y los `type="number"` crudos (`12450.5`) dificultan la lectura en mostrador argentino.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/components/pos/cobro-guiado/PasoCliente.tsx` | Paso 2 wizard; usa `ClienteSelector` genérico |
| `app/components/clientes/ClienteSelector.tsx` | Dropdown `absolute` con `max-h-48 overflow-auto` |
| `app/components/pos/CobroGuiadoModal.tsx` | Body `flex-1 overflow-y-auto` — scroll del modal |
| `app/components/pos/cobro-guiado/PasoDescuento.tsx` | % + monto fijo simultáneos; sin botón Quitar; `value={descuento}` en monto fijo refleja % aplicado |
| `app/components/pos/PanelPago.tsx` | Modo clásico: sección descuento con botón Quitar pero misma mezcla % + monto en un solo panel |
| `app/components/pos/PagoMultiMetodo.tsx` | Inputs `type="number"` para monto de cada pago (clásico y guiado vía `size="large"`) |
| `app/lib/format.ts` | `formatARS()` solo para display; no hay `parseARSInput` ni componente de input |
| `app/lib/pos/descuento.ts` | Cálculo de % correcto (testeado en plan `2026-06-09-fix-descuentos-pos-porcentaje.md`) |

### Brechas o Problemas que se Abordan

#### 1. Scroll incómodo al buscar cliente (wizard)

`ClienteSelector` renderiza resultados en un `<ul>` con `position: absolute; max-h-48; overflow-auto` dentro del paso Cliente, que a su vez vive en el body scrolleable del modal (`CobroGuiadoModal` línea ~203).

Efecto: **doble scroll** (modal + dropdown), dropdown cortado, difícil elegir cliente con mouse o táctil en pantalla grande.

#### 2. Descuento: no se puede quitar % y pasar a monto fijo

En `PasoDescuento.tsx`:

- No hay botón **Quitar** (sí existe en `PanelPago.tsx` líneas 222–230).
- El input monto fijo usa `value={descuento || ''}` — cuando se aplica 10%, `descuento` pasa a ser el monto calculado (ej. $1.000) y el campo monto fijo muestra `1000`, bloqueando la intención de “borrar y poner otro monto”.
- % y monto fijo conviven sin indicar cuál está activo.

El usuario pide: **o porcentaje o monto fijo**, opcionalmente, y poder resetear.

#### 3. Montos sin formato ARS en cobro

Campos afectados hoy (`type="number"`, valor numérico crudo):

| Campo | Archivo |
|-------|---------|
| Monto de cada línea de pago | `PagoMultiMetodo.tsx` ~línea 130 |
| Descuento monto fijo (clásico) | `PanelPago.tsx` ~línea 272 |
| Descuento monto fijo (guiado) | `PasoDescuento.tsx` ~línea 135 |

Los totales ya usan `formatARS`; los **inputs editables** no.

**Fuera de scope explícito:** precio unitario editable en `Carrito.tsx` (no es “sistema de cobro”); cantidades y pesos en `PesoModal.tsx`.

---

## Cambios Propuestos

### Resumen de Cambios

- Nuevo **`ClienteBusquedaInline`** para el paso Cliente del wizard (lista estática, sin dropdown absoluto).
- Nuevo **`DescuentoEditor`** compartido con modo `porcentaje | monto` excluyente + Quitar.
- Nuevo **`InputMonedaARS`** + helpers `parseARSInput` / `formatARSInput` en `lib/format.ts`.
- Reemplazar inputs de monto en `PagoMultiMetodo` y descuento fijo en ambos modos.
- Refactor `PanelPago` y `PasoDescuento` para usar `DescuentoEditor`.
- Tests unitarios para parse/format ARS y lógica de tipo de descuento.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/format-moneda.ts` | `parseARSInput`, `formatARSInput`, `formatARSTyping` (helpers puros, testeables) |
| `app/lib/format-moneda.test.ts` | Tests parse/format ARS |
| `app/components/ui/InputMonedaARS.tsx` | Input controlado que muestra/edita montos en formato es-AR |
| `app/components/pos/DescuentoEditor.tsx` | UI compartida: sin descuento / % / monto fijo; props `size?: 'default' \| 'large'` |
| `app/components/pos/cobro-guiado/ClienteBusquedaInline.tsx` | Búsqueda de cliente con resultados en lista inline (sin absolute) |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/format.ts` | Re-exportar helpers de `format-moneda.ts` (opcional, para API única) |
| `app/components/pos/cobro-guiado/PasoCliente.tsx` | Usar `ClienteBusquedaInline` en lugar de `ClienteSelector` |
| `app/components/pos/cobro-guiado/PasoDescuento.tsx` | Delegar en `DescuentoEditor`; quitar lógica duplicada |
| `app/components/pos/PanelPago.tsx` | Reemplazar bloque descuento por `DescuentoEditor` |
| `app/components/pos/PagoMultiMetodo.tsx` | Monto → `InputMonedaARS`; preservar `data-pago-monto` y `onKeyDown` Enter |
| `app/components/pos/CobroGuiadoModal.tsx` | Ajuste menor de padding en paso cliente si hace falta (`overflow-visible` en step cliente) |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **`ClienteBusquedaInline` separado en lugar de extender `ClienteSelector`**: El selector compacto con dropdown absoluto sigue siendo correcto en `PanelPago` y otras pantallas. El wizard necesita layout distinto; un componente dedicado evita props `variant` que compliquen el selector general.

2. **Lista inline de clientes**: Resultados debajo del input, ancho completo, `max-h-[min(40vh,320px)]` con scroll **solo en la lista** si hay muchos resultados — el modal no necesita scroll adicional para 3–8 resultados típicos. Cada fila `min-h-[52px]` para clic fácil.

3. **Descuento: tres estados lógicos** `ninguno | porcentaje | monto`:
   - UI en modo “Con descuento”: sub-toggle **Porcentaje** | **Monto fijo**.
   - Al cambiar de sub-modo: `onDescuentoChange(0)` y limpiar inputs locales.
   - Presets 5/10/15% solo visibles en sub-modo porcentaje.
   - Botón **Quitar descuento** siempre visible cuando `descuento > 0` o sub-modo activo.
   - El estado persistido sigue siendo solo `descuento: number` en `POSContainer` (monto en ARS); el editor deriva el sub-modo desde props + estado local.

4. **`InputMonedaARS` con patrón focus/blur**:
   - **Blur / no foco**: muestra `formatARSInput(value)` → ej. `12.450,00` (sin símbolo `$` en el input para no interferir al editar; prefijo visual opcional `$` en CSS).
   - **Focus**: muestra dígitos editables; al tipear se parsea con `parseARSInput` que acepta `12450`, `12.450,50`, `12450.5`.
   - `inputMode="decimal"`, `type="text"` (no `number`) para permitir coma/punto.
   - Propagar `data-pago-monto` para hotkeys existentes (`focusPrimerMontoPago`, `shouldIgnoreHotkey`).

5. **Alcance ARS**: Solo montos de **cobro** (pagos + descuento fijo). No carrito ni cantidades en este plan.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Portal del dropdown de `ClienteSelector` a `document.body` | Más complejo; sigue siendo popover flotante, menos “paso a paso” |
| Mantener % y monto fijo en paralelo con validación | Confunde al cajero; el pedido pide exclusión |
| `type="number"` con `toLocaleString` on blur only | No formatea miles mientras se escribe; peor UX en montos grandes |

### Preguntas Abiertas (si las hay)

1. **¿Prefijo `$` dentro del input o a la izquierda como adorno?** *Recomendación: adorno fijo `$` a la izquierda del campo (como ticket), valor `12.450,00` a la derecha.*

2. **¿Formatear también precio unitario en carrito?** *Fuera de scope; se puede agregar en plan futuro si el usuario lo pide.*

---

## Tareas Paso a Paso

### Paso 1: Helpers de moneda + tests

**Acciones:**

- Crear `app/lib/format-moneda.ts`:

```typescript
/** Parsea texto ingresado por usuario (es-AR) a número. Vacío → 0. */
export function parseARSInput(raw: string): number

/** Formatea número para mostrar en input (sin símbolo $). Ej: 12450.5 → "12.450,50" */
export function formatARSInput(n: number): string

/** Durante edición: permite dígitos parciales sin forzar 2 decimales. */
export function sanitizeMoneyTyping(raw: string): string
```

- Reglas `parseARSInput`:
  - Quitar espacios y `$`
  - Si hay coma, es separador decimal (formato AR)
  - Si solo hay punto y grupos de 3, es separador de miles
  - `Math.max(0, round2(result))`

- Crear `format-moneda.test.ts`:
  - `parseARSInput('12.450,50')` → `12450.5`
  - `parseARSInput('1000')` → `1000`
  - `formatARSInput(12450.5)` → `12.450,50`
  - Edge: vacío, solo coma

**Archivos afectados:**

- `app/lib/format-moneda.ts`
- `app/lib/format-moneda.test.ts`

---

### Paso 2: Componente `InputMonedaARS`

**Acciones:**

- Crear `app/components/ui/InputMonedaARS.tsx`:

```typescript
interface InputMonedaARSProps {
  value: number
  onChange: (n: number) => void
  className?: string
  id?: string
  disabled?: boolean
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  'data-pago-monto'?: string
  size?: 'default' | 'large'
}
```

- Estado local `display` + `focused`.
- `onFocus`: set focused, opcionalmente seleccionar todo.
- `onChange`: `sanitizeMoneyTyping` → parse → `onChange(n)` → actualizar display.
- `onBlur`: focused false, `setDisplay(formatARSInput(value))`.
- Layout: wrapper flex con `$` estático a la izquierda (`text-gray-400`), input `text-right tabular-nums`.
- Clases `large`: `h-12 text-lg` (wizard); default: `h-10 text-sm`.

**Archivos afectados:**

- `app/components/ui/InputMonedaARS.tsx`

---

### Paso 3: `ClienteBusquedaInline` — fix scroll paso Cliente

**Acciones:**

- Crear `ClienteBusquedaInline.tsx` reutilizando `buscarClientesAction` y `NuevoClienteModal`:
  - Input grande `h-12 text-base` ancho completo.
  - Si `value` (cliente seleccionado): tarjeta confirmación igual que `ClienteSelector` + botón Quitar.
  - Si buscando: lista **estática** `<ul className="mt-3 border rounded-xl divide-y max-h-[min(40vh,320px)] overflow-y-auto">` — **sin** `position: absolute`.
  - Cada resultado: `min-h-[52px] px-4 py-3`, nombre + DNI/tel + saldo a favor si aplica.
  - Estado vacío: “Sin resultados” / “Escribí para buscar”.
  - Botón “+ Cliente nuevo” debajo del input.

- En `PasoCliente.tsx`: reemplazar bloque `ClienteSelector` por `ClienteBusquedaInline`.

- En `CobroGuiadoModal.tsx`: en el contenedor del paso `cliente`, agregar `overflow-visible` o quitar restricción que recorte la lista (el scroll queda solo en la lista de resultados si hay muchos).

**Wireframe:**

```
┌─────────────────────────────────────┐
│ [ Buscar por nombre, DNI...      ]  │
│ [ + Cliente nuevo ]                 │
├─────────────────────────────────────┤
│ Juan Pérez · DNI 12345678      →   │  ← filas grandes, sin popover
│ María García · 299-555-1234    →   │
└─────────────────────────────────────┘
```

**Archivos afectados:**

- `app/components/pos/cobro-guiado/ClienteBusquedaInline.tsx`
- `app/components/pos/cobro-guiado/PasoCliente.tsx`
- `app/components/pos/CobroGuiadoModal.tsx` (ajuste CSS menor)

---

### Paso 4: `DescuentoEditor` compartido

**Acciones:**

- Crear `DescuentoEditor.tsx` con props:

```typescript
interface DescuentoEditorProps {
  subtotal: number
  descuento: number
  onDescuentoChange: (v: number) => void
  size?: 'default' | 'large'
  /** Si true, muestra cards Sin/Con descuento (wizard). Si false, solo controles (panel clásico). */
  showModoCards?: boolean
}
```

- Estado local:
  - `tipo: 'ninguno' | 'porcentaje' | 'monto'`
  - `pctCustom: string`
  - Sincronizar `tipo` cuando `descuento` externo cambia a 0.

- Comportamiento:
  - **Quitar**: `tipo='ninguno'`, `pctCustom=''`, `onDescuentoChange(0)`.
  - Sub-toggle Porcentaje | Monto fijo (solo si `tipo !== 'ninguno'` o `showModoCards` con “Con descuento”).
  - Modo porcentaje: presets 5/10/15 + input % + Aplicar; **no** mostrar input monto fijo.
  - Modo monto: solo `InputMonedaARS` con label “Monto de descuento”.
  - Al cambiar sub-toggle: reset descuento a 0.

- `PasoDescuento.tsx`: mantener header “¿Aplicar descuento?” + cards Sin/Con; dentro de “Con” renderizar `DescuentoEditor` con `showModoCards={false}` y sub-toggle interno.

- `PanelPago.tsx`: reemplazar líneas 205–281 por `<DescuentoEditor subtotal={...} descuento={...} onDescuentoChange={...} size="default" showModoCards={false} />` + subtotal línea arriba.

**Archivos afectados:**

- `app/components/pos/DescuentoEditor.tsx`
- `app/components/pos/cobro-guiado/PasoDescuento.tsx`
- `app/components/pos/PanelPago.tsx`

---

### Paso 5: `InputMonedaARS` en pagos

**Acciones:**

- En `PagoMultiMetodo.tsx`, reemplazar `<input type="number" ... monto />` por:

```tsx
<InputMonedaARS
  value={Number(p.monto) || 0}
  onChange={(n) => update(p.id, { monto: n })}
  onKeyDown={...}
  data-pago-monto={index === 0 ? '' : undefined}
  size={large ? 'large' : 'default'}
/>
```

- Verificar que `focusPrimerMontoPago()` sigue encontrando `[data-pago-monto]`.
- Verificar `shouldIgnoreHotkey`: inputs de monto deben seguir permitiendo F2/Enter (ya excluye `data-pago-monto`).

**Archivos afectados:**

- `app/components/pos/PagoMultiMetodo.tsx`

---

### Paso 6: Validación y build

**Acciones:**

- Ejecutar tests de `format-moneda.test.ts` (agregar script `test` con vitest si no existe, o correr con `npx vitest run` puntual).
- `npm run build` sin errores TS.
- Checklist manual (ver abajo).

**Archivos afectados:**

- Ninguno nuevo

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `POSContainer.tsx` — `handleDescuentoChange` / sincronización pagos tras descuento: sin cambio de contrato; sigue recibiendo `descuento: number`.
- `ClienteSelector.tsx` — **sin modificar**; sigue usado en `PanelPago` modo clásico.
- `lib/pos/cobro-guiado-steps.ts` — validación de descuento no cambia.

### Actualizaciones Necesarias para Consistencia

- Opcional: nota en `planes/2026-06-08-pos-cobro-guiado-modal.md` (histórico) — no editar; este plan es follow-up.
- No requiere migración DB ni cambio en `CLAUDE.md`.

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Cobro guiado — paso Cliente | UX mejorada, sin cambio de datos |
| Cobro guiado — paso Descuento | Comportamiento más predecible |
| Cobro clásico — chip Descuento | Misma lógica %/monto que wizard |
| Montos de pago | Visual ARS; valor numérico enviado a `registrarVenta` igual |

---

## Lista de Validación

- [ ] Paso Cliente wizard: buscar cliente muestra lista inline sin scroll doble incómodo
- [ ] Seleccionar cliente de la lista funciona; Quitar cliente funciona
- [ ] Paso Descuento: aplicar 10%, Quitar, luego monto fijo $500 funciona
- [ ] Paso Descuento: sub-modos % y monto son excluyentes (no ambos visibles activos)
- [ ] Panel clásico descuento: mismo comportamiento %/monto/Quitar
- [ ] Input pago en wizard muestra `12.450,00` al blur; acepta edición con coma
- [ ] Input pago en panel clásico igual
- [ ] F2 + focus monto efectivo + Enter siguen funcionando
- [ ] `npm run build` OK
- [ ] Tests `format-moneda.test.ts` pasan

---

## Criterios de Éxito

1. Un cajero en cobro guiado puede buscar y elegir cliente **sin scroll anidado confuso** en el modal.
2. Puede aplicar descuento por %, quitarlo, y aplicar un **monto fijo distinto** sin que el campo quede bloqueado con el valor del %.
3. Todos los campos de **monto de cobro** (pagos y descuento fijo) en ambos modos muestran formato **es-AR** legible.

---

## Notas

### Causa raíz del bug de descuento

Al aplicar 10% sobre $10.000, `descuento` = `1000`. El input monto fijo con `value={descuento}` muestra `1000`, impidiendo “vaciar y escribir 500”. La solución es separar **tipo de entrada** del **valor persistido** y limpiar al cambiar de tipo.

### Ejecutar implementación

```
/implementar planes/2026-06-19-fix-cobro-guiado-ux.md
```

---

## Notas de Implementación

**Implementado:** 2026-06-19

### Resumen

- `ClienteBusquedaInline`: lista de resultados estática (sin dropdown absoluto) en paso Cliente del wizard.
- `DescuentoEditor` compartido: sub-modos Porcentaje | Monto fijo excluyentes + Quitar; usado en wizard y panel clásico.
- `InputMonedaARS` + `format-moneda.ts` para montos de pago y descuento fijo con formato es-AR.
- Paso cliente del modal con `overflow-visible` para evitar scroll doble.
- `npm run build` OK; tests `format-moneda.test.ts` 6/6 OK vía `npx vitest run`.

### Desviaciones del Plan

- `DescuentoEditor` en panel clásico muestra toggles Porcentaje/Monto directamente (sin paso intermedio "Aplicar descuento").

### Problemas Encontrados

Ninguno.
