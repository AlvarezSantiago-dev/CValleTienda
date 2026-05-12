# Plan: Búsqueda por código de barras + autofoco global

**Creado:** 2026-04-29
**Estado:** Borrador
**Pedido:** Mejorar la entrada por escáner de códigos de barras en POS y Productos, y un sistema de autofoco bien hecho donde corresponda.

---

## Descripción General

### Qué Logra Este Plan

Endurecer el flujo de escáner de códigos de barras en todo el sistema y aplicar un patrón consistente de **autofoco** en los lugares de alto tráfico (POS, alta/edición de productos, búsqueda de productos, modales). Hoy el POS ya tiene la base — el plan extiende esa lógica al resto y la generaliza con un hook reutilizable.

### Por Qué Importa

El cajero tipea poco y escanea mucho. Cada click extra para volver a poner el foco al input es fricción real que se nota a fin de día. Además, al cargar variantes nuevas con un escáner físico, hoy no hay un flujo claro: este plan deja un patrón estándar **"focus → escaneo → llenado → siguiente"**.

---

## Estado Actual

### Estructura Existente Relevante

- **POS — `app/components/pos/BuscadorVariantes.tsx`** ya implementa:
  - `inputRef.current?.focus()` en `useEffect` de mount
  - Debounce 250 ms; **0 ms** si el query es 13 dígitos (EAN-13)
  - Si el resultado es match único + es EAN-13 → `onSelect()` automático y refoco.
  - Refoco también tras `handleSelect`.
- **POS — `POSContainer.tsx`**: pasa `onSelect` → `addItem`. Tras cobrar (`registrarVenta`), `reset()` limpia el carrito pero **no devuelve el foco al buscador**.
- **Productos — `Buscador.tsx`**: simple input con debounce 300 ms que sincroniza `?q=` en URL. **Sin autofoco**, sin tratamiento especial de escaneo.
- **Productos — `ProductoForm.tsx`** (alta/edición): primer campo `nombre`, **sin autofoco**.
- **Productos — `VariantesEditor.tsx`**: cada fila tiene un input `codigo_barras` libre. No hay un flujo "escanear para una variante específica".
- **Clientes — `ClienteForm.tsx` / `NuevoClienteModal.tsx`**: sin autofoco al abrir.
- **Stock — `IngresoForm.tsx` / `AjusteForm.tsx`**: sin autofoco.
- **Componente UI base — `app/components/ui/Input.tsx`**: ya soporta `ref` (forwardRef) — confirmado por el uso en BuscadorVariantes.

### Brechas o Problemas que se Abordan

1. **POS post-cobro**: el foco no vuelve al buscador automáticamente, se queda en el botón "Cobrar".
2. **POS detección de escáner**: solo dispara auto-add con EAN-13 (13 dígitos). Códigos de 8 (EAN-8), 12 (UPC-A), 14 (ITF-14) y códigos internos no auto-disparan.
3. **Productos buscador**: si el usuario escanea un código en `/productos`, debería detectar el match exacto y navegar al detalle (o resaltarlo). Hoy solo filtra.
4. **VariantesEditor**: un cajero con escáner no tiene una UX clara para "escaneá ahora el código de esta variante". Hoy hay que clickear en el input correcto manualmente.
5. **Falta de hook compartido**: la lógica de autofoco + detección de escaneo se va a repetir; conviene extraerla.

---

## Cambios Propuestos

### Resumen de Cambios

- Crear hook `useAutoFocus(deps)` — refoco programable.
- Crear hook `useBarcodeScanner({ onScan, minLength, timeoutMs })` — detección heurística de escaneo (entrada rápida + Enter, o longitud mínima de dígitos).
- POS: aplicar refoco tras cobrar, generalizar detección a cualquier código numérico ≥ 8 dígitos, agregar listener global de teclado (escaneos fuera del input también capturados).
- Productos: autofoco en buscador, navegar al detalle si el escaneo matchea exacto.
- ProductoForm: autofoco en `nombre` al alta; en edición foco al primer campo editable.
- VariantesEditor: botón "Escanear" por fila que abre captura modal o foco directo al input (decisión: foco directo + indicación visual).
- ClienteForm / IngresoForm / AjusteForm / Modales: autofoco en primer campo.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
|---|---|
| `app/lib/hooks/useAutoFocus.ts` | Hook genérico que enfoca un ref al montar y/o cuando cambian dependencias. |
| `app/lib/hooks/useBarcodeScanner.ts` | Detector global de escaneo basado en velocidad de tecleo + `Enter`. |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
|---|---|
| `app/components/pos/BuscadorVariantes.tsx` | Usar `useAutoFocus`; ampliar regex de EAN a `/^\d{8,14}$/`; aceptar `Enter` como trigger inmediato; exponer `focus()` vía ref imperativo para que el padre refoque tras cobrar. |
| `app/components/pos/POSContainer.tsx` | Tras `registrarVenta` (post-imprimir), llamar `buscadorRef.current?.focus()`. Capturar `Esc` global para enfocar el buscador. |
| `app/components/productos/Buscador.tsx` | Autofoco al montar; al detectar escaneo (`useBarcodeScanner` o `Enter` + valor numérico ≥ 8) buscar match exacto por `codigo_barras` y navegar a `/productos/{id}`. |
| `app/components/productos/ProductoForm.tsx` | Autofoco en input `nombre`. |
| `app/components/productos/VariantesEditor.tsx` | Cada fila: input `codigo_barras` con `useRef` y un botón secundario "🔍 Escanear" que enfoca el input y selecciona su contenido. Listener `onKeyDown` Enter → enfocar input de la siguiente fila. |
| `app/components/clientes/ClienteForm.tsx` | Autofoco en primer campo (nombre). |
| `app/components/clientes/NuevoClienteModal.tsx` | Autofoco al abrir el modal. |
| `app/components/stock/IngresoForm.tsx` | Autofoco en input de variante / cantidad. |
| `app/components/stock/AjusteForm.tsx` | Autofoco en motivo. |
| `app/components/ui/Input.tsx` | Soportar prop `autoFocus` ya nativa de React; dejar comentario explicando por qué se prefiere `useAutoFocus` cuando hay re-renders. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Heurística de escaneo basada en velocidad + Enter, NO en librería externa**.
   Justificación: los escáneres USB se comportan como teclado virtual y disparan teclas a > 100 caracteres/segundo seguidas de `Enter`. Detectar eso a mano es ~30 líneas; agregar dependencia (`@react-aria` o similar) es sobreingeniería.

2. **Regex `/^\d{8,14}$/` en lugar de solo EAN-13**.
   Justificación: cubre EAN-8, UPC-A (12), EAN-13, ITF-14 y códigos internos. Si tiene 8-14 dígitos, lo tratamos como código.

3. **`useBarcodeScanner` global vía `window.addEventListener('keydown')` se aplica SOLO en `/pos`**.
   Justificación: es la pantalla donde el cajero escanea sin mirar al input. En productos/clientes el foco explícito es suficiente.

4. **Refoco en POS post-venta se hace después de iniciar la impresión**, no antes.
   Justificación: que la impresión arranque sin que un keyup accidental lo dispare otra vez.

5. **VariantesEditor: foco al input + selección, sin modal de escaneo**.
   Justificación: el modal era una idea inicial pero rompe el flujo del teclado. Click en "🔍 Escanear" → foco al input → el cajero dispara el lector → el código aparece. Más simple.

6. **`useAutoFocus(ref, deps?)` separado de `useBarcodeScanner`**.
   Justificación: composabilidad. `useAutoFocus` se reusa en formularios sin escáner.

### Alternativas Consideradas

- **Web Serial / WebUSB**: rechazado. Requiere permisos, scanners varían en protocolo, los USB-HID (modo teclado) son universales.
- **Librería `react-barcode-reader`**: rechazado. ~10 KB para 30 líneas de código + se pisa con foco existente.
- **Atajos de teclado custom (`/` para enfocar)**: válido pero secundario, no es lo que pidió el usuario. Se puede agregar después.

### Preguntas Abiertas

Ninguna — el alcance está claro. Se puede implementar en paralelo a otras tareas.

---

## Tareas Paso a Paso

### Paso 1: Crear `useAutoFocus`

Hook simple que enfoca un ref al montar y, opcionalmente, cuando cambian sus dependencias.

**Archivo:** `app/lib/hooks/useAutoFocus.ts`

**Contenido:**
```ts
import { useEffect, type RefObject } from 'react'

/**
 * Enfoca el elemento referenciado al montar.
 * Si se pasan deps, refoca cuando cambian.
 *
 * @param ref Ref al input/textarea a enfocar.
 * @param deps Dependencias adicionales que disparan refoco.
 * @param select Si true, selecciona el contenido tras enfocar.
 */
export function useAutoFocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  deps: unknown[] = [],
  select = false
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    if (select && 'select' in el && typeof (el as HTMLInputElement).select === 'function') {
      ;(el as HTMLInputElement).select()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
```

---

### Paso 2: Crear `useBarcodeScanner`

Hook que escucha keydown global y detecta secuencias rápidas terminadas en Enter.

**Archivo:** `app/lib/hooks/useBarcodeScanner.ts`

**Especificación:**
- Props: `{ onScan: (code: string) => void, enabled?: boolean, minLength?: number, maxIntervalMs?: number }`.
- Defaults: `enabled=true`, `minLength=8`, `maxIntervalMs=30`.
- Mantener buffer interno; resetear si el intervalo entre teclas supera `maxIntervalMs`.
- Al recibir `Enter`, si el buffer cumple `minLength` y es `/^[A-Za-z0-9_-]+$/`, llamar `onScan(buffer)` y resetear.
- Ignorar si el evento viene desde un `<input>`/`<textarea>`/`contentEditable` (esos casos los maneja el input local).
- Listener en `window`. Cleanup en unmount.

```ts
'use client'
import { useEffect, useRef } from 'react'

interface Options {
  onScan: (code: string) => void
  enabled?: boolean
  minLength?: number
  maxIntervalMs?: number
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 8,
  maxIntervalMs = 30,
}: Options) {
  const bufferRef = useRef('')
  const lastTsRef = useRef(0)
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    if (!enabled) return
    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      const now = performance.now()
      const dt = now - lastTsRef.current
      if (dt > maxIntervalMs) bufferRef.current = ''
      lastTsRef.current = now
      if (e.key === 'Enter') {
        const code = bufferRef.current
        bufferRef.current = ''
        if (code.length >= minLength && /^[A-Za-z0-9_-]+$/.test(code)) {
          onScanRef.current(code)
        }
        return
      }
      if (e.key.length === 1) bufferRef.current += e.key
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, minLength, maxIntervalMs])
}
```

---

### Paso 3: Refactor `BuscadorVariantes` (POS)

**Archivo:** `app/components/pos/BuscadorVariantes.tsx`

**Acciones:**
- Reemplazar `useEffect(focus)` por `useAutoFocus(inputRef)`.
- Cambiar regex de EAN-13 por `/^\d{8,14}$/` para ampliar a EAN-8/UPC/ITF-14.
- Aceptar tecla **Enter** en el input → si el query es numérico ≥ 8, dispara búsqueda inmediata sin esperar debounce.
- Exponer método imperativo `focus()` con `useImperativeHandle` para que el padre refoque tras cobrar.
- Cambiar firma a `forwardRef` con `BuscadorVariantesHandle = { focus: () => void }`.

---

### Paso 4: POS — refoco post-venta y captura global de escáner

**Archivo:** `app/components/pos/POSContainer.tsx`

**Acciones:**
- Crear `const buscadorRef = useRef<BuscadorVariantesHandle>(null)` y pasarlo a `<BuscadorVariantes ref={buscadorRef} ... />`.
- Tras `registrarVenta` ok (después de disparar `imprimir(...)`), llamar `buscadorRef.current?.focus()`.
- Agregar `useBarcodeScanner({ onScan: handleScan })` donde `handleScan(codigo)` ejecuta `buscarVariantesAction(codigo)` y, si hay match único, lo agrega al carrito; si no, enfoca el buscador con el valor pre-cargado.

---

### Paso 5: Buscador de Productos con autofoco + auto-navegación

**Archivo:** `app/components/productos/Buscador.tsx`

**Acciones:**
- Importar `useRef`, `useRouter` ya está.
- `const inputRef = useRef<HTMLInputElement>(null); useAutoFocus(inputRef)`.
- Handler `onKeyDown`: si `Enter` y `value` es `/^[A-Za-z0-9_-]{8,14}$/`, hacer fetch a una server action `buscarProductoPorCodigoBarras(codigo)` que devuelve `{ producto_id }` y navegar a `/productos/${id}`.

**Nuevo server action:** agregar en `app/app/actions/productos.ts`:
```ts
export async function buscarProductoPorCodigoBarras(
  codigo: string
): Promise<ActionResult<{ producto_id: string } | null>> { ... }
```
Hace `select producto_id from variantes_producto where tienda_id=? and codigo_barras=?` y devuelve el primero.

---

### Paso 6: Autofoco en formularios de alta/edición

**Archivos:**
- `app/components/productos/ProductoForm.tsx`: `useAutoFocus` en input `nombre`.
- `app/components/clientes/ClienteForm.tsx`: idem.
- `app/components/clientes/NuevoClienteModal.tsx`: enfocar al abrir (deps `[abierto]`).
- `app/components/stock/IngresoForm.tsx`: enfocar en input principal.
- `app/components/stock/AjusteForm.tsx`: enfocar en motivo.

Cada uno: agregar `const inputRef = useRef<HTMLInputElement>(null)`, pasarlo al primer Input relevante y `useAutoFocus(inputRef, [deps relevantes])`.

---

### Paso 7: VariantesEditor — flujo "escanear esta variante"

**Archivo:** `app/components/productos/VariantesEditor.tsx`

**Acciones:**
- Mantener un array `inputsRef = useRef<(HTMLInputElement | null)[]>([])` indexado por fila.
- Agregar botón "🔍 Escanear" al lado de `BarcodeButton` (o reemplazarlo si redundante) que al click llama `inputsRef.current[idx]?.focus(); inputsRef.current[idx]?.select()`.
- En el input `codigo_barras`, agregar `onKeyDown`: si `Enter`, `inputsRef.current[idx+1]?.focus()` (avanzar a la siguiente fila).
- En `add()`, programar foco en la nueva fila tras render: `setTimeout(() => inputsRef.current[next.length-1]?.focus(), 0)`.

---

### Paso 8: Validación TypeScript

**Acciones:**
- `cd app && node "node_modules/typescript/bin/tsc" --noEmit`
- Corregir cualquier error.

---

### Paso 9: Pruebas manuales

**Acciones:**
- POS: escanear con scanner físico mientras el foco está en el botón Cobrar → debe agregar al carrito. Cobrar → foco vuelve al buscador.
- Productos: ir a `/productos`, escanear un código existente → debería abrir el detalle.
- Productos: alta producto → cursor parpadea en "Nombre" sin click.
- VariantesEditor: agregar 3 variantes vacías, click "🔍 Escanear" en la 1ra → escanear → Enter → foco salta a la 2da → escanear → etc.
- Clientes: abrir modal nuevo cliente → foco en "Nombre".

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/(dashboard)/pos/page.tsx` — usa `POSContainer`.
- `app/(dashboard)/productos/page.tsx`, `/nuevo`, `/[id]` — usan `Buscador` y `ProductoForm`.

### Actualizaciones Necesarias para Consistencia

- Actualizar `contexto/proyectos.md` mencionando el sistema de autofoco + escáner integrado.
- Marcar como completado en `planes/2026-04-29-modulo-impresion.md` la nota relacionada al escáner si la había.

### Impacto en Flujos de Trabajo Existentes

- **POS**: cambia el comportamiento del foco post-venta (mejora). Los cajeros lo notarán en el primer uso.
- **Productos**: agregar atajo "escanear → ir al detalle" puede sorprender; agregar tooltip/hint en el placeholder.
- **VariantesEditor**: agregar botón "🔍 Escanear" puede confundir al lado de `BarcodeButton` (que genera código). Reordenar visualmente: primero "Escanear" (entrada), luego "Generar" (alternativa).

---

## Lista de Validación

- [ ] `tsc --noEmit` pasa sin errores
- [ ] Hook `useAutoFocus` creado y exportado
- [ ] Hook `useBarcodeScanner` creado y exportado
- [ ] POS refoca al buscador tras cobrar
- [ ] POS captura escaneos globales (cuando el foco no está en el buscador)
- [ ] POS detecta códigos de 8 a 14 dígitos
- [ ] Buscador de productos autofocado al cargar página
- [ ] Buscador de productos navega al detalle si el escaneo matchea código exacto
- [ ] Server action `buscarProductoPorCodigoBarras` creada
- [ ] ProductoForm autofocado en "Nombre"
- [ ] VariantesEditor: botón "Escanear" enfoca el input correspondiente; Enter avanza fila
- [ ] ClienteForm + NuevoClienteModal autofocados
- [ ] IngresoForm + AjusteForm autofocados
- [ ] Pruebas manuales con scanner físico exitosas

---

## Criterios de Éxito

La implementación está completa cuando:

1. El cajero puede operar el POS un día entero **sin tocar el mouse** salvo para casos excepcionales.
2. Cargar 10 variantes nuevas con códigos vía escáner toma menos de 30 segundos (vs. >2 minutos hoy).
3. Escanear un código en `/productos` lleva al detalle del producto si existe; si no, lo deja como filtro normal.
4. Todos los formularios de alta tienen el cursor pre-posicionado al cargar.

---

## Notas

- Si en el futuro se quiere atajo de teclado `/` para enfocar el buscador del POS desde cualquier lado, es una línea extra en `useBarcodeScanner` (capturar `/` antes de Enter).
- Si más adelante se necesita soporte de scanners Bluetooth con prefijo (algunos envían `~~CODE\n`), el `useBarcodeScanner` ya lo tolera porque solo mira velocidad + Enter; bastaría con strip del prefijo.
- Considerar agregar un toast sutil "Código X no encontrado" cuando el escáner global no matchea, para feedback al cajero.
