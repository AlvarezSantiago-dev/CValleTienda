# Plan: Auditoría completa del sistema de devoluciones (caso real: cambio de jean vía saldo a favor)

**Creado:** 2026-07-02
**Estado:** Implementado
**Pedido:** Analizar el sistema completo de devoluciones a partir del caso real del cliente (venta jean + campera → devolución del jean con saldo a favor → nueva venta del jean azul) y corregir todo lo necesario para que los números no fallen en ninguna pantalla.

> **Reemplaza a:** `planes/2026-07-01-auditoria-devoluciones-saldo-favor-caja.md` (mismo tema, ahora con el caso real confirmado).

---

## Descripción General

### Qué Logra Este Plan

Reconstruye con precisión el caso reportado, identifica **dónde los números fallan de verdad** (cierre de caja del turno) y **dónde solo fallan en percepción** (lista de ventas), y corrige ambos frentes: consistencia contable en caja + trazabilidad del saldo a favor + claridad de UI para que el cajero use el flujo correcto de **Cambio de producto** cuando corresponde.

### Por Qué Importa

El sistema está en producción con clientes reales. El operador vio "una venta del valor del jean" que no entendía — eso genera desconfianza aunque los reportes mensuales neteen bien. Peor: el **cierre de caja del turno sí queda inflado** en este escenario (bug real). Un POS que no cuadra la caja pierde al cliente.

---

## Estado Actual

### Reconstrucción exacta del caso

| Paso | Acción del cajero | Registro en el sistema |
|------|-------------------|------------------------|
| 1 | Vende jean baggy 40 celeste + campera | `ventas` T-A por (jean + campera), pagos reales, stock descontado |
| 2 | Cliente devuelve el jean celeste; cajero elige **Saldo a favor** | `devoluciones` por valor del jean, `tipo_resolucion='saldo_a_favor'`, **`sesion_caja_id = NULL`**, crédito en `clientes.saldo_favor`, stock del jean celeste repuesto |
| 3 | "Registra el cambio" como **venta nueva** del jean baggy 40 azul, pagada con el saldo | `ventas` T-B por valor del jean, **sin `pagos_venta`** (cubierta 100% con saldo), `descontar_saldo_favor` deja el crédito en $0, stock del jean azul descontado |

Lo que el cliente vio en `/ventas`: la venta T-B al valor del jean → interpretó "la devolución se registró como venta". **T-B es una venta real y legítima** — el problema es que nada en la UI indica que fue pagada con crédito de una devolución, y la venta T-A sigue mostrando el total bruto.

**El flujo correcto para este caso ya existe:** resolución **Cambio de producto → otra variante** (`20260620110001_cambio_variante_devolucion.sql`): un solo registro, repone el celeste, descuenta el azul, sin dinero, sin inflar ventas. No se usó — probablemente porque el cajero no lo conoce, o porque el jean azul está cargado como **producto distinto** (el cambio a otra variante solo ofrece variantes del **mismo producto al mismo precio**, ver `obtenerVariantesParaCambio` en `app/lib/devoluciones/queries-cambio.ts`).

### Verificación número por número (con el caso: jean $30.000, campera $50.000)

| Superficie | Qué muestra hoy | ¿Correcto? |
|------------|-----------------|------------|
| **Stock** | Celeste +1 (trigger devolución), azul −1 (venta) | ✅ |
| **Reportes P&L mes** (`get_reporte_historico_meses`) | Brutas $110.000 (T-A + T-B), devoluciones $30.000, **netas $80.000** | ✅ netea bien |
| **Dashboard día** (`obtenerKpisHoy`) | Ventas $110.000, devoluciones $30.000 (filtra por `created_at`), neto $80.000 | ✅ |
| **Ganancia bruta** (dashboard y P&L) | Resta la ganancia de la línea devuelta, suma la de la nueva | ✅ |
| **Métricas cliente** | Devolución resta `monto_total`, venta nueva lo suma | ✅ aprox |
| **Lista `/ventas`** | T-A a $80.000 completo + T-B a $30.000, sin ninguna marca | ⚠️ percepción: "vendí dos jeans" |
| **Detalle venta T-B** | Total $30.000, **pagos vacíos** — no dice cómo se cobró | ⚠️ sin trazabilidad |
| **Cierre de caja del turno** (`preview_resumen_turno` / `cerrar_caja`) | Ventas del turno incluyen T-B ($30.000); devoluciones del turno = **$0** porque la devolución saldo a favor no tiene `sesion_caja_id` → **`total_neto` inflado en $30.000**. "Cobros por cuenta" tampoco cuadra con "Ventas" (T-B sin pagos) | ❌ **bug real** |
| **Anular T-B** | `anularVenta` no devuelve el saldo consumido al cliente (no está persistido) | ❌ bug latente |

### Estructura Existente Relevante

| Capa | Archivos |
|------|----------|
| Server actions | `app/app/actions/devoluciones.ts` (`registrarDevolucion`), `app/app/actions/ventas.ts` (`registrarVenta`, `anularVenta`) |
| UI devoluciones | `app/components/devoluciones/DevolucionForm.tsx`, `TablaDevoluciones.tsx`, `CambioVariantePanel.tsx`, `app/lib/devoluciones/queries-cambio.ts` |
| UI ventas/POS | `app/lib/ventas/queries.ts`, `app/app/(dashboard)/ventas/page.tsx` y `[id]/page.tsx`, `app/components/pos/PanelPago.tsx`, `cobro-guiado/PasoCliente.tsx` |
| Caja | `supabase/migrations/20260620120003_preview_resumen_turno_devoluciones.sql`, `app/lib/caja/types.ts`, `resumen-turno.ts`, `ResumenTurnoPanel.tsx`, `CierreCajaRenderer.tsx`, `app/lib/email/templates/cierre-caja.ts` |
| DB saldo a favor | `20260510000003_saldo_a_favor.sql` (RPCs `incrementar/descontar_saldo_favor`), `20260603000001_revertir_saldo_favor.sql` |
| DB devoluciones | `20260419000011_devoluciones.sql` (triggers stock/fondos/cliente), `20260620110001_cambio_variante_devolucion.sql` |
| Tickets | `build_payload_ticket_devolucion` (última versión en `20260620110002_payload_devolucion_entrega.sql`), `TicketDevolucionRenderer.tsx`, `app/lib/impresion/types.ts` |
| Política reportes | `app/lib/reportes/formulas.ts`, `referencia/reportes-definiciones-metricas.md` |

### Brechas o Problemas que se Abordan

| ID | Problema | Severidad |
|----|----------|-----------|
| **B1** | Devoluciones `saldo_a_favor` y `cambio` no asignan `sesion_caja_id` (solo se busca sesión dentro del bloque `reembolso`) → invisibles en el turno, `total_neto` del cierre inflado | **Crítica** |
| **B2** | `saldo_favor_usado` no se persiste en `ventas` → venta pagada con crédito no muestra forma de pago, y `anularVenta` no puede devolver el crédito consumido | **Alta** |
| **B3** | Cierre de caja no distingue reintegros (dinero que salió) de créditos store (pasivo sin egreso) | **Alta** |
| **B4** | Lista y detalle de ventas sin marca de devoluciones asociadas ni de pago con saldo → la percepción "se registró como venta" | **Media** |
| **B5** | Ticket de devolución no dice cómo se resolvió (reembolso / saldo a favor / cambio) | **Media** |
| **B6** | Flujo "Cambio de producto" limitado a variantes del **mismo producto** al mismo precio; si el jean azul es otro producto del catálogo, el cajero queda forzado al camino saldo a favor + venta nueva | **Media** |
| **B7** | Sin guía en `DevolucionForm` que oriente al cajero: "¿cambio de talle/color? usá Cambio de producto" | **Baja** |
| **B8** | Comisiones de la venta original no se revierten al devolver (limitación documentada) | Baja (fuera de alcance) |

---

## Cambios Propuestos

### Resumen de Cambios

- **Fase 0 — Diagnóstico:** SQL de solo lectura sobre el tenant del cliente para confirmar la secuencia T-A → devolución → T-B.
- **Fase 1 — Caja consistente (crítico):** `sesion_caja_id` en todas las devoluciones + split reintegros/créditos en `preview_resumen_turno` y `cerrar_caja`.
- **Fase 2 — Trazabilidad del saldo:** columna `ventas.saldo_favor_usado`, persistencia, reversión al anular, visualización.
- **Fase 3 — Claridad UI:** badges de resolución en devoluciones, marca de devolución/pago-con-saldo en ventas, monto neto en detalle de venta, ticket con texto de resolución.
- **Fase 4 — Guía de flujo:** copy en `DevolucionForm` orientando al flujo Cambio; documentar la limitación mismo-producto.
- **Fase 5 — Tests + documentación:** tests de política, checklist manual de reconciliación, actualizar `referencia/reportes-definiciones-metricas.md`.

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260702000001_ventas_saldo_favor_usado.sql` | Columna `ventas.saldo_favor_usado numeric(12,2) NOT NULL DEFAULT 0` + check `>= 0` |
| `supabase/migrations/20260702000002_caja_split_devoluciones.sql` | `preview_resumen_turno` y `cerrar_caja` v3: devoluciones del turno separadas en reintegros vs créditos; `total_neto` resta ambas (alineado con dashboard/reportes) |
| `supabase/migrations/20260702000003_payload_devolucion_resolucion.sql` | `build_payload_ticket_devolucion` incluye `tipo_resolucion` |
| `app/lib/devoluciones/resolucion-labels.ts` | Labels/colores de `tipo_resolucion` para badges y tickets |
| `app/lib/devoluciones/flujos.test.ts` | Tests de política: impacto de cada resolución en caja vs reportes |
| `salidas/checklist-reconciliacion-devoluciones.md` | Checklist manual para reproducir el caso jean y validar cada pantalla |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/app/actions/devoluciones.ts` | Buscar sesión abierta **siempre** (no solo en reembolso) y asignar `sesion_caja_id` a toda devolución; mantener la exigencia de caja abierta solo para reembolso en efectivo |
| `app/app/actions/ventas.ts` | `registrarVenta`: persistir `saldo_favor_usado` en el INSERT. `anularVenta`: si la venta consumió saldo, devolverlo con `incrementar_saldo_favor` (además del `revertir_saldo_favor_de_venta` existente) |
| `app/lib/ventas/queries.ts` | `VentaListItem` y `VentaCompleta` con `saldo_favor_usado` y `total_devuelto` (suma de devoluciones completadas ≠ cambio de esa venta) |
| `app/app/(dashboard)/ventas/page.tsx` + tabla | Badge "Devolución" en ventas con devoluciones asociadas; indicador "Saldo a favor" cuando `saldo_favor_usado > 0` |
| `app/app/(dashboard)/ventas/[id]/page.tsx` | Bloque Total / Devuelto / **Neto**; línea "Pagado con saldo a favor: $X" en la sección de pagos |
| `app/components/devoluciones/TablaDevoluciones.tsx` | Columna/badge de resolución (Reembolso / Saldo a favor / Cambio) |
| `app/app/(dashboard)/devoluciones/[id]/page.tsx` | Card "Resolución" con texto explicativo |
| `app/components/devoluciones/DevolucionForm.tsx` | Nota de guía: si el cliente se lleva otro producto, sugerir "Cambio de producto"; aviso al elegir saldo a favor: "No sale dinero de la caja; el crédito queda en la cuenta del cliente" |
| `app/components/pos/PanelPago.tsx` y `cobro-guiado/PasoConfirmacion.tsx` | Mostrar "Saldo a favor aplicado" como línea del resumen de cobro |
| `app/lib/impresion/types.ts` | `PayloadTicketDevolucion.tipo_resolucion` |
| `app/components/impresion/TicketDevolucionRenderer.tsx` | Bloque según resolución: "ACREDITADO COMO SALDO A FAVOR" / "CAMBIO DE PRODUCTO — SIN REINTEGRO" |
| `app/lib/caja/types.ts`, `resumen-turno.ts` | Campos `total_devoluciones_reintegro` / `total_devoluciones_credito` |
| `app/components/caja/ResumenTurnoPanel.tsx`, `CierreCajaRenderer.tsx`, `app/lib/email/templates/cierre-caja.ts` | Mostrar el split (línea secundaria bajo "Devoluciones") |
| `app/lib/caja/resumen-turno.test.ts` | Casos con split |
| `app/types/database.ts` | Tipos: `ventas.saldo_favor_usado` |
| `referencia/reportes-definiciones-metricas.md` | Sección caja actualizada + tabla de escenarios |
| `planes/2026-07-01-auditoria-devoluciones-saldo-favor-caja.md` | Marcar `**Estado:** Reemplazado por 2026-07-02-auditoria-completa-devoluciones-caso-jean.md` |

### Archivos a Eliminar (si aplica)

Ninguno.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **La venta T-B no es un bug — no se toca el registro de ventas**: Una venta pagada con saldo a favor es una venta real (así lo tratan reportes y AFIP). Lo que falta es trazabilidad y señalización, no cambiar la semántica.

2. **`total_neto` del turno resta también los créditos store**: Hoy dashboard y reportes restan `saldo_a_favor` de las ventas netas; la caja debe hacer lo mismo para que "neto del día" coincida en todas las pantallas. El **arqueo de efectivo no cambia** (no salió dinero físico) — por eso el split reintegros/créditos es visible para el cajero.

3. **`sesion_caja_id` para toda devolución con caja abierta, sin bloquear si no la hay** (salvo reembolso en efectivo, que sigue exigiendo caja): trazabilidad del turno sin fricción operativa.

4. **Persistir `saldo_favor_usado` como columna en `ventas`** (no como fila en `pagos_venta`): evita crear métodos de pago sistema y movimientos de fondos virtuales; el mix de pagos de caja sigue reflejando solo dinero real.

5. **Guiar al flujo "Cambio de producto" con copy, no bloquear el camino saldo a favor + venta**: ambos caminos son contablemente válidos tras este plan; el cambio es más limpio pero tiene la limitación mismo-producto/mismo-precio (B6, ampliación queda P2).

### Alternativas Consideradas

- **Registrar el pago con saldo como fila de `pagos_venta` con método "Saldo a favor"** → descartado por ahora: exige método sistema, cuenta de fondos virtual y ajustes en todos los agregados de caja. La columna es suficiente y más simple.
- **Excluir `saldo_a_favor` de devoluciones monetarias en reportes** → descartado: es mercadería que volvió; las ventas netas deben restarla (política ya fijada en la auditoría 2026-06-20).
- **Permitir cambio entre productos distintos con igual precio** → válido pero amplía superficie de bugs (snapshots, stock cruzado); queda como P2 explícito.
- **Marcar la venta original como "devuelta parcial" cambiando `estado`** → descartado: rompe historial y facturación; se resuelve con el badge y el monto neto.

### Preguntas Abiertas

1. **¿El jean azul está cargado como variante del mismo producto o como producto aparte?** Define si B6 (ampliar el cambio a productos distintos) sube de prioridad.
2. **¿Split de devoluciones visible siempre en el cierre, o solo cuando hay créditos > 0?** Propuesta: solo cuando hay créditos, para no ensuciar el cierre típico.
3. **¿Incluir la mejora del cambio entre productos distintos (B6) en esta entrega?** Recomendación: no — dejar P2 y validar primero con el copy de guía.

---

## Tareas Paso a Paso

### Paso 1: Diagnóstico con datos del tenant (solo lectura)

Confirmar la secuencia del caso antes de tocar código.

**Acciones:**

- En Supabase SQL Editor del proyecto, correr:

```sql
-- Devoluciones saldo a favor recientes y su sesión de caja
SELECT d.numero_devolucion, d.venta_id, d.sesion_caja_id, d.tipo_resolucion,
       d.total_devuelto, d.created_at, v.numero_ticket, v.total
FROM devoluciones d JOIN ventas v ON v.id = d.venta_id
WHERE d.tipo_resolucion = 'saldo_a_favor' AND d.estado = 'completada'
ORDER BY d.created_at DESC LIMIT 20;

-- Ventas sin pagos (candidatas a "pagadas 100% con saldo")
SELECT v.numero_ticket, v.total, v.created_at, v.cliente_id
FROM ventas v
LEFT JOIN pagos_venta pv ON pv.venta_id = v.id
WHERE v.estado = 'completada' AND pv.id IS NULL
ORDER BY v.created_at DESC LIMIT 20;
```

- Verificar que la devolución del jean tiene `sesion_caja_id IS NULL` y que la venta T-B no tiene `pagos_venta`.
- Registrar hallazgos en las Notas de Implementación al cerrar el plan.

**Archivos afectados:** ninguno.

---

### Paso 2: Migración `ventas.saldo_favor_usado`

**Acciones:**

- Crear `supabase/migrations/20260702000001_ventas_saldo_favor_usado.sql`:

```sql
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS saldo_favor_usado numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_saldo_favor_usado_nonneg CHECK (saldo_favor_usado >= 0);
COMMENT ON COLUMN public.ventas.saldo_favor_usado IS
  'Parte del total cubierta con crédito de devoluciones (no genera ingreso de caja).';
```

- Actualizar `app/types/database.ts`.

**Archivos afectados:** migración nueva, `app/types/database.ts`.

---

### Paso 3: Persistir y revertir el saldo en `app/app/actions/ventas.ts`

**Acciones:**

- En el INSERT de `ventas` dentro de `registrarVenta`, agregar `saldo_favor_usado: saldoFavorUsado`.
- En `anularVenta`, tras el update a `anulada`, leer `cliente_id, saldo_favor_usado` de la venta; si `saldo_favor_usado > 0` y hay cliente, llamar `incrementar_saldo_favor` por ese monto (devolver el crédito consumido). Mantener la llamada existente a `revertir_saldo_favor_de_venta` (revierte el crédito **otorgado** por devoluciones de esa venta). Los dos casos son independientes y pueden coexistir.
- Revalidar `/clientes` y `/clientes/[id]` cuando se devuelve saldo.

**Archivos afectados:** `app/app/actions/ventas.ts`.

---

### Paso 4: Sesión de caja en toda devolución

**Acciones:**

- En `registrarDevolucion` (`app/app/actions/devoluciones.ts`), mover la búsqueda de sesión abierta fuera del bloque `if (tipo_resolucion === 'reembolso')`:
  - Buscar la sesión abierta siempre; `sesionId` = id o `null`.
  - Mantener el error bloqueante "Para devolver efectivo necesitás una sesión de caja abierta" solo cuando hay pagos en efectivo.
  - El INSERT de cabecera ya usa `sesion_caja_id: sesionId` — con este cambio queda poblado para `saldo_a_favor` y `cambio` también.

**Archivos afectados:** `app/app/actions/devoluciones.ts`.

---

### Paso 5: Migración caja — split reintegros vs créditos

**Acciones:**

- Crear `supabase/migrations/20260702000002_caja_split_devoluciones.sql` redefiniendo `preview_resumen_turno` y `cerrar_caja` (partir de la versión en `20260620120003`):
  - `v_total_dev_reintegro`: devoluciones del turno con `tipo_resolucion = 'reembolso'` (o `NULL` legacy).
  - `v_total_dev_credito`: devoluciones del turno con `tipo_resolucion = 'saldo_a_favor'`.
  - `total_devoluciones_monto` = reintegro + crédito (excluye `cambio`, como hasta ahora); `total_neto` = ventas − devoluciones − comisiones (sin cambio de fórmula, pero ahora **incluye** las saldo a favor porque tienen sesión).
  - Agregar al JSON de retorno: `total_devoluciones_reintegro`, `total_devoluciones_credito`.
  - `efectivo_esperado`: sin cambios (se calcula por `movimientos_fondos`, los créditos no generan movimiento).
  - En `cerrar_caja`, persistir los dos subtotales si `cierres_caja` lo permite; si no, agregar columnas `total_devoluciones_reintegro` y `total_devoluciones_credito` con default 0 en la misma migración.
- Aplicar en staging/prod antes del deploy.

**Archivos afectados:** migración nueva.

---

### Paso 6: Tipos y UI de caja

**Acciones:**

- `app/lib/caja/types.ts`: agregar `total_devoluciones_reintegro?: number` y `total_devoluciones_credito?: number` a `ResumenTurno`.
- `app/lib/caja/resumen-turno.ts`: mapear los campos nuevos (con default 0 para cierres viejos).
- `ResumenTurnoPanel.tsx`: bajo el KPI "Devoluciones", cuando `total_devoluciones_credito > 0`, línea secundaria: `Reintegros $X · Créditos $Y`.
- `CierreCajaRenderer.tsx` y `app/lib/email/templates/cierre-caja.ts`: misma línea condicional.
- Ampliar `app/lib/caja/resumen-turno.test.ts` con un payload que incluya el split.

**Archivos afectados:** los 5 listados.

---

### Paso 7: Trazabilidad en ventas (queries + UI)

**Acciones:**

- `app/lib/ventas/queries.ts`:
  - `VentaListItem`: agregar `saldo_favor_usado: number` y `total_devuelto: number` (join/agregado de `devoluciones` completadas con `tipo_resolucion != 'cambio'` por venta; usar una segunda query batch por ids para no complicar el select principal).
  - `VentaCompleta`: agregar `saldo_favor_usado`.
- Lista `/ventas`: badge ámbar "Devolución" cuando `total_devuelto > 0`; texto secundario "Neto $Z". Indicador "Saldo a favor" cuando `saldo_favor_usado > 0`.
- Detalle `/ventas/[id]`:
  - KPIs: Total / Devuelto / Neto (ya carga `devoluciones` de la venta — reutilizar).
  - En la sección de pagos, si `saldo_favor_usado > 0`, fila: "Saldo a favor aplicado — $X" (así una venta 100% saldo no muestra pagos vacíos).

**Archivos afectados:** `app/lib/ventas/queries.ts`, `app/app/(dashboard)/ventas/page.tsx` (+ componente de tabla), `app/app/(dashboard)/ventas/[id]/page.tsx`.

---

### Paso 8: Claridad en devoluciones (labels, tabla, detalle, form)

**Acciones:**

- Crear `app/lib/devoluciones/resolucion-labels.ts`:

```ts
export const RESOLUCION_LABELS: Record<string, { label: string; tone: string }> = {
  reembolso: { label: 'Reembolso', tone: 'red' },
  saldo_a_favor: { label: 'Saldo a favor', tone: 'emerald' },
  cambio: { label: 'Cambio', tone: 'blue' },
}
```

- `TablaDevoluciones.tsx`: badge de resolución en vista desktop y móvil (el dato `tipo_resolucion` ya viene en `DevolucionListItem`).
- `devoluciones/[id]/page.tsx`: card "Resolución" con texto: saldo a favor → "El importe quedó acreditado en la cuenta del cliente. No salió dinero de la caja."
- `DevolucionForm.tsx`:
  - En la card de saldo a favor, agregar aclaración: "No sale dinero de la caja".
  - Nota guía sobre las tres opciones: "¿El cliente se lleva otro talle o color del mismo producto? Usá **Cambio de producto** — no genera movimientos de dinero ni una venta nueva."

**Archivos afectados:** archivo nuevo + los 3 componentes.

---

### Paso 9: Ticket de devolución con resolución

**Acciones:**

- Crear `supabase/migrations/20260702000003_payload_devolucion_resolucion.sql`: redefinir `build_payload_ticket_devolucion` (partir de `20260620110002`) agregando `'tipo_resolucion', d.tipo_resolucion` al jsonb.
- `app/lib/impresion/types.ts`: `tipo_resolucion?: 'reembolso' | 'saldo_a_favor' | 'cambio'` en `PayloadTicketDevolucion`.
- `TicketDevolucionRenderer.tsx`: después del bloque TOTAL DEVUELTO:
  - `saldo_a_favor` → recuadro "ACREDITADO COMO SALDO A FAVOR / válido para próximas compras".
  - `cambio` → "CAMBIO DE PRODUCTO — SIN REINTEGRO".
  - `reembolso` → sin cambios (ya lista los reintegros).

**Archivos afectados:** migración nueva + 2 archivos.

---

### Paso 10: POS — mostrar saldo aplicado en el cobro

**Acciones:**

- `PanelPago.tsx` y `cobro-guiado/PasoConfirmacion.tsx`: en el resumen de cobro, cuando hay saldo aplicado, línea "Saldo a favor — $X" junto a los métodos de pago (hoy solo se ve el descuento implícito del total).

**Archivos afectados:** 2 componentes.

---

### Paso 11: Tests y checklist de reconciliación

**Acciones:**

- `app/lib/devoluciones/flujos.test.ts` (node test runner, patrón de `formulas.test.ts`):
  - `esDevolucionMonetaria`: reembolso/saldo_a_favor/NULL → true; cambio → false.
  - Helper de split de caja: reintegro vs crédito con los tres tipos.
- `salidas/checklist-reconciliacion-devoluciones.md` — reproducir el caso jean completo en staging:
  1. Abrir caja con $10.000.
  2. Venta T-A: jean $30.000 + campera $50.000, efectivo → efectivo esperado $90.000.
  3. Devolución jean con saldo a favor → cliente con crédito $30.000; devolución visible en el turno; efectivo esperado sigue $90.000.
  4. Venta T-B: jean azul $30.000 pagada 100% con saldo → `saldo_favor_usado = 30000`, sin pagos; crédito del cliente $0.
  5. Cierre: ventas $110.000, devoluciones $30.000 (reintegros $0 / créditos $30.000), **neto $80.000**, efectivo esperado $90.000 → cuadra con el cajón.
  6. Dashboard del día: neto $80.000 — mismo número que caja.
  7. Ticket de la devolución dice "ACREDITADO COMO SALDO A FAVOR".
  8. Extra: anular T-B → el cliente recupera crédito $30.000.
- Correr suite de tests existente (`resumen-turno.test.ts`, `formulas.test.ts`) para regresiones.

**Archivos afectados:** test nuevo + checklist nuevo.

---

### Paso 12: Documentación y cierre

**Acciones:**

- `referencia/reportes-definiciones-metricas.md`: actualizar sección "Caja — resumen de turno" con el split y agregar la tabla de escenarios (ver Notas).
- Marcar `planes/2026-07-01-auditoria-devoluciones-saldo-favor-caja.md` como `**Estado:** Reemplazado por 2026-07-02-auditoria-completa-devoluciones-caso-jean.md`.
- Verificar que `CLAUDE.md` no requiere cambios (no hay comandos ni estructura nueva).
- Actualizar este plan a `**Estado:** Implementado` + Notas de Implementación.

**Archivos afectados:** 3 archivos.

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/lib/dashboard/queries.ts` — KPIs de devoluciones (sin cambios: filtra por `created_at`, ya correcto).
- `app/lib/reportes/queries.ts`, `formulas.ts` — política de devoluciones monetarias (sin cambios de fórmula).
- `app/components/dashboard/UltimasDevolucionesCard.tsx` — puede sumar el badge de resolución (opcional).
- `supabase/migrations/20260620120001_reporte_historico_ganancia_neta.sql` — ganancia neta (sin cambios).

### Actualizaciones Necesarias para Consistencia

- Las migraciones SQL deben aplicarse en producción **antes** del deploy del código que las consume (orden: Paso 2 → 5 → 9).
- Cierres de caja históricos no tienen el split: la UI debe tolerar campos ausentes (default 0).

### Impacto en Flujos de Trabajo Existentes

- Cajeros: verán las devoluciones saldo a favor / cambio dentro del turno; el cierre restará créditos del neto pero no del arqueo de efectivo.
- Dueños: el neto del turno coincidirá con el neto del día del dashboard — hoy no coincide cuando hay saldo a favor.
- Sin cambios en reportes mensuales ni CSV (política intacta).

---

## Lista de Validación

- [ ] Diagnóstico SQL confirma la secuencia del caso (devolución sin sesión + venta sin pagos)
- [ ] Migraciones aplicadas sin error en staging y prod
- [ ] Devolución saldo a favor nueva queda con `sesion_caja_id` poblado
- [ ] Cierre de caja: neto resta la devolución saldo a favor; efectivo esperado sin cambios; split visible cuando hay créditos
- [ ] Venta pagada con saldo muestra "Saldo a favor aplicado" en detalle, lista y POS
- [ ] `anularVenta` de una venta con `saldo_favor_usado > 0` restituye el crédito al cliente
- [ ] Ticket de devolución saldo a favor imprime "ACREDITADO COMO SALDO A FAVOR"
- [ ] Lista `/ventas` marca ventas con devoluciones y muestra neto
- [ ] `DevolucionForm` muestra la guía hacia "Cambio de producto"
- [ ] Tests nuevos y existentes pasan (`npm test` en `app/`)
- [ ] Checklist manual de reconciliación completado end-to-end en staging
- [ ] `referencia/reportes-definiciones-metricas.md` actualizado; plan 2026-07-01 marcado como reemplazado

---

## Criterios de Éxito

1. Reproduciendo el caso jean en staging, **todas** las pantallas (lista ventas, detalle, caja del turno, dashboard, reportes, ticket) cuentan la misma historia y el neto coincide: $80.000.
2. El cierre de caja de un turno con devolución saldo a favor no queda inflado ni genera diferencia de efectivo.
3. El operador puede explicar cada registro: la venta T-B dice "pagada con saldo a favor", la devolución dice "acreditado al cliente", y la venta original muestra su neto.
4. El cajero tiene guía visible para usar "Cambio de producto" en cambios de talle/color.

---

## Notas

### Matriz de escenarios (referencia para QA y para `referencia/reportes-definiciones-metricas.md`)

| Escenario | Caja: efectivo | Caja: neto turno | Reportes: ventas netas | Notas |
|-----------|----------------|------------------|------------------------|-------|
| Devolución reembolso efectivo | −monto | −monto | −monto | Egreso vía trigger |
| Devolución reembolso tarjeta | 0 (cuenta tarjeta −monto) | −monto | −monto | |
| Devolución saldo a favor | **0** | −monto (post-fix) | −monto | Crédito = pasivo, no egreso |
| Cambio misma variante / otra variante mismo precio | 0 | 0 | 0 | Solo stock |
| Venta pagada parte saldo + parte efectivo | +parte efectivo | +total venta | +total venta | `saldo_favor_usado` registra la parte crédito |
| Venta 100% saldo a favor | 0 | +total venta | +total venta | Sin `pagos_venta`; neteada por la devolución que originó el crédito |
| Anular venta que otorgó saldo (vía devoluciones) | — | — | revierte crédito otorgado | RPC existente `revertir_saldo_favor_de_venta` |
| Anular venta que consumió saldo | — | — | restituye crédito al cliente | Nuevo en este plan |

### P2 explícito (fuera de alcance)

- **B6 ampliado:** permitir "Cambio de producto" entre productos distintos con igual precio (hoy solo variantes del mismo producto). Evaluar tras validar si el jean azul era otro producto en el catálogo del cliente.
- Método de pago sistema "Saldo a favor" en `pagos_venta` para unificar el mix de pagos.
- Reversión de comisiones al devolver (B8, limitación documentada).
- `anularDevolucion` guiada desde la UI.

---

## Notas de Implementación

**Implementado:** 2026-07-02

### Resumen

- **Migraciones nuevas (3):**
  - `20260702000001_ventas_saldo_favor_usado.sql` — columna `ventas.saldo_favor_usado` (con check `>= 0`).
  - `20260702000002_caja_split_devoluciones.sql` — columnas `total_devoluciones_reintegro` / `total_devoluciones_credito` en `cierres_caja`; redefine `preview_resumen_turno` y `cerrar_caja` con el split (créditos siguen restando del neto pero no tocan efectivo).
  - `20260702000003_payload_devolucion_resolucion.sql` — `build_payload_ticket_devolucion` incluye `tipo_resolucion`.
- **Server actions:** `registrarVenta` persiste `saldo_favor_usado`; `anularVenta` restituye el crédito consumido (`incrementar_saldo_favor`); `registrarDevolucion` asigna `sesion_caja_id` a **toda** devolución con caja abierta (el fix central del bug de caja), manteniendo la exigencia de caja abierta solo para reembolsos en efectivo.
- **Caja:** `ResumenTurno`, `Cierre`, panel de turno, ticket de cierre y email de cierre muestran "Reintegros $X · Créditos $Y" cuando hay créditos (>0).
- **Ventas:** lista muestra badges "Devolución" / "Pagada con saldo a favor" y neto; detalle muestra "Saldo a favor aplicado", nota explicativa y bloque Total/Devuelto/Neto; el vuelto contempla el saldo aplicado.
- **Devoluciones:** nuevo `app/lib/devoluciones/resolucion-labels.ts`; columna/badge "Resolución" en tabla y detalle; `DevolucionForm` aclara el efecto en caja de cada opción y sugiere "Cambio de producto" cuando se elige saldo a favor; ticket imprime la resolución y la leyenda "no se entregó dinero" para saldo a favor.
- **POS:** confirmación del cobro aclara que la parte cubierta con crédito no ingresa a caja.
- **Tests:** `app/lib/devoluciones/flujos.test.ts` (caso jean completo + reembolso + cambio + legacy + anulación) y 2 casos nuevos en `resumen-turno.test.ts`. 18/18 pasan con vitest.
- **Docs:** `referencia/reportes-definiciones-metricas.md` actualizado (columna "¿Egreso de caja?", split de caja, matriz de escenarios del turno); `salidas/checklist-reconciliacion-devoluciones.md` con los 5 escenarios manuales y SQL de diagnóstico.

### Desviaciones del Plan

- El **Paso 1 (diagnóstico SQL sobre el tenant del cliente)** no se ejecutó porque requiere acceso a la base de producción; las queries quedaron en `salidas/checklist-reconciliacion-devoluciones.md` para correrlas en el SQL Editor de Supabase.
- Pregunta abierta 2 resuelta con la recomendación del plan: el split de devoluciones se muestra solo cuando hay créditos (> 0) para no ensuciar la UI en turnos sin saldo a favor.
- Pregunta abierta 3: B6 (cambio entre productos distintos de igual precio) quedó como P2, según lo previsto.

### Problemas Encontrados

- **Test preexistente incorrecto:** `lib/pos/cobro-guiado-steps.test.ts` tenía un caso ("pagosInsuficientes tras descuento") que esperaba `true` para un pago de $1.000 contra un total de $800 — eso es sobrepago, no insuficiencia, y la implementación (correcta) devuelve `false`. Se corrigió el test y se agregaron 2 casos de cobertura (pago realmente insuficiente y total cubierto con saldo a favor). No se tocó la lógica de `cobro-guiado-steps.ts`.
- El repo mezcla tests de `node:test` y `vitest` sin script `test` en `package.json`; los archivos vitest relevantes (28 tests) pasan todos.

### Validación pendiente del operador

- Aplicar las 3 migraciones en Supabase y deployar.
- Correr el checklist manual end-to-end (escenarios A–E) en staging.
