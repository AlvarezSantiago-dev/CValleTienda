# Plan: Caja — Movimientos Manuales + Historial por Mes

**Creado:** 2026-05-21
**Estado:** Borrador
**Pedido:** Agregar registro de movimientos manuales durante la sesión (eligiendo cualquier cuenta), y reestructurar el historial de cierres con filtro por mes.

---

## Descripción General

### Qué Logra Este Plan

Dos mejoras concretas al módulo de caja:

1. **Movimientos manuales en sesión activa:** Un botón en el panel de caja abierta permite registrar un egreso o ingreso manual sobre cualquier cuenta activa (efectivo, Mercado Pago, banco, etc.). Casos de uso: retiro de caja, pago a proveedor, ingreso de cambio extra, corrección manual. El movimiento se registra en `movimientos_fondos`, actualiza el saldo de la cuenta y queda incluido automáticamente en el arqueo al cierre.

2. **Historial de cierres por mes:** El historial actual muestra solo las últimas 8 sesiones sin filtro. Se reestructura con un selector de mes, mostrando todas las sesiones del mes elegido con un resumen de totales al tope (ventas del mes, total neto). Por defecto muestra el mes actual.

### Por Qué Importa

Sin movimientos manuales, cualquier retiro de efectivo del cajón durante el turno (para pagar un proveedor, llevar al banco, etc.) genera un "faltante" fantasma al cierre. Esto va a confundir al primer cliente desde el día uno.

El historial por mes es operacionalmente necesario: una tienda con ventas diarias va a tener 30 sesiones por mes. Ver solo 8 hace inútil el historial.

---

## Estado Actual — Qué YA Está Implementado

| Elemento | Estado |
|----------|--------|
| Tabla `movimientos_fondos` con `tipo`, `concepto`, `monto`, `saldo_anterior`, `saldo_posterior`, `cuenta_fondo_id` | ✅ |
| Tabla `cuentas_fondos` con `saldo_actual` actualizable | ✅ |
| RPC `cerrar_caja` — calcula `saldo_antes_turno` / `saldo_despues_turno` por cuenta a partir de `movimientos_fondos.created_at` en el rango de la sesión | ✅ |
| `SesionAbiertaPanel` — muestra saldos por cuenta, ventas del turno | ✅ |
| `listarSesiones(limit)` — devuelve últimas N sesiones sin filtro de fecha | ✅ (limitado) |
| `caja/page.tsx` — Server Component, sin `searchParams` | ✅ (a extender) |
| `cierres_caja` + `cierres_caja_detalle` — detalle completo de cierre | ✅ |

---

## Brechas que se Abordan

| Brecha | Impacto |
|--------|---------|
| No se pueden registrar egresos/ingresos manuales durante el turno | Diferencia de efectivo al cierre incorrecta |
| Historial limitado a 8 sesiones sin filtro | Inútil después del primer mes de uso |
| No hay resumen del mes en el historial | El dueño no puede ver cuánto se vendió en un mes desde caja |

---

## Cambios Propuestos

### Resumen de Cambios

**Feature 1 — Movimientos manuales:**
- `actions/caja.ts` → nueva action `registrarMovimientoCaja`
- `lib/caja/queries.ts` → nueva query `listarMovimientosManualesSesion` (para mostrar en el panel)
- `components/caja/RegistrarMovimientoForm.tsx` → nuevo componente: modal con formulario
- `components/caja/SesionAbiertaPanel.tsx` → agregar botón "Registrar movimiento" + listado de movimientos del turno

**Feature 2 — Historial por mes:**
- `lib/caja/queries.ts` → nueva función `listarSesionesPorMes(anio, mes)` que reemplaza `listarSesiones(limit)`
- `components/caja/HistorialCajaMes.tsx` → nuevo Client Component con selector de mes + tabla
- `app/(dashboard)/caja/page.tsx` → recibir `searchParams.mes`, pasar datos al nuevo componente

---

## Archivos a Crear

| Ruta | Propósito |
|------|-----------|
| `app/components/caja/RegistrarMovimientoForm.tsx` | Modal client-side con formulario para registrar movimiento manual |
| `app/components/caja/HistorialCajaMes.tsx` | Client Component: selector de mes + tabla de sesiones + resumen |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `app/app/actions/caja.ts` | Agregar `registrarMovimientoCaja(input)` |
| `app/lib/caja/queries.ts` | Agregar `listarMovimientosManualesSesion(sesionId)` y `listarSesionesPorMes(anio, mes)` |
| `app/components/caja/SesionAbiertaPanel.tsx` | Botón "Registrar movimiento" + lista de movimientos manuales del turno |
| `app/app/(dashboard)/caja/page.tsx` | Aceptar `searchParams`, pasar datos a `HistorialCajaMes` |

---

## Implementación Detallada

### Paso 1 — Action `registrarMovimientoCaja`

**Archivo:** `app/app/actions/caja.ts`

```typescript
export interface RegistrarMovimientoInput {
  cuenta_fondo_id: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
}

export async function registrarMovimientoCaja(
  input: RegistrarMovimientoInput
): Promise<ActionResult<{ id: string }>>
```

**Lógica:**
1. Validar: `monto > 0`, `concepto` no vacío, `cuenta_fondo_id` presente
2. Leer la cuenta para obtener `saldo_actual` (verificar que pertenece a la tienda)
3. Calcular `saldo_posterior = saldo_actual + monto` (ingreso) o `saldo_actual - monto` (egreso)
4. Validar: si egreso, no puede dejar saldo negativo (mostrar error claro)
5. Insertar en `movimientos_fondos`: `{ tienda_id, cuenta_fondo_id, tipo, concepto, monto, saldo_anterior: saldo_actual, saldo_posterior, venta_id: null, usuario_id }`
6. Actualizar `cuentas_fondos.saldo_actual = saldo_posterior`
7. `revalidatePath('/caja')`

**Errores descriptivos:**
- `"El monto debe ser mayor a 0"`
- `"La cuenta seleccionada no existe"`
- `"Saldo insuficiente en {nombre_cuenta} para este egreso"`

---

### Paso 2 — Query `listarMovimientosManualesSesion`

**Archivo:** `app/lib/caja/queries.ts`

```typescript
export interface MovimientoManual {
  id: string
  tipo: 'ingreso' | 'egreso' | 'ajuste'
  concepto: string
  monto: number
  saldo_posterior: number
  nombre_cuenta: string
  tipo_cuenta: string
  created_at: string
}

export async function listarMovimientosManualesSesion(
  sesionFechaApertura: string
): Promise<MovimientoManual[]>
```

**Lógica:** Consulta `movimientos_fondos` JOIN `cuentas_fondos` donde `venta_id IS NULL` (= movimiento manual, no generado por venta) y `created_at >= sesionFechaApertura`, ordenado por `created_at DESC`.

---

### Paso 3 — Componente `RegistrarMovimientoForm`

**Archivo:** `app/components/caja/RegistrarMovimientoForm.tsx`

**Comportamiento:** Modal (overlay sobre el panel, no un dialog separado). Se abre al hacer clic en "Registrar movimiento" y se cierra al guardar o cancelar.

**Campos del formulario:**
| Campo | Tipo | Notas |
|-------|------|-------|
| Tipo | Radio/Toggle: Egreso / Ingreso | Default: Egreso (es el más común) |
| Cuenta | Select con las cuentas activas | Muestra nombre + saldo actual |
| Concepto | Input text | Placeholder: "Retiro para depósito", "Pago proveedor", etc. |
| Monto | Input number, step=0.01, min=0.01 | |

**Props:**
```typescript
interface Props {
  cuentas: Array<{ id: string; nombre: string; tipo: string; saldo_actual: number }>
  onSuccess: () => void
  onCancel: () => void
}
```

**Al guardar:** llama `registrarMovimientoCaja`, en éxito llama `router.refresh()` + `onSuccess()`.

---

### Paso 4 — Actualizar `SesionAbiertaPanel`

**Archivo:** `app/components/caja/SesionAbiertaPanel.tsx`

**Cambios:**
1. Recibir prop `movimientosManuales: MovimientoManual[]` (desde el Server Component padre)
2. Recibir prop `cuentas: Array<{id, nombre, tipo, saldo_actual}>` (para el formulario)
3. Agregar estado `showMovimientoForm: boolean`
4. Agregar botón "＋ Registrar movimiento" (pequeño, junto al título "Saldo actual por cuenta")
5. Renderizar `<RegistrarMovimientoForm>` cuando `showMovimientoForm === true`
6. Agregar sección "Movimientos manuales del turno" debajo de la tabla de saldos — lista simple de los movimientos con tipo (badge ingreso verde / egreso rojo), concepto, cuenta y monto

**Nota:** `SesionAbiertaPanel` ya es Client Component (`'use client'`), no hay problemas de arquitectura.

---

### Paso 5 — Query `listarSesionesPorMes`

**Archivo:** `app/lib/caja/queries.ts`

```typescript
export interface ResumenMesCaja {
  total_sesiones: number
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_neto: number // suma de total_neto de cierres del mes
}

export async function listarSesionesPorMes(
  anio: number,
  mes: number // 1-12
): Promise<{ sesiones: SesionListItem[]; resumen: ResumenMesCaja }>
```

**Lógica:**
- Calcular `fecha_inicio` y `fecha_fin` del mes
- Consultar `sesiones_caja` filtrando `fecha_apertura >= fecha_inicio AND fecha_apertura < fecha_fin`
- Sin límite (todas las sesiones del mes)
- Calcular totales de ventas (mismo patrón que `listarSesiones`)
- Calcular `total_neto` sumando `cierres_caja.total_neto` de los cierres del mes

---

### Paso 6 — Componente `HistorialCajaMes`

**Archivo:** `app/components/caja/HistorialCajaMes.tsx`

**Tipo:** Client Component (`'use client'`)

**Props:**
```typescript
interface Props {
  sesiones: SesionListItem[]
  resumen: ResumenMesCaja
  mesActual: string  // "2026-05" — mes que se muestra
  mesesDisponibles: string[]  // ["2026-05", "2026-04", ...] — para el selector
}
```

**Estructura visual:**

```
┌─────────────────────────────────────────────────────────┐
│  Historial de sesiones           [← Mayo 2026 →]        │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Sesiones │ │ Ventas   │ │ Total    │                │
│  │    28    │ │ $420.000 │ │ neto     │                │
│  └──────────┘ └──────────┘ └──────────┘                │
│                                                         │
│  [tabla / cards de sesiones del mes]                    │
└─────────────────────────────────────────────────────────┘
```

**Selector de mes:** Navegación con botones `←` y `→`. Al cambiar de mes, actualiza la URL con `?mes=YYYY-MM` (usando `useRouter().push`) para que el Server Component recargue los datos del mes seleccionado.

**Por qué usar URL en vez de estado local:** Los datos vienen del servidor (Server Component). Pasar todos los meses al cliente sería costoso. Mejor: el cliente cambia la URL → el Server Component recarga solo el mes pedido.

---

### Paso 7 — Actualizar `caja/page.tsx`

**Archivo:** `app/app/(dashboard)/caja/page.tsx`

**Cambios:**
1. Aceptar `searchParams: Promise<{ mes?: string }>` como prop
2. Parsear `mes` (formato `"YYYY-MM"`) → `anio` y `mes`. Si ausente o inválido, usar el mes actual.
3. Llamar `listarSesionesPorMes(anio, mes)` en vez de `listarSesiones(8)`
4. Para obtener la lista de meses disponibles para el selector: consulta rápida con `SELECT DISTINCT date_trunc('month', fecha_apertura)` — agregar función `listarMesesConSesiones()` en queries
5. Pasar `movimientosManuales` y `cuentas` a `SesionAbiertaPanel` cuando hay sesión abierta
6. Reemplazar el bloque del historial por `<HistorialCajaMes>` con las props adecuadas

---

## Migration SQL

No se requiere migration. La tabla `movimientos_fondos` ya existe con todos los campos necesarios. El campo `venta_id IS NULL` es suficiente para distinguir movimientos manuales de los generados por ventas.

---

## Orden de Implementación

1. `actions/caja.ts` — `registrarMovimientoCaja`
2. `lib/caja/queries.ts` — `listarMovimientosManualesSesion` + `listarSesionesPorMes` + `listarMesesConSesiones`
3. `components/caja/RegistrarMovimientoForm.tsx` — componente nuevo
4. `components/caja/SesionAbiertaPanel.tsx` — integrar formulario + lista de movimientos
5. `components/caja/HistorialCajaMes.tsx` — componente nuevo con selector
6. `app/(dashboard)/caja/page.tsx` — conectar todo

---

## Criterios de Aceptación

- [ ] Con caja abierta, el botón "Registrar movimiento" aparece en el panel activo
- [ ] El formulario permite elegir cualquier cuenta activa y muestra su saldo actual
- [ ] Un egreso que dejaría saldo negativo muestra error claro (no se guarda)
- [ ] Tras guardar, el saldo de la cuenta se actualiza en el panel sin recargar manualmente
- [ ] Los movimientos manuales del turno se listan en el panel de sesión activa
- [ ] Al cerrar la caja, el desglose por cuenta refleja correctamente los movimientos manuales
- [ ] El historial muestra las sesiones del mes actual por defecto
- [ ] El selector de mes navega con `←` / `→` y actualiza la URL
- [ ] El resumen del mes (cantidad de sesiones, ventas totales, total neto) aparece arriba de la tabla
- [ ] Meses sin sesiones no aparecen en el selector (solo meses con datos)
