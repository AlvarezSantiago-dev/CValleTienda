# Plan: Mejora completa del cierre de caja y preview admin

**Creado:** 2026-06-08
**Estado:** Implementado
**Pedido:** Mejorar la vista de cierre de caja con todo el detalle necesario y corregir la previsualización admin que hoy resulta confusa.

---

## Descripción General

### Qué Logra Este Plan

Rediseña la experiencia de cierre de caja en tres capas: **preview del turno antes de cerrar** (admin y cajero), **formulario de cierre con arqueo claro**, y **detalle post-cierre completo** (pantalla de sesión, último cierre, email/impresión alineados). El admin deja de ver saldos globales mezclados con datos del turno y pasa a entender qué pasó en la sesión, qué va a quedar en el cierre y cómo cuadra el efectivo.

### Por Qué Importa

Hoy el panel izquierdo (admin) muestra **saldo acumulado de cada cuenta** — no el movimiento del turno — junto con filas anidadas de acreditación pendiente que rompen la tabla. El formulario de cierre compara el conteo físico contra `saldo_actual` de efectivo, que **no coincide** con `efectivo_esperado` que calcula el RPC (apertura + ingresos − egresos del turno). Eso genera diferencias fantasma y desconfianza. El detalle post-cierre (`CierreDetalle`) omite columnas que ya existen en BD (`saldo_antes_turno`, `saldo_despues_turno`), no muestra pagos por método, ventas del turno ni top productos — datos que el email de cierre sí incluye.

---

## Estado Actual

### Estructura Existente Relevante

| Elemento | Ubicación | Estado |
|----------|-----------|--------|
| Página principal caja | `app/app/(dashboard)/caja/page.tsx` | Grid 2 cols: `SesionAbiertaPanel` + `CerrarSesionForm` |
| Panel sesión abierta | `app/components/caja/SesionAbiertaPanel.tsx` | KPIs básicos + tabla saldos globales + movimientos manuales |
| Formulario cierre | `app/components/caja/CerrarSesionForm.tsx` | Solo arqueo; usa `saldo_actual` (incorrecto para arqueo) |
| Detalle post-cierre | `app/components/caja/CierreDetalle.tsx` | Ventas/devoluciones/arqueo/desglose parcial por cuenta |
| Detalle sesión cerrada | `app/app/(dashboard)/caja/sesiones/[id]/page.tsx` | Solo `CierreDetalle` + botón reabrir |
| Queries caja | `app/lib/caja/queries.ts` | `obtenerSesionAbierta`, `obtenerCierre`, movimientos manuales |
| RPC cierre | `supabase/migrations/20260419000010_sesiones_caja.sql` → `cerrar_caja` | Cálculo correcto de `efectivo_esperado` y detalle por cuenta |
| Email cierre | `app/lib/email/enviar-cierre.ts` + `templates/cierre-caja.ts` | Incluye top 5 productos |
| Impresión ticket | `app/components/impresion/CierreCajaRenderer.tsx` | Payload `PayloadCierreCaja` |
| Formato ARS | `app/lib/format-moneda.ts`, `InputMonedaARS` | Ya usado en POS/cobro guiado |
| Plan previo vuelto | `planes/2026-06-06-revision-y-fix-cierre-de-caja.md` | Fix vuelto ya en SQL (movimientos_fondos) |

### Brechas o Problemas que se Abordan

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Admin ve **saldo global** por cuenta, no movimiento del turno | Confunde al cerrar: “¿por qué Mercado Pago tiene $31.000 si no vendí nada?” |
| 2 | Filas de **acreditación pendiente** embebidas en la tabla de saldos | Layout roto, difícil de escanear |
| 3 | `CerrarSesionForm` muestra `saldo_actual` como referencia de arqueo | **Bug UX**: no es igual a `efectivo_esperado` del RPC |
| 4 | Sin **preview del cierre** antes de confirmar | Admin no sabe qué se va a registrar |
| 5 | `CierreDetalle` no muestra saldo antes/después, pagos por método, ventas, top productos | Detalle incom vs email |
| 6 | `/caja/sesiones/[id]` es una sola tarjeta | No sirve como auditoría del turno |
| 7 | Tipos de cuenta en crudo (`efectivo`, `mercado_pago`) | Poco legible |
| 8 | KPI “Estado: Abierta” redundante con badge del header | Ruido visual |
| 9 | Efectivo declarado con `type="number"` sin formato ARS | Inconsistente con resto del POS |
| 10 | Sin botón **Imprimir cierre** en UI web | Existe renderer pero no se expone |

---

## Cambios Propuestos

### Resumen de Cambios

- Nueva función SQL **`preview_resumen_turno(p_sesion_id)`** — misma lógica de cálculo que `cerrar_caja`, solo lectura.
- Nueva query TS **`obtenerResumenTurno(sesionId)`** + tipos en `lib/caja/types.ts`.
- Helper **`labelTipoCuenta(tipo)`** centralizado para labels legibles.
- **`ResumenTurnoPanel`** — componente reutilizable (preview pre-cierre y base del detalle post-cierre).
- Rediseño **`SesionAbiertaPanel`** para admin: turno vs saldos globales separados.
- **`CerrarSesionForm`** con preview integrado, `InputMonedaARS`, diferencia en vivo.
- **`CierreDetalle`** ampliado + secciones colapsables.
- **`/caja/sesiones/[id]`** como página de auditoría completa.
- Botón imprimir cierre desde detalle (reutilizar lógica de payload existente).
- Tests unitarios del helper de labels y del parser de preview (si aplica).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `supabase/migrations/20260608120001_preview_resumen_turno.sql` | RPC `preview_resumen_turno` — resumen del turno sin cerrar |
| `app/lib/caja/labels.ts` | `labelTipoCuenta`, `labelTipoMovimiento` |
| `app/lib/caja/resumen-turno.ts` | Tipos `ResumenTurno`, mapper desde RPC |
| `app/components/caja/ResumenTurnoPanel.tsx` | UI unificada: KPIs, arqueo, desglose por cuenta, pagos por método |
| `app/components/caja/VentasTurnoLista.tsx` | Tabla compacta de ventas del turno con link |
| `app/components/caja/TopProductosTurno.tsx` | Top 5 productos (misma lógica que email) |
| `app/components/caja/ImprimirCierreButton.tsx` | Client button que encola job de impresión |
| `app/lib/caja/resumen-turno.test.ts` | Tests del mapper / labels |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `app/lib/caja/queries.ts` | `obtenerResumenTurno`, `listarVentasTurno`, `listarPagosPorMetodoTurno`, `obtenerTopProductosTurno` |
| `app/lib/caja/types.ts` | Tipos para resumen turno, venta turno, pago por método |
| `app/components/caja/SesionAbiertaPanel.tsx` | Rediseño admin: quitar KPI Estado; separar secciones; labels legibles |
| `app/components/caja/CerrarSesionForm.tsx` | Preview + efectivo esperado correcto + InputMonedaARS + diff live |
| `app/components/caja/CierreDetalle.tsx` | Delegar en `ResumenTurnoPanel` + columnas saldo antes/después + extras |
| `app/app/(dashboard)/caja/page.tsx` | Fetch `obtenerResumenTurno` cuando hay sesión abierta; pasar a form y panel |
| `app/app/(dashboard)/caja/sesiones/[id]/page.tsx` | Layout completo: header sesión, resumen, ventas, movimientos, imprimir |
| `app/lib/format-moneda.ts` | Exportar `formatARS` si no está (evitar duplicar en 6 archivos) — opcional refactor mínimo |

---

## Decisiones de Diseño

### Decisiones Clave Tomadas

1. **RPC SQL para preview**: El cálculo de `efectivo_esperado` y detalle por cuenta debe vivir en Postgres (fuente de verdad). Un RPC `preview_resumen_turno` evita drift entre preview y `cerrar_caja`. Idealmente extraer sub-función compartida; si el refactor de `cerrar_caja` es riesgoso, duplicar la lógica en preview con comentario cruzado y test SQL.

2. **Separar “Movimiento del turno” vs “Saldo global”**: En admin, la tabla principal del panel izquierdo pasa a mostrar **ingresos / egresos / neto del turno por cuenta** (desde preview RPC). Los saldos globales y acreditaciones pendientes van a una sección secundaria colapsable “Saldos actuales de la tienda”.

3. **Un componente `ResumenTurnoPanel`**: Misma visualización en preview pre-cierre, `CierreDetalle` post-cierre y página `/caja/sesiones/[id]`. Props: `modo: 'preview' | 'cerrado'`, datos del resumen, flags de secciones.

4. **Cajero vs admin**: El cajero sigue viendo panel simplificado (sin saldos globales ni movimientos manuales). El preview en `CerrarSesionForm` sí lo ve el cajero (ventas, efectivo esperado, arqueo) porque necesita cuadrar el cajón.

5. **Pagos por método**: Agrupar `pagos_venta` del turno por `cuenta_fondo_id` / nombre cuenta — no confundir con “método de pago POS” si el modelo usa cuentas de fondos como proxy (efectivo, MP, etc.).

6. **InputMonedaARS en efectivo declarado**: Reutilizar componente existente del cobro guiado.

### Alternativas Consideradas

| Alternativa | Por qué se rechazó |
|-------------|------------------|
| Calcular preview solo en TypeScript | Riesgo de divergir del RPC `cerrar_caja` |
| Tabs en panel admin (Turno / Saldos / Movimientos) | Más clics; acordeones por sección son suficientes |
| Página nueva `/caja/preview` | Duplica ruta; el preview vive en el form de cierre |

### Preguntas Abiertas

1. **¿Mostrar lista completa de ventas del turno o solo últimas 10 + link “Ver todas”?** — Propuesta: últimas 10 en panel, link a `/ventas?sesion=…` si el filtro existe; si no, link genérico a ventas del día.
2. **¿Cajero debe ver desglose por cuenta (MP, etc.) al cerrar?** — Propuesta: sí ver totales de ventas y arqueo efectivo; desglose por cuenta solo admin/owner.

---

## Tareas Paso a Paso

### Paso 1: RPC `preview_resumen_turno`

**Objetivo:** Exponer en lectura el mismo cálculo que usará el cierre.

**Acciones:**

- Crear migración `20260608120001_preview_resumen_turno.sql`.
- Función retorna `jsonb` con estructura:

```sql
{
  "total_ventas_monto": numeric,
  "total_ventas_cantidad": int,
  "total_devoluciones_monto": numeric,
  "total_devoluciones_cantidad": int,
  "total_comisiones": numeric,
  "total_neto": numeric,
  "monto_apertura_efectivo": numeric,
  "efectivo_esperado": numeric,
  "detalle_por_cuenta": [
    {
      "cuenta_fondo_id": uuid,
      "nombre_cuenta": text,
      "tipo_cuenta": text,
      "total_ingresos": numeric,
      "total_egresos": numeric,
      "comision_estimada": numeric,
      "total_neto": numeric,
      "saldo_antes_turno": numeric,
      "saldo_despues_turno": numeric
    }
  ],
  "pagos_por_cuenta": [
    { "nombre_cuenta": text, "cantidad_pagos": int, "monto_bruto": numeric, "comision": numeric, "monto_neto": numeric }
  ]
}
```

- Reutilizar queries internas de `cerrar_caja` (ventas, devoluciones, movimientos_fondos desde `fecha_apertura`, comisiones).
- `security definer` + validar `get_tienda_id()` y sesión abierta (o también permitir sesión cerrada para página detalle — **recomendado**: aceptar cualquier sesión de la tienda para re-calcular histórico).
- `grant execute to authenticated`.

**Archivos afectados:**

- `supabase/migrations/20260608120001_preview_resumen_turno.sql`

---

### Paso 2: Queries y tipos en TypeScript

**Acciones:**

- Agregar interfaces en `app/lib/caja/types.ts`: `ResumenTurno`, `DetalleCuentaTurno`, `PagoPorCuentaTurno`.
- Crear `app/lib/caja/resumen-turno.ts` con mapper RPC → tipos.
- En `queries.ts`:
  - `obtenerResumenTurno(sesionId: string): Promise<ResumenTurno | null>`
  - `listarVentasTurno(sesionId, limit = 10)`
  - `obtenerTopProductosTurno(sesionId, limit = 5)` — copiar lógica de `enviar-cierre.ts`
  - `listarMovimientosTurno(sesionId)` — todos los movimientos desde apertura (no solo manuales)
- Crear `app/lib/caja/labels.ts`:

```ts
const LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  // ...
}
export function labelTipoCuenta(tipo: string): string
```

**Archivos afectados:**

- `app/lib/caja/types.ts`
- `app/lib/caja/resumen-turno.ts`
- `app/lib/caja/queries.ts`
- `app/lib/caja/labels.ts`

---

### Paso 3: Componente `ResumenTurnoPanel`

**Acciones:**

- Props: `resumen: ResumenTurno`, `modo: 'preview' | 'cerrado'`, `cierre?: Cierre` (para declarado/diferencia si cerrado), `colapsable?: boolean`.
- Secciones:
  1. **KPIs**: ventas, devoluciones, comisiones, neto.
  2. **Arqueo efectivo** (preview: solo esperado; cerrado: esperado/declarado/diferencia con colores).
  3. **Movimiento del turno por cuenta** — tabla con ingresos, egresos, comisión, neto, saldo antes → después.
  4. **Cobros por cuenta** — cantidad de pagos y montos.
- Usar `labelTipoCuenta` en columna tipo.
- Badge “Vista previa” cuando `modo === 'preview'`.

**Archivos afectados:**

- `app/components/caja/ResumenTurnoPanel.tsx`

---

### Paso 4: Rediseño `SesionAbiertaPanel` (fix preview admin)

**Acciones:**

- Eliminar KPI “Estado: Abierta”.
- Reemplazar KPI ventas: mostrar monto como valor principal, cantidad como hint (invertir jerarquía actual).
- Nueva prop `resumenTurno?: ResumenTurno | null` (solo admin).
- Si `mostrarSaldos && resumenTurno`:
  - Sección principal: **“Movimiento del turno”** — mini tabla o embed parcial de `ResumenTurnoPanel` (solo detalle por cuenta).
  - Sección colapsable (cerrada por default): **“Saldos actuales de cuentas”** — tabla global actual con acreditaciones pendiente en cards debajo de cada cuenta, no filas `<tr>` anidadas.
- Columna “Tipo” → badge con `labelTipoCuenta(c.tipo)`.
- Mantener movimientos manuales y botón registrar.

**Archivos afectados:**

- `app/components/caja/SesionAbiertaPanel.tsx`

---

### Paso 5: Mejorar `CerrarSesionForm`

**Acciones:**

- Nueva prop `resumenTurno: ResumenTurno`.
- Reemplazar caja amarilla: mostrar **`efectivo_esperado`** del resumen (no `saldo_actual`).
- Agregar texto explicativo: “Calculado: apertura + ingresos efectivo − egresos efectivo del turno”.
- Integrar `ResumenTurnoPanel` en modo preview **debajo** del arqueo (colapsable en mobile).
- Reemplazar `Input` por `InputMonedaARS`; calcular diferencia en vivo cuando hay valor declarado.
- Paso confirmación: mostrar resumen compacto (ventas, efectivo esperado, declarado, diferencia) antes del botón rojo.
- Cajero: recibe `resumenTurno` igual (fetch en page.tsx para todos los roles).

**Archivos afectados:**

- `app/components/caja/CerrarSesionForm.tsx`

---

### Paso 6: Ampliar `CierreDetalle` y página sesión

**Acciones:**

- `CierreDetalle`: usar `ResumenTurnoPanel` con `modo="cerrado"` + datos de `cierre`.
- Agregar `TopProductosTurno` y `VentasTurnoLista` como secciones opcionales (props).
- Crear `ImprimirCierreButton` — buscar en `actions/caja.ts` o impresión cómo se arma `PayloadCierreCaja` al cerrar; exponer action `obtenerPayloadImpresionCierre(sesionId)`.
- Reescribir `app/(dashboard)/caja/sesiones/[id]/page.tsx`:
  - Header: fechas apertura/cierre, usuario, tipo cierre, badge emergencia.
  - `CierreDetalle` completo con
  - Lista ventas del turno +
  - Movimientos del turno (todos) +
  - Top productos +
  - Botones: Imprimir, Reabrir (admin).

**Archivos afectados:**

- `app/components/caja/CierreDetalle.tsx`
- `app/components/caja/VentasTurnoLista.tsx`
- `app/components/caja/TopProductosTurno.tsx`
- `app/components/caja/ImprimirCierreButton.tsx`
- `app/app/(dashboard)/caja/sesiones/[id]/page.tsx`
- Posible: `app/app/actions/caja.ts` o `app/lib/impresion/`

---

### Paso 7: Wiring en `caja/page.tsx`

**Acciones:**

- Cuando `sesion` existe: `const resumenTurno = await obtenerResumenTurno(sesion.id)`.
- Pasar a `SesionAbiertaPanel` (si !esCajero) y `CerrarSesionForm` (todos).
- Para último cierre en vista sin sesión: opcionalmente agregar top productos si se fetchean ventas de esa sesión.

**Archivos afectados:**

- `app/app/(dashboard)/caja/page.tsx`

---

### Paso 8: Tests y validación

**Acciones:**

- Test `labels.test.ts`: tipos conocidos → labels legibles.
- Test mapper resumen-turno con fixture JSON.
- Manual QA checklist (ver abajo).
- `npm run build` sin errores.

**Archivos afectados:**

- `app/lib/caja/resumen-turno.test.ts`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área

- `app/app/actions/caja.ts` — `cerrarSesion`, `cerrarSesionEmergencia`, payload impresión
- `app/lib/email/enviar-cierre.ts` — reutilizar query top productos
- `app/components/dashboard/EstadoCajaBanner.tsx` — no cambia; sigue usando sesión abierta
- `app/components/impresion/CierreCajaRenderer.tsx` — payload debe seguir compatible

### Actualizaciones Necesarias para Consistencia

- Aplicar migración SQL en Supabase (dev/prod).
- Opcional: extraer `formatARS` duplicado en 6+ componentes caja → `format-moneda.ts` (refactor pequeño, no bloqueante).

### Impacto en Flujos de Trabajo Existentes

- Flujo cajero: más contexto al cerrar, mismo número de pasos.
- Flujo admin: panel izquierdo más informativo, menos confusión con saldos históricos.
- Email e impresión: sin cambios de contrato; UI web se alinea con lo que ya reciben por email.

---

## Lista de Validación

- [x] Migración `preview_resumen_turno` aplicada y RPC responde para sesión abierta
- [x] `efectivo_esperado` en preview coincide con `efectivo_esperado` post-cierre en caso de prueba
- [x] Admin ve “Movimiento del turno” separado de “Saldos actuales”
- [x] Acreditaciones pendientes no rompen layout de tabla
- [x] Tipos de cuenta muestran labels legibles (no snake_case)
- [x] `CerrarSesionForm` usa `InputMonedaARS` y diferencia en vivo
- [x] Cajero ve efectivo esperado correcto (caso vuelto: apertura + venta − vuelto)
- [x] `/caja/sesiones/[id]` muestra ventas, movimientos, top productos
- [x] Botón imprimir genera ticket coherente con `CierreCajaRenderer`
- [x] `npm run build` OK
- [x] Tests nuevos pasan

---

## Criterios de Éxito

1. Un admin con sesión abierta entiende en **≤10 segundos** cuánto vendió el turno, cómo se movió cada cuenta y cuánto efectivo debería haber en el cajón — sin interpretar saldos globales.
2. Al declarar efectivo, la diferencia mostrada **coincide** con la del cierre guardado (misma fórmula RPC).
3. La página de detalle de sesión cerrada contiene **toda la información operativa** del turno (ventas, pagos, movimientos, arqueo, productos top).
4. La UI de cierre es **visualmente consistente** con el resto del POS (ARS, badges, jerarquía tipográfica).

---

## Notas

### Caso de prueba crítico (regresión vuelto)

| Paso | Valor |
|------|-------|
| Apertura efectivo | $10.000 |
| Venta | $8.000 |
| Pago efectivo | $10.000 |
| Vuelto | $2.000 |
| **Efectivo esperado** | **$18.000** |

Verificar en preview y en cierre final.

### Wireframe conceptual (layout sesión abierta)

```
┌─ Sesión activa ─────────────────────┐  ┌─ Cerrar caja ───────────────────┐
│ KPIs: Apertura | Ventas | Devoluc.  │  │ Efectivo esperado: $97.400      │
│                                     │  │ [InputMonedaARS declarado]      │
│ ▼ Movimiento del turno (admin)      │  │ Diferencia: —                   │
│   Cuenta | Ing | Egr | Neto         │  │ ▼ Vista previa del cierre       │
│                                     │  │   [ResumenTurnoPanel]           │
│ ▸ Saldos actuales (colapsado)       │  │ [Observaciones]                 │
│ Movimientos manuales                │  │ [Cerrar caja → Confirmar]       │
└─────────────────────────────────────┘  └─────────────────────────────────┘
```

### Orden de implementación recomendado

1 → 2 → 3 → 7 (preview funcional end-to-end) → 4 → 5 → 6 → 8

---

## Notas de Implementación

**Implementado:** 2026-06-08

### Resumen

- RPC `preview_resumen_turno` con misma lógica de cálculo que `cerrar_caja`.
- Componente `ResumenTurnoPanel` reutilizado en preview, formulario de cierre y detalle post-cierre.
- Panel admin rediseñado: movimiento del turno vs saldos globales colapsables.
- `CerrarSesionForm` usa `efectivo_esperado` del RPC, `InputMonedaARS` y diferencia en vivo.
- Página `/caja/sesiones/[id]` ampliada con ventas, movimientos, top productos e imprimir.
- Action `obtenerPayloadCierre` para reimpresión client-side.

### Desviaciones del Plan

- `obtenerPayloadCierre` implementado en TypeScript (`actions/impresion.ts`) en lugar de RPC SQL, alineado con el patrón post-eliminación de `cola_impresion`.
- Componente extra `MovimientosTurnoLista.tsx` para la tabla de movimientos del turno.
- Cajero: desglose por cuenta oculto en preview (`mostrarDesgloseCuentas={!esCajero}`).

### Problemas Encontrados

- FK de ventas es `usuario_id`, no `vendedor_id` — corregido en `listarVentasTurno`.
- Botón anidado en acordeón de saldos — separado en dos controles independientes.
