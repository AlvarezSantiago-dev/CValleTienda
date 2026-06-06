# 2026-06-06 Revision y fix del cierre de caja

## Objetivo
Revisar y corregir el cálculo del cierre de caja para que el flujo de caja funcione correctamente en todos los casos, especialmente cuando el cliente paga más de la venta y se registra un vuelto en efectivo.

## Problema identificado
El cierre de caja calcula `efectivo_esperado` como:
- apertura de efectivo
- más pagos en efectivo de la venta
- menos devoluciones en efectivo

Pero no resta los egresos de vuelto generados después de registrar la venta. En el caso:
- apertura 10.000
- venta 8.000
- pago en efectivo 10.000
- vuelto 2.000

la fórmula actual produce 20.000 en vez de 18.000.

## Alcance
- `supabase/migrations/20260419000010_sesiones_caja.sql` (función `public.cerrar_caja`)
- el flujo de ventas en `app/app/actions/ventas.ts` que registra el vuelto como movimiento de fondos
- posibles efectos en el frontend de caja y en el resumen del cierre

## Tareas

1. Analizar `public.cerrar_caja` y confirmar el cálculo actual de `efectivo_esperado`.
2. Confirmar que el vuelto se registra como movimiento de fondos tipo `egreso` en `movimientos_fondos` con referencia a la venta (`venta_id`).
3. Corregir `efectivo_esperado` para que reste:
   - los egresos en efectivo derivados del mismo turno/venta (vuelto)
   - otros egresos de efectivo del turno si corresponden a movimientos manuales o ajustes de caja
4. Revisar si el cierre debe usar movimientos de caja en lugar de solo `pagos_venta` y `pagos_devolucion` para tener un cálculo completo y consistente.
5. Agregar una prueba de regresión o un caso de ejemplo en SQL para validar la situación:
   - apertura 10.000
   - venta 8.000
   - pago en efectivo 10.000
   - vuelta 2.000
   - `efectivo_esperado` debe ser 18.000
6. Probar el flujo en la aplicación:
   - abrir caja
   - registrar venta con pago en efectivo y vuelto
   - cerrar caja
   - verificar que el arqueo muestre 18.000 como esperado y que la diferencia se calcule bien
7. Revisar el historial de cierres y el detalle por cuenta (`cierres_caja_detalle`) para asegurarse de que refleje correctamente el saldo antes/después del turno.

## Resultado esperado
- El cierre de caja debe calcular el efectivo esperado como el saldo inicial más los ingresos de efectivo del turno, menos los egresos de efectivo del turno.
- El caso de pago con vuelto debe quedar correcto: apertura 10.000 + venta 8.000 - vuelto 2.000 = 18.000.
- El flujo de caja ya no debe asustar a un cajero o admin con valores erróneos en el cierre.

## Notas técnicas
- `app/app/actions/ventas.ts` confirma que el vuelto se registra con `public.registrar_movimiento_fondo(... tipo='egreso' ...)`.
- `supabase/migrations/20260419000008_cuentas_fondos.sql` define `movimientos_fondos` como historial inmutable y `saldo_actual` como saldo real.
- La corrección debe priorizar la lógica en SQL para mantener la consistencia incluso si el frontend cambia.
