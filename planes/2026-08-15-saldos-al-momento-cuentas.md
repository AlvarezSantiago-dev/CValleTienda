# Plan: Saldos al momento por cuenta (dashboard + egresos)

**Creado:** 2026-08-15
**Estado:** Implementado
**Pedido:** Al presentar el sistema a alguien de finanzas, los saldos no informan cuánto dinero hay ahora en cada cuenta (egresos y dashboard); no queda claro qué número se está mostrando.

---

## Descripción General

### Qué Logra Este Plan

Deja una **definición única y visible** de la posición de cada cuenta de fondos, con tres números que un contador o dueño puede leer sin adivinar:

| Número | Significado |
| ------ | ----------- |
| **Saldo al momento** | Plata que ya debería estar en esa cuenta (neto de comisión, ya acreditada). Es el número grande. |
| **Por acreditar** | Cobros registrados cuyo dinero todavía no entra (neto). |
| **Saldo proyectado** | Al momento + por acreditar. Es lo que va a quedar cuando todo acredite. |

Corrige el ledger para que las ventas sumen **`monto_neto`** (no el bruto) a `cuentas_fondos.saldo_actual`, ajusta saldos históricos por comisiones nunca descontadas, y muestra esos tres números en **dashboard**, **formulario de egreso/ingreso** y **caja**.

### Por Qué Importa

CValleTienda se vende como control total del negocio. En una demo o visita comercial, la primera pregunta de alguien de finanzas es: *“¿cuánta plata hay ahora en efectivo, en MP y en el banco?”*. Hoy esa respuesta es incorrecta o ilegible. Sin números creíbles no hay confianza para cerrar un cliente, ni para operar el día a día (pagar un proveedor, retirar efectivo, conciliar con la app de MP).

---

## Estado Actual

### Estructura Existente Relevante

**Modelo de datos**

| Pieza | Ubicación | Rol |
| ----- | --------- | --- |
| `cuentas_fondos.saldo_actual` | `supabase/migrations/20260419000008_cuentas_fondos.sql` | Contador persistido. Comentario: “saldo real disponible”. Se actualiza con `registrar_movimiento_fondo()`. |
| `movimientos_fondos` | misma migración | Ledger: ingreso/egreso/ajuste con `saldo_anterior` / `saldo_posterior`. |
| `pagos_venta.monto` / `monto_neto` / `comision_calculada` / `dias_acreditacion` | `20260419000009_metodos_pago.sql` | Snapshot del cobro. El trigger **acredita `monto` (bruto)** al instante. |
| `metodos_pago.dias_acreditacion` | misma | Seed: MP 1 día, transferencia 1 día, débito 1 día, crédito 14 días. Comentario dice “días hábiles”; el JS usa **días calendario**. |

**Cálculo de “pendiente” (duplicado, misma fórmula rota)**

| Archivo | Función |
| ------- | ------- |
| `app/lib/dashboard/queries.ts` | `obtenerSaldosCuentas()` |
| `app/lib/caja/queries.ts` | bloque dentro de `obtenerSesionAbierta()` |

Fórmula actual:

```
disponibleEstimado = max(0, saldo_actual − suma(monto_neto de pagos aún no acreditados))
```

El número grande de la UI es `saldo_actual`. El “disponible estimado” solo aparece si hay pendiente.

**UI que muestra saldos**

| Superficie | Archivo | Qué ve el usuario hoy |
| ---------- | ------- | --------------------- |
| Dashboard | `app/components/dashboard/SaldosCard.tsx` | Título **“Saldos disponibles”**. Número grande = `saldo_actual`. Abajo, si hay pendiente: “Disponible estimado”, “Pendiente por acreditar”, “Comisión futura”. Va **abajo** del dashboard, al lado de ganancia bruta. |
| Dashboard KPIs | `app/app/(dashboard)/dashboard/page.tsx` | “Ventas de hoy (neto)”, ticket, mes: son **ventas del día/mes calendario**, no plata en cuentas. |
| Caja (owner/admin) | `app/components/caja/SesionAbiertaPanel.tsx` | “Saldos actuales de cuentas” **colapsado**. Mismo `saldo_actual` + overlay de pendiente. El cajero **no** ve saldos (`mostrarSaldos={!esCajero}`). |
| Resumen del turno | `app/components/caja/ResumenTurnoPanel.tsx` | En modo compacto muestra **ingresos/egresos/neto del turno**, no el saldo actual. Columnas “Antes/Después” ocultas. |
| Egreso / ingreso | `app/components/caja/RegistrarMovimientoForm.tsx` y `EditarMovimientoForm.tsx` | Select: `Nombre — $saldo_actual`. Hint: **“Saldo disponible: $saldo_actual”**. |
| Configuración | `app/components/configuracion/CuentasFondosManager.tsx` | Muestra `saldo_actual` sin leyenda. |
| Validación egreso | RPC `registrar_movimiento_caja_manual` | Bloquea si `saldo_actual − monto < 0` (usa el contador persistido, no el dinero ya acreditado). |

**Cómo se mueve la plata en una venta**

1. POS inserta `pagos_venta` con `monto`, `comision_calculada`, `monto_neto`, `dias_acreditacion`.
2. Trigger `mover_fondos_por_pago_venta` llama `registrar_movimiento_fondo(..., p_monto => new.monto)` → **`saldo_actual += bruto` al toque**.
3. Comisión **nunca** se descuenta del saldo.
4. `dias_acreditacion` **no** atrasa el crédito: solo sirve para el overlay de UI.
5. Anulación revierte el **bruto** (`20260522000002_revertir_fondos_anulacion.sql`). Consistente con el ingreso bruto; no arregla comisiones.
6. Devolución egresa `pagos_devolucion.monto` (bruto del reintegro).

**Seed de métodos (efecto colateral, fuera de corrección de comisiones)**

Débito y crédito van a la cuenta **“Efectivo en caja”**. Una venta con tarjeta infla el saldo de efectivo aunque esa plata no esté en el cajón. El arqueo (“esperado en cajón”) mezcla efectivo físico con cobros de tarjeta. **No se remapea en este plan** (pregunta abierta).

**Planes previos relacionados**

- `planes/2026-06-19-analisis-dashboard-datos-caja-turnos.md` — KPIs = día calendario; banner = turno. No cubre saldos de cuentas.
- `planes/2026-06-06-fix-comisiones-acreditacion-dashboard.md` — agregó el overlay pendiente/comisión. **Estado: Planificado**; la UI existe pero la resta usa `monto_neto` contra un saldo **bruto**, así que el “disponible estimado” queda mal.
- `planes/2026-07-23-movimientos-caja-resumen-editar-eliminar.md` — ledger del turno, no posición de caja.

### Brechas o Problemas que se Abordan

**1. El número está mal (no solo mal etiquetado)**

Ejemplo: cuenta MP en $0. Venta $10.000, comisión 3,99 %, 1 día de acreditación.

| Concepto | Valor real | Qué muestra el sistema hoy |
| -------- | ---------- | -------------------------- |
| Entra a MP (mañana) | $9.601 | — |
| Comisión MP | $399 | “Comisión futura $399” |
| `saldo_actual` | — | **$10.000** (bruto, ya) |
| Número grande “Saldos disponibles” | debería ser $0 hoy | **$10.000** |
| “Disponible estimado” | $0 hoy | **$399** (= $10.000 − $9.601 = la comisión) |
| “Por acreditar” | $9.601 | $9.601 (este sí coincide) |

Al día siguiente (ya acreditó): el overlay desaparece y el dashboard dice **$10.000 disponibles**. En la app de MP hay **$9.601**. Un egreso de $10.000 pasa la validación. Ahí se cae la demo.

Fórmula rota: `saldo_bruto − pendiente_neto` = acreditado_bruto + comisión_pendiente. Nunca es “plata ahora”.

**2. La idea está mal presentada**

- Título “Saldos disponibles” + número grande = ledger bruto (incluye plata que no está).
- “Disponible estimado” es secundario, a veces ausente, y además está mal calculado.
- Dashboard mezcla **P&L** (ventas hoy, ganancia del mes) con **posición de caja** sin decir cuál es cuál.
- En caja, los saldos están colapsados; el resumen compacto muestra movimiento del **turno**, no stock de dinero.
- El form de egreso llama “disponible” a `saldo_actual`.

**3. Duplicación y timezone**

La lógica de pendiente está copiada en dashboard y caja. `setDate(+días)` usa el reloj del servidor, no el calendario `America/Argentina/Buenos_Aires`. El comentario SQL dice “días hábiles” y el código usa días corridos.

---

## Cambios Propuestos

### Resumen de Cambios

- Definir y documentar el modelo de 3 números (al momento / por acreditar / proyectado).
- Cambiar el trigger de venta para acreditar **`monto_neto`**.
- Migración one-shot: restar comisiones históricas de `saldo_actual` y dejar un movimiento de **ajuste** auditable por cuenta.
- Extraer un helper único de posición de fondos (TS +, si hace falta, SQL para validar egresos).
- Redibujar dashboard, caja y form de movimiento: número grande = **saldo al momento**, leyendas explícitas.
- Subir el bloque de saldos en el dashboard (después de KPIs / banner de caja).
- Validar egresos contra **saldo al momento** (no contra el proyectado).
- No tocar impresión, no remapear tarjetas→efectivo, no reescribir el historial de movimientos de ventas (solo el ajuste + créditos futuros).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `app/lib/fondos/posicion.ts` | Tipos `PosicionCuenta`, `PendienteItem` y funciones puras: `fechaAcreditacion(createdAt, dias)`, `esPendiente(ahora, fecha)`, `armarPosicion(saldoActual, pendientes)`. Una sola fórmula. |
| `app/lib/fondos/queries.ts` | `listarPendientesPorCuenta(supabase, tiendaId)` — query a `pagos_venta` + ventas completadas. Usada por dashboard y caja. |
| `supabase/migrations/20260815000001_saldos_cuentas_neto_y_correccion.sql` | 1) Trigger usa `monto_neto`. 2) Ajuste histórico de `saldo_actual`. 3) Función `saldo_al_momento(cuenta_id)` para validar egresos. |
| `referencia/modelo-saldos-cuentas.md` | Glosario corto para demos y sesiones futuras (qué es cada número). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `supabase/migrations/20260815000001_…sql` (nuevo, ver arriba) | Reemplaza el cuerpo de `mover_fondos_por_pago_venta` para `p_monto => new.monto_neto`. |
| `app/lib/dashboard/queries.ts` | `obtenerSaldosCuentas()` delega en `lib/fondos`. Expone `saldoAlMomento`, `saldoProyectado`, `porAcreditar` (depreca o alias `saldoDisponibleEstimado`). |
| `app/lib/caja/queries.ts` | Mismo helper; no recalcular pendiente inline. |
| `app/lib/caja/types.ts` | `SaldoCuenta` con los 3 números nombrados. |
| `app/components/dashboard/SaldosCard.tsx` | Título “Saldos al momento”. Número grande = al momento. Subfilas: por acreditar + proyectado. Copy de 1 línea. |
| `app/app/(dashboard)/dashboard/page.tsx` | Mover `SaldosCard` arriba (después de `EstadoCajaBanner` + KPIs). Descripción del page header o del card aclara que los KPIs son ventas, no caja. |
| `app/components/caja/SesionAbiertaPanel.tsx` | Saldos **abiertos por defecto**. Mismos 3 números. |
| `app/components/caja/RegistrarMovimientoForm.tsx` | Select y hint: “Saldo al momento”. Si hay pendiente, mostrarlo. `max` del input = al momento en egreso. |
| `app/components/caja/EditarMovimientoForm.tsx` | Igual. |
| `app/app/(dashboard)/caja/page.tsx` | Pasar a los forms `saldo_al_momento` (no solo `saldo_actual`). |
| `app/app/actions/caja.ts` | El RPC de alta/edición valida contra `saldo_al_momento` (migración). Traducir error si queda corto. |
| `app/components/configuracion/CuentasFondosManager.tsx` | Mostrar “Saldo al momento” + proyectado si difieren. Puede reusar query de posición o un campo derivado. |
| `CLAUDE.md` | Una línea en “App CValleTienda” apuntando a `referencia/modelo-saldos-cuentas.md`. |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **Tres números, un lenguaje.** No inventar un cuarto (“disponible estimado”, “saldo contable bruto”). Al momento / por acreditar / proyectado. El grande es siempre **al momento**.

2. **El ledger futuro acredita neto.** `mover_fondos_por_pago_venta` usa `monto_neto`. Así `saldo_actual` = **proyectado neto** (todo lo que va a quedar en la cuenta, ya descontada la comisión). `saldo_al_momento = saldo_actual − por_acreditar`.

3. **Corrección histórica = un ajuste por cuenta, no reescribir ventas.** Por cada cuenta con comisión acumulada de ventas `completada`:

   - `UPDATE cuentas_fondos SET saldo_actual = saldo_actual − comisiones_historicas`.
   - `INSERT` movimiento `tipo = 'ajuste'` (o egreso manual de sistema) con concepto `Ajuste: comisiones históricas no descontadas` y el monto. Queda auditado. Los movimientos viejos de venta siguen mostrando el bruto; el comentario del ajuste lo explica.

4. **Egreso contra saldo al momento.** No se puede sacar plata que todavía no acreditó. Mensaje: “Saldo al momento $X. Hay $Y por acreditar.”

5. **Pendiente se calcula en un solo lugar.** Query + función pura. Fecha de acreditación = `created_at` de `pagos_venta` + `dias_acreditacion` en calendario **ART** (`America/Argentina/Buenos_Aires`), días **corridos** (el seed y el código actual son corridos; no inventar días hábiles en este plan). Documentar la mentira del comentario SQL.

6. **No atrasar el crédito en el trigger.** Seguir acreditando al vender (ahora neto). El “todavía no está” es overlay. Evita un cron de acreditación y no rompe el cierre de turno.

7. **No remapear tarjetas → efectivo acá.** Es otro bug de modelo (cajón vs posnet). Si se mete en este plan se mezcla el mensaje de la demo. Queda como follow-up.

8. **UI primitives-first.** Tokens semánticos, `DashboardSectionCard`, `Badge`, `Button`. Sin `lime-*` / hex de marca. No tocar `components/impresion/**`.

9. **Cajero sigue sin ver saldos globales** (regla actual de roles). El form de egreso del cajero **sí** debe mostrar el saldo al momento de la cuenta que elige, para no egresar a ciegas. Eso es operacional, no “ver finanzas del dueño”.

### Alternativas Consideradas

| Enfoque | Por qué se descartó |
| ------- | ------------------- |
| Solo cambiar labels, no el trigger | El “disponible estimado” seguiría siendo `bruto − neto_pendiente` = basura. La demo se cae igual. |
| No tocar `saldo_actual` hasta la fecha de acreditación (cron) | Más correcto bancariamente, pero implica job, race con egresos y rehacer preview de cierre. Fuera de alcance. |
| Ingreso bruto + egreso automático de comisión | Ledger más verboso y útil, pero duplica filas en cada venta y cambia totales de “ingresos del turno”. Se puede hacer después; ahora alcanza con acreditar neto. |
| Reescribir `movimientos_fondos.monto` de ventas viejas | Rompe `saldo_anterior`/`saldo_posterior` en cadena. Inseguro. |
| Validar egreso contra proyectado | Permite “gastar” plata de MP que todavía no está. Inaceptable frente a un financiero. |

### Preguntas Abiertas (si las hay)

1. **¿El cajero debe ver el saldo al momento en el form de egreso?** El plan asume **sí** (si no, sigue egresando a ciegas). Si preferís ocultarlo, decilo antes de implementar.

2. **¿Tarjetas débito/crédito siguen yendo a “Efectivo en caja”?** Este plan **no** lo cambia. Si en la demo eso también dolió, hay que un plan aparte (cuenta “Posnet / tarjetas” + arqueo solo de efectivo físico).

3. **¿Reescribir historial de movimientos de bruto a neto?** El plan **no** lo hace; solo ajuste. Si el financiero va a auditar el ledger línea a línea, los movimientos viejos de venta van a seguir en bruto.

Si no hay respuesta, se implementa con las decisiones 1–9 de arriba.

---

## Tareas Paso a Paso

Ejecutá estas tareas en orden durante la implementación.

### Paso 1: Documentar el modelo (referencia)

Crear `referencia/modelo-saldos-cuentas.md` con:

- Tabla de los 3 números (copiar la de “Qué Logra”).
- Ejemplo numérico MP $10.000 / 3,99 % / 1 día (antes vs después).
- Qué **no** es un saldo: “Ventas de hoy (neto)”, “Ganancia bruta (mes)”, “Total neto” del turno.
- Acreditación = días corridos ART, no hábiles.

**Acciones:**

- Escribir el markdown.
- En `CLAUDE.md`, sección App CValleTienda, agregar una fila a la tabla de recursos: `referencia/modelo-saldos-cuentas.md` — posición de caja.

**Archivos afectados:**

- `referencia/modelo-saldos-cuentas.md`
- `CLAUDE.md`

---

### Paso 2: Helper TS de posición (fórmula única)

Crear `app/lib/fondos/posicion.ts`.

**Tipos:**

```ts
export interface PendienteItem {
  pagoVentaId: string
  ventaId: string
  montoNeto: number
  comision: number
  fechaVenta: string | null
  fechaAcreditacion: string // ISO
}

export interface PosicionCuenta {
  saldoProyectado: number   // = saldo_actual persistido (post-migración: neto)
  porAcreditar: number      // suma monto_neto pendientes
  saldoAlMomento: number    // max(0, round2(proyectado − porAcreditar))
  pendienteComision: number
  proximaFechaAcreditacion: string | null
  pendienteFechas: number
  pendientes: PendienteItem[]
}
```

**Funciones:**

- `fechaAcreditacionIso(createdAtIso: string, dias: number): string` — sumar `dias` al YMD en ART (`hoyArgentinaYmd` / helpers de `app/lib/datetime.ts`), no `Date#setDate` en UTC.
- `estaPendiente(fechaAcreditacionIso: string, ahora = new Date()): boolean` — pendiente si el inicio del día ART de acreditación es **estrictamente posterior** a “ahora” en ART (o: `fechaAcreditacion > ahora`; elegir una y testearla).
- `armarPosicion(saldoActual: number, items: PendienteItem[]): PosicionCuenta`

**Tests unitarios** en `app/lib/fondos/posicion.test.ts` (mismo estilo que `app/lib/reportes/queries-finanzas.test.ts` / `app/lib/caja` tests si existen):

- Venta $10.000, 3,99 %, 1 día, `saldo_actual` ya neto $9.601 → al momento $0, por acreditar $9.601, proyectado $9.601.
- Misma venta al día siguiente → al momento $9.601, por acreditar $0.
- Varias fechas de acreditación → `proximaFecha` = la más cercana.
- `dias = 0` → nunca pendiente.

**Acciones:**

- Implementar helper + tests.
- Correr los tests del archivo.

**Archivos afectados:**

- `app/lib/fondos/posicion.ts`
- `app/lib/fondos/posicion.test.ts`

---

### Paso 3: Query única de pendientes

Crear `app/lib/fondos/queries.ts`:

- `listarPendientesAcreditacion(opts: { supabase, tiendaId }): Map<cuentaId, PendienteItem[]>`
- Filtros: `pagos_venta` de la tienda, `venta.estado = 'completada'`, `cuenta_fondo_id` not null, `dias_acreditacion > 0`, fecha de acreditación > ahora.
- Select mínimo: `id, cuenta_fondo_id, monto_neto, comision_calculada, dias_acreditacion, created_at, venta:ventas!inner(id, created_at, estado)`.

No traer todos los pagos de la historia para filtrar en JS si se puede evitar: si el volumen duele, filtrar en SQL con `created_at > now() - (dias_acreditacion || ' days')` es un plus; si no, el filtro JS actual (como hoy) es aceptable para el MVP.

**Acciones:**

- Extraer la query duplicada de dashboard y caja.

**Archivos afectados:**

- `app/lib/fondos/queries.ts`

---

### Paso 4: Migración SQL — neto + corrección + validación

Archivo: `supabase/migrations/20260815000001_saldos_cuentas_neto_y_correccion.sql`

**4.1 Trigger**

Reemplazar en `mover_fondos_por_pago_venta`:

```sql
p_monto => new.monto_neto
```

Concepto puede quedar igual (`Venta #N — método`). Si `monto_neto = 0` (100 % comisión, raro), no llamar al registro o no insertar movimiento con monto 0 (el check actual exige `monto > 0`). En ese caso: skip del perform.

**4.2 Corrección histórica (una vez)**

Para cada `cuentas_fondos`:

```sql
comisiones = SUM(pagos_venta.comision_calculada)
  WHERE cuenta_fondo_id = cuenta
    AND venta.estado = 'completada'
```

Si `comisiones > 0`:

1. Lock de la fila de cuenta.
2. `saldo_nuevo = saldo_actual - comisiones` (permitir negativo solo si ya era inconsistente; preferir no clipear para no esconder el desfasaje).
3. Insertar `movimientos_fondos` con `tipo = 'ajuste'`, `concepto = 'Ajuste: comisiones históricas no descontadas'`, `monto = comisiones`, `saldo_anterior`, `saldo_posterior`, `venta_id` null, `usuario_id` null.
4. Update `saldo_actual`.

**Cuidado:** `registrar_movimiento_fondo` con `tipo = 'ajuste'` **setea** `saldo_actual = p_monto` (reemplazo absoluto), no resta. **No usar esa rama.** Hacer UPDATE + INSERT a mano, o extender el helper con un tipo `egreso` de sistema. Recomendado: INSERT directo + UPDATE, igual que el delete de movimientos, para no redefinir el semántica de `ajuste`.

**4.3 Función `saldo_al_momento(p_cuenta_fondo_id uuid)`**

```
saldo_al_momento = cuentas_fondos.saldo_actual
  − SUM(pagos_venta.monto_neto de ventas completadas
        con dias_acreditacion > 0
        y created_at + dias_acreditacion * interval '1 day' > now())
```

`GREATEST(0, …)` en la validación de egreso, no necesariamente en el report (si el proyectado es menor que el pendiente, hay que verlo).

**4.4 Validar egresos**

En `registrar_movimiento_caja_manual` y `editar_movimiento_caja_manual` (migraciones `20260723000001` / `20260811000002` — redefinir las funciones en esta migración):

- Si `p_tipo = 'egreso'`, exigir `p_monto <= saldo_al_momento(cuenta)` (después del lock).
- Mensaje: `Saldo al momento insuficiente para este egreso`.

Anulación y devolución **no** cambian en este paso (siguen usando bruto del pago/reintegro; consistentes entre sí).

**Acciones:**

- Escribir la migración completa (create or replace de las 3 funciones + bloque DO de corrección).
- No editar migraciones viejas.

**Archivos afectados:**

- `supabase/migrations/20260815000001_saldos_cuentas_neto_y_correccion.sql`

---

### Paso 5: Cablear queries de dashboard y caja

**`obtenerSaldosCuentas()`**

1. `listarCuentasFondos(true)`
2. `listarPendientesAcreditacion`
3. Por cuenta: `armarPosicion(c.saldo_actual, pendientes)`
4. Devolver campos nuevos. Mantener aliases temporales `saldoDisponibleEstimado = saldoAlMomento` y `pendientePorAcreditar = porAcreditar` solo si hace falta para no romper compile a mitad de paso; al terminar el Paso 6, borrar aliases.

**`obtenerSesionAbierta()`**

Mismo armado sobre `saldos_cuentas`.

**`caja/page.tsx`**

Al armar `CuentaOpcion`, incluir `saldo_al_momento` y `por_acreditar` (desde `sesion.saldos_cuentas` o la misma posición). No volver a leer solo `saldo_actual`.

**Acciones:**

- Eliminar los dos bucles de pendiente copiados.
- Compilar tipos.

**Archivos afectados:**

- `app/lib/dashboard/queries.ts`
- `app/lib/caja/queries.ts`
- `app/lib/caja/types.ts`
- `app/app/(dashboard)/caja/page.tsx`

---

### Paso 6: UI — dashboard

**`SaldosCard`**

- Título: **Saldos al momento**.
- Description: `Plata que ya debería estar en cada cuenta, neto de comisión.` Si `totalPorAcreditar > 0`: `Por acreditar en total: $X`.
- Por cuenta:
  - Número grande: `saldoAlMomento`.
  - Si `porAcreditar > 0`: filas “Por acreditar” (danger-soft) y “Saldo proyectado” (`saldoProyectado`).
  - “Próxima acreditación” + botón detalle (reusar modal actual).
  - **No** mostrar “Comisión futura” como si restara de nuevo (ya está fuera del neto). Si se quiere, una línea chica en el modal: “Comisión ya descontada del proyectado: $X”.
- Total opcional al pie: suma de al momento (dueño ve “caja total ahora”).

**`dashboard/page.tsx`**

Orden sugerido:

1. PageHeader
2. EstadoCajaBanner
3. Grid KPIs (ventas hoy / mes) — no mover
4. **SaldosCard a ancho completo** (no compartido con ganancia)
5. TurnosHoyCard y el resto
6. GananciaBrutaCard donde está (P&L del mes)

En el header o en un `text-xs text-fg-muted` bajo los KPIs: `Las tarjetas de arriba son ventas del día y del mes. Los saldos de cuentas están más abajo.` — una sola frase, sin tutorial.

**Acciones:**

- Reescribir copy y jerarquía visual con tokens v2.
- No cambiar queries de KPIs de ventas (otro modelo; ya etiquetados “calendario”).

**Archivos afectados:**

- `app/components/dashboard/SaldosCard.tsx`
- `app/app/(dashboard)/dashboard/page.tsx`

---

### Paso 7: UI — caja y movimientos

**`SesionAbiertaPanel`**

- `saldosExpandidos` inicial = `true`.
- Título: **Saldos al momento**.
- Número principal = `saldoAlMomento`.
- Subfilas iguales al dashboard si hay pendiente.

**`RegistrarMovimientoForm` / `EditarMovimientoForm`**

Extender `CuentaOpcion`:

```ts
{
  id, nombre, tipo,
  saldo_actual,      // proyectado (persistido)
  saldo_al_momento,
  por_acreditar,
}
```

- Option: `{nombre} — {formatARS(saldo_al_momento)} al momento`
- Hint egreso: `Saldo al momento: $X` + si `por_acreditar > 0`: `Hay $Y por acreditar (no se puede egresar todavía).`
- `max` del input de monto en egreso = `saldo_al_momento`.
- Validación client-side: si `monto > saldo_al_momento`, error claro (el RPC es la fuente de verdad).

**Cajero:** el form recibe las mismas cuentas con saldos. No abrir el panel colapsable de saldos globales.

**Acciones:**

- Actualizar ambos forms y el panel.
- Traducir el nuevo error SQL en `app/app/actions/caja.ts` (`traducirError`).

**Archivos afectados:**

- `app/components/caja/SesionAbiertaPanel.tsx`
- `app/components/caja/RegistrarMovimientoForm.tsx`
- `app/components/caja/EditarMovimientoForm.tsx`
- `app/app/actions/caja.ts`

---

### Paso 8: Configuración de cuentas

En `CuentasFondosManager`, el monto bajo el nombre:

- Línea 1: `Al momento {formatARS(alMomento)}`
- Si proyectado ≠ al momento: `Proyectado {formatARS(proyectado)}`

La página de config hoy solo tiene `saldo_actual`. Opciones: (a) llamar `obtenerSaldosCuentas()` desde la page de cuentas, o (b) mostrar `saldo_actual` como “Proyectado” y no calcular pendiente ahí. Preferir (a) para no mentir.

**Archivos afectados:**

- `app/app/(dashboard)/configuracion/cuentas-fondos/page.tsx` (si hoy solo pasa `listarCuentasFondos`)
- `app/components/configuracion/CuentasFondosManager.tsx`

---

### Paso 9: Verificación

Correr mentalmente / en tenant de prueba el ejemplo $10.000 MP:

1. Aplicar migración.
2. Venta MP $10.000 → `saldo_actual` += 9.601; movimiento ingreso 9.601.
3. Dashboard: al momento $0 (o el previo), por acreditar +9.601, proyectado +9.601.
4. Egreso $1 desde MP → error “saldo al momento insuficiente” si al momento es 0.
5. Esperar (o manipular `dias_acreditacion` a 0 / fecha) → al momento = proyectado.
6. Cuenta con comisiones viejas: aparece 1 ajuste y el saldo baja esa suma.
7. Efectivo `dias = 0`: al momento = proyectado = `saldo_actual` (sin overlay).
8. Anular una venta nueva: revierte **bruto** (limitación conocida; ver Notas). Si se anula una venta post-migración (ingreso neto, egreso bruto), el saldo queda **corto** por la comisión. **Mitigar en esta misma migración:** cambiar `revertir_fondos_anulacion` para revertir `monto_neto`, no `monto`. Obligatorio para no introducir un bug nuevo.

**Acción extra del Paso 4 (no olvidar):** `revertir_fondos_anulacion` debe usar `monto_neto` igual que el alta. Ventas viejas (ingreso bruto): al anularlas post-migración, el egreso neto dejaría comisión “regalada” en el saldo. Para no abrir ese agujero:

- Revertir `monto_neto` siempre (alineado al trigger nuevo).
- Las ventas **viejas** ya tuvieron ingreso bruto; si se anulan después del ajuste de comisiones, el saldo ya no incluye esa comisión → revertir neto es correcto también para ellas (el ajuste ya sacó la comisión).
- Si se anula **antes** de aplicar el ajuste… el orden de la migración es: primero ajuste de comisiones de ventas completadas, después cambiar trigger y revert. Una anulación posterior de venta vieja: ingreso histórico era bruto, ajuste ya restó comisión, revertir neto = saca el neto que “quedaba”. Correcto.

**Archivos afectados:**

- Misma migración: `revertir_fondos_anulacion` → `p_monto => v_pago.monto_neto`.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/components/dashboard/GananciaBrutaCard.tsx` — P&L; no es saldo. No cambiar fórmula; se separa visualmente.
- `app/lib/reportes/queries.ts` — egresos manuales del mes; no usa `saldo_actual`.
- `app/components/caja/ResumenTurnoPanel.tsx` — “Antes/Después” del turno = `saldo_actual − ingresos + egresos` en SQL (`preview_resumen_turno`). Tras el ajuste, esos saldos bajan por comisiones históricas (correcto). El neto del **turno** sigue siendo ingresos−egresos−comisión estimada de `pagos_venta`; no hace falta tocar el RPC de preview salvo que “ingresos” sigan siendo brutos de `movimientos_fondos` (ventas viejas) y netos (ventas nuevas). Aceptable; documentar en notas del plan.
- `app/components/pitch/pitch-content.ts` — copy comercial; no bloquea.
- Triggers de devolución (`mover_fondos_por_devolucion`) — siguen en bruto del reintegro. Fuera de alcance salvo que se anule/devuelva el 100 % de una venta neta (el reintegro típico es lo que se le devuelve al cliente, no el neto MP).

### Actualizaciones Necesarias para Consistencia

- `CLAUDE.md` — link al glosario.
- `referencia/modelo-saldos-cuentas.md` — nuevo.
- Comentario SQL de `cuentas_fondos.saldo_actual`: actualizar a “Saldo proyectado neto (acreditado + por acreditar, comisión ya descontada). El ‘al momento’ se calcula restando pendientes.”

### Impacto en Flujos de Trabajo Existentes

- **POS / venta:** el cajero no cambia nada. El dueño ve menos saldo (neto).
- **Caja / egreso:** puede rechazar egresos que antes pasaban (gastaban comisión o plata no acreditada). Es el comportamiento deseado.
- **Cierre / arqueo:** `efectivo_esperado` no se redefine acá. Tarjetas en efectivo siguen ensuciando el cajón.
- **Reportes / ganancia:** sin cambio (ya restan comisiones en P&L).
- **Demo / pitch:** el bloque de saldos pasa a ser respondible: “esto hay ahora; esto está por caer”.

---

## Lista de Validación

- [x] Migración aplicada: trigger acredita `monto_neto`; anulación revierte `monto_neto`.
- [x] Cada cuenta con comisiones históricas tiene exactamente un movimiento de ajuste y `saldo_actual` reducido en esa suma.
- [x] Tests de `posicion.ts` en verde.
- [x] Dashboard: título “Saldos al momento”; número grande = al momento; proyectado y por acreditar visibles si aplica.
- [x] Dashboard: bloque de saldos arriba (después de KPIs), no escondido junto a ganancia.
- [x] Form de egreso muestra “Saldo al momento” y bloquea monto > al momento (UI + RPC).
- [x] Caja owner: saldos expandidos con los 3 números.
- [x] Cajero: no ve el panel global; sí ve saldo al momento en el form.
- [x] Configuración de cuentas no muestra un número mudo: dice al momento / proyectado.
- [x] Ejemplo $10.000 / 3,99 % / 1 día coincide con la tabla del glosario.
- [x] Efectivo `dias = 0`: un solo número, sin overlay.
- [x] `CLAUDE.md` y `referencia/modelo-saldos-cuentas.md` actualizados.
- [x] Sin cambios en `components/impresion/**` ni `styles/print.css`.
- [x] Tokens v2; no reintroducir `lime-*` / hex de marca.

---

## Criterios de Éxito

1. Un financiero puede señalar el número grande de cada cuenta y decir “eso es lo que hay ahora”, y ese número coincide con “neto ya acreditado” (no con el bruto de las ventas).
2. Registrar un egreso muestra, por cuenta, cuánta plata hay al momento, y el sistema impide sacar más que eso.
3. En el dashboard queda explícito qué es venta del día/mes y qué es saldo de cuenta; nadie tiene que adivinar qué número está mirando.
4. Una venta nueva con comisión no infla el saldo por el bruto; el ejemplo MP $10.000 deja proyectado $9.601 y al momento $0 hasta acreditar.

---

## Notas

- **Devoluciones** siguen egresando el monto reintegrado al cliente (correcto operativamente). No es el mismo bug que acreditar bruto de la venta.
- **Días hábiles vs corridos:** el comentario de `metodos_pago.dias_acreditacion` miente. Este plan documenta corridos y no implementa feriados AR. Si un cliente MP acredita “24 h hábiles”, el overlay puede correrse un día; es estimación, no conciliación bancaria.
- **Tarjetas → efectivo:** follow-up recomendado (`planes/YYYY-MM-DD-cuenta-posnet-separada.md`) si la demo también chocó el arqueo.
- **Cron de acreditación real:** follow-up si se quiere que `saldo_actual` sea *solo* al momento y el proyectado viva en otra columna. Hoy el overlay alcanza.
- **Tenant de prueba:** aplicar la migración en staging/local y revisar el ajuste histórico antes de producción; si hay cuentas con `saldo_actual` ya “a mano” (edits raros), el ajuste puede dejar negativo — revisar esas filas.
- No commitear ni pushear salvo pedido explícito.

---

## Notas de Implementación

**Implementado:** 2026-08-15

### Resumen

Se unificó la posición de cada cuenta en tres números (al momento / por acreditar / proyectado). Las ventas nuevas acreditan `monto_neto`; la anulación revierte neto; un ajuste histórico resta comisiones nunca descontadas. Dashboard, caja, egresos y configuración muestran el saldo al momento como número principal. Los egresos se validan contra ese saldo (UI + RPC).

### Desviaciones del Plan

- `obtenerSaldosCuentas` acepta `soloActivas` para reutilizarla en `/configuracion/cobros` (todas las cuentas) sin duplicar el armado.
- En edición de un egreso existente, el tope client-side suma de nuevo el monto actual del movimiento (misma cuenta) para no bloquear una corrección válida; el RPC sigue siendo la fuente de verdad.
- `GananciaBrutaCard` quedó sola (sin grid de 2 columnas) al subir `SaldosCard`.

### Problemas Encontrados

Ninguno. Tests `lib/fondos/posicion.test.ts`: 8/8. `tsc --noEmit` OK.

### Pendiente operativo

Aplicar la migración `supabase/migrations/20260815000001_saldos_cuentas_neto_y_correccion.sql` en el proyecto Supabase (local/staging/prod) y revisar cuentas cuyo ajuste histórico deje saldo negativo.
