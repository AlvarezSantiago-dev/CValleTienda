# Catálogo público

Link por tienda: `/c/{slug}` (ej. `/c/boutique-luna`). Sin login. No usa el header de CValle.

## Cómo activarlo

1. Configuración → **Catálogo**: nombre público, WhatsApp (se guarda con 549…), retiro y/o envío, link, activar.
2. En **Productos**, marcar “Mostrar en catálogo público”. **Default apagado**: si no lo marcás, no aparece.
3. Copiar el link y compartirlo (Instagram, WhatsApp, etc.).

Sin WhatsApp o con el mes vencido el link muestra “no está disponible”.

## Pedido del cliente

Arma el pedido desde la grilla o la ficha. **Agregar no saca de la ficha**: toast + badge + barra inferior «Ver pedido». Desde el carrito, «Seguir comprando» vuelve al catálogo. Elige retiro o envío (dirección si es envío) y confirma. En rubros con cuenta corriente (distribuidora) puede elegir **Contado o A cuenta**; el recargo es pack → producto → default de la tienda. El sistema **guarda el pedido** y abre WhatsApp al número del local. No hay pago online.

La grilla tiene buscador client-side (nombre / pack). Carrito y checkout usan stepper +/− y CTAs sticky con safe-area. Las cantidades no pueden superar el stock (packs = unidades × tamaño). La ficha muestra stock visible: unidades sueltas, o packs + unidades restantes; si el pack no entra, explica “Quedan N u. · Pack x8 lleva 8”. El servidor vuelve a validar al crear, editar y convertir el pedido.

## Gestión en la app

Inbox **Pedidos** (cajeros incluidos). Campana en el header. Listado con WhatsApp, badge a cuenta e ítems. Detalle: flujo Recibido → Aceptado → Listo → Cobrar.

Estados: nuevo → visto → aceptado → listo → entregado. Cancelar en cualquier momento previo a la venta.

Al editar, las cantidades no pueden superar el stock físico (packs = unidades × tamaño). Al convertir: Contado / A cuenta con recargo por línea.

**Stock:** no se mueve cuando llega el WhatsApp. Se descuenta al **confirmar envío o retiro** (registrar venta, con caja abierta). Si es envío y el plan tiene remitos, se genera el remito con la dirección.

Kits y bundles no salen en el catálogo.
