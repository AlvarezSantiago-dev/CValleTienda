# Plan: POS — modal de cobro para montos (sin tocar Cliente / Descuento / Notas)

**Creado:** 2026-08-18
**Estado:** Implementado
**Pedido:** Arreglar lo visual del punto de cobro: los montos grandes se recortan en el panel; celular, tablet y notebook no dan espacio. Cliente, descuento y notas están bien. Evaluar opciones y usar la mejor (preferencia: modal de cobro).

---

## Descripción General

### Qué Logra Este Plan

En **modo clásico** el panel derecho deja de ser el lugar donde se tipea plata. Cliente, descuento, factura y notas siguen en el panel. El cobro (método, monto recibido, multi-pago, vuelto) pasa a un **modal de montos** a pantalla completa en mobile y ancho generoso en tablet/notebook. Las líneas de pago dejan el grid `5+3+3+1` (el monto cabe en ~95 px) y pasan a **monto a ancho completo**, tipografía grande, `tabular-nums`, sin recorte.

El **modo guiado** (wizard de 4 pasos) se mantiene para quien lo tenga activado. Su paso Pago reutiliza el mismo layout de montos para que el recorte no vuelva a aparecer ahí.

### Por Qué Importa

El POS es el flujo más usado del producto. En Argentina un total de `$ 1.250.000,00` es cotidiano; hoy se corta a `$ 10.000,0` en el input. En celular el teclado tapa el campo; en notebook el panel es `2/5` del grid (~400 px). Un modal de cobro es el único contenedor que da el mismo espacio en 360 px, 768 px y 1366 px sin sacrificar Cliente/Descuento/Notas ni inventar un tercer modo de configuración.

---

## Estado Actual

### Estructura Existente Relevante

| Ruta | Rol |
|------|-----|
| `app/components/pos/POSContainer.tsx` | Orquestador. `modoGuiado` vs clásico. F2 → `cobrar()` (clásico) o `abrirCobroGuiado()` (guiado). Layout `lg:grid-cols-5` (carrito 3 + cobro 2). Sticky `Cobrar` en `< lg`. |
| `app/components/pos/PanelPago.tsx` | Modo clásico: chips Cliente / Descuento / Factura / Notas + total + `PagoRapidoChips` + `PagoMultiMetodo` + CTA. |
| `app/components/pos/PagoMultiMetodo.tsx` | Cada línea: `grid-cols-12` → método `col-span-5`, monto `col-span-3`, ref `col-span-3`, borrar `col-span-1`. Usado también en devoluciones. |
| `app/components/pos/PagoRapidoChips.tsx` | Chips de método; efectivo enfoca `[data-pago-monto]`. |
| `app/components/ui/InputMonedaARS.tsx` | Formato es-AR. Sizes `default` \| `large`. Wrapper `overflow-hidden`. |
| `app/components/pos/CobroGuiadoModal.tsx` | Wizard 4 pasos (`pago` → `cliente` → `descuento` → `confirmacion`). `Modal size="full"`. |
| `app/components/pos/cobro-guiado/PasoPago.tsx` | UI grande de método + total, pero reusa `PagoMultiMetodo` con el mismo grid angosto. |
| `app/components/pos/PanelCobroResumen.tsx` | Resumen + CTA en modo guiado (desktop). |
| `app/components/ui/Modal.tsx` | `sm`–`full`, `mobileFullscreen` (100dvh), footer fijo, Escape, scroll lock. |
| `app/lib/pos/cobro-modo.ts` | `'clasico' \| 'guiado'`. Default `'clasico'`. |
| `app/lib/pos/pago-rapido.ts` | `aplicarPagoRapido`, `focusPrimerMontoPago`, `metodoPorDefecto`. |
| `app/lib/pos/puede-cobrar.ts` | Habilita confirmar. CC no exige cubrir total. Tests en `puede-cobrar.test.ts`. |
| `app/lib/pos/cobro-guiado-steps.ts` | Pasos y validación del wizard. Tests existentes. |
| `app/components/configuracion/PosModoCobroForm.tsx` | Copy: clásico = “pagos en el panel derecho. F2 cobra directo”. |
| `app/components/pos/PosAtajosHelp.tsx` | F2 clásico: “Cobrar o cargar efectivo”. |
| `app/components/devoluciones/DevolucionForm.tsx` | Reusa `PagoMultiMetodo` (se beneficia del layout nuevo). |

### Cómo se ve el cobro hoy (modo clásico — el de la captura)

```
Sidebar | Buscador + carrito (3/5) | PanelPago (2/5)
                                   | [Cliente] [Descuento] [Notas]
                                   | Total a pagar  $ 10.000,00
                                   | [Efectivo] [MP QR]
                                   | [Efectivo ▾] [$ 10.000,0] [Ref] [x]  ← recorte
                                   | Cobrado / Resta / Vuelto
                                   | [Confirmar a cuenta $ 10.000,00]
```

**F2 hoy (clásico):** si no hay pagos, seed efectivo + `focusPrimerMontoPago()` y **no cobra**. El cajero tipea en el input de ~95 px. Enter en el monto dispara `onCobrar`.

**Mobile (`< lg`):** `PanelPago` queda debajo del carrito (hay que scrollear). Barra sticky “Cobrar” llama `iniciarCobro()` → `cobrar()`: seed + foco en un input que puede estar tapado por teclado o fuera de viewport.

**Modo guiado:** F2 abre `CobroGuiadoModal`. El paso Pago ya es modal, pero el monto sigue en `col-span-3`.

### Diagnóstico de espacio (números)

- Grid POS: `lg:grid-cols-5`, cobro = 2 columnas.
- Notebook 1366×768 menos sidebar (~240 px) → panel cobro ≈ **400–440 px**.
- Interno `grid-cols-12` + `col-span-3` → input monto ≈ **90–110 px**.
- `$ 10.000,00` en `text-sm` mono ≈ 95–110 px → **se recorta** (`$ 10.000,0`).
- `$ 1.250.000,00` es imposible de leer/editar en ese hueco.
- En 360 px el panel a ancho completo alcanza, pero el mismo grid 12 deja el monto en ~80 px y el teclado virtual cubre la fila.

### Brechas o Problemas que se Abordan

1. **El monto no tiene un contenedor a prueba de cifras ARS** en ningún breakpoint del modo clásico.
2. **Cliente / Descuento / Notas no son el problema**; meterlos en un wizard (modo guiado) agrega fricción que el usuario no pidió.
3. **Activar modo guiado por defecto no alcanza:** el wizard cambia el flujo de cliente/descuento y el `PagoMultiMetodo` sigue recortando.
4. **Solo ensanchar `col-span-3` → `col-span-5` en el panel** mejora notebook un poco y no arregla mobile/teclado.
5. **No hay superficie de cobro compartida** entre clásico y guiado: el layout roto está duplicado.

---

## Análisis de opciones (y la elegida)

### Opción A — Solo ensanchar el input en el panel lateral

Agrandar `col-span` del monto, apilar método/monto/ref en el sidebar, `text-lg`.

- **Pros:** poco código, F2 igual.
- **Contras:** el panel sigue siendo 2/5; en notebook el total + chips + 2 líneas de pago + CTA pelean por altura; en mobile el teclado tapa el campo; cifras de 7+ dígitos siguen justas.
- **Veredicto:** parche. No cumple “celular, tablet y notebook”.

### Opción B — Pasar a modo guiado (wizard 4 pasos) como default

Ya existe `CobroGuiadoModal`.

- **Pros:** modal `full` ya resuelto; F2 ya abre overlay.
- **Contras:** el usuario dijo que Cliente/Descuento/Notas **están bien donde están**. El wizard los convierte en pasos obligatorios. El monto **sigue recortado** en `PagoMultiMetodo`.
- **Veredicto:** no alinea con el pedido. Útil como modo opt-in (se mantiene).

### Opción C — Bottom sheet solo en mobile; panel igual en desktop

- **Pros:** arregla el teclado en celular.
- **Contras:** el recorte de la captura es de **notebook**. Tablet en landscape cae en `lg` y sigue roto.
- **Veredicto:** incompleto.

### Opción D — Modal **solo de cobro** + layout de montos a ancho completo (recomendada)

Panel clásico conserva chips Cliente / Descuento / Notas / Factura y el total. CTA / F2 / sticky mobile abren `CobroPagoModal`: método, monto héroe, multi-pago, vuelto, confirmar. Extraer el cuerpo visual a un form reutilizable por el paso Pago del wizard.

- **Pros:** respeta lo que el usuario quiere conservar; un solo lugar para tipear plata en todos los dispositivos; no hay tercer `pos_modo_cobro`; el experto no pierde velocidad (F2 abre modal con efectivo seed + foco en monto; Enter/F2 confirma); el wizard se beneficia del mismo layout.
- **Contras:** un toque extra vs cobro 100 % inline (aceptable: hoy F2 ya no cobra en efectivo hasta tipear el monto).
- **Veredicto:** mejor opción. Es la que implementa este plan.

### Opción E — Teclado numérico virtual tipo caja registradora

- **Pros:** táctil en tablet.
- **Contras:** YAGNI; el teclado del SO + `inputMode="decimal"` alcanza; duplica UX.
- **Veredicto:** fuera de scope. Nota futura.

---

## Cambios Propuestos

### Resumen de Cambios

- Nuevo **`CobroPagoModal`**: overlay de cobro (no wizard). Mobile fullscreen, desktop `size="lg"`/`xl`.
- Extraer **`CobroMontosForm`**: total héroe + chips de método + líneas de pago stacked + cobrado/resta/vuelto. Lo usan el modal clásico y `PasoPago`.
- **`PagoMultiMetodo`**: layout apilado (método + borrar arriba, monto full-width, ref debajo). Size `xl` para cobro. Devoluciones heredan el stack (mejora, no rompe contrato).
- **`InputMonedaARS`**: size `xl` (`h-16`, `text-2xl sm:text-4xl`, nunca truncar).
- **`PanelPago`**: quitar `PagoRapidoChips` + `PagoMultiMetodo` + hint de F2 sobre el input angosto. Dejar chips de contexto + total + CTA que **abre el modal**.
- **`POSContainer`**: en clásico, `iniciarCobro` / F2 / sticky Cobrar abren `CobroPagoModal` (con seed efectivo si no hay pagos). Confirmar en el modal llama `finalizarVenta` / `cobrar` ya validado.
- **Modo guiado:** sin cambio de pasos. `PasoPago` usa `CobroMontosForm`.
- Copy de Configuración → Cobros y atajos `?`.
- **No tocar** actions, queries, impresión, ni agregar un tercer modo.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/components/pos/CobroPagoModal.tsx` | Modal de cobro del modo clásico: abre/cierra, seed, atajos Enter/F2, footer Confirmar / Sin seña (CC), error. |
| `app/components/pos/CobroMontosForm.tsx` | UI compartida de montos (total, chips, líneas, vuelto). Usada por `CobroPagoModal` y `PasoPago`. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/components/pos/PagoMultiMetodo.tsx` | Dejar de usar `grid-cols-12`. Stack: select+borrar; `InputMonedaARS` `w-full`; ref full-width. Size `xl`. Tokens semánticos en el markup tocado (`bg-surface-sunken`, `text-fg`, `border-border-default`). Preservar `PagoLinea`, `onCobrar`, `data-pago-monto`, redondeo/vuelto. |
| `app/components/ui/InputMonedaARS.tsx` | Agregar `size: 'xl'`. No truncar; el número siempre visible (`min-w-0` + contenedor `w-full`). Font ≥16 px en mobile. |
| `app/components/pos/PanelPago.tsx` | Quitar bloque Forma de pago / Seña (`PagoRapidoChips` + `PagoMultiMetodo`). CTA `onCobrar` pasa a significar “abrir cobro” (el padre abre el modal). Copy del botón: `Cobrar {total}` / `Confirmar a cuenta {total}`. Hint: “F2 abre el cobro”. En mobile el CTA del panel puede ocultarse (`hidden lg:flex`) porque ya está la barra sticky. |
| `app/components/pos/POSContainer.tsx` | Estado `cobroPagoAbierto`. `iniciarCobro` clásico → abrir modal (seed si hace falta). `modalAbierto` incluye este modal. F2 con modal cerrado abre; con modal abierto no se swallowa del todo: el modal maneja F2/Enter para confirmar. Sticky y drawer “Cobrar” abren el mismo modal. Render de `CobroPagoModal`. |
| `app/components/pos/cobro-guiado/PasoPago.tsx` | Reemplazar chips duplicados + `PagoMultiMetodo` por `CobroMontosForm` (el footer “Siguiente” del wizard se queda en `CobroGuiadoModal`). |
| `app/components/configuracion/PosModoCobroForm.tsx` | Copy clásico: “Cliente, descuento y notas en el panel. F2 abre el cobro en un modal con montos grandes.” |
| `app/components/pos/PosAtajosHelp.tsx` | F2 clásico: “Abrir cobro (modal de montos)”. Enter: “Confirmar cobro con el monto en foco”. |
| `CLAUDE.md` | Una línea en App CValleTienda: cobro clásico usa modal de montos; chips de cliente/descuento/notas siguen en el panel. |
| `contexto/proyectos.md` | Actualizar bullet POS. |

### Archivos a Eliminar (si aplica)

Ninguno. `PagoRapidoChips.tsx` se reutiliza dentro de `CobroMontosForm` (no se borra). `CobroGuiadoModal` se conserva.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Modal solo de cobro, no un wizard nuevo.** Cliente / Descuento / Factura / Notas quedan en `PanelPago`. El overlay decide cómo se paga y confirma.

2. **No hay tercer `pos_modo_cobro`.** Sigue `clasico` | `guiado`. Clásico = panel de contexto + modal de montos. Guiado = wizard 4 pasos (el paso Pago comparte layout).

3. **F2 en clásico abre el modal**, no cobra en silencio. Al abrir: si no hay pagos y no es CC, seed efectivo (igual que hoy) y `focusPrimerMontoPago()`. Enter o F2 **dentro del modal** confirma si `puedeCobrar`. Escape cierra sin perder lo tipeado. Un experto: F2 → (monto ya = total) → Enter. Un toque más que “cobrar ciego”, igual que el flujo actual de efectivo.

4. **Layout de línea de pago = stack, nunca 12 columnas.** El monto es el héroe (`w-full`, `size="xl"`). Método y borrar en la fila superior. Referencia debajo, full-width, solo prominente si el método no es efectivo.

5. **Componente compartido `CobroMontosForm`.** Evita que clásico y guiado diverjan otra vez. `PasoPago` deja de duplicar chips + `PagoMultiMetodo`.

6. **Mobile: sticky “Cobrar” abre el mismo modal** (`mobileFullscreen` del `Modal` v2). El monto queda en la mitad superior del overlay para que el teclado iOS no lo tape. Footer del modal = Confirmar (safe-area ya está en `Modal`).

7. **Cuenta corriente:** el modal muestra “Seña (opcional)”, deuda restante, y botón **Sin seña — todo a cuenta** que vacía pagos y confirma (equivalente al de `PasoPago` hoy, pero confirma en clásico en lugar de “Siguiente”). Validación: sin cliente → error “Elegí un cliente para fiar” (ya existe en `cobrar()`); el modal no debe confirmar CC sin cliente.

8. **Presentación only.** No cambiar `registrarVenta`, queries, ni markup de impresión. `puedeCobrarVenta` y seed de `pago-rapido.ts` se reutilizan.

9. **Tokens v2** en UI nueva/tocada. No reintroducir `gray-*` / `lime-*` / hex de marca. No tocar `print.css` ni `components/impresion/**`.

10. **Devoluciones:** `PagoMultiMetodo` stacked en un card a ancho de página. Mejora montos; no requiere modal propio en este plan.

### Alternativas Consideradas

Documentadas arriba (A–E). Rechazadas A, B, C, E.

### Preguntas Abiertas (si las hay)

Ninguna bloqueante. Defaults ya tomados:

- F2 siempre abre el modal (no cobro instantáneo aunque el monto ya cubra).
- Chips de método **no** se duplican en el sidebar; viven en el modal.
- No se agrega teclado numérico virtual.

Si al implementar se prefiere cobro instantáneo con F2 cuando el total ya está cubierto, es un if de 5 líneas en el handler del modal; no cambia el resto.

---

## Especificación visual del modal

### Desktop / notebook (`sm+`)

```
┌──────────── Cobrar venta / Confirmar pedido ───────── [x] ┐
│                                                            │
│              Total a pagar                                 │
│              $ 1.250.000,00          ← text-4xl tabular    │
│                                                            │
│   [ Efectivo ] [ Mercado pago QR ] [ … ]                   │
│                                                            │
│   Pagos                              + Otro pago           │
│   ┌────────────────────────────────────────────────────┐   │
│   │ Efectivo                                      [x]  │   │
│   │ $  1.250.000,00            ← h-16 text-4xl full    │   │
│   └────────────────────────────────────────────────────┘   │
│                                                            │
│   ┌ Cobrado ┐  ┌ Resta ┐  ┌ Vuelto a entregar ┐            │
│   │ $ …     │  │ $ …   │  │ $ …               │            │
│   └─────────┘  └───────┘  └───────────────────┘            │
│                                                            │
│   [ Cancelar ]                    [ Cobrar $ 1.250.000,00 ]│
└────────────────────────────────────────────────────────────┘
```

- `Modal` `size="xl"` (`max-w-2xl`), `mobileFullscreen`.
- Título: `Cobrar venta` o `Confirmar pedido` si `esCuentaCorriente`.
- Descripción opcional: cliente elegido (si hay) en una línea `text-sm text-fg-muted`, no editable aquí.

### Mobile (< sm)

- Full viewport (`h-[100dvh]`).
- Total `text-3xl`.
- Input monto `text-2xl`, `h-16`, en el tercio superior (antes de scrollear).
- Chips `min-h-[44px]`.
- Footer Confirmar sticky del `Modal`.
- `inputMode="decimal"` (ya en `InputMonedaARS`).

### Cuenta corriente

- Label chips: “Seña (opcional)”.
- Texto: “Si no cargás un pago, el total queda como deuda.”
- Botón secundario full-width: “Sin seña — todo a cuenta” (disabled si no hay cliente).
- CTA primaria: “Confirmar a cuenta {formatARS(total)}” (habilitada con o sin seña si hay cliente).

### Estados

- `isCobrando`: CTA loading, inputs disabled.
- `error`: banner `danger-soft` arriba del footer.
- Resta > 0 (contado): CTA disabled; Resta en `text-warning-soft-fg`.
- Vuelto > 0: card `info` / azul semántico `bg-info-soft`.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Size `xl` en `InputMonedaARS`

Extender el union `size` con `'xl'`.

**Acciones:**

- `xl`: contenedor `h-16 w-full`, texto `text-2xl sm:text-4xl`, `font-mono tabular-nums`, padding izquierdo del `$` un poco mayor (`pl-3`).
- El input interno no usa `truncate`. El wrapper puede conservar `overflow-hidden` (redondeo) porque el campo es `w-full`.
- No cambiar el comportamiento focus/select/parse.

**Archivos afectados:**

- `app/components/ui/InputMonedaARS.tsx`

---

### Paso 2: Layout stacked en `PagoMultiMetodo`

Reemplazar el `grid grid-cols-12` por stack.

**Acciones:**

- Cada línea: `flex flex-col gap-2` dentro de `bg-surface-sunken border border-border-default rounded-[var(--radius-md)] p-3`.
- Fila 1: `<select className="flex-1 min-h-[44px]">` + botón borrar `min-h-[44px] min-w-[44px]` (`aria-label="Eliminar pago"`).
- Fila 2: `<InputMonedaARS className="w-full" size={large ? 'xl' : size === 'large' ? 'xl' : 'default'} />`. Definir `size?: 'default' | 'large' | 'xl'` — `large` y `xl` usan input xl (cobro); `default` usa `large` de Input (devoluciones: stacked pero no text-4xl).
- Fila 3: input referencia `w-full min-h-[44px]`. Placeholder “Referencia (opcional)” si no es efectivo.
- Resumen Cobrado / Resta / Vuelto: tres cards `text-sm sm:text-base tabular-nums`, no `text-xs` apretado. Resta warning, vuelto info, cobrado fg.
- Migrar clases `gray-*` / `red-*` crudas del markup tocado a tokens (`text-fg`, `text-danger`, `border-danger-border`, etc.).
- Preservar: `+ Otro pago`, Auto-completar, `onCobrar` en Enter del monto, `data-pago-monto` en el primer pago, `desgloseVueltoEfectivo`, mensaje de ajuste redondeo.
- **No cambiar** la forma de `PagoLinea`.

**Archivos afectados:**

- `app/components/pos/PagoMultiMetodo.tsx`

**Validación intermedia:** abrir `/devoluciones` (reembolso) y cargar un monto grande: debe verse entero.

---

### Paso 3: Crear `CobroMontosForm`

Componente presentacional que arma la superficie de cobro.

**Props (contrato):**

```ts
interface CobroMontosFormProps {
  metodos: MetodoPago[]
  totalAPagar: number
  pagos: PagoLinea[]
  onPagosChange: (p: PagoLinea[]) => void
  onConfirmarMonto?: () => void // Enter en el input (clásico: confirmar; guiado: siguiente)
  redondeoEfectivoActivo?: boolean
  esCuentaCorriente?: boolean
  onSinSena?: () => void // solo CC; el padre decide (confirmar vs siguiente)
  clienteNombre?: string | null
}
```

**Acciones:**

- Cabecera: label “Total a pagar” + `formatARS(totalAPagar)` `text-3xl sm:text-4xl font-bold font-mono tabular-nums text-center`.
- Si `clienteNombre`, una línea muted debajo.
- Reusar `PagoRapidoChips` (targets ya 44 px). En CC, el label de la sección es “Seña (opcional)” + copy de deuda.
- Si `esCuentaCorriente` y `onSinSena`, botón “Sin seña — todo a cuenta” (`variant="secondary"`, `min-h-[48px]`).
- `PagoMultiMetodo` con `size="xl"` y `onCobrar={onConfirmarMonto}`.
- Cards cobrado/vuelto: si `PagoMultiMetodo` ya las muestra, **no duplicar**. Decisión: dejar el resumen **solo** en `PagoMultiMetodo` (una fuente). `PasoPago` hoy duplica cobrado/vuelto — al migrar, borrar el grid extra de `PasoPago`.
- Tokens v2. Sin `gray-*`.

**Archivos afectados:**

- `app/components/pos/CobroMontosForm.tsx` (nuevo)

---

### Paso 4: Crear `CobroPagoModal`

**Acciones:**

- Usar `Modal` v2: `open`, `onClose`, `title`, `size="xl"`, `mobileFullscreen` (default true), `footer` con Cancelar (`variant="secondary"`) + Confirmar (`Button` primary `size="lg"`).
- Body: `CobroMontosForm`.
- Al pasar `open` de false→true: si `pagos.length === 0 && totalAPagar > 0 && !esCuentaCorriente`, seed con `metodoPorDefecto` + `aplicarPagoRapido` (misma lógica que `cobrar()` líneas 580–588) y `focusPrimerMontoPago()`.
- Enter en monto / F2: si `puedeCobrar && !isCobrando` → `onConfirmar()`. Listener local (como `CobroGuiadoModal`), no pelear con Escape del Modal.
- CC: `onSinSena` → `onPagosChange([])` y `onConfirmar()` (el padre valida cliente).
- CTA footer disabled con la misma regla que hoy: `!puedeCobrar || isCobrando`. En CC `puedeCobrar` es true con ítems+stock; el padre igual rechaza sin cliente.
- Mostrar `error` del padre en el body.
- `onClose` no resetea pagos.

**Archivos afectados:**

- `app/components/pos/CobroPagoModal.tsx` (nuevo)

---

### Paso 5: Cablear `POSContainer`

**Acciones:**

- Estado `const [cobroPagoAbierto, setCobroPagoAbierto] = useState(false)`.
- `abrirCobroPago = () => { if (items.length === 0 || !stockOk) return; setError(null); setCobroPagoAbierto(true) }`.
- `iniciarCobro`: si `modoGuiado` → `abrirCobroGuiado()`; else → `abrirCobroPago()`.
- `modalAbierto` += `cobroPagoAbierto`.
- Hotkeys: si `cobroPagoAbierto`, **no** `return` ciego en F2 (el modal lo maneja). El `if (modalAbierto) return` actual bloquearía F2-confirmar: cambiar a `if (pesoModalPendiente || payloadPendiente || cobroGuiadoAbierto) return` y dejar que `CobroPagoModal` escuche F2, **o** si `cobroPagoAbierto && (F2|Ctrl+Enter)` → `cobrar()`. Elegir **una** de las dos (preferida: handler en el modal, y en el effect de POSContainer: `if (cobroPagoAbierto) return` igual que otros modales, porque el modal registra su propio listener). `CobroGuiadoModal` ya hace Enter internamente mientras POSContainer retorna si `modalAbierto`. **Replicar ese patrón:** incluir `cobroPagoAbierto` en `modalAbierto` y manejar F2/Enter **dentro** de `CobroPagoModal`.
- Sticky bar y footer del Drawer: siguen llamando `iniciarCobro` (ahora abre modal).
- `PanelPago.onCobrar={iniciarCobro}` (ya no `cobrar` directo).
- Render:

```tsx
<CobroPagoModal
  open={cobroPagoAbierto}
  onClose={() => setCobroPagoAbierto(false)}
  /* props de montos, cliente, error, isCobrando, esCuentaCorriente */
  onConfirmar={() => {
    cobrar()
  }}
/>
```

- Cerrar el modal al completar venta: en el success path de `finalizarVenta` (donde ya se resetea carrito), `setCobroPagoAbierto(false)`.
- Si `cobrar()` hace early return (seed — no debería si el modal ya seedó; o “elegí cliente”), el modal permanece abierto y muestra `error`.
- Ajustar el seed de `cobrar()`: si el modal ya seedó, `cobrar()` confirma. Si por bug se llama `cobrar()` con pagos vacíos y efectivo, el seed+return actual **no debe** ocurrir con el modal abierto (el usuario vería el modal sin confirmar). Guard: `if (cobroPagoAbierto && pagos vacíos && efectivo) { seed; return }` está bien la primera vez al abrir; al confirmar, los pagos ya existen. No hace falta cambiar `cobrar()` si el modal siempre seeda al abrir.

**Archivos afectados:**

- `app/components/pos/POSContainer.tsx`

---

### Paso 6: Simplificar `PanelPago`

**Acciones:**

- Eliminar imports y JSX de `PagoRapidoChips` y `PagoMultiMetodo`.
- Conservar: header Cobrar, chips Cliente/Descuento/Factura/Notas, secciones colapsables (cliente + saldo a favor, descuento, factura, notas), bloque total, error, CTA `hidden lg:flex`.
- Hint desktop: `F2 abre el cobro · ? para ayuda`.
- CTA label: igual (`Cobrar $…` / `Confirmar a cuenta $…`). `disabled={!puedeCobrar || isCobrando}` — **ojo:** en clásico `puedeCobrar` es false sin pagos. Si el CTA ahora **abre el modal**, debe habilitarse con carrito+stock (y en CC con cliente), no con pagos cubiertos. Extraer regla `puedeAbrirCobro`:

```
hayItems && stockOk && (!esCuentaCorriente || cliente)
```

  El total cubierto se valida **dentro del modal** (`puedeCobrarVenta`).

- Pasar esa regla como prop nueva `puedeAbrirCobro` **o** cambiar el significado de `puedeCobrar` en el panel (rompería el botón si alguien espera la regla vieja). **Hacer prop `puedeAbrirCobro`** y usar `puedeCobrar` solo en el modal/footer.
- Sticky bar en POSContainer: `disabled={!puedeAbrirCobro || isCobrando}`.

**Archivos afectados:**

- `app/components/pos/PanelPago.tsx`
- `app/components/pos/POSContainer.tsx` (prop y disabled de sticky/drawer)

---

### Paso 7: `PasoPago` del wizard usa `CobroMontosForm`

**Acciones:**

- Reemplazar el JSX de título/chips/`PagoMultiMetodo`/cards duplicadas por `<CobroMontosForm … onConfirmarMonto={onSiguiente} onSinSena={() => { onPagosChange([]); onSiguiente() }} />`.
- Conservar el contrato de props de `PasoPago` para no tocar `CobroGuiadoModal` salvo imports si hiciera falta.
- Footer “Siguiente” del wizard permanece.

**Archivos afectados:**

- `app/components/pos/cobro-guiado/PasoPago.tsx`

---

### Paso 8: Copy de config y atajos

**Acciones:**

- `PosModoCobroForm` opción `clasico`:
  - Título: `Panel + modal de cobro`
  - Descripción: `Cliente, descuento y notas en el panel derecho. F2 abre un modal para cargar el monto (pensado para cifras grandes y pantallas chicas).`
- Opción `guiado`: sin cambio de comportamiento; opcionalmente aclarar “el paso Pago usa los mismos montos grandes”.
- `PosAtajosHelp` `ATAJOS_CLASICO`:
  - F2 / Ctrl+Enter: `Abrir cobro`
  - Enter: `Confirmar cobro (con el monto en foco)`
  - Esc: `Cerrar cobro o volver al buscador`

**Archivos afectados:**

- `app/components/configuracion/PosModoCobroForm.tsx`
- `app/components/pos/PosAtajosHelp.tsx`

---

### Paso 9: Docs de workspace

**Acciones:**

- `CLAUDE.md` sección App CValleTienda — Design System v2: agregar que el cobro clásico usa `CobroPagoModal` (montos); chips Cliente/Descuento/Notas siguen en `PanelPago`.
- `contexto/proyectos.md` módulo POS: mencionar modal de cobro.

**Archivos afectados:**

- `CLAUDE.md`
- `contexto/proyectos.md`

---

### Paso 10: Tests y verificación

**Acciones:**

- Correr tests existentes (no deberían romper; no hay cambio de fórmulas):

```
cd app
npx tsx --test lib/pos/puede-cobrar.test.ts lib/pos/cobro-guiado-steps.test.ts
```

- No hace falta test unitario del layout. Checklist manual en Lista de Validación.
- Typecheck: `npx tsc --noEmit` en `app/` si el proyecto lo usa en scripts.

**Archivos afectados:**

- Ninguno de producción, salvo fix si tsc falla.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/devoluciones/DevolucionForm.tsx` — `PagoMultiMetodo` (layout nuevo, mismo API).
- `app/components/caja/CerrarSesionForm.tsx` — `InputMonedaARS` (no usa `xl` salvo que se lo pasemos; no hace falta).
- `app/components/ui/DesignShowcase.tsx` — showcase del input; opcional mostrar size xl.
- `app/app/(dashboard)/configuracion/cobros/page.tsx` — render de `PosModoCobroForm`.
- `app/lib/pos/hotkeys.ts` / `shouldIgnoreHotkey` — F2 no debe ignorarse fuera de inputs; dentro del monto el modal decide.

### Actualizaciones Necesarias para Consistencia

- Copy de modo de cobro (config + `?`).
- `CLAUDE.md` y `contexto/proyectos.md`.
- No actualizar planes viejos (`2026-06-08-pos-cobro-guiado-modal.md`, etc.); este plan es la fuente nueva.

### Impacto en Flujos de Trabajo Existentes

- **Cajero experto (notebook, clásico):** F2 abre modal con efectivo y monto seleccionado → Enter cobra. Misma intención, más espacio.
- **Distribuidora CC:** cliente se elige **antes** en el panel (como hoy, con el warning amarillo). El modal es seña opcional + confirmar.
- **Modo guiado:** sin cambio de pasos; montos más legibles.
- **Mobile:** sticky Cobrar abre overlay; no hay que scrollear el panel para tipear plata. Cliente/descuento siguen en el panel (scroll) o se eligen antes; si olvidan cliente en CC, el modal muestra el error y no cierra.
- **Devoluciones:** líneas de reembolso más altas; revisar que el form no se desborde.

---

## Lista de Validación

- [x] Modo clásico: chips Cliente / Descuento / Notas (y Factura si aplica) siguen en el panel; no hay input de monto en el panel.
- [x] F2 / Ctrl+Enter / CTA desktop / sticky mobile / drawer carrito abren `CobroPagoModal`.
- [x] Al abrir sin pagos (contado): seed efectivo, foco y select en el monto.
- [x] Monto a ancho completo (`InputMonedaARS` xl, stack). Recorte del grid 12 columnas eliminado. Verificación visual en dispositivo pendiente.
- [x] Enter o F2 en el modal confirma si el total está cubierto; Escape cierra y conserva pagos.
- [x] Resta > 0 (contado): CTA disabled; Resta visible en cards.
- [x] Vuelto en card; redondeo $100 intacto.
- [x] Multi-pago: “+ Otro pago” apila otra línea full-width.
- [x] CC: seña opcional; “Sin seña” confirma con `cobrar([])`. Sin cliente: no abre el modal (`puedeAbrirCobro`).
- [x] Modo guiado: 4 pasos intactos; `PasoPago` usa `CobroMontosForm`.
- [x] Monto en tercio superior del overlay (total + chips + input).
- [x] Tokens v2 en UI nueva/tocada.
- [x] `PagoMultiMetodo` stacked también en devoluciones (mismo API).
- [x] `puede-cobrar.test.ts` pasa (node:test). `cobro-guiado-steps.test.ts` usa vitest y el proyecto no lo tiene instalado (preexistente).
- [x] Impresión / `registrarVenta` sin cambios.
- [x] `CLAUDE.md` y `contexto/proyectos.md` actualizados.
- [x] Configuración → Cobros copy nuevo.

---

## Criterios de Éxito

1. En modo clásico, **ningún** monto de cobro se edita en el panel de 2/5 columnas.
2. Un total de 9+ caracteres (`$ 1.250.000,00`) es 100 % visible y editable en 360 px, 768 px y 1366 px.
3. Cliente, descuento y notas no se mueven al wizard ni se duplican en el modal.
4. F2 → modal → Enter cobra una venta de contado con efectivo en ≤ 3 acciones, con el monto prefilled.
5. Modo guiado y `registrarVenta` no cambian de contrato.

---

## Notas

- El recorte no era un bug de `formatARS` ni de `InputMonedaARS`: era **falta de ancho**. El modal es el contenedor; el stack es el layout. Hace falta las dos cosas.
- No unificar clásico y guiado en un solo modo: el wizard sigue sirviendo a cajeros nuevos que quieren que les pregunten cliente/descuento. Este plan les mejora el paso Pago gratis.
- Teclado numérico en pantalla: backlog. Reevaluar si hay quejas táctiles en tablet sin teclado físico.
- `PanelPago` en mobile sigue en el flujo de la página (cliente/descuento). Si más adelante molesta el scroll, se puede meter esos chips en un drawer; **fuera de este plan**.
- Al implementar, si `cobrar()` se dispara dos veces (Enter burbujea), `preventDefault` en el keydown del monto (ya existe en `PagoMultiMetodo`) + listener del modal deben coordinarse: el modal confirma, `onCobrar` del input no debe llamar `cobrar` **y** el modal otra vez. En clásico: `onConfirmarMonto` del form = `onConfirmar` del modal (una sola llamada).

---

## Notas de Implementación

**Implementado:** 2026-08-18

### Resumen

El cobro clásico ya no tipea plata en el panel derecho. Cliente / descuento / notas siguen ahí; F2, el CTA y la barra mobile abren `CobroPagoModal` con montos a ancho completo. El wizard guiado reutiliza `CobroMontosForm`. `PagoMultiMetodo` pasó de grid 12 columnas a stack (también mejora devoluciones).

### Desviaciones del Plan

- En cuenta corriente **sin cliente**, el modal no se abre (`puedeAbrirCobro`); el error se muestra en el panel. El plan mencionaba abrir el modal y mostrar el error adentro. Más simple: hay que elegir cliente antes.
- `cobrar()` acepta `pagosOverride` para que “Sin seña” confirme con `[]` y no use pagos stale del closure.
- `cobro-guiado-steps.test.ts` no se pudo correr con `tsx --test` porque importa `vitest` y el `package.json` de `app/` no lo incluye. `puede-cobrar.test.ts` sí pasó. `tsc --noEmit` OK.

### Problemas Encontrados

- Ninguno de producto. El test del wizard ya estaba desalineado con el runner del plan (vitest vs node:test).
