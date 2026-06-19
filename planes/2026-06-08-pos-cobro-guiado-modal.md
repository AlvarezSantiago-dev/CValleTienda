# Plan: POS — modo de cobro guiado (wizard modal) configurable

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Agregar un sistema de cobro alternativo elegible desde configuración: modo actual vs modo paso a paso con ayudas y UI grande (F2 abre modal → pago → cliente → descuento → confirmar).

---

## Descripción General

### Qué Logra Este Plan

Introduce un **segundo modo de cobro** en el POS, activable por tienda desde **Configuración → Cobros**. En modo **guiado**, el flujo de venta de productos (escaneo, búsqueda, carrito) permanece igual; al presionar **F2** (o el botón Cobrar) se abre un **modal a pantalla casi completa** que guía al cajero en pasos grandes y claros:

1. **¿Cómo paga?** — método por defecto efectivo, monto autocompletado con el total, soporte multi-pago como hoy.
2. **¿Cliente?** — sin cliente / buscar / agregar nuevo.
3. **¿Descuento?** — sin descuento / elegir porcentaje o monto.
4. **Confirmar** — resumen legible y cobro final.

El modo **clásico** (panel lateral actual con chips Cliente · Descuento · Factura · Notas) sigue disponible sin cambios de comportamiento para tiendas que no activen el wizard.

### Por Qué Importa

El plan POS notebook (`2026-06-08-pos-notebook-cobro-velocidad-ux.md`) mejoró velocidad para usuarios expertos, pero en mostrador con **pantallas grandes**, cajeros nuevos o turnos con mucha rotación, el panel lateral concentra demasiadas opciones en poco espacio visual. Un wizard **un paso = una decisión** reduce errores (olvidar cliente, descuento mal cargado, pago incompleto) y permite avanzar con **un clic + Enter**, alineado con el pedido del usuario.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/components/pos/POSContainer.tsx` | Orquestador: estado carrito/pagos/cliente/descuento; `cobrar()`; hotkey F2 → `cobrar()` directo |
| `app/components/pos/PanelPago.tsx` | Panel lateral: toolbar chips, secciones colapsables, `PagoRapidoChips`, `PagoMultiMetodo` |
| `app/components/pos/PagoMultiMetodo.tsx` | Líneas de pago, auto-completar, vuelto/restante |
| `app/components/pos/PagoRapidoChips.tsx` | Chips por método; efectivo enfoca monto |
| `app/lib/pos/pago-rapido.ts` | `metodoPorDefecto`, `aplicarPagoRapido`, `focusPrimerMontoPago` |
| `app/lib/pos/descuento.ts` | Cálculo correcto de % (post fix `2026-06-09-fix-descuentos-pos-porcentaje.md`) |
| `app/lib/pos/hotkeys.ts` | F2, Ctrl+Enter, Escape, `shouldIgnoreHotkey` |
| `app/components/clientes/ClienteSelector.tsx` | Búsqueda + `NuevoClienteModal` |
| `app/components/pos/PosAtajosHelp.tsx` | Ayuda de atajos (? ) |
| `app/app/actions/ventas.ts` | `registrarVenta` — sin cambios de contrato |
| `app/app/actions/configuracion.ts` | `actualizarConfiguracionTienda`, `ConfigTiendaInput` |
| `app/lib/configuracion/queries.ts` | `ConfiguracionTienda`, `obtenerConfiguracionTienda` |
| `app/app/(dashboard)/configuracion/cobros/page.tsx` | Cuentas de fondos + métodos de pago |
| `app/app/(dashboard)/pos/page.tsx` | Pasa `configuracion` a `POSContainer` |
| `supabase/migrations/20260419000007_configuracion.sql` | Tabla `configuracion_tienda` |

### Flujo actual de cobro (modo clásico)

```
Escanear/buscar → carrito crece
Panel lateral: opcionalmente cliente, descuento, pagos
F2 o "Cobrar" → cobrar():
  - Si no hay pagos: auto-seed efectivo (si efectivo: focus monto y return)
  - Si pagos cubren total → registrarVenta → reset → imprimir
```

**F2 hoy** dispara cobro inmediato, no un asistente.

### Brechas o Problemas que se Abordan

1. **No hay modo guiado** para cajeros que prefieren pantallas grandes paso a paso.
2. **F2 y cobro están acoplados** a la lógica inline de `POSContainer.cobrar()` sin separación “abrir asistente” vs “finalizar venta”.
3. **Cliente y descuento son opcionales enterrados** en chips del panel; en modo guiado deben ser pasos explícitos con defaults claros (“Sin cliente”, “Sin descuento”).
4. **No existe preferencia por tienda** para elegir modo de cobro (solo hay config de métodos/cuentas).
5. **Atajos de ayuda** (`PosAtajosHelp`) documentan F2 como “cobrar”, habrá que diferenciar por modo.

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva columna DB `pos_modo_cobro` en `configuracion_tienda`: `'clasico' | 'guiado'` (default `'clasico'`).
- Sección en **Configuración → Cobros**: selector visual de modo con preview/descripción.
- Nuevo **`CobroGuiadoModal`**: wizard de 4 pasos, UI grande (targets ≥ 56px, tipografía ≥ 18px en totales).
- Refactor ligero en `POSContainer`: extraer `finalizarVenta()` reutilizable; F2 abre modal en modo guiado.
- En modo guiado: panel lateral **simplificado** a resumen (total + hint “F2 para cobrar”); sin duplicar controles de pago.
- Actualizar `PosAtajosHelp` y hint bajo botón Cobrar según modo activo.
- Tests unitarios para navegación de pasos y validación “puede avanzar / puede cobrar”.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260619100001_pos_modo_cobro.sql` | Columna `pos_modo_cobro` + check constraint |
| `app/lib/pos/cobro-modo.ts` | Tipo `PosModoCobro`, constantes, helpers `esModoGuiado()` |
| `app/lib/pos/cobro-guiado-steps.ts` | Definición de pasos, validadores por paso, orden |
| `app/lib/pos/cobro-guiado-steps.test.ts` | Tests de validación por paso |
| `app/components/pos/CobroGuiadoModal.tsx` | Shell del modal: stepper, navegación Enter/Escape, footer |
| `app/components/pos/cobro-guiado/PasoPago.tsx` | Paso 1: métodos grandes + multi-pago ampliado |
| `app/components/pos/cobro-guiado/PasoCliente.tsx` | Paso 2: Sin cliente / Buscar / Nuevo + saldo a favor |
| `app/components/pos/cobro-guiado/PasoDescuento.tsx` | Paso 3: Sin descuento / presets / % custom / monto fijo |
| `app/components/pos/cobro-guiado/PasoConfirmacion.tsx` | Paso 4: resumen + botón Cobrar grande |
| `app/components/pos/PanelCobroResumen.tsx` | Panel mínimo para modo guiado (solo total e ítems) |
| `app/components/configuracion/PosModoCobroForm.tsx` | Formulario radio cards en config cobros |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/configuracion/queries.ts` | Agregar `pos_modo_cobro` a `ConfiguracionTienda` |
| `app/types/database.ts` | Sincronizar tipo `ConfiguracionTienda` |
| `app/app/actions/configuracion.ts` | `ConfigTiendaInput.pos_modo_cobro` + persistencia |
| `app/app/(dashboard)/configuracion/cobros/page.tsx` | Montar `PosModoCobroForm` arriba de cuentas/métodos |
| `app/components/pos/POSContainer.tsx` | Modo guiado: estado `wizardAbierto`; F2 abre wizard; `finalizarVenta()`; render condicional panel |
| `app/components/pos/PosAtajosHelp.tsx` | Texto F2 según `pos_modo_cobro` |
| `app/lib/pos/hotkeys.ts` | Opcional: constante `ABRIR_COBRO_GUIADO` documentada |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Persistencia en `configuracion_tienda`**: Es preferencia de operación del negocio (como `balanza_formato`), no dato transaccional. Default `clasico` garantiza cero regresión.

2. **F2 en modo guiado abre el wizard, no cobra**: El usuario pidió explícitamente “Tocamos F2 el sistema abre un modal”. El cobro final ocurre en el paso Confirmación (Enter o botón grande).

3. **Reutilizar estado existente de `POSContainer`**: `pagos`, `cliente`, `descuento`, `saldoFavorAplicado` siguen siendo la fuente de verdad. El wizard es controlado (props + callbacks), no duplica estado en paralelo.

4. **Orden de pasos: Pago → Cliente → Descuento → Confirmar**: Coincide con el pedido. Descuento después del cliente permite mostrar saldo a favor en paso Cliente sin recalcular pagos dos veces; al aplicar descuento en paso 3 se recalcula `totalAPagar` y se ajusta la primera línea de pago si sigue siendo pago único por el total.

5. **Pre-seed al abrir wizard**: Si `pagos` está vacío, crear línea efectivo con `totalAPagar` actual (mismo criterio que `metodoPorDefecto` + `aplicarPagoRapido`). Si efectivo, foco en monto del paso 1 para editar billete entregado.

6. **Panel lateral en modo guiado**: Mostrar `PanelCobroResumen` en lugar de `PanelPago` completo para no tener dos UIs de pago. Opciones avanzadas (factura, notas) quedan en paso Confirmación o sub-sección colapsable (ver preguntas abiertas).

7. **Modal casi fullscreen**: `max-w-3xl` o `max-w-4xl`, centrado, fondo oscuro semitransparente, `min-h-[70vh]` en desktop. En `< lg` el wizard ocupa pantalla completa (fullscreen sheet) — mismo flujo, targets táctiles grandes.

8. **Navegación por teclado**:
   - **Enter**: avanzar al siguiente paso si el paso actual es válido; en paso Confirmación → `finalizarVenta()`.
   - **Escape**: cerrar wizard sin cobrar (estado del carrito intacto).
   - **Tab / flechas**: entre opciones grandes del paso (implementar `role="radiogroup"` donde aplique).

9. **No tocar `registrarVenta`**: El wizard solo prepara los mismos datos que hoy envía `cobrar()`.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|-------------------|
| Preferencia en `localStorage` por dispositivo | El usuario pidió elegir desde **configuración** (nivel tienda) |
| Wizard como página `/pos/cobrar` separada | Rompe flujo de escaneo continuo; modal mantiene carrito visible detrás |
| Reemplazar modo clásico por completo | Regresión para tiendas que ya dominaron el panel lateral |
| Descuento antes que pago | No coincide con el pedido; además el total de pago depende del descuento |

### Preguntas Abiertas (si las hay)

1. **Factura electrónica y notas**: ¿Van como paso 5 opcional del wizard, o sub-sección colapsable solo en Confirmación? *Recomendación del plan: colapsable en Confirmación si `facturacionActiva`, para no alargar el flujo base.*

2. **Saldo a favor**: ¿Paso explícito o solo dentro de Paso Cliente cuando el cliente tiene saldo? *Recomendación: dentro de Paso Cliente con botón grande “Usar saldo a favor”.*

3. **¿Modo guiado en mobile (`< lg`)?** *Recomendación: sí, fullscreen; si el usuario prefiere solo desktop, agregar nota en config “Recomendado para pantallas ≥ 1024px” sin bloquear mobile.*

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración y tipos — `pos_modo_cobro`

**Acciones:**

- Crear migración:

```sql
alter table public.configuracion_tienda
  add column if not exists pos_modo_cobro text not null default 'clasico';

alter table public.configuracion_tienda
  add constraint configuracion_tienda_pos_modo_cobro_check
  check (pos_modo_cobro in ('clasico', 'guiado'));

comment on column public.configuracion_tienda.pos_modo_cobro is
  'Modo de cobro en POS: clasico (panel lateral) o guiado (wizard modal con F2)';
```

- Extender `ConfiguracionTienda` en `app/lib/configuracion/queries.ts`:

```typescript
pos_modo_cobro: 'clasico' | 'guiado'
```

- Extender `ConfigTiendaInput` y `actualizarConfiguracionTienda` en `app/app/actions/configuracion.ts` con validación del enum.
- Actualizar `app/types/database.ts` si el proyecto lo exige para tipos generados.

**Archivos afectados:**

- `supabase/migrations/20260619100001_pos_modo_cobro.sql`
- `app/lib/configuracion/queries.ts`
- `app/app/actions/configuracion.ts`
- `app/types/database.ts`

---

### Paso 2: Helpers de modo y validación de pasos

**Acciones:**

- Crear `app/lib/pos/cobro-modo.ts`:

```typescript
export type PosModoCobro = 'clasico' | 'guiado'
export const POS_MODO_COBRO_DEFAULT: PosModoCobro = 'clasico'
export function esModoGuiado(modo: PosModoCobro | null | undefined): boolean
```

- Crear `app/lib/pos/cobro-guiado-steps.ts` con:

```typescript
export type PasoCobroGuiado = 'pago' | 'cliente' | 'descuento' | 'confirmacion'

export const PASOS_ORDEN: PasoCobroGuiado[] = ['pago', 'cliente', 'descuento', 'confirmacion']

export interface CobroGuiadoContext {
  subtotal: number
  descuento: number
  saldoFavorAplicado: number
  pagos: PagoLinea[]
  cliente: ClienteLite | null
  metodos: MetodoPago[]
}

export function totalAPagar(ctx: CobroGuiadoContext): number
export function pasoPagoValido(ctx: CobroGuiadoContext): boolean
export function pasoClienteValido(): boolean  // siempre true (sin cliente es válido)
export function pasoDescuentoValido(ctx: CobroGuiadoContext): boolean
export function puedeFinalizarCobro(ctx: CobroGuiadoContext): boolean
```

- Reglas de validación **Paso Pago** (reutilizar lógica de `POSContainer`):
  - `items.length > 0` (validado antes de abrir wizard)
  - `sumaPagos + saldoFavor >= totalAPagar - 0.01` O pagos vacíos con auto-seed permitido solo al finalizar, no al avanzar — **al avanzar desde paso pago exigir al menos una línea con suma ≥ totalAPagar - 0.01** (o saldo a favor cubre todo).

- Tests en `cobro-guiado-steps.test.ts`: casos pago insuficiente, multi-pago, saldo a favor, descuento que reduce total.

**Archivos afectados:**

- `app/lib/pos/cobro-modo.ts`
- `app/lib/pos/cobro-guiado-steps.ts`
- `app/lib/pos/cobro-guiado-steps.test.ts`

---

### Paso 3: UI de configuración — selector de modo

**Acciones:**

- Crear `PosModoCobroForm.tsx` con dos **radio cards** grandes:

| Opción | Título | Descripción |
|--------|--------|-------------|
| `clasico` | Panel lateral (actual) | Cliente, descuento y pagos en el panel derecho. F2 cobra directo. |
| `guiado` | Paso a paso (recomendado pantallas grandes) | F2 abre asistente: pago → cliente → descuento → confirmar. |

- Usar `actualizarConfiguracionTienda` (o action dedicada mínima que reutilice la misma).
- Integrar en `configuracion/cobros/page.tsx` como **primera sección** (“Experiencia de cobro en el POS”), antes de cuentas de fondos.
- Solo roles owner/admin pueden guardar (hereda política RLS existente).

**Archivos afectados:**

- `app/components/configuracion/PosModoCobroForm.tsx`
- `app/app/(dashboard)/configuracion/cobros/page.tsx`

---

### Paso 4: Componentes del wizard — pasos 1 a 4

**Acciones:**

#### `PasoPago.tsx`

- Header: “¿Cómo va a pagar?” + total a pagar en `text-4xl font-black`.
- Reutilizar lógica de `PagoRapidoChips` pero con botones `min-h-[56px] text-base px-6`.
- Debajo: variante ampliada de `PagoMultiMetodo` o componente nuevo `PagoMultiMetodoGrande` con inputs `h-12 text-lg`.
- Footer del paso: Resta / Vuelto en tarjetas grandes (como hoy pero `text-lg`).
- Enter en monto efectivo → **siguiente paso** (no finalizar venta).

#### `PasoCliente.tsx`

- Tres botones tipo tarjeta (grid 3 columnas en `lg`):
  - **Sin cliente** (default seleccionado, borde lime)
  - **Buscar cliente** → expande `ClienteSelector` con input grande
  - **Cliente nuevo** → abre `NuevoClienteModal`
- Si cliente con `saldo_favor > 0`: banner + “Aplicar saldo” (reutilizar lógica de `PanelPago.aplicarSaldoCompleto`).

#### `PasoDescuento.tsx`

- Dos opciones principales: **Sin descuento** | **Con descuento**.
- Si con descuento: presets 5/10/15% (`min-h-[48px]`), input % custom, monto fijo — reutilizar `descuento.ts`.
- Mostrar subtotal y total actualizado en vivo.

#### `PasoConfirmacion.tsx`

- Resumen en lista grande: cantidad de ítems, subtotal, descuento, saldo a favor, pagos (método + monto), cliente o “Consumidor final”.
- Botón **Cobrar $X** `min-h-[56px] text-lg font-bold rounded-full bg-[#0A0A0A]`.
- Si `facturacionActiva`: sección colapsable `FacturaToggle` (misma props que `PanelPago`).
- Campo notas opcional colapsable (`Textarea` 2 filas).

#### `CobroGuiadoModal.tsx`

- Props (controlado):

```typescript
interface CobroGuiadoModalProps {
  open: boolean
  onClose: () => void
  paso: PasoCobroGuiado
  onPasoChange: (p: PasoCobroGuiado) => void
  ctx: CobroGuiadoContext & { itemsCount: number; isCobrando: boolean; error: string | null }
  metodos: MetodoPago[]
  facturacionActiva: boolean
  emitirFactura: boolean
  onEmitirFacturaChange: (v: boolean) => void
  cuitReceptor: string
  onCuitReceptorChange: (v: string) => void
  observaciones: string
  onObservacionesChange: (v: string) => void
  onPagosChange: ...
  onClienteChange: ...
  onDescuentoChange: ...
  onSaldoFavorChange: ...
  onConfirmar: () => void
}
```

- Stepper visual: `1 Pago — 2 Cliente — 3 Descuento — 4 Confirmar` con paso activo resaltado.
- Botones footer: “Atrás” (excepto paso 1), “Siguiente” / “Cobrar” en último paso.
- `useEffect` al abrir: si `pagos.length === 0`, seed efectivo + total.
- Trap de foco dentro del modal; Escape → `onClose`.
- `role="dialog"` `aria-modal="true"`.

**Archivos afectados:**

- `app/components/pos/CobroGuiadoModal.tsx`
- `app/components/pos/cobro-guiado/PasoPago.tsx`
- `app/components/pos/cobro-guiado/PasoCliente.tsx`
- `app/components/pos/cobro-guiado/PasoDescuento.tsx`
- `app/components/pos/cobro-guiado/PasoConfirmacion.tsx`

---

### Paso 5: Integración en `POSContainer`

**Acciones:**

- Leer `configuracion?.pos_modo_cobro ?? 'clasico'`.
- Extraer de `cobrar()` la lógica de `registrarVenta` a `finalizarVenta(pagosOverride?: PagoLinea[])` para llamar desde wizard y modo clásico.
- Nuevo estado: `cobroGuiadoAbierto: boolean`, `pasoGuiado: PasoCobroGuiado`.
- Función `abrirCobroGuiado()`:
  - Validar `items.length > 0` y stock.
  - Pre-seed pagos si vacío.
  - `setPasoGuiado('pago')`, `setCobroGuiadoAbierto(true)`.
- Modificar listener F2 / Ctrl+Enter:
  - Si `esModoGuiado` → `abrirCobroGuiado()` (si ya abierto y paso confirmación válido → `finalizarVenta()`).
  - Si clásico → comportamiento actual de `cobrar()`.
- Botón Cobrar (desktop y sticky mobile): misma bifurcación.
- Incluir `cobroGuiadoAbierto` en `modalAbierto` para no disparar hotkeys globales detrás.
- Render condicional columna derecha:

```tsx
{esModoGuiado(configuracion?.pos_modo_cobro) ? (
  <PanelCobroResumen subtotal={...} totalAPagar={...} itemsCount={items.length} />
) : (
  <PanelPago ... />
)}
```

- Montar `<CobroGuiadoModal ... />` al final del JSX.

**Archivos afectados:**

- `app/components/pos/POSContainer.tsx`
- `app/components/pos/PanelCobroResumen.tsx` (nuevo)

---

### Paso 6: Ajuste de descuento al cambiar en paso 3

**Acciones:**

- Cuando `onDescuentoChange` altera el total en wizard abierto:
  - Si hay **una sola línea de pago** y su monto era igual al `totalAPagar` anterior, actualizar automáticamente esa línea al nuevo total (mismo patrón que “pago rápido”).
  - Si hay multi-pago, mostrar aviso en paso Confirmación si `sumaPagos < totalAPagar` (“Ajustá los pagos en el paso 1”) con link “Volver a pago”.
- Implementar en helper `sincronizarPagosTrasDescuento(pagos, totalAnterior, totalNuevo)` en `cobro-guiado-steps.ts`.

**Archivos afectados:**

- `app/lib/pos/cobro-guiado-steps.ts`
- `app/components/pos/CobroGuiadoModal.tsx`

---

### Paso 7: Atajos, ayuda y copy

**Acciones:**

- `PosAtajosHelp.tsx`: si modo guiado, fila F2 = “Abrir asistente de cobro” y nota “En el último paso, Enter confirma la venta”.
- `PanelCobroResumen`: texto “Presioná **F2** para cobrar paso a paso”.
- `PanelPago` hint existente: sin cambios en modo clásico.

**Archivos afectados:**

- `app/components/pos/PosAtajosHelp.tsx`
- `app/components/pos/PanelCobroResumen.tsx`
- `app/components/pos/POSContainer.tsx` (pasar modo a help)

---

### Paso 8: Pruebas y validación manual

**Acciones:**

- `npm run test` — tests de `cobro-guiado-steps.test.ts`.
- `npm run build` — sin errores TS.
- Checklist manual (ver Lista de Validación).

**Archivos afectados:**

- (ninguno nuevo)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/(dashboard)/pos/page.tsx` — ya pasa `configuracion`; no requiere cambio si el campo viene en query.
- `obtenerConfiguracionTienda()` — debe incluir `pos_modo_cobro` en el `select` (verificar query; si usa `*`, automático post-migración).
- Brochure/PDF novedades — **fuera de scope**; actualizar en entrega futura si se comunica a clientes.

### Actualizaciones Necesarias para Consistencia

- `planes/2026-06-08-pos-notebook-cobro-velocidad-ux.md` — no modificar (histórico); este plan es complementario.
- CLAUDE.md — **no requiere cambio** (no hay nuevo comando workspace).
- Opcional post-implementación: línea en PDF novedades clientes sobre “modo cobro guiado”.

### Impacto en Flujos de Trabajo Existentes

| Flujo | Impacto |
|-------|---------|
| Modo clásico (default) | Ninguno |
| Modo guiado | F2 cambia significado; capacitar cajeros |
| Configuración | Nueva sección en Cobros |
| `registrarVenta` / caja / stock | Sin cambio |

---

## Lista de Validación

- [ ] Migración aplicada; columna `pos_modo_cobro` existe con default `clasico`
- [ ] Configuración → Cobros muestra selector y persiste ambos modos
- [ ] Modo clásico: F2 y panel lateral funcionan igual que antes
- [ ] Modo guiado: F2 con ítems en carrito abre modal paso Pago
- [ ] Paso Pago: efectivo por defecto, monto = total, multi-pago, vuelto visible
- [ ] Paso Cliente: sin cliente / buscar / nuevo funcionan
- [ ] Paso Descuento: sin descuento y presets/% custom correctos (usar `descuento.ts`)
- [ ] Paso Confirmación: resumen correcto; Cobrar registra venta e imprime como hoy
- [ ] Escape cierra wizard sin perder carrito
- [ ] Enter avanza pasos y confirma en el último
- [ ] `npm run test` y `npm run build` OK
- [ ] `PosAtajosHelp` refleja el modo activo

---

## Criterios de Éxito

1. Cada tienda puede elegir **clásico** o **guiado** desde Configuración → Cobros sin afectar a otras tiendas.
2. En modo guiado, un cajero completa una venta con productos escaneados usando **solo F2 + clics/Enter** en 4 pasos legibles en pantalla grande.
3. Multi-pago, vuelto, cliente, descuento y saldo a favor se comportan igual que en modo clásico respecto a `registrarVenta`.
4. Tiendas en modo clásico no perciben ningún cambio de comportamiento.

---

## Notas

### Wireframe ASCII del wizard (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  Cobrar venta                                    [1][2][3][4]│
│  ● Pago   ○ Cliente   ○ Descuento   ○ Confirmar            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ¿Cómo va a pagar el cliente?                              │
│                                                             │
│              Total:  $ 12.450,00                            │
│                                                             │
│   [  Efectivo  ]  [  Débito  ]  [  Mercado Pago  ]          │
│                                                             │
│   Monto recibido:  [ 12450.00 ]    Vuelto: $ 0,00           │
│   [ + Otro método de pago ]                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [ Atrás ]  [ Siguiente → ]     │
└─────────────────────────────────────────────────────────────┘
```

### Ejecutar implementación

```
/implementar planes/2026-06-08-pos-cobro-guiado-modal.md
```

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

- Migración `pos_modo_cobro` en `configuracion_tienda` (default `clasico`).
- Selector en Configuración → Cobros con action `actualizarPosModoCobro`.
- Wizard modal de 4 pasos: Pago → Cliente → Descuento → Confirmar.
- Modo guiado: panel lateral simplificado (`PanelCobroResumen`), F2 abre asistente.
- Modo clásico sin cambios de comportamiento.
- Sincronización automática de pago único al cambiar descuento o saldo a favor.
- `npm run build` OK.

### Desviaciones del Plan

- Action dedicada `actualizarPosModoCobro` en lugar de extender `ConfigTiendaInput` completo (más simple para la UI de cobros).
- Tests en `cobro-guiado-steps.test.ts` creados pero el proyecto no tiene runner vitest configurado en `package.json`.

### Problemas Encontrados

Ninguno bloqueante. Aplicar migración en Supabase antes de usar en producción.
