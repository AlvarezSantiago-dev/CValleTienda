# Plan: Rediseño UX Cobros (modal + orden auto + ayuda)

**Creado:** 2026-09-02
**Estado:** Implementado
**Pedido:** Rediseñar Cobros: alta/edición en modal, orden automático si no se toca, copy de ayuda genérico (sin nombres de personas de ejemplo).

---

## Descripción General

### Qué Logra Este Plan

Hace usable `/configuracion/cobros` en desktop y mobile: crear/editar **cuentas de fondos** y **métodos de pago** en `Modal` (DS v2), no en filas apretadas de tabla. El **orden** se asigna solo (`max + 1`) al crear si el usuario no lo define. Se agrega copy de ayuda que explica la relación cuenta ↔ método con lenguaje abstracto (sin nombres propios de clientes).

### Por Qué Importa

Cobros es configuración crítica del POS y de Caja. La UI actual (tabla + fila “Agregar” con inputs minúsculos) hace casi imposible dar de alta cuentas/métodos en tablet. Sin orden automático, todo queda en `0` y el POS no prioriza nada. Sin guía clara, el dueño confunde “dónde está la plata” con “qué botón cobro”.

---

## Estado Actual

### Estructura Existente Relevante

| Pieza | Rol |
|-------|-----|
| `app/app/(dashboard)/configuracion/cobros/page.tsx` | Página unificada: POS modo cobro, redondeo, cuentas, métodos |
| `app/components/configuracion/CuentasFondosManager.tsx` | CRUD cuentas: cards mobile + tabla desktop + fila/tarjeta inline de alta |
| `app/components/configuracion/MetodosPagoManager.tsx` | Idem métodos; exige cuenta activa |
| `app/app/actions/configuracion.ts` | `crearCuentaFondo` / `crearMetodoPago` / update / soft-delete; `orden` viene del client tal cual |
| `app/components/ui/Modal.tsx` | Primitive con footer, sizes, mobileFullscreen |
| `app/components/ui/Button.tsx`, `Input`, `Select` | Form controls DS |
| `referencia/modelo-saldos-cuentas.md` | Semántica de saldos (no UX de config) |
| Redirects legacy | `/configuracion/cuentas-fondos` y `/metodos-pago` → cobros |

### Brechas o Problemas que se Abordan

1. Alta inline en tabla: inputs angostos, labels apretados, imposible en viewports chicos/medios.
2. Edición desktop en-celda vs mobile accordion — dos paradigmas; unificar en modal.
3. `orden: Number(x) || 0` → todos en 0; no hay `max(orden)+1` en create de cuentas/métodos.
4. Copy actual no enseña el modelo mental cuenta vs método (solo “lugares donde se almacena” / “métodos del POS”).
5. `revalidatePath` en actions apunta a rutas viejas (`/metodos-pago`, `/cuentas-fondos`), no a `/configuracion/cobros`.

---

## Cambios Propuestos

### Resumen de Cambios

- Botón **“Agregar cuenta”** / **“Agregar método”** abre Modal (crear).
- Botón **Editar** abre el mismo Modal (editar); listado solo lectura (cards mobile + tabla o lista desktop simplificada).
- Campo **Orden** opcional en modal (sección “Avanzado” colapsable o hint); vacío/0 al crear → servidor calcula `max(orden)+1`.
- Callout de ayuda arriba de cada sección (genérico).
- Actions: helper `siguienteOrden`; revalidate `/configuracion/cobros`.
- Primitives: Button DS (no `<button>` raw negro), tokens danger/success, min-h touch.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| (ninguno obligatorio) | Preferir refactor in-place de los dos managers. Opcional: `CobrosAyudaCallout.tsx` si el copy se reutiliza. |

Si hace falta extraer formularios para legibilidad:

| Ruta | Propósito |
|------|-----------|
| `app/components/configuracion/CuentaFondoFormModal.tsx` | Modal crear/editar cuenta |
| `app/components/configuracion/MetodoPagoFormModal.tsx` | Modal crear/editar método |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `CuentasFondosManager.tsx` | Quitar alta inline; Modal; listado limpio; orden auto |
| `MetodosPagoManager.tsx` | Idem |
| `configuracion/cobros/page.tsx` | Copy de sección + callout de flujo (primero cuentas, después métodos) |
| `app/actions/configuracion.ts` | `siguienteOrden(tabla)`; create usa auto si `orden` null/≤0; `revalidatePath('/configuracion/cobros')` (+ legacy opcional) |
| `contexto/proyectos.md` (breve) | Anotar entrega UX Cobros |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Modal (no Drawer) para alta/edición**: formulario con 4–6 campos; `Modal` size `md`/`lg`, `mobileFullscreen` ya existe — suficiente y consistente con stock/caja.
2. **Orden auto en servidor**: al `crear*`, si `orden` es `undefined`, `null` o `≤ 0`, setear `max(orden de la tienda) + 1`. En edición, respetar el valor enviado (usuario puede reordenar).
3. **Orden en UI**: no obligatorio en el form de alta; mostrar en “Opciones avanzadas” (disclosure) con placeholder “Automático” / hint “Si lo dejás vacío, va al final”.
4. **Listado**: mobile = cards (como hoy, sin expandir form); desktop = tabla **solo lectura** + acciones Editar / Desactivar. Sin edición in-place.
5. **Copy de ayuda — genérico** (sin nombres de personas ni marcas de tenant):
   - **Cuentas:** “Cada cuenta es un lugar donde guardás plata (efectivo en caja, billetera digital, banco). Si varias personas o canales manejan dinero por separado, creá una cuenta por cada combinación.”
   - **Métodos:** “Cada método es el botón que ves en el POS. Tiene que apuntar a una cuenta: así sabés a qué saldo suma el cobro. Comisión y días de acreditación se usan al vender (Mercado Pago u otros con demora).”
   - **Página:** “Primero creá las cuentas; después los métodos que las usan.”
6. **Empty state métodos**: si no hay cuentas, callout + CTA a scrollear a cuentas (ya hay link a `/configuracion/cuentas-fondos`; preferir ancla `#cuentas-fondos` en la misma página cobros).
7. **No cambiar el modelo de datos** (sigue 1 método → 1 cuenta). Solo UX + orden.

### Alternativas Consideradas

| Alternativa | Por qué no |
|-------------|------------|
| Drawer bottom | Mejor para filtros; form de 6 campos cabe mejor en Modal fullscreen mobile |
| Wizard “cuenta + método” en un paso | Útil a futuro; este plan no mezcla entidades |
| Drag-and-drop orden | Más scope; auto + campo avanzado alcanza v1 |
| Copiar ejemplos con nombres reales del cliente | Pedido explícito: **no** |

### Preguntas Abiertas (si las hay)

1. ¿En edición el campo Orden queda siempre visible o solo en “Avanzado”?  
2. ¿Migrar datos existentes con todos `orden = 0` a una secuencia 1..N en una migración one-shot?

**Defaults si no hay respuesta:** Orden solo en Avanzado (crear y editar); **sí** migración ligera SQL o script en action “reordenar” no — mejor **al vuelo no**; opcional one-shot en migración `UPDATE ... SET orden = row_number` solo si se pide. Default: **no** tocar históricos; los nuevos sí van bien; el dueño puede editar orden a mano.

---

## Tareas Paso a Paso

### Paso 1 — Actions: orden automático + revalidate

**Acciones:**

- Agregar helper privado, p.ej.:

```ts
async function siguienteOrden(
  supabase: ...,
  tiendaId: string,
  tabla: 'cuentas_fondos' | 'metodos_pago'
): Promise<number> {
  const { data } = await supabase
    .from(tabla)
    .select('orden')
    .eq('tienda_id', tiendaId)
  const max = (data ?? []).reduce((m, r) => Math.max(m, Number(r.orden) || 0), 0)
  return max + 1
}
```

- En `crearCuentaFondo` / `crearMetodoPago`:  
  `const orden = input.orden > 0 ? input.orden : await siguienteOrden(...)`
- Hacer `orden` opcional en el tipo de input de create (`orden?: number`) o documentar que `0` = auto.
- `revalidatePath('/configuracion/cobros')` en create/update/eliminar/reactivar de cuentas y métodos (mantener paths legacy si siguen en redirects).

**Archivos afectados:**

- `app/app/actions/configuracion.ts`

---

### Paso 2 — Modal cuenta de fondos

**Acciones:**

- Refactor `CuentasFondosManager`:
  - Estado `modal: null | { mode: 'crear' } | { mode: 'editar', id }`
  - CTA primaria `Button` “Agregar cuenta”
  - `Modal` title “Nueva cuenta” / “Editar cuenta”; campos: Nombre*, Tipo*, Descripción, Color; Avanzado: Orden (opcional)
  - Footer: Cancelar + Guardar/Crear (`Button` DS)
  - Al crear: no enviar orden o enviar `0` → server auto
  - Listado mobile cards + desktop table **sin** fila de alta ni inputs en celdas
  - Editar abre modal prellenado; Desactivar/Reactivar fuera del modal (o en footer del edit)
- Callout ayuda (tokens `bg-info-soft` / `border-info-border` o `bg-surface-sunken`) con el copy genérico de cuentas.
- `id="cuentas-fondos"` en el section wrapper (page o manager).

**Archivos afectados:**

- `CuentasFondosManager.tsx`
- opcional `CuentaFondoFormModal.tsx`

---

### Paso 3 — Modal método de pago

**Acciones:**

- Mismo patrón en `MetodosPagoManager`:
  - Campos: Nombre*, Cuenta de fondos*, Comisión %, Días acreditación; Avanzado: Orden
  - Placeholder comisión/días con defaults 0
  - Si `cuentasActivas.length === 0`: empty state + link `#cuentas-fondos`
- Callout ayuda genérico de métodos.
- Quitar fila/tarjeta inline “Nuevo método”.

**Archivos afectados:**

- `MetodosPagoManager.tsx`
- opcional `MetodoPagoFormModal.tsx`

---

### Paso 4 — Página Cobros: copy de flujo

**Acciones:**

- En `cobros/page.tsx`, encima de las secciones de cuentas/métodos, un párrafo o callout único:

  > **Cómo armar los cobros:** primero las **cuentas de fondos** (dónde queda la plata). Después los **métodos de pago** (botones del POS), cada uno apuntando a una cuenta. Si manejás efectivo y digital por separado —o distintas personas con su propia caja/billetera— usá una cuenta por cada lugar y un método por cada forma de cobrar.

- Ajustar `description` del `ConfiguracionShell` si hace falta (corto).
- `contentClassName`: valorar `max-w-5xl` para tablas más holgadas post-rediseño.

**Archivos afectados:**

- `configuracion/cobros/page.tsx`

---

### Paso 5 — Pulido DS + docs

**Acciones:**

- Reemplazar botones raw `bg-fg text-white` por `Button` / `Button variant="secondary"|"danger"`.
- Errores con tokens `danger-soft` (evitar `text-red-800` hardcode).
- Touch: CTAs `min-h-11` en mobile.
- Actualizar `contexto/proyectos.md` (línea Configuración / Cobros).
- Opcional una línea en `referencia/modelo-saldos-cuentas.md` apuntando a la UX de Cobros (no obligatorio).
- `npm run build`.

**Archivos afectados:**

- Managers, page, docs

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- POS / ventas / caja: leen métodos y cuentas; **no** cambian contratos si solo cambia UX de config.
- Dashboard saldos: `listarCuentasFondos` — sin cambio.
- Redirects `cuentas-fondos` / `metodos-pago` → cobros.

### Actualizaciones Necesarias para Consistencia

- `revalidatePath` → cobros
- Copy coherente en page + callouts de cada manager (no contradecirse)

### Impacto en Flujos de Trabajo Existentes

- Mismos campos y reglas de negocio; solo cambia interacción.
- Orden de métodos en POS puede empezar a reflejar secuencia útil en altas nuevas.

---

## Lista de Validación

- [x] Agregar cuenta abre Modal usable en ~390px y desktop
- [x] Agregar método abre Modal; exige cuenta; sin cuentas → empty + ancla
- [x] Crear sin tocar Orden → queda `max+1` (no todos en 0)
- [x] Crear con Orden = 5 → respeta 5
- [x] Editar no pisa orden salvo que el usuario lo cambie
- [x] No hay fila inline de alta en tablas
- [x] Copy de ayuda **sin** nombres propios de ejemplo (personas/tenant)
- [x] Primitives DS (`Button`, tokens); sin anti-DS obvio
- [x] Tras guardar, lista se refresca en `/configuracion/cobros`
- [x] `npm run build` OK

---

## Criterios de Éxito

1. Un owner puede crear cuenta + método en &lt; 1 minuto en teléfono sin zoom horizontal.
2. Los nuevos ítems aparecen al final del orden sin configurar el campo.
3. Queda claro qué es cuenta vs método sin consultar soporte.

---

## Notas

- Relacionado: unificación Cobros en `planes/2026-05-28-reestructuracion-configuracion.md` (estructura de tabs ya hecha; este plan es UX de las tablas).
- Fase 2: drag-and-drop orden; “crear método sugiriendo nombre = cuenta”; wizard cuenta+método.
- No tocar PrintBridge ni ledger de ventas.

---

## Notas de Implementación

**Implementado:** 2026-09-02

### Resumen

Modal DS para crear/editar cuentas y métodos; listados solo lectura; `siguienteOrden` / `resolverOrdenCreacion` en actions; `revalidateCobros()` incluye `/configuracion/cobros`; callouts genéricos + flujo en la página; `max-w-5xl`.

### Desviaciones del Plan

- No se extrajeron `CuentaFondoFormModal.tsx` / `MetodoPagoFormModal.tsx` (refactor in-place).
- No se tocó `referencia/modelo-saldos-cuentas.md` (opcional).
- Históricos con `orden = 0` no se migran (default del plan).

### Problemas Encontrados

Ninguno. `npm run build` OK.
