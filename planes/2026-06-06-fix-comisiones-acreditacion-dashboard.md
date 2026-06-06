# Plan: Fix comisiones y días de acreditación en dashboard y cierre de caja

**Creado:** 2026-06-06
**Estado:** Planificado
**Pedido:** Ajustar el dashboard para que muestre el saldo pendiente a ingresar con fecha de acreditación y corregir el neto del negocio/tienda por comisiones y acreditaciones en cierres.

---

## Descripción General

Este plan corrige la forma en que el sistema muestra y calcula los saldos de cuentas de fondos cuando hay pagos con comisión y tiempos de acreditación diferidos.

Actualmente el dashboard muestra solo los `Saldos disponibles` con el `saldo_actual` de cada cuenta, pero no refleja:

- el monto pendiente que todavía no se acredita en la cuenta por días de acreditación,
- la fecha estimada de entrada de ese dinero,
- el impacto real de las comisiones sobre el neto del negocio/tienda,
- el detalle en el cierre de caja de cuánto se descontó en comisiones y cuánto queda pendiente por acreditarse.

Esto causa que la pantalla principal y los informes de cierre sean engañosos para el dueño: pueden verse $4.000 en Mercado Pago y no mostrar que parte de ese dinero todavía está en tránsito y que se descontaron comisiones que afectan el neto.

---

## Objetivos

1. Mostrar en el dashboard un bloque de `Saldos disponibles` que distinga entre:
   - saldo ya acreditado y disponible,
   - saldo pendiente por acreditación,
   - fecha estimada de acreditación según `dias_acreditacion` del método de pago.
2. Ajustar el cálculo de neto del negocio/tienda para que considere comisiones y tiempos de acreditación en los cierres.
3. En el último cierre de caja registrado, el detalle de comisiones debe reflejar el impacto real del turno y permitir ver claramente cuánto se acredita después.
4. No romper el sistema existente: el cambio debe ser incremental y seguro, manteniendo el comportamiento actual cuando la acreditación es inmediata.

---

## Alcance

### Incluye

- Cambios en el dashboard `/dashboard`.
- Nuevas métricas de `pendiente a ingresar` por cuenta de fondos.
- Cálculo de fecha estimada de acreditación de cada pago.
- Ajuste del modelo de datos / queries de dashboard para incluir comisiones y pendiente.
- Ajuste de los cierres de caja para que el neto tenga en cuenta el ingreso diferido y las comisiones.
- Refactor de `SaldosCard` y componentes de cierre si es necesario.

### No incluye

- Cambios en facturación electrónica AFIP.
- Cambios de UX en módulos no relacionados con caja/dashboard.
- Reescritura completa del módulo de ventas.

---

## Estado Actual Relevante

### Dashboard

- `app/app/(dashboard)/dashboard/page.tsx` ya orquesta varios KPIs y el bloque `SaldosCard`.
- `app/components/dashboard/SaldosCard.tsx` solo muestra `nombre`, `tipo` y `saldo_actual`.
- No hay representación de monto pendiente ni fecha de acreditación.

### Cierres de caja

- `supabase/migrations/20260419000010_sesiones_caja.sql` define `cierres_caja` y `cierres_caja_detalle`.
- El cierre actual usa `pagos_venta` para calcular comisiones y `movimientos_fondos` para totales por cuenta, pero no conserva información de acreditación futura ni la separa en el dashboard.

### Pagos y métodos de pago

- `public.metodos_pago.dias_acreditacion` existe y se usa en ventas.
- `public.pagos_venta` almacena `comision_calculada` y `monto_neto`.
- El sistema tiene triggers que actualizan `cuentas_fondos.saldo_actual` según pagos y devoluciones.

---

## Propuesta de Implementación

### 1. Modelo de datos / queries

Crear o extender queries para extraer:

- `cuentas_fondos.saldo_actual` (ya disponible).
- `pagos_venta` con `monto`, `monto_neto`, `comision_calculada`, `metodo_pago_id`, `cuenta_fondo_id`, `dias_acreditacion`.
- `metodos_pago.dias_acreditacion` y `metodos_pago.nombre`.
- cálculo de `pendiente_por_acreditar` por cuenta:
  - sumar `monto_neto` de pagos que aún no han sido acreditados,
  - agrupar por fecha estimada de acreditación = `created_at + dias_acreditacion días`.
- cálculo de `comision_total` por cuenta/turno.

Esto permitirá que el dashboard muestre tanto el saldo disponible real como el dinero que todavía no cayó.

### 2. Nuevas métricas del dashboard

Agregar al dashboard:

- `Saldo disponible` = `cuentas_fondos.saldo_actual`.
- `Saldo pendiente por acreditar` = monto neto de pagos que todavía no vencieron según `dias_acreditacion`.
- `Próxima acreditación` = fecha mínima futura de acreditación para pagos no acreditados.
- `Impacto comisiones` = total de comisión descontada por cuenta o por método de pago.

### 3. UI

Modificar `app/components/dashboard/SaldosCard.tsx` y/o agregar un nuevo componente como `SaldoPendienteCard.tsx` para mostrar:

- cuenta / tipo de fondo,
- disponible hoy,
- pendiente por acreditar,
- fecha estimada del próximo crédito,
- ó un pequeño badge que diga `Acredita en 3 días`.

Si una cuenta ya no tiene saldo pendiente, mostrar solo el disponible.

### 4. Ajuste en cierre de caja

Revisar `public.cerrar_caja` y/o la lógica de cierre para que el neto del negocio/tienda tenga en cuenta:

- las comisiones cobradas en el turno,
- el monto que ya está disponible vs el monto que todavía llegará luego de los días de acreditación,
- el detalle por cuenta de fondos mostrando la diferencia entre `total_ingresos`, `comisiones` y `monto_neto`.

Posible extensión de `public.cierres_caja_detalle` con campos adicionales como:

- `pendiente_por_acreditar`,
- `fecha_acreditacion_primera`.

O al menos asegurar que el `total_neto` de cierre refleje ingresos netos después de comisiones.

### 5. Validación y seguridad

- Agregar pruebas manuales de cierre con pagos en efectivo, Mercado Pago y transferencia.
- Verificar que no se rompe el reporting cuando `dias_acreditacion = 0`.
- Asegurar que cualquier cálculo nuevo se aplica solo a pagos con `estado = 'completada'` y dentro del periodo de la sesión/cierre.
- Mantener tablas y `SaldosCard` compatibles con cuentas de efectivo y Mercado Pago.

---

## Tareas Detalladas

1. Crear/actualizar `app/lib/dashboard/queries.ts`.
   - `obtenerSaldosCuentas()` ya existe, extenderlo para traer pendiente y fecha de acreditación.
   - Agregar `obtenerSaldosPendientesPorCuenta()`.
   - Agregar `obtenerComisionesPendientes()` si hace falta.

2. Actualizar `app/components/dashboard/SaldosCard.tsx`.
   - Mostrar `saldo_actual` + `pendiente_por_acreditar` + `fecha_acreditacion`.
   - Añadir visualización para diferenciar `Disponible` y `Pendiente`.

3. Actualizar `app/app/(dashboard)/dashboard/page.tsx`.
   - Traer la nueva query de saldos pendientes.
   - Incluir la nueva información en el layout.

4. Revisar la ruta de cierre y datos de caja.
   - Revisar `supabase/migrations/20260419000010_sesiones_caja.sql` y `public.cerrar_caja`.
   - Ver si es necesario ampliar `cierres_caja_detalle` con campos de pendiente/comisión.
   - Si no se amplía la tabla, asegurarse que el cálculo del neto actual refleje comisiones.

5. Revisar `app/lib/caja/queries.ts` y `app/components/caja/CierreDetalle.tsx`.
   - Confirmar que el detalle del último cierre muestra `comision_estimada` y `total_neto`.
   - Si no muestra comisiones claramente, ajustar la UI para hacerlo evidente.

6. Pruebas de regresión.
   - Cierre con `dias_acreditacion=0` debe comportarse igual que hoy.
   - Cierre con `dias_acreditacion>0` debe mostrar monto pendiente y no mezclarlo con disponible.
   - El dashboard debe seguir cargando aunque no haya cuentas con pendiente.

---

## Puntos de Control

- [ ] Query de saldos extendida disponible y con datos correctos.
- [ ] Dashboard muestra `pendiente por acreditar` por cuenta.
- [ ] Dashboard muestra fecha estimada de acreditación.
- [ ] Cierre de caja refleja el neto después de comisiones.
- [ ] Cierre de caja no pierde compatibilidad con el flujo existente.
- [ ] No hay crash en el dashboard cuando una cuenta no tiene pendiente.
- [ ] Comisiones en el cierre se ven en el detalle y quedan correctamente ajustadas.

---

## Riesgos y Mitigaciones

- Riesgo: calcular pendiente en el dashboard con base en `created_at` puede incluir pagos fuera de sesión.
  - Mitigación: limitar las queries a pagos de la tienda y usar `estado = 'completada'`.

- Riesgo: agregar campos a `cierres_caja_detalle` puede requerir migración adicional.
  - Mitigación: primero resolver solo con queries y UI; extender tabla solo si es estrictamente necesario.

- Riesgo: el sistema puede interpretar mal `dias_acreditacion` como días calendario vs hábiles.
  - Mitigación: usar la definición actual del campo y documentar que son días naturales.

---

## Entregables

- Plan de implementación documentado (`planes/2026-06-06-fix-comisiones-acreditacion-dashboard.md`).
- Código actualizado en dashboard y cierre de caja.
- Componente de dashboard que muestra saldos disponibles + pendientes.
- Validación funcional con pagos inmediatos y diferidos.
- Sin quiebres del sistema existente.
