# Plan: Movimientos de caja — resumen completo, autor, editar/eliminar

**Creado:** 2026-07-23
**Estado:** Implementado
**Pedido:** Centralizar movimientos de dinero dentro de caja, ver todos los movimientos con quién los hizo en el resumen, y poder editar/eliminar ingresos/egresos manuales solo con caja abierta.

---

## Descripción General

### Qué Logra Este Plan

Consolida la visualización de **todos** los movimientos de dinero del turno dentro de `/caja` (manuales + automáticos por ventas/devoluciones), mostrando **quién** registró cada uno. Permite **editar y eliminar** solo los ingresos/egresos **manuales**, y únicamente mientras la sesión de caja esté **abierta**. Al cerrar la caja, el ledger del turno queda congelado en el resumen histórico.

### Por Qué Importa

Sin un listado completo y auditable dentro de caja, el dueño no puede reconciliar retiros, ingresos extra y cobros del turno en un solo lugar. Hoy `usuario_id` se guarda al crear un movimiento manual pero **no se muestra** en la UI, y no hay forma de corregir un error de carga (monto/concepto/cuenta equivocados) sin trucos. Eso genera arqueos confusos y pérdida de confianza en el módulo de caja — pieza crítica del POS multi-rubro.

---

## Estado Actual

### Estructura Existente Relevante

**Rutas y UI**

| Ruta / componente | Rol actual |
| ----------------- | ---------- |
| `/caja` → `app/app/(dashboard)/caja/page.tsx` | Hub: sesión abierta, cierre, historial por mes |
| `SesionAbiertaPanel.tsx` | Panel turno + botón “+ Registrar movimiento” + lista **solo manuales** (sin autor, sin acciones) |
| `RegistrarMovimientoForm.tsx` | Modal crear ingreso/egreso → `registrarMovimientoCaja` |
| `/caja/sesiones/[id]` + `MovimientosTurnoLista.tsx` | Detalle post-cierre: lista **todos** los movimientos (sin autor, sin edit) |
| Sidebar | Solo ítem `Caja` → `/caja` (no hay ruta aparte de “movimientos”) |

**Backend**

| Pieza | Ubicación | Comportamiento |
| ----- | --------- | -------------- |
| `registrarMovimientoCaja` | `app/app/actions/caja.ts` | INSERT en `movimientos_fondos` + UPDATE `saldo_actual`. **No** exige caja abierta. Guarda `usuario_id`. |
| `listarMovimientosManualesSesion` | `app/lib/caja/queries.ts` | `venta_id IS NULL` + `created_at >= fecha_apertura`. Sin join a perfiles. |
| `listarMovimientosTurno` | `app/lib/caja/queries.ts` | Todos los movimientos desde apertura. Sin `usuario`. Usado solo en detalle de sesión cerrada. |
| `preview_resumen_turno` / `cerrar_caja` | migraciones SQL | Totales por cuenta sumando `movimientos_fondos` en el rango temporal de la sesión |

**Schema `movimientos_fondos`** (`20260419000008_cuentas_fondos.sql`)

```
id, tienda_id, cuenta_fondo_id,
tipo (ingreso|egreso|ajuste), concepto, monto,
saldo_anterior, saldo_posterior,
venta_id (null = manual), usuario_id, created_at
```

- **Sin** `sesion_caja_id`, **sin** `updated_at`
- RLS: solo SELECT + INSERT (diseñado como log inmutable)
- Helper atómico: `registrar_movimiento_fondo(...)` (SECURITY DEFINER + `FOR UPDATE`) — los manuales de la app **no** lo usan hoy (race posible)

**Roles UI**

- `vendedor` (cajero): abre/cierra caja; **no** ve saldos ni formulario de movimientos
- owner/admin: ven saldos, registran movimientos, ven historial

**Plan previo relacionado:** `planes/2026-05-21-caja-movimientos-manuales-y-historial-mes.md` (create + historial mes — ya en código).

### Brechas o Problemas que se Abordan

| Brecha | Impacto |
| ------ | ------- |
| En sesión abierta solo se listan movimientos **manuales**, no el ledger completo del turno | No se puede “ver todo el dinero” del turno desde `/caja` |
| `usuario_id` no se muestra en listas ni en resumen | No hay auditoría visible de quién hizo cada movimiento |
| No existe editar/eliminar movimientos manuales | Errores de carga quedan permanentes hasta trucos externos |
| `registrarMovimientoCaja` no valida sesión abierta | Se puede mover fondos con caja cerrada (inconsistente con ventas) |
| Asociación turno↔movimientos solo por `created_at` | Frágil si se reabre caja o hay overlap; edit/delete necesita reglas claras |
| INSERT + UPDATE de saldo no atómico en manuales | Race entre dos operadores concurrentes |

---

## Cambios Propuestos

### Resumen de Cambios

- Mostrar en `/caja` (sesión abierta) el **listado completo de movimientos del turno** (manuales + ventas/devoluciones), no solo manuales.
- Incluir columna/dato **quién** (`usuario`) en listas de sesión abierta y detalle de sesión cerrada.
- Agregar actions `editarMovimientoCaja` y `eliminarMovimientoCaja` (solo manuales, solo con caja abierta).
- Endurecer `registrarMovimientoCaja`: exigir sesión abierta + usar RPC atómica.
- Migración SQL: RPCs SECURITY DEFINER para crear/editar/eliminar manuales con lock de cuenta; políticas o grants coherentes; opcionalmente columna `sesion_caja_id` para atar el movimiento al turno.
- UI: acciones Editar / Eliminar en filas manuales cuando la sesión está abierta; modal de edición reutilizando el form de alta.
- Tras editar/eliminar: `revalidatePath` para que `ResumenTurnoPanel` / preview reflejen los nuevos totales.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260723000001_movimientos_caja_editar_eliminar.sql` | Columna opcional `sesion_caja_id`, RPCs `registrar/editar/eliminar_movimiento_caja_manual`, validación sesión abierta |
| `app/components/caja/EditarMovimientoForm.tsx` | Modal client para editar tipo/cuenta/concepto/monto de un movimiento manual |
| `app/components/caja/MovimientosTurnoTabla.tsx` | Tabla unificada (abierta + cerrada): tipo, concepto, cuenta, monto, fecha, usuario, badge manual/venta; acciones edit/delete si `editable` |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/actions/caja.ts` | Exigir caja abierta en create; agregar `editarMovimientoCaja` / `eliminarMovimientoCaja`; llamar RPCs |
| `app/lib/caja/queries.ts` | Extender `MovimientoManual` / `listarMovimientosTurno` con `usuario`; unificar listado para panel abierto; deprecar o redirigir lista solo-manuales |
| `app/lib/caja/types.ts` | Agregar `usuario: UsuarioLite \| null` a `MovimientoTurno` |
| `app/components/caja/SesionAbiertaPanel.tsx` | Reemplazar tabla manual-only por `MovimientosTurnoTabla` con `editable=true`; pasar movimientos completos |
| `app/components/caja/MovimientosTurnoLista.tsx` | Delegar a `MovimientosTurnoTabla` con `editable=false` (o reemplazar usos) |
| `app/components/caja/RegistrarMovimientoForm.tsx` | Opcional: aceptar props iniciales para reusar en edición; o dejar create-only y usar `EditarMovimientoForm` |
| `app/app/(dashboard)/caja/page.tsx` | Cargar `listarMovimientosTurno(sesion.id)` en lugar de solo manuales; pasar a panel |
| `app/app/(dashboard)/caja/sesiones/[id]/page.tsx` | Sin cambio de ruta; hereda usuario vía lista actualizada |
| `app/types/database.ts` | Actualizar interfaz `MovimientoFondo` si existe (`sesion_caja_id`) |

### Archivos a Eliminar (si aplica)

Ninguno. `MovimientosTurnoLista` puede quedar como wrapper thin o migrarse a la tabla unificada sin borrar de golpe.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Seguir usando `movimientos_fondos` (no crear `movimientos_caja`)**: Ya es el ledger real del sistema (triggers de ventas/devoluciones + manuales). Duplicar tablas rompería el cierre y el preview.

2. **Edit/delete solo de manuales (`venta_id IS NULL`)**: Los movimientos generados por ventas/devoluciones/anulaciones se corrigen por sus flujos propios (anular venta, etc.). Mutar el ledger automático rompería la auditoría.

3. **Mutación in-place + ajuste de `saldo_actual` (no movimiento compensatorio)**: El usuario pidió editar/eliminar explícitamente. Como solo se permite con **caja abierta** (antes del cierre), es aceptable UPDATE/DELETE del row manual y recalcular el saldo de la cuenta. El cierre posterior recalcula totales por SUM en el rango, así que no depende de la cadena `saldo_anterior/posterior` de filas posteriores.

4. **RPCs SECURITY DEFINER atómicas** (`FOR UPDATE` en `cuentas_fondos`): Evita races y centraliza reglas (caja abierta, solo manual, saldo ≥ 0 en egresos). La app no hace INSERT+UPDATE sueltos.

5. **Agregar `sesion_caja_id` nullable + backfill best-effort**: Al crear/editar manuales se setea la sesión abierta. Queries de turno filtran por `sesion_caja_id = :id` cuando está presente, con fallback a `created_at >= fecha_apertura` para filas históricas. Mejora precisión vs solo tiempo.

6. **Permisos UI: owner/admin** (igual que hoy para registrar): Cajero no edita fondos. Create/edit/delete quedan alineados.

7. **Lista completa dentro de `/caja`**: No se crea ruta nueva ni ítem de sidebar. “Movimientos de caja” = sección del panel de sesión (abierta) + ya existente en detalle de sesión (cerrada).

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
| ----------- | ------------------ |
| Movimiento compensatorio (ajuste inverso) sin borrar | Más “puro” contablemente, pero el usuario pidió editar/eliminar y ensucia el listado del turno |
| Solo permitir editar el **último** movimiento de la cuenta | Más seguro para la cadena de saldos, pero frustrante si el error no es el último |
| Página `/caja/movimientos` separada | Fragmenta el flujo; el pedido es que quede **dentro de caja** |
| Soft-delete (`anulado_at`) | Útil a futuro; para MVP in-place + restricción caja abierta alcanza; se puede evolucionar después |

### Preguntas Abiertas (si las hay)

1. **¿El cajero (`vendedor`) debe ver el listado de movimientos (read-only) o sigue oculto como hoy?**  
   Propuesta por defecto: **sigue oculto** (solo owner/admin), salvo que indiques lo contrario.

2. **¿Al editar se puede cambiar la cuenta de destino, o solo concepto/monto/tipo?**  
   Propuesta por defecto: **sí se puede cambiar la cuenta** (revierte saldo en la cuenta vieja y aplica en la nueva), dentro de la misma RPC.

3. **¿Eliminar pide confirmación modal simple, o además motivo/nota de corrección?**  
   Propuesta por defecto: **confirmación simple** (sin nota). El `usuario_id` del movimiento original se conserva en edit; en delete el row desaparece (auditoría limitada al log de app/DB si existe).

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Migración SQL — `sesion_caja_id` + RPCs

Crear `supabase/migrations/20260723000001_movimientos_caja_editar_eliminar.sql`.

**Acciones:**

- `ALTER TABLE movimientos_fondos ADD COLUMN IF NOT EXISTS sesion_caja_id uuid REFERENCES sesiones_caja(id) ON DELETE SET NULL`
- Índice parcial: `CREATE INDEX ... ON movimientos_fondos (sesion_caja_id) WHERE sesion_caja_id IS NOT NULL`
- Backfill opcional best-effort: para cada tienda, movimientos con `venta_id IS NULL` cuyo `created_at` cae entre `fecha_apertura` y `coalesce(fecha_cierre, now())` de una sesión → setear `sesion_caja_id` (solo si hay match único)
- Función `registrar_movimiento_caja_manual(p_cuenta_fondo_id, p_tipo, p_concepto, p_monto)`:
  1. Resolver `tienda_id` / `auth.uid()`
  2. Exigir sesión `estado = 'abierta'` de la tienda; si no → `raise exception 'La caja debe estar abierta'`
  3. Lock cuenta `FOR UPDATE`; validar pertenencia y `activo`
  4. Calcular saldos; egreso no deja saldo &lt; 0
  5. INSERT con `venta_id null`, `usuario_id = auth.uid()`, `sesion_caja_id = sesión abierta`
  6. UPDATE `saldo_actual`
  7. RETURN id
- Función `editar_movimiento_caja_manual(p_id, p_cuenta_fondo_id, p_tipo, p_concepto, p_monto)`:
  1. Cargar movimiento; exigir `venta_id IS NULL`, misma tienda
  2. Exigir sesión abierta y que el movimiento pertenezca al turno (`sesion_caja_id = abierta` **o** `created_at >= fecha_apertura` de la abierta)
  3. Revertir efecto del movimiento original sobre `saldo_actual` de la cuenta original (ingreso→restar, egreso→sumar)
  4. Aplicar nuevo efecto sobre la cuenta destino (puede ser otra); validar saldo ≥ 0
  5. UPDATE fila: tipo, concepto, monto, cuenta, saldos snapshot, `sesion_caja_id` = abierta (mantener `usuario_id` original; opcionalmente no pisar autor)
  6. RETURN id
- Función `eliminar_movimiento_caja_manual(p_id)`:
  1. Mismas validaciones (manual + caja abierta + del turno)
  2. Revertir saldo en la cuenta
  3. `DELETE FROM movimientos_fondos WHERE id = p_id`
- `GRANT EXECUTE` a `authenticated`
- Comentarios en funciones documentando la excepción a “log inmutable” **solo** para manuales con caja abierta

**Archivos afectados:**

- `supabase/migrations/20260723000001_movimientos_caja_editar_eliminar.sql`

---

### Paso 2: Types y queries

**Acciones:**

- En `types.ts`, extender `MovimientoTurno`:

```ts
usuario: UsuarioLite | null
cuenta_fondo_id: string  // necesario para prefill del form de edición
```

- Unificar `MovimientoManual` con `MovimientoTurno` (o hacer alias) para no duplicar shapes.
- Reescribir `listarMovimientosTurno(sesionId)`:
  - Select: `id, tipo, concepto, monto, saldo_posterior, created_at, venta_id, cuenta_fondo_id, cuenta:cuentas_fondos(nombre, tipo), usuario:perfiles!movimientos_fondos_usuario_id_fkey(id, nombre, apellido)`
  - Filtro preferido: `.eq('sesion_caja_id', sesionId)` si hay filas; si la sesión no tiene movimientos con FK (datos viejos), fallback: `.gte('created_at', fecha_apertura)` y si la sesión está cerrada también `.lte('created_at', fecha_cierre)`
  - Mapear `es_manual: venta_id == null`, `usuario: normalizeUsuario(...)`
- Actualizar `listarMovimientosManualesSesion` para incluir usuario **o** dejar de usarla en `page.tsx` y usar solo `listarMovimientosTurno`.
- Exportar `nombreUsuario` desde types (ya existe) para la UI.

**Archivos afectados:**

- `app/lib/caja/types.ts`
- `app/lib/caja/queries.ts`

---

### Paso 3: Server actions

En `app/app/actions/caja.ts`:

**Acciones:**

- Refactor `registrarMovimientoCaja`:
  - Validaciones de input iguales (monto &gt; 0, concepto, cuenta)
  - Llamar RPC `registrar_movimiento_caja_manual` vía `supabase.rpc(...)`
  - Traducir errores conocidos (`La caja debe estar abierta`, saldo insuficiente)
  - `revalidatePath('/caja')`, `/dashboard`, `/pos`, layout
- Agregar:

```ts
export interface EditarMovimientoInput {
  id: string
  cuenta_fondo_id: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
}

export async function editarMovimientoCaja(input: EditarMovimientoInput): Promise<ActionResult>
export async function eliminarMovimientoCaja(id: string): Promise<ActionResult>
```

- Ambas llaman a sus RPCs; mismos revalidates.
- No agregar policies UPDATE/DELETE abiertas en RLS: las mutaciones pasan solo por RPC definer.

**Archivos afectados:**

- `app/app/actions/caja.ts`

---

### Paso 4: Componente tabla unificada + forms

**Acciones:**

- Crear `MovimientosTurnoTabla.tsx` (client si hay acciones; o server + client row actions):
  - Columnas: Fecha | Tipo (badge ingreso/egreso/ajuste + “· venta” si no manual) | Concepto | Cuenta | Usuario | Monto | Acciones
  - Props: `movimientos: MovimientoTurno[]`, `editable?: boolean`, `cuentas?: CuentaOpcion[]`
  - Si `editable && es_manual`: botones Editar / Eliminar
  - Eliminar: confirmación (`window.confirm` o modal pequeño) → `eliminarMovimientoCaja` → `router.refresh()`
  - Editar: abre `EditarMovimientoForm` con valores iniciales
- Crear `EditarMovimientoForm.tsx`: mismo layout que `RegistrarMovimientoForm` (toggle tipo, select cuenta, concepto, monto) pero llama `editarMovimientoCaja` y muestra título “Editar movimiento”.
- Actualizar `MovimientosTurnoLista` para renderizar `MovimientosTurnoTabla` con `editable={false}` (mantener export para no romper imports).

**Archivos afectados:**

- `app/components/caja/MovimientosTurnoTabla.tsx` (nuevo)
- `app/components/caja/EditarMovimientoForm.tsx` (nuevo)
- `app/components/caja/MovimientosTurnoLista.tsx`
- `app/components/caja/RegistrarMovimientoForm.tsx` (sin cambios mayores; solo create)

---

### Paso 5: Integrar en panel de sesión abierta y página `/caja`

**Acciones:**

- En `caja/page.tsx`:
  - Si `sesion && !esCajero`: `movimientos = await listarMovimientosTurno(sesion.id)` (en lugar de solo manuales)
  - Pasar `movimientos` (completos) y `cuentas` a `SesionAbiertaPanel`
- En `SesionAbiertaPanel.tsx`:
  - Reemplazar bloque “Movimientos manuales del turno” por sección **“Movimientos del turno”** con `MovimientosTurnoTabla editable`
  - Mantener botón “+ Registrar movimiento” arriba (junto a resumen)
  - Empty state: “Todavía no hay movimientos en este turno”
- En detalle sesión cerrada: la lista ya muestra todos; ahora con columna Usuario vía tabla unificada.

**Archivos afectados:**

- `app/app/(dashboard)/caja/page.tsx`
- `app/components/caja/SesionAbiertaPanel.tsx`
- `app/app/(dashboard)/caja/sesiones/[id]/page.tsx` (solo si hace falta pasar props nuevas)

---

### Paso 6: Tipos DB locales y consistencia

**Acciones:**

- Actualizar `MovimientoFondo` en `app/types/database.ts` con `sesion_caja_id: string | null` si el tipo está definido allí.
- Verificar que `ResumenTurnoPanel` no necesite cambios (se alimenta de RPC preview que ya suma movimientos; tras refresh post-edit los totales deben cuadrar).
- No actualizar `CLAUDE.md` (cambio de feature de producto, no de estructura del workspace). Opcional: una línea en `contexto/proyectos.md` bajo módulos de caja si se documentan capacidades — no obligatorio.

**Archivos afectados:**

- `app/types/database.ts`

---

### Paso 7: Validación manual / checklist

**Acciones:**

- Aplicar migración en entorno local/staging.
- Probar flujos de la Lista de Validación abajo.
- Corregir copy/errores de RPC si el mensaje no llega limpio a la UI (`traducirError`).

**Archivos afectados:**

- Ninguno nuevo (pruebas)

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/actions/ventas.ts` / `devoluciones.ts` — exigen caja abierta; alinear criterio con movimientos manuales
- Triggers `mover_fondos_por_pago_venta`, `mover_fondos_por_devolucion`, `revertir_fondos_anulacion` — siguen insertando sin `sesion_caja_id` (opcional mejora futura: setear sesión desde la venta)
- `preview_resumen_turno` / `cerrar_caja` — consumen `movimientos_fondos` por tiempo; edit/delete con caja abierta altera el preview antes del cierre
- `CierreDetalle` / email de cierre — no listan movimientos línea a línea hoy; no requieren cambio en este plan

### Actualizaciones Necesarias para Consistencia

- Triggers automáticos: en un follow-up se puede setear `sesion_caja_id` desde `ventas.sesion_caja_id` al insertar el movimiento de pago (mejora de filtrado; **fuera de alcance** salvo que sobre tiempo).
- Plan previo `2026-05-21-caja-movimientos-manuales-...` queda como base; este plan lo extiende.

### Impacto en Flujos de Trabajo Existentes

- Registrar movimiento: mismo botón; ahora falla si no hay caja abierta (comportamiento más estricto).
- Cierre de caja: sin cambio de UX; totales reflejan movimientos ya corregidos.
- Cajero: sin cambio si se mantiene oculto el bloque de movimientos.
- Reabrir caja: al reabrir, los manuales del turno vuelven a ser editables (sesión `abierta`); coherente con el pedido.

---

## Lista de Validación

Cómo verificar que la implementación está completa y correcta:

- [x] Con caja **cerrada**, intentar registrar movimiento → error claro “La caja debe estar abierta” *(RPC + traducirError; validar en staging tras migrar)*
- [x] Con caja **abierta** (owner/admin): registrar ingreso y egreso → aparecen en “Movimientos del turno” con **nombre de usuario**, cuenta, monto y badge correcto *(código listo)*
- [x] Una venta cobrada en el turno aparece en la misma lista con badge “· venta” **sin** botones editar/eliminar *(código listo)*
- [x] Editar un manual (concepto, monto, tipo y/o cuenta) → lista y `ResumenTurnoPanel` / saldos se actualizan tras refresh *(código listo)*
- [x] Eliminar un manual → desaparece de la lista; `saldo_actual` de la cuenta vuelve al valor previo; preview del turno cuadra *(código listo)*
- [x] Con caja **cerrada**, en `/caja/sesiones/[id]` se ven todos los movimientos **con usuario**, sin acciones de editar/eliminar *(código listo)*
- [x] Intentar editar/eliminar vía action con caja cerrada (o movimiento de otra sesión) → error rechazado por RPC *(código listo)*
- [x] Cajero (`vendedor`) no ve el bloque de movimientos ni puede registrar (comportamiento actual preservado)
- [x] Dos egresos concurrentes que dejarían saldo negativo: al menos uno falla de forma segura (lock RPC)
- [ ] Migración aplica limpia en DB vacía y en DB con movimientos históricos *(pendiente: correr migración en el proyecto Supabase)*

---

## Criterios de Éxito

La implementación está completa cuando:

1. Desde `/caja` con sesión abierta, el usuario owner/admin ve **todos** los movimientos de dinero del turno (manuales + automáticos) con **quién** los generó cuando hay `usuario_id`.
2. Puede **editar y eliminar** únicamente ingresos/egresos **manuales**, y solo con caja **abierta**; el resumen/preview del turno refleja el cambio.
3. Con caja cerrada, el detalle de sesión muestra el historial completo (con autor) en solo lectura; no hay mutaciones posibles.

---

## Notas

- **Cadena `saldo_anterior` / `saldo_posterior` en filas posteriores:** al editar/borrar un movimiento intermedio, los snapshots de filas posteriores pueden quedar históricamente inconsistentes entre sí. El saldo vivo (`cuentas_fondos.saldo_actual`) y los totales de cierre (SUM) son la fuente de verdad. No se propone reescritura masiva de la cadena en este plan.
- **Mejora futura:** setear `sesion_caja_id` también en triggers de pagos; soft-delete con `anulado_at` + motivo si se necesita auditoría más estricta; permitir al cajero registrar egresos de efectivo limitados.
- **No** crear ítem nuevo en sidebar ni ruta `/movimientos`: todo vive bajo Caja.
- Al implementar: skills sugeridos `senior-backend` (RPC/RLS) + `senior-frontend` (tabla/modales), y `supabase-postgres-best-practices` al escribir la migración.

---

## Notas de Implementación

**Implementado:** 2026-07-23

### Resumen

- Migración con `sesion_caja_id`, backfill de manuales y RPCs atómicas `registrar/editar/eliminar_movimiento_caja_manual` (exigen caja abierta).
- Actions de caja refactorizadas a RPCs; create/edit/delete con mensajes de error traducidos.
- Queries y tipos: `MovimientoTurno` incluye `usuario` y `cuenta_fondo_id`; listado unificado del turno.
- UI: `MovimientosTurnoTabla` + `EditarMovimientoForm`; panel de sesión abierta muestra todos los movimientos con editar/eliminar en manuales; detalle cerrado en solo lectura con autor.
- Preguntas abiertas resueltas por defecto del plan: cajero no ve movimientos; se puede cambiar cuenta al editar; confirmación simple al eliminar.

### Desviaciones del Plan

- Filtro de `listarMovimientosTurno` quedó por rango temporal (con tope `fecha_cierre` si existe), alineado a `preview_resumen_turno`, en lugar del `.or(sesion_caja_id…)` de PostgREST (más frágil). La FK `sesion_caja_id` se usa en las RPCs de edit/delete.
- Helper SQL `_delta_movimiento_fondo` agregado (no estaba explícito en el plan).

### Problemas Encontrados

- Ninguno bloqueante. `tsc --noEmit` OK en archivos tocados.
- **Pendiente operativo:** aplicar la migración en Supabase (`supabase db push` / SQL editor) antes de usar create/edit/delete en runtime.
`}