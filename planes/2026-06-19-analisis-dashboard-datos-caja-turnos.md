# Plan: Análisis del dashboard vs datos de caja, turnos y cierre

**Creado:** 2026-06-19
**Estado:** Implementado
**Pedido:** Analizar cómo se comporta el dashboard respecto a los datos (¿compara con el día?), considerar doble turno de cajeros en el mismo día, y verificar que al cerrar caja no se rompa nada.

---

## Descripción General

### Qué Logra Este Plan

Documenta **cómo el dashboard agrega datos hoy**, dónde usa **día calendario** vs **sesión de caja**, qué pasa con **doble turno** (apertura → cierre → nueva apertura el mismo día), y qué **inconsistencias de UX o datos** existen cuando la caja está cerrada. Incluye un plan de verificación y mejoras propuestas para alinear lo que ve el dueño con lo que pasó operativamente.

### Por Qué Importa

El dueño abre `/dashboard` cada mañana esperando entender “cómo va el negocio **hoy**”. Pero el sistema mezcla dos modelos distintos:

1. **Día calendario** (00:00–23:59 ART) — usado en casi todos los KPIs.
2. **Sesión de caja** (apertura → cierre) — usado solo en el banner de caja y en `/caja`.

Con **dos cajeros en el mismo día** (turno mañana + turno tarde), esos números **no coinciden** y puede parecer que “el dashboard está roto” aunque los datos en BD sean correctos. Hay que decidir si eso es aceptable (con mejor etiquetado) o si hay que agregar métricas por turno/día.

---

## Estado Actual

### Arquitectura de datos del dashboard

```
/dashboard (page.tsx)
├── obtenerSesionAbierta()          → sesión ABIERTA (si existe)
├── obtenerKpisDia()                → ventas/devoluciones por DÍA calendario AR
├── obtenerKpisMes()                → mes calendario vs mes anterior (mismo día)
├── obtenerSerieVentas14Dias()      → ventas por DÍA (bruto, sin devoluciones)
├── obtenerTopProductosMes()        → mes calendario hasta hoy
├── obtenerTopVar1Mes()             → mes calendario hasta hoy
├── obtenerGananciaBrutaMes()       → mes calendario + RPC + egresos/comisiones
├── obtenerUltimasVentas(5)         → últimas 5 ventas SIN filtro de fecha
├── obtenerUltimasDevoluciones(5)   → últimas 5 devoluciones SIN filtro de fecha
├── obtenerTopClientesHistorico()   → histórico acumulado (tabla clientes)
├── obtenerStockBajoCount()         → snapshot actual
└── obtenerSaldosCuentas()          → saldo_actual global + pendientes acreditación

Layout (todas las páginas del dashboard)
└── AvisoCajaCerrada()              → segunda consulta a obtenerSesionAbierta()
```

**Zona horaria:** todo el dashboard usa `America/Argentina/Buenos_Aires` vía `app/lib/datetime.ts` (`hoyArgentinaYmd`, `ymdFromIso`, `inicioDiaArgentina`, etc.). Esto está bien alineado con reportes y cierre de caja.

### Tabla: cada widget vs fuente y alcance temporal

| Widget / KPI | Fuente | Alcance temporal | ¿Usa sesión de caja? | Comparación |
|--------------|--------|------------------|----------------------|-------------|
| **Ventas hoy (neto)** | `ventas.created_at` | Día calendario hoy AR | No | vs ayer (mismo criterio) |
| **Cant. ventas hoy** | idem | Día calendario hoy AR | No | vs ayer |
| **Ticket promedio hoy** | idem | Día calendario hoy AR | No | — |
| **Ventas del mes** | idem | Mes calendario 1 → hoy | No | vs mes anterior hasta mismo día |
| **Gráfico 14 días** | idem | 14 días calendario (bruto) | No | — |
| **Top productos / var1** | `detalles_venta` + venta | Mes calendario | No | — |
| **Ganancia bruta** | RPC + movimientos | Mes calendario | No | — |
| **Últimas ventas** | `listarVentas` | **Sin filtro de fecha** (últimas 5 globales) | No | — |
| **Top clientes** | `clientes.monto_total` | **Histórico total** | No | — |
| **Saldos disponibles** | `cuentas_fondos.saldo_actual` | **Estado actual** (global) | No | — |
| **EstadoCajaBanner** | `obtenerSesionAbierta` | **Solo sesión abierta actual** | **Sí** | — |
| **AvisoCajaCerrada** (layout) | idem | Binario: hay sesión abierta o no | **Sí** | — |

**Conclusión clave:** el dashboard responde “¿cómo va **el día de negocio calendario**?” en los KPIs, pero el banner responde “¿cómo va **el turno de caja actual**?”. Son preguntas distintas.

### Cómo se calculan los KPIs del día

`obtenerKpisDia()` (`app/lib/dashboard/queries.ts`):

1. Trae ventas completadas con `created_at` entre **inicio de ayer** e **inicio de mañana** (ART).
2. Clasifica cada venta con `ymdFromIso(created_at)` → bucket `hoy` o `ayer`.
3. Devoluciones de hoy: solo `tipo_resolucion != 'cambio'` (reembolsos que salen plata).
4. **Neto hoy** = ventas hoy − devoluciones reembolso hoy.
5. **Delta %** = hoy vs ayer (cantidad y monto bruto de ventas).

**No filtra por `sesion_caja_id`.** Una venta cuenta en “hoy” por la hora del ticket, no por el turno en que se abrió la caja.

### Cómo se calcula el banner de caja

`EstadoCajaBanner` + `obtenerSesionAbierta()`:

- Si hay sesión **abierta**: muestra hora de apertura + `total_ventas_cantidad` / `total_ventas_monto` de **esa sesión** (query por `sesion_caja_id`).
- Si **no** hay sesión abierta: “Caja cerrada” + link a abrir.

Además, `AvisoCajaCerrada` en el layout repite el aviso en **todas** las páginas cuando no hay sesión abierta.

---

## Brechas y Problemas Identificados

### 1. Doble turno el mismo día — desalineación banner vs KPIs

**Escenario:**

| Hora | Acción | Ventas del turno |
|------|--------|------------------|
| 08:00 | Cajero A abre caja | — |
| 08:00–13:00 | Ventas turno mañana | $80.000 (20 ventas) |
| 13:00 | Cajero A **cierra caja** | — |
| 14:00 | Cajero B abre caja | — |
| 14:00–20:00 | Ventas turno tarde | $50.000 (12 ventas) |

**Qué ve el dueño en el dashboard (tarde, caja abierta):**

| Elemento | Valor mostrado | Correcto para… |
|----------|----------------|----------------|
| Ventas hoy (neto) | ~$130.000 | **Todo el día calendario** ✓ |
| EstadoCajaBanner | “12 ventas · $50.000” | **Solo turno tarde** ✓ para turno, ✗ si el usuario espera “hoy” |
| Entre turnos (13:00–14:00, caja cerrada) | KPI $80k + banner “Caja cerrada” | Confuso: “cerrada pero ya vendí $80k hoy” |

**Riesgo:** el dueño compara el KPI principal ($130k) con el banner ($50k) y cree que hay un error.

**Severidad:** Media (UX / confianza). Los datos en BD son correctos; la UI no explica el criterio.

---

### 2. Sesión que cruza medianoche — desalineación KPI vs banner

**Escenario:** caja abierta 22:00 del día D, ventas a las 01:00 del día D+1, sesión sigue abierta.

| Elemento | Comportamiento |
|----------|----------------|
| Ventas hoy (día D+1) | Solo cuenta ventas con `created_at` en D+1 |
| Banner sesión | Suma **todas** las ventas de la sesión (incluye las de D) |

**Resultado:** KPI “hoy” < ventas del banner. Mismo tipo de confusión que doble turno, pero por cruce de fecha.

**Severidad:** Baja en retail típico (cierran antes de medianoche); Alta si hay turnos nocturnos.

---

### 3. Doble aviso de “caja cerrada”

Cuando no hay sesión abierta, el usuario ve:

1. `AvisoCajaCerrada` — barra amarilla fija en **todo el layout**.
2. `EstadoCajaBanner` — card amarilla duplicada **solo en /dashboard**.

**Severidad:** Baja (ruido visual).

---

### 4. Gráfico 14 días vs KPI “neto hoy” — definiciones distintas

- KPI principal: **neto** (resta devoluciones reembolso).
- Gráfico: **bruto** (solo ventas completadas, sin restar devoluciones). El subtítulo lo aclara, pero el dueño puede no leerlo.

**Severidad:** Baja.

---

### 5. “Últimas ventas” no son “del día”

`obtenerUltimasVentas(5)` llama `listarVentas({ pageSize: 5 })` **sin** `soloHoy`. Puede mostrar ventas de ayer si hoy hubo pocas operaciones.

**Severidad:** Baja.

---

### 6. Cierre de caja — ¿se rompe el dashboard?

**Flujo al cerrar** (`cerrarSesion` en `app/app/actions/caja.ts`):

- RPC `cerrar_caja` persiste cierre + detalle.
- `revalidatePath('/caja')`, `/pos`, `/ventas`, `'/', 'layout'`.
- **No** hace `revalidatePath('/dashboard')` explícito, pero `'/', 'layout'` invalida el layout (incluye `AvisoCajaCerrada`).

**Flujo al vender** (`crearVenta`):

- Requiere sesión abierta; si no hay → error en POS (no venta huérfana).
- `revalidatePath('/dashboard')` **sí** se llama.

**Comportamiento esperado post-cierre:**

| Área | Comportamiento | ¿Se rompe? |
|------|----------------|------------|
| KPIs “hoy” | Siguen contando ventas ya hechas (por `created_at`) | **No** — correcto |
| Banner caja | Pasa a “Caja cerrada” | **No** — correcto |
| POS | No permite vender sin abrir | **No** — correcto |
| Saldos | Reflejan movimientos reales (ventas ya impactaron fondos) | **No** |
| Sesión cerrada en historial | `/caja` historial + detalle sesión | **No** (mejorado recientemente) |
| Dashboard cache | Layout revalidado; page debería refrescar al navegar | **Probablemente OK**; conviene test manual |

**Riesgo menor:** si el admin deja el dashboard abierto sin navegar tras un cierre remoto, podría ver banner “caja abierta” stale hasta refresh. Next.js no hace polling.

**Severidad:** Muy baja.

---

### 7. Consulta duplicada de sesión abierta

Por cada carga de `/dashboard`:

- `page.tsx` → `obtenerSesionAbierta()`
- `layout.tsx` → `AvisoCajaCerrada` → `obtenerSesionAbierta()` otra vez

`obtenerSesionAbierta` en caja hace varias queries (ventas sesión + saldos + pagos pendientes). El dashboard solo usa totales de ventas para el banner, pero paga el costo completo.

**Severidad:** Baja (performance).

---

### 8. KPIs no reflejan cantidad de turnos del día

El dashboard **no muestra**:

- Cuántas sesiones se abrieron/cerraron hoy.
- Ventas por sesión vs ventas del día.
- Link rápido al último cierre del día.

Eso obliga al dueño a ir a `/caja` → historial del mes para auditar turnos.

**Severidad:** Media (feature gap para multi-turno).

---

## Matriz de escenarios de prueba

Ejecutar manualmente (o automatizar después) estos casos:

| # | Escenario | Pasos | Resultado esperado dashboard | Qué validar |
|---|-----------|-------|------------------------------|-------------|
| T1 | Día sin ventas, caja cerrada | No abrir caja | KPIs en $0; banner + aviso layout “cerrada” | Coherencia |
| T2 | Un turno, caja abierta | Abrir → 3 ventas | KPI = banner (mismos totales) | **Deben coincidir** |
| T3 | Doble turno mismo día | T1 cierra → T2 abre → ventas en cada uno | KPI = suma ambos turnos; banner = solo turno actual | Documentar diferencia |
| T4 | Cierre con arqueo | Declarar efectivo y cerrar | KPIs unchanged; banner “cerrada”; POS bloqueado | revalidate |
| T5 | Cierre emergencia | Cerrar sin arqueo | Igual T4 | Historial marca emergencia |
| T6 | Devolución reembolso hoy | Venta ayer, devolución hoy | KPI neto hoy baja; gráfico 14d no cambia ayer | Definiciones |
| T7 | Venta después de medianoche (sesión abierta) | Sesión D 22h, venta D+1 01h | KPI “hoy” solo venta post-medianoche; banner suma todo | Edge case |
| T8 | Reabrir sesión cerrada | Reopen desde detalle | Banner vuelve a abierta; KPIs sin cambio | Integridad |

---

## Cambios Propuestos

### Resumen de cambios (fase implementación futura)

1. **Clarificar etiquetas** en KPIs y banner (“Hoy calendario” vs “Turno actual”).
2. **Enriquecer `EstadoCajaBanner`** con resumen del día cuando hay doble turno o caja cerrada con ventas hoy.
3. **Eliminar duplicación** de aviso caja cerrada (layout XOR banner).
4. **Agregar bloque “Turnos de hoy”** en dashboard (opcional, recomendado).
5. **Optimizar** fetch de sesión (query liviana para banner).
6. **Tests** de agregación día calendario + test integración post-cierre.

### Nuevos archivos a crear (implementación)

| Ruta | Propósito |
|------|-----------|
| `app/lib/dashboard/queries-sesion-dia.ts` | `obtenerResumenDiaCaja()`: sesiones del día, ventas por sesión vs ventas calendario |
| `app/components/dashboard/TurnosHoyCard.tsx` | Lista sesiones de hoy con totales y link a detalle |
| `app/lib/dashboard/kpis-dia.test.ts` | Tests unitarios buckets hoy/ayer con fixtures TZ |
| `salidas/2026-06-19-analisis-dashboard-caja.md` | Resumen ejecutivo para el cliente (opcional) |

### Archivos a modificar (implementación)

| Archivo | Cambios |
|---------|---------|
| `app/components/dashboard/EstadoCajaBanner.tsx` | Mostrar turno actual + “Hoy en total: X ventas · $Y”; si cerrada y hubo ventas hoy, no parecer “día vacío” |
| `app/app/(dashboard)/dashboard/page.tsx` | Pasar `kpisDia` al banner; agregar `TurnosHoyCard`; quitar redundancia con layout |
| `app/components/layout/AvisoCajaCerrada.tsx` | Ocultar en `/dashboard` si `EstadoCajaBanner` ya informa; o unificar en un solo componente |
| `app/lib/caja/queries.ts` | `obtenerSesionAbiertaLite()` — solo id, fecha_apertura, totales ventas sesión (sin saldos) |
| `app/lib/dashboard/queries.ts` | `obtenerSesionesHoy()`, filtrar `obtenerUltimasVentas` con `soloHoy: true` (opcional) |
| `app/app/actions/caja.ts` | Agregar `revalidatePath('/dashboard')` explícito al cerrar/abrir |

---

## Decisiones de Diseño

### Decisiones clave

1. **Mantener KPIs por día calendario** — Es el estándar de “¿cómo va el negocio hoy?” para dueños y comparación ayer/mes. No reemplazar por sesión de caja.

2. **Agregar contexto de turno sin mezclar KPIs** — El banner y/o card “Turnos hoy” explican la diferencia cuando hay multi-turno.

3. **Sesión vs día en overnight** — Documentar como limitación conocida; solución futura opcional: toggle “Ver por turno / Ver por día” (solo admin).

4. **Cierre de caja no debe alterar KPIs históricos del día** — Correcto hoy; no cambiar.

### Alternativas consideradas

| Alternativa | Por qué se rechazó (por ahora) |
|-------------|--------------------------------|
| KPIs solo por sesión abierta | Rompe comparación ayer/mes y días con caja cerrada entre turnos |
| Unificar todo en sesión del “día de negocio” configurable | Complejidad alta; pocos clientes lo piden aún |
| Ocultar KPIs cuando caja cerrada | Empeora UX; el dueño quiere ver ventas del día aunque la caja esté cerrada |

### Preguntas abiertas

1. **¿El dueño quiere ver “ventas del turno actual” como KPI destacado además del día?** — Propuesta: sí, en el banner o card secundaria, no reemplazar el KPI principal.

2. **¿Mostrar sesiones cerradas del día en el dashboard aunque la caja esté abierta?** — Propuesta: sí, en `TurnosHoyCard` colapsable.

3. **¿Últimas ventas deben ser solo de hoy?** — Propuesta: sí, o subtítulo “Últimas del día” vs “Últimas globales”.

---

## Tareas Paso a Paso

### Paso 1: Auditoría manual (sin código)

**Acciones:**

- Ejecutar matriz T1–T8 en entorno de prueba.
- Capturar screenshots: doble turno, post-cierre, entre turnos.
- Anotar discrepancias banner vs KPI con números reales.

**Entregable:** checklist completado en este plan o en `salidas/`.

---

### Paso 2: Documentar criterios en UI (quick win)

**Acciones:**

- Cambiar label “Ventas hoy (neto)” → “Ventas de hoy (neto)” + tooltip/sub: “Calendario · incluye todos los turnos”.
- En `EstadoCajaBanner`, cuando hay sesión abierta: subtítulo “Turno actual · desde HH:MM”.
- Cuando caja cerrada y `kpisDia.hoy.cantidad > 0`: “Caja cerrada · hoy se registraron X ventas ($Y)”.

**Archivos:** `EstadoCajaBanner.tsx`, `dashboard/page.tsx`.

---

### Paso 3: Query `obtenerSesionesHoy` + `TurnosHoyCard`

**Acciones:**

- Query: sesiones con `fecha_apertura` en rango día calendario AR (incluye abiertas y cerradas).
- Por cada sesión: totales ventas (ya en `listarSesionesPorMes` o query dedicada).
- Componente card con filas: apertura, cierre, usuario, ventas, link `/caja/sesiones/[id]`.

**Archivos:** `queries.ts` (dashboard o caja), `TurnosHoyCard.tsx`, `page.tsx`.

---

### Paso 4: Deduplicar aviso caja cerrada

**Acciones:**

- Opción A: `AvisoCajaCerrada` no renderiza en rutas `/dashboard` y `/caja`.
- Opción B: un solo `CajaStatusBar` compartido layout + dashboard.

**Archivos:** `AvisoCajaCerrada.tsx`, `layout.tsx`.

---

### Paso 5: Optimización y revalidación

**Acciones:**

- `obtenerSesionAbiertaLite()` para banner (sin saldos ni pending MP).
- `revalidatePath('/dashboard')` en `abrirSesion`, `cerrarSesion`, `cerrarSesionEmergencia`.

**Archivos:** `caja/queries.ts`, `actions/caja.ts`.

---

### Paso 6: Tests automatizados

**Acciones:**

- Tests `ymdFromIso` + buckets KPI con timestamps 23:59 / 00:01 ART.
- Test: fixture doble sesión mismo día → KPI suma, sesión individual no.

**Archivos:** `app/lib/dashboard/kpis-dia.test.ts`.

---

## Conexiones y Dependencias

### Archivos relacionados

- `app/lib/dashboard/queries.ts` — agregación principal
- `app/lib/caja/queries.ts` — sesión abierta y historial
- `app/lib/datetime.ts` — TZ Argentina (fuente de verdad)
- `app/app/actions/caja.ts` — cierre/apertura + revalidate
- `app/app/actions/ventas.ts` — ventas atadas a sesión
- `planes/2026-06-08-mejora-cierre-caja-detalle-admin.md` — detalle sesión post-cierre
- `planes/2026-06-06-fix-comisiones-acreditacion-dashboard.md` — saldos pendientes (parcialmente implementado en `SaldosCard`)

### Impacto en flujos

- **POS:** sin cambios; sigue bloqueado sin caja abierta.
- **Reportes** (`/reportes`): usan lógica similar día calendario — mantener consistencia de labels.
- **Cajero:** no ve dashboard (redirect a POS); no afectado.

---

## Lista de Validación

- [ ] Matriz T1–T8 ejecutada y documentada (manual — pendiente en entorno de prueba)
- [x] KPI “hoy” coincide con suma de ventas `created_at` en día AR (query SQL manual) — lógica verificada con tests unitarios
- [x] Doble turno: KPI = suma turnos; banner = turno actual (documentado en UI)
- [x] Post-cierre: dashboard refresca banner sin ventas nuevas posibles (`revalidatePath('/dashboard')`)
- [x] Sin doble banner amarillo en `/dashboard` (`AvisoCajaCerradaRouteGuard`)
- [x] Sesión overnight documentada o mitigada (copy en banner + tests TZ medianoche)
- [x] Tests TZ pasan (`npx tsx --test lib/dashboard/kpis-dia.test.ts`)
- [x] `revalidatePath('/dashboard')` en acciones de caja

---

## Criterios de Éxito

1. Un dueño con **dos turnos en el día** entiende por qué el KPI principal y el banner muestran números distintos **sin pensar que hay un bug**.
2. Tras **cerrar caja**, el dashboard sigue mostrando las ventas del día y deja claro que no se pueden registrar más ventas hasta abrir.
3. Los KPIs del día **coinciden con una query SQL de auditoría** (`created_at` en rango ART).
4. No hay regresiones en POS, cierre de caja ni reportes mensuales.

---

## Notas

### Diagrama conceptual: dos relojes

```
                    ┌─────────────────────────────────────┐
                    │         DÍA CALENDARIO (ART)         │
                    │  KPIs: hoy, mes, gráfico 14 días   │
                    │  Fuente: ventas.created_at         │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
   ┌──────▼──────┐             ┌──────▼──────┐             ┌──────▼──────┐
   │  Sesión 1   │   cierre    │  (gap)      │   apertura  │  Sesión 2   │
   │  08–13      │────────────►│  caja cerr. │────────────►│  14–20      │
   │  ventas A   │             │             │             │  ventas B   │
   └─────────────┘             └─────────────┘             └─────────────┘
          │                                                       │
          └─────────────────── KPI hoy = A + B ───────────────────┘
                                    Banner (si abierta) = solo B
```

### Respuesta directa a la pregunta del usuario

| Pregunta | Respuesta |
|----------|-----------|
| ¿Compara con el día? | **Sí.** KPIs principales usan **día calendario Argentina** (hoy vs ayer, mes vs mes anterior). |
| ¿Y la caja? | Solo el **banner** y el **aviso del layout** usan estado de sesión (abierta/cerrada + ventas del turno actual). |
| ¿Doble turno? | **No se rompe** en datos; **sí confunde** porque KPI suma todo el día y el banner solo el turno abierto. |
| ¿Cierre de caja? | **No rompe** KPIs ni saldos; bloquea ventas nuevas; conviene revalidar `/dashboard` explícitamente y mejorar copy cuando hay ventas del día pero caja cerrada. |

### Orden de implementación sugerido

Paso 1 (auditoría) → Paso 2 (labels/copy) → Paso 5 (revalidate) → Paso 3 (TurnosHoy) → Paso 4 (dedup banner) → Paso 6 (tests)

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

Se clarificó en UI la diferencia entre **día calendario AR** (KPIs) y **turno de caja actual** (banner). Se agregó `TurnosHoyCard` con sesiones del día, `obtenerSesionAbiertaLite()` para reducir queries del banner, deduplicación del aviso de caja cerrada en `/dashboard` y `/caja`, filtro `soloHoy` en últimas ventas, y `revalidatePath('/dashboard')` en todas las acciones de caja. Tests unitarios para buckets KPI y límites de medianoche ART.

### Desviaciones del Plan

- Paso 1 (auditoría manual T1–T8): no ejecutado en entorno real; queda como checklist manual para el usuario.
- `salidas/2026-06-19-analisis-dashboard-caja.md`: no creado (marcado opcional en el plan).
- `AvisoCajaCerradaRouteGuard` envuelve el contenido dentro de `AvisoCajaCerrada.tsx` en lugar de modificar `layout.tsx` directamente (mismo efecto funcional).

### Problemas Encontrados

- Ninguno bloqueante. Build y tests pasan correctamente.
