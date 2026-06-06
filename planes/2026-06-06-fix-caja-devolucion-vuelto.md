# Plan: Corregir registro completo de caja en devoluciones y POS

**Creado:** 2026-06-06
**Estado:** Borrador
**Pedido:** Arreglar el registro de caja cuando una devolución devuelve dinero o cuando el POS debe dar vuelto, de modo que el movimiento quede registrado correctamente en la caja.

---

## Descripción General

### Qué logras con este plan

1. **Registrar correctamente el vuelto en ventas POS cuando el cliente paga más del total.**
2. **Asegurar que los reembolsos en devoluciones queden vinculados a la sesión de caja y al movimiento de fondos correcto.**
3. **Evitar que el cierre de caja muestre diferencias fantasma por efectivo entregado desde caja.**

### Por qué importa

Si el sistema permite devolver dinero o entregar cambio sin registrar el movimiento de fondo correspondiente, el arqueo diario queda desactualizado. Esto genera diferencias de caja falsas, contabilidad incorrecta y riesgo para el operador.

---

## Estado Actual

- `app/app/actions/ventas.ts` permite exceso de pago (`vuelto`) si está cubierto con métodos de efectivo.
- `supabase/all_migrations.sql` registra ingresos de `pagos_venta` en `movimientos_fondos`.
- No hay un registro explícito del egreso de caja cuando se entrega vuelto en la venta.
- `app/app/actions/devoluciones.ts` registra `pagos_devolucion` y el trigger `mover_fondos_por_devolucion()` debería crear el movimiento de egreso.
- `app/components/devoluciones/DevolucionForm.tsx` ya envía pagos y acepta reembolsos en efectivo.

---

## Brechas que se abordan

| Brecha | Impacto |
|---|---|
| Vuelto de venta no registrado como egreso de caja | Caja muestra ingresos inflados y arqueo incorrecto |
| Reembolso en devolución sin verificación de sesión/caja asociada | Puede quedar pago sin contexto de turno |
| Falta de validación de cuentas de efectivo en pagos de devolución | Riesgo de reembolso sin movimiento de fondo |

---

## Cambios Propuestos

### 1. Corregir el registro de vuelto en `registrarVenta`

- En `app/app/actions/ventas.ts`:
  - Calcular `exceso = sumaPagos - total`.
  - Si `exceso > 0`, crear un `movimiento_fondo` de tipo `egreso` usando la cuenta de efectivo que entrega el vuelto.
  - Incluir concepto claro: `"Vuelto venta #<ticket>"`.
  - Mantener la validación actual de que el vuelto sólo puede salir de pagos en efectivo.
  - Revalidar `/caja` y `/pos`.

### 2. Validar caja/sesión en reembolsos de devolución

- En `app/app/actions/devoluciones.ts`:
  - Confirmar que `sesion_caja_id` se asigna cuando hay reembolso en efectivo.
  - Revisar que `pagos_devolucion` tenga `cuenta_fondo_id` y dispare el trigger `mover_fondos_por_devolucion()`.
  - Agregar una prueba de flujo o verificación manual para asegurar que `devoluciones.sesion_caja_id` no quede `null` en reembolsos en efectivo.

### 3. Ajustar UI/validaciones si es necesario

- En `app/components/pos/PanelPago.tsx` y `app/components/devoluciones/DevolucionForm.tsx`:
  - Confirmar que la lista de pagos muestra `vuelto` y no deja enviar datos inconsistentes.
  - Si es necesario, dejar más claro cuándo el vuelto se aplica y qué cuenta de efectivo se usa.

### 4. QA y verificación

- Registrar una venta POS con pago en efectivo mayor al total.
  - Verificar en `movimientos_fondos` que se cree ingreso por pago y egreso por vuelto.
  - Verificar en cierre de caja que el flujo quede conciliado correctamente.
- Registrar una devolución con `reembolso` por efectivo.
  - Verificar en `pagos_devolucion` y `movimientos_fondos` el egreso.
  - Confirmar que la devolución se asocia a la sesión de caja activa.

---

## Archivos a modificar

- `app/app/actions/ventas.ts`
- `app/app/actions/devoluciones.ts`
- `app/components/pos/PanelPago.tsx` (validación/UI si hace falta)
- `app/components/devoluciones/DevolucionForm.tsx` (validación/UI si hace falta)
- `supabase/all_migrations.sql` (revisar trigger `mover_fondos_por_pago_venta` si se requiere ajuste)

---

## Pasos detallados

1. Inspeccionar el flujo de `registrarVenta` para confirmar dónde se calcula `vuelto` y qué pagos de efectivo participan.
2. Implementar el egreso de caja por `vuelto` después del insert de `pagos_venta`.
3. Revisar la asignación de `sesion_caja_id` en `registrarDevolucion` y asegurar el movimiento de caja del reembolso efectivo.
4. Añadir mensajes claros en la UI para operadores cuando se genera vuelto o reembolso en efectivo.
5. Probar con datos reales de venta y devolución, cerrando caja para validar arqueo.

---

## Criterio de aceptación

- El sale POS con vuelto genera un movimiento de caja adicional de tipo `egreso` igual al vuelto.
- La devolución con reembolso efectivo queda anotada en `movimientos_fondos` y en la sesión de caja activa.
- Al cerrar caja, las diferencias de efectivo reflejan correctamente el vuelto y el reembolso.
- No hay regresión en ventas normales ni en devoluciones de saldo a favor/cambio.
