# Redondeo de efectivo a $100 — guía para el dueño

**Fecha:** 2026-07-28

## En una frase

No es ganancia del producto: es plata que no devolviste en monedas/billetes chicos. Está en la caja. El total de la venta no cambia. En el ticket sale un **aviso de vuelto** para el cliente.

## Qué hace

- En efectivo, el sistema sugiere cobrar redondeando hacia arriba a $100.
- El vuelto solo se entrega en múltiplos de $100.
- Lo que sobra (&lt; $100) queda en el cajón.
- Queda registrado en la venta (`redondeo_efectivo_monto`) y se suma en el resumen de caja como “Ajustes redondeo (interno)”.

## Qué no hace

- No cambia el TOTAL del ticket ni los precios de los productos.
- No entra en la ganancia bruta (venta − costo).

## Ticket al cliente

Cuando hay redondeo, el ticket muestra un recuadro con el aviso.

El texto es **configurable** en Configuración → Cobros. Placeholders:
- `{monto}` → vuelto no entregado
- `{total}` → total de la compra

Si el campo está vacío, se usa el aviso por defecto del sistema.

## Dónde se configura

**Configuración → Cobros → Efectivo y vuelto**  
Toggle: “Redondear vuelto en efectivo ($100)”.

## Cómo ver el total del turno

En el panel de cierre / resumen del turno, si hubo redondeos, aparece **Ajustes redondeo (interno)**.

Consulta SQL:

```sql
select sum(redondeo_efectivo_monto)
from ventas
where tienda_id = '…'
  and created_at >= '…'
  and estado = 'completada';
```

## ¿Es legal / habitual?

Es práctica común en Argentina cuando no circulan monedas. El ticket interno no es factura AFIP; si facturás, el total facturado sigue siendo el de la venta (sin el redondeo). Esta guía no es asesoramiento legal.
