# Plan: POS notebook — cobro ágil, atajos y visibilidad

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Estudiar `/pos` para notebooks: agilizar ventas y cobro, agregar atajos sin romper producción, mejorar visibilidad de opciones poco evidentes.

---

## Descripción General

### Qué Logra Este Plan

Rediseña la **zona de cobro** del POS y agrega **atajos de teclado y pago rápido** para que un cajero en notebook complete una venta con menos clics y menos scroll. Reorganiza visualmente cliente, descuento, factura y observaciones para que dejen de estar enterrados en un panel largo. Todo es **aditivo y retrocompatible**: no cambia la lógica de `registrarVenta` ni el flujo de stock/caja.

### Por Qué Importa

CValleTienda vive en mostrador con **notebooks** (típico 1366×768 o 1280×800), sidebar incluido. Hoy el escaneo y el carrito están bien optimizados (planes 2026-05-16 y 2026-05-27), pero el **cuello de botella es el cobro**: hay que agregar manualmente al menos un pago antes de poder cobrar, no hay atajos de teclado, y en pantallas &lt;1280px el `PanelPago` queda **debajo del carrito** obligando a scrollear. Opciones útiles (cliente, descuento, saldo a favor, factura) compiten visualmente con labels de 11px y links indigo pequeños.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/app/(dashboard)/pos/page.tsx` | Gate: caja abierta + métodos de pago; carga datos y monta `POSContainer` |
| `app/components/pos/POSContainer.tsx` | Orquestador: carrito, escáner global, `puedeCobrar`, `cobrar()`, layout grid |
| `app/components/pos/BuscadorVariantes.tsx` | Búsqueda/escaneo con debounce; auto-add en match único |
| `app/components/pos/Carrito.tsx` | Ítems con +/-; precio unitario editable |
| `app/components/pos/PanelPago.tsx` | Panel vertical: cliente → resumen/descuento → pagos → obs → factura → Cobrar |
| `app/components/pos/PagoMultiMetodo.tsx` | Multi-pago manual; links "+ Agregar pago" / "Auto-completar" |
| `app/components/pos/FacturaToggle.tsx` | Toggle factura electrónica + CUIT |
| `app/components/clientes/ClienteSelector.tsx` | Búsqueda/alta de cliente inline |
| `app/lib/hooks/useBarcodeScanner.ts` | Escáner HID cuando el foco **no** está en input |
| `app/lib/hooks/useAutoFocus.ts` | Auto-focus al buscador al montar y post-venta |
| `app/app/actions/ventas.ts` | `registrarVenta` — validación server-side intacta |
| `planes/2026-05-27-pos-ux-velocidad-caja.md` | **Implementado** — grilla colapsable, chip último ítem, +/- carrito |
| `planes/2026-05-10-dashboard-pos-redesign.md` | **Parcial** — lime en Cobrar; indigo persiste en pagos/buscador |

### Layout actual en notebook

```
POSContainer grid: grid-cols-1 xl:grid-cols-5  (dos columnas solo ≥1280px)
Sidebar AppShell: w-56 (~224px) + padding
→ En 1366px: ~1008px útiles → apenas entra xl
→ En 1024–1279px: UNA columna → buscador → chip → carrito → scroll → PanelPago
```

### Brechas o Problemas que se Abordan

1. **Cobro bloqueado sin pago explícito:** `puedeCobrar` exige `pagos.length > 0` (`POSContainer.tsx` ~231–235). Cada venta requiere "+ Agregar pago" aunque sea efectivo exacto.

2. **Sin atajos de teclado para cobrar:** no hay F2, Ctrl+Enter ni navegación ↑↓ en resultados del buscador.

3. **Panel de pago lejos en notebook:** breakpoint `xl` deja el cobro fuera de vista en la mayoría de laptops.

4. **Opciones poco visibles:**
   - Descuento: input `w-28 h-8` mezclado con subtotal (`PanelPago.tsx` ~137–147)
   - Cliente/saldo a favor: solo visible tras elegir cliente (`PanelPago.tsx` ~88–126)
   - Factura: al final del panel, async (`FacturaToggle.tsx`)
   - Catálogo: botón `text-[11px]` (`POSContainer.tsx` ~300–312)
   - Auto-completar pago: link `text-xs text-indigo-600` (`PagoMultiMetodo.tsx` ~84–91)

5. **Inconsistencia visual:** indigo en pagos/buscador vs lime/black en Cobrar — sensación de UI a medias.

6. **Escáner vs inputs de pago:** `useBarcodeScanner` se desactiva con foco en cualquier input; al cargar montos hay que salir del campo para escanear de nuevo.

---

## Cambios Propuestos

### Resumen de Cambios

**Fase 1 — Velocidad de cobro (P0, bajo riesgo):**
- Chips de **pago rápido** por método (Efectivo, Débito, …) que cargan el total en un clic
- **Auto-seed** del primer pago al intentar cobrar o al presionar atajo (si no hay líneas)
- Atajos: **F2** y **Ctrl+Enter** → Cobrar; **Escape** → foco buscador
- Breakpoint **lg (1024px)** para layout dos columnas (carrito | cobro)
- Barra fija inferior en móvil/stacked con total + Cobrar siempre visible

**Fase 2 — Visibilidad y descubrimiento (P1):**
- Toolbar compacta bajo el header "Cobrar": chips **Cliente · Descuento · Factura · Notas**
- Secciones colapsables: observaciones y factura **cerradas por defecto**
- Descuento con presets rápidos (5%, 10%, monto) además del input
- Saldo a favor visible en dropdown de `ClienteSelector`
- Navegación **↑↓ + Enter** en resultados de `BuscadorVariantes`
- Overlay de ayuda **?** con lista de atajos (no intrusivo)

**Fase 3 — Pulido visual (P2):**
- Migrar indigo → lime/black en `PagoMultiMetodo`, `BuscadorVariantes`, `FacturaToggle`, `VarianteSelector`
- Targets más grandes en botones de pago y catálogo
- Quitar doble borde buscador (card externa + interna)
- `PrintSelectionModal`: botón "Listo, nueva venta" prominente + **Enter** cierra

**Fuera de scope inicial (futuro):**
- Modo POS fullscreen sin sidebar
- Descuento por línea en carrito (server ya lo soporta)
- Comandos de voz en POS

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/components/pos/PagoRapidoChips.tsx` | Botones grandes por método de pago; un clic = una línea con monto = total |
| `app/components/pos/PosAtajosHelp.tsx` | Modal/popover con tabla de atajos de teclado |
| `app/lib/pos/hotkeys.ts` | Constantes y helpers: `POS_HOTKEYS`, `shouldIgnoreHotkey(event)` |
| `app/lib/pos/pago-rapido.ts` | `crearPagoCompleto(metodoId, total)`, `detectarMetodoEfectivo(metodos)` |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/pos/POSContainer.tsx` | Hotkeys globales; layout `lg:grid-cols-5`; barra sticky cobro; wiring pago rápido |
| `app/components/pos/PanelPago.tsx` | Toolbar chips; secciones colapsables; integrar `PagoRapidoChips`; reorden visual |
| `app/components/pos/PagoMultiMetodo.tsx` | Exportar helpers; botones más visibles; lime theme; opcional ocultar "+ Agregar" si hay chips |
| `app/components/pos/BuscadorVariantes.tsx` | Keyboard nav en dropdown; lime hover; highlight índice activo |
| `app/components/pos/FacturaToggle.tsx` | Estilo lime; label más legible |
| `app/components/clientes/ClienteSelector.tsx` | Mostrar `saldo_favor` en resultados |
| `app/components/pos/PrintSelectionModal.tsx` | CTA "Nueva venta" + hotkey Enter/Escape |
| `app/components/pos/Carrito.tsx` | Scroll-to-first stock error al intentar cobrar bloqueado (opcional P1) |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Cambios aditivos en producción:** no se altera `registrarVenta` ni reglas de vuelto/stock. Los atajos solo **disparan acciones que ya existen**. Si el cajero no los usa, el flujo manual sigue igual.

2. **Pago rápido = reemplazar líneas, no acumular:** al clickear un chip de método, se setea `pagos = [{ metodo, monto: totalAPagar }]`. Evita líneas duplicadas. Split payment sigue disponible vía "+ Otro pago" o editando montos.

3. **Auto-seed al cobrar (diferenciado por método):**
   - **Tarjeta / MP / transferencia:** F2/Cobrar con `pagos` vacíos → seed con monto = total y **cobra en el mismo paso** (pago digital exacto).
   - **Efectivo:** F2/Cobrar con `pagos` vacíos → seed con monto = total como referencia, **foco en el campo monto** y **no cobra** hasta que el cajero ingrese lo que entrega el cliente. El vuelto se calcula en `PagoMultiMetodo` (ya existía). Enter en el campo monto también dispara cobrar.
   - *Feedback de prueba P0 (2026-06-08):* el auto-seed efectivo “exacto” no era práctico en mostrador argentino; este ajuste mantiene la velocidad de F2 sin asumir pago justo.

4. **Breakpoint `lg` en lugar de `xl`:** en notebook 1024px+ el panel Cobrar queda al lado del carrito. Trade-off: carrito un poco más angosto — aceptable porque la tabla ya tiene scroll horizontal en casos extremos.

5. **Atajos conservadores:** F2 (tradición caja argentina) + Ctrl+Enter (power users). No reasignar teclas del browser (Ctrl+W, etc.). Ignorar hotkeys cuando hay modal abierto (`PesoModal`, `VarianteSelector`, `PrintSelectionModal`) o foco en textarea.

6. **Observaciones y factura colapsadas por defecto:** liberan espacio vertical; el 90% de ventas no las usa. Toolbar chip las expande on demand.

7. **Fin indigo → lime:** coherencia con redesign 2026-05-10; mejora contraste de links pequeños.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Auto-agregar pago al primer ítem del carrito | Cambia hábito de quien arma carrito largo antes de cobrar; puede confundir split payment |
| Cobrar con Enter en buscador | Conflicto con Enter en resultados de búsqueda |
| Modo fullscreen sin sidebar en v1 | Más invasivo; requiere layout route-specific; dejar para fase futura |
| Quitar multi-pago | Negocios reales usan efectivo + tarjeta; mantener |
| Solo mobile-first | Usuarios declararon notebooks, no tablets |

### Preguntas Abiertas (si las hay)

1. **Método por defecto del auto-seed:** ¿primer método por `orden` en configuración, o detectar el que tenga `cuenta_fondo.tipo === 'efectivo'`? (Recomendación: efectivo si existe, sino primero por orden.)

2. **Cantidad de chips visibles:** ¿mostrar todos los métodos activos o solo los 3–4 primeros + "Más…"? (Recomendación: todos si ≤4; si no, top 3 + dropdown.)

3. **Barra sticky inferior en stacked mode:** ¿siempre visible o solo cuando `items.length > 0`? (Recomendación: solo con ítems.)

4. **Presets de descuento:** ¿5% / 10% / 15% fijos o configurables por tienda? (Recomendación: fijos en v1; config en v2.)

5. **Comunicar atajos al equipo:** ¿banner one-time post-deploy o solo overlay `?`? (Recomendación: toast la primera vez que entran a `/pos` después del deploy + overlay permanente.)

---

## Tareas Paso a Paso

### Paso 1: Helpers de pago rápido

Crear `app/lib/pos/pago-rapido.ts`:

```typescript
import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from '@/components/pos/PagoMultiMetodo'

export function detectarMetodoEfectivo(metodos: MetodoPago[]): MetodoPago | null {
  return metodos.find((m) => m.cuenta_fondo?.tipo === 'efectivo') ?? null
}

export function metodoPorDefecto(metodos: MetodoPago[]): MetodoPago | null {
  if (metodos.length === 0) return null
  return detectarMetodoEfectivo(metodos) ?? metodos[0]
}

export function crearPagoCompleto(
  metodoId: string,
  total: number,
  id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)
): PagoLinea {
  return {
    id,
    metodo_pago_id: metodoId,
    monto: Math.round(total * 100) / 100,
    referencia: '',
  }
}

/** Reemplaza todas las líneas con un pago único por el total */
export function aplicarPagoRapido(metodoId: string, total: number): PagoLinea[] {
  return [crearPagoCompleto(metodoId, total)]
}
```

Crear `app/lib/pos/hotkeys.ts`:

```typescript
export const POS_HOTKEYS = {
  COBRAR: ['F2', 'ctrl+enter'],
  FOCUS_BUSCADOR: ['escape'],
  AYUDA: ['?'],
  NUEVA_VENTA: ['enter'], // solo en PrintSelectionModal
} as const

export function shouldIgnoreHotkey(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  if (tag === 'TEXTAREA') return true
  if (tag === 'SELECT') return true
  if (tag === 'INPUT' && (t as HTMLInputElement).type !== 'search') return true
  if (t.isContentEditable) return true
  return false
}
```

**Archivos afectados:**
- `app/lib/pos/pago-rapido.ts` (nuevo)
- `app/lib/pos/hotkeys.ts` (nuevo)

---

### Paso 2: Componente `PagoRapidoChips`

Crear `app/components/pos/PagoRapidoChips.tsx`:

- Props: `metodos`, `total`, `pagos`, `onChange`, `metodoActivoId?`
- Render: fila de botones `flex flex-wrap gap-2`
- Estilo botón activo (método seleccionado): `bg-lime-500 text-[#0A0A0A] font-bold`
- Estilo inactivo: `bg-gray-100 hover:bg-gray-200 text-gray-800`
- Altura mínima **44px** (touch-friendly en notebook trackpad)
- `onClick(metodo)` → `onChange(aplicarPagoRapido(metodo.id, total))`
- Si `total === 0`, disabled
- Debajo, texto helper: "Split: editá montos o + Otro pago"

**Archivos afectados:**
- `app/components/pos/PagoRapidoChips.tsx` (nuevo)

---

### Paso 3: Integrar pago rápido y auto-seed en `PanelPago` + `POSContainer`

**PanelPago.tsx:**

- Insertar `<PagoRapidoChips />` **antes** de `PagoMultiMetodo`, bajo el label "Forma de pago"
- Renombrar link "+ Agregar pago" → "+ Otro pago" (split explícito)
- Pasar prop `onCobrarIntento?: () => boolean` o mover auto-seed a `POSContainer.cobrar()`

**POSContainer.tsx — modificar `cobrar()`:**

```typescript
function cobrar() {
  let pagosActuales = pagos
  if (pagosActuales.length === 0 && totalBruto > 0 && saldoFavorAplicado < totalBruto) {
    const m = metodoPorDefecto(metodos)
    if (m) {
      pagosActuales = aplicarPagoRapido(m.id, totalAPagar)
      setPagos(pagosActuales)
      // recalcular puedeCobrar en mismo tick — usar pagosActuales localmente:
    }
  }
  const suma = pagosActuales.reduce(...)
  if (!(items.length > 0 && stockOk && (pagosActuales.length > 0 || ...) && suma + saldo...)) return
  // ... registrarVenta con pagosActuales
}
```

**Archivos afectados:**
- `app/components/pos/PanelPago.tsx`
- `app/components/pos/POSContainer.tsx`
- `app/components/pos/PagoMultiMetodo.tsx` (renombrar labels, export `PagoLinea` ya existe)

---

### Paso 4: Atajos de teclado globales

En `POSContainer.tsx`, agregar `useEffect` con listener `keydown`:

| Tecla | Condición | Acción |
|-------|-----------|--------|
| F2 | `!shouldIgnoreHotkey` && no modal abierto | `cobrar()` |
| Ctrl+Enter | idem | `cobrar()` |
| Escape | idem && carrito no vacío opcional | `buscadorRef.focus()`; cerrar chip catálogo |
| ? (shift+/) | idem | toggle `PosAtajosHelp` |

No disparar si `puedeCobrar === false` (opcional: flash visual en botón Cobrar deshabilitado).

Crear `PosAtajosHelp.tsx` — popover/modal pequeño:

```
F2 / Ctrl+Enter   Cobrar
Escape            Volver al buscador
↑ ↓ Enter         Elegir producto en lista
?                 Esta ayuda
```

**Archivos afectados:**
- `app/components/pos/POSContainer.tsx`
- `app/components/pos/PosAtajosHelp.tsx` (nuevo)

---

### Paso 5: Layout notebook — dos columnas desde `lg`

En `POSContainer.tsx`:

**Antes:**
```tsx
<div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
  <div className="xl:col-span-3 ...">
  <div className="xl:col-span-2">
```

**Después:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3 space-y-4 min-w-0">
  <div className="lg:col-span-2">
```

**Barra sticky cobro (stacked mode only):**

```tsx
{/* visible solo cuando lg:hidden && items.length > 0 */}
<div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-white px-4 py-3 flex items-center gap-3 shadow-lg">
  <span className="font-black text-xl tabular-nums flex-1">{formatARS(totalAPagar)}</span>
  <Button onClick={cobrar} disabled={!puedeCobrar} className="!h-12 !px-8">Cobrar</Button>
</div>
```

Agregar `pb-24` al contenedor principal en mobile para no tapar contenido.

**PanelPago:** cambiar `lg:sticky lg:top-4` → mantener; en desktop side-by-side el panel ya queda visible.

**Archivos afectados:**
- `app/components/pos/POSContainer.tsx`
- `app/components/pos/PanelPago.tsx` (padding bottom en stacked si hace falta)

---

### Paso 6: Toolbar de opciones secundarias (cliente, descuento, factura, notas)

Refactor `PanelPago.tsx` sección superior (después del header "Cobrar"):

```
[ 👤 Cliente ] [ % Descuento ] [ 🧾 Factura ] [ 📝 Notas ]
     ↓ expande panel inline correspondiente (solo uno abierto a la vez)
```

- Chip activo: borde lime + fondo lime-50
- **Cliente:** expande `ClienteSelector` + bloque saldo a favor (lógica actual)
- **Descuento:** expande input + presets [5%] [10%] [15%] que calculan sobre subtotal
- **Factura:** solo si `facturacionActiva`; expande `FacturaToggle`
- **Notas:** expande textarea observaciones

Eliminar `divide-y` largo; el total a pagar **siempre visible** entre toolbar y forma de pago (bloque gris actual ~160–165).

Presets descuento:

```typescript
function presetDescuento(porcentaje: number, subtotal: number) {
  onDescuentoChange(Math.round(subtotal * porcentaje) / 100)
}
```

**Archivos afectados:**
- `app/components/pos/PanelPago.tsx`

---

### Paso 7: Navegación por teclado en buscador

En `BuscadorVariantes.tsx`:

- Estado `highlightIndex: number` (-1 = ninguno)
- `ArrowDown` / `ArrowUp`: mover highlight en `results`
- `Enter`: si `highlightIndex >= 0`, seleccionar; si no, comportamiento actual
- Estilo ítem activo: `bg-lime-50 ring-2 ring-lime-400`
- Reset highlight cuando cambia `results`

**Archivos afectados:**
- `app/components/pos/BuscadorVariantes.tsx`

---

### Paso 8: Saldo a favor visible antes de seleccionar

En `ClienteSelector.tsx`, en cada fila del dropdown:

```tsx
{cliente.saldo_favor > 0 && (
  <span className="text-[11px] text-emerald-700 font-semibold ml-auto">
    Saldo {formatARS(cliente.saldo_favor)}
  </span>
)}
```

**Archivos afectados:**
- `app/components/clientes/ClienteSelector.tsx`

---

### Paso 9: Pulido visual indigo → lime

Reemplazos mecánicos:

| Archivo | Buscar | Reemplazar |
|---------|--------|------------|
| `PagoMultiMetodo.tsx` | `indigo-600`, `indigo-800`, `ring-indigo-500` | `lime-700`, `lime-900`, `ring-lime-400/60` |
| `BuscadorVariantes.tsx` | `hover:bg-indigo-50` | `hover:bg-lime-50` |
| `FacturaToggle.tsx` | clases indigo | lime equivalentes |
| `VarianteSelector.tsx` | indigo hovers | lime |

Aumentar catálogo toggle en `POSContainer.tsx`:

```tsx
className="... px-3 py-1.5 text-[12px] ..."  // era text-[11px]
```

**Archivos afectados:**
- `app/components/pos/PagoMultiMetodo.tsx`
- `app/components/pos/BuscadorVariantes.tsx`
- `app/components/pos/FacturaToggle.tsx`
- `app/components/pos/VarianteSelector.tsx`
- `app/components/pos/POSContainer.tsx`

---

### Paso 10: Mejorar flujo post-impresión

En `PrintSelectionModal.tsx`:

- Botón primario **"Listo — nueva venta"** (cierra modal)
- Listener: Enter/Escape → `onClose`
- Copy: "Imprimí lo que necesites y cerrá para seguir"

**Archivos afectados:**
- `app/components/pos/PrintSelectionModal.tsx`
- `app/components/pos/POSContainer.tsx` (pasar onClose explícito)

---

### Paso 11: Validación manual y build

**Checklist operativo (notebook 1366×768 y 1280×800):**

1. Escanear 3 productos → chip último ítem → clic "Efectivo" chip → Cobrar en 1 clic
2. F2 con carrito listo → venta registrada sin mouse
3. Split: chip efectivo → editar monto → "+ Otro pago" tarjeta → auto-completar resta
4. Cliente con saldo → visible en dropdown → aplicar saldo → cobrar resto con chip
5. Layout 1024px: panel Cobrar visible al lado sin scroll excesivo
6. Layout &lt;1024px: barra sticky inferior funcional
7. ↑↓ Enter en búsqueda con múltiples resultados
8. Usuario sin atajos: flujo manual idéntico a hoy (+ Otro pago sigue funcionando)
9. `npm run build` sin errores

**Archivos afectados:** ninguno (pruebas)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

| Archivo | Relación |
|---------|----------|
| `app/app/actions/ventas.ts` | `registrarVenta` — no modificar contrato |
| `app/lib/configuracion/queries.ts` | `MetodoPago`, `ConfiguracionTienda` |
| `app/components/layout/AppShell.tsx` | Sidebar reduce ancho útil en POS |
| `planes/2026-05-27-pos-ux-velocidad-caja.md` | Base ya implementada |
| `planes/2026-05-10-dashboard-pos-redesign.md` | Paleta lime — completar en POS |

### Actualizaciones Necesarias para Consistencia

- No requiere cambios en DB ni migraciones SQL
- No requiere actualizar `CLAUDE.md` (sin comandos nuevos)
- Opcional: nota en `contexto/datos-actuales.md` post-deploy para el equipo de caja

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Venta escaneo-only | Más rápido: chip efectivo + F2 |
| Multi-pago | Sigue igual; chips son atajo, no reemplazo |
| Factura electrónica | Más visible vía toolbar; sigue opt-in |
| Capacitación | Mostrar overlay `?` una vez; atajos son opt-in |
| Producción | **Riesgo bajo** — cambios UI + atajos aditivos |

---

## Lista de Validación

### P0 (implementado)

- [x] Chips de pago rápido cargan el total con un clic
- [x] F2 / Ctrl+Enter cobran cuando el carrito está listo (auto-seed si no hay pagos)
- [x] Auto-seed crea pago default (efectivo o primero) al cobrar sin líneas previas
- [x] Layout dos columnas visible desde 1024px (`lg:grid-cols-5`)
- [x] Barra sticky Cobrar en modo stacked (&lt;1024px)
- [x] Overlay `?` con atajos de teclado
- [x] `npm run build` compila sin errores TypeScript

### P1/P2 (implementado)

- [x] Toolbar expande cliente / descuento / factura / notas
- [x] Presets descuento 5/10/15% funcionan *(hotfix 2026-06-09: bug doble `/100` corregido en `2026-06-09-fix-descuentos-pos-porcentaje.md`)*
- [x] Saldo a favor visible en búsqueda de clientes
- [x] ↑↓ Enter en resultados del buscador
- [x] Indigo eliminado de componentes POS de pago/búsqueda
- [x] Print modal cierra con "Nueva venta" / Enter
- [ ] Flujo manual legacy verificado en mostrador (prueba humana — pendiente usuario)

---

## Criterios de Éxito

1. Un cajero en notebook completa una venta **solo efectivo** en ≤3 acciones después del último escaneo: chip Efectivo → F2 (o Cobrar).
2. En resolución 1366×768 el botón Cobrar y el total son visibles **sin scroll** en al menos el 80% de ventas típicas (≤8 ítems).
3. El equipo en producción puede seguir operando sin aprender atajos; quienes los usen reducen tiempo de cobro perceptiblemente.
4. Ninguna regresión en validaciones server (stock, vuelto, caja cerrada, multi-pago).

---

## Notas

- **Atajos en producción:** sumar atajos es positivo si son opt-in y no pisan comportamiento del browser. F2 y Ctrl+Enter son estándar en POS retail. Comunicar al equipo con un mensaje de 30 segundos, no manual largo.
- **Notebooks vs tablets:** targets mínimos 44px en chips de pago; trackpad-friendly.
- **Orden de implementación recomendado:** Pasos 1–5 (P0) primero → deploy → feedback → Pasos 6–8 (P1) → Paso 9–10 (P2).
- **Métrica futura:** si se quiere medir impacto, loguear en analytics tiempo buscador→cobro (fuera de scope).

---

## Notas de Implementación

**Implementado (P0):** 2026-06-08

### Resumen

Fase P0 desplegada: helpers `pago-rapido` y `hotkeys`, chips de pago rápido por método, auto-seed al cobrar (efectivo preferido), atajos F2/Ctrl+Enter/Esc/?, layout `lg` dos columnas, barra sticky en móvil/stacked, modal de ayuda de atajos.

### Desviaciones del Plan

- Botón Cobrar del panel lateral oculto en &lt;lg (`hidden lg:flex`) para no duplicar la barra sticky.
- Hint de atajos (F2, ?) agregado bajo el botón Cobrar en desktop.
- Métodos &gt;4: primeros 3 chips + select "Más métodos…" (plan recomendaba top 3 + dropdown).

### Problemas Encontrados

Ninguno. Build OK.

### Implementado (P1/P2): 2026-06-08

**Resumen:** Toolbar colapsable en `PanelPago` (Cliente · Descuento · Factura · Notas), presets 5/10/15%, saldo a favor en dropdown de clientes, navegación ↑↓+Enter en buscador, migración indigo→lime en pago/búsqueda/factura/variantes, modal de impresión con CTA prominente y Enter/Esc.

**Desviaciones del Plan:**
- Ajuste P0 efectivo/vuelto (F2 no cobra hasta ingresar monto) incorporado antes de P1.
- `BuscadorVariantes` usa `type="search"` para compatibilidad con `shouldIgnoreHotkey` y doble borde eliminado quitando card interna.
- `PesoModal.tsx` conserva indigo (fuera del listado explícito del plan P2).

**Problemas Encontrados:** Ninguno. Build OK.
