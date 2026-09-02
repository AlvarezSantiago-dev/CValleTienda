# Catálogo público

Link por tienda: `/c/{slug}` (ej. `/c/boutique-luna`). Sin login. No usa el header de CValle.

## Cómo activarlo

1. Configuración → **Catálogo**: nombre público, WhatsApp (se guarda con 549…), retiro y/o envío, link, activar.
2. En **Productos**, marcar “Mostrar en catálogo público”. Opcional: **Destacar en el inicio** (carrusel coverflow, máx. 12). **Default apagado**: si no lo marcás, no aparece.
3. Copiar el link y compartirlo (Instagram, WhatsApp, etc.).

Sin WhatsApp o con el mes vencido el link muestra “no está disponible”.

## Pedido del cliente

Arma el pedido desde la grilla o la ficha. **Agregar no saca de la ficha**: toast + badge + barra inferior «Ver pedido». Desde el carrito, «Seguir comprando» vuelve al catálogo. Elige retiro o envío (dirección si es envío) y confirma. En rubros con cuenta corriente (distribuidora) puede elegir **Contado o A cuenta**; el recargo es pack → producto → default de la tienda. El sistema **guarda el pedido** y abre WhatsApp al número del local. No hay pago online.

La home del catálogo muestra **destacados** (coverflow) y debajo la grilla paginada (~20) con buscador (nombre) y **chips de categoría** (URL `?q=&categoria=&page=`). Carrito y checkout usan stepper +/− y CTAs sticky con safe-area. Las cantidades no pueden superar el stock (packs overlay = unidades × tamaño). La ficha muestra stock visible: unidades sueltas, o packs + unidades restantes; si el pack no entra, explica “Quedan N u. · Pack x8 lleva 8”. El servidor vuelve a validar al crear, editar y convertir el pedido.

Los **tramos de cantidad** (% o $ por presentación) suman variantes del mismo producto (1 pack Comun + 1 Zero + 1 Fanta = 3 packs). La ficha usa las etiquetas del rubro (en distribuidora: **Marca** / **Presentación**, no Talle/Color); un chip siempre resuelve una variante válida. Unidad de medida pack/caja: el stock se cuenta en presentaciones (vender 1 pack descuenta 1); `unidades_contenido` es el contenido interno (ej. 6 botellas) para mostrar, no para multiplicar el descuento.

## Gestión en la app

Inbox **Pedidos** (cajeros incluidos). Campana en el header. Listado con WhatsApp, badge a cuenta e ítems. Detalle: Recibido → Aceptado → Cobrar (con remitos); Recibido → Aceptado → Listo → Cobrar (sin remitos).

Estados: nuevo → visto → confirmado → (listo/entregado, rubros sin remitos) → convertido. Cancelar en cualquier momento previo a la venta; si hay remito sin venta, se anula.

Al editar, las cantidades no pueden superar el stock físico (packs = unidades × tamaño). Guardar con remito vivo reescribe ítems del remito. Al cobrar: Contado / A cuenta con recargo por línea.

**Stock:** no se mueve cuando llega el WhatsApp ni al **aceptar**. Con remitos (distribuidora + plan): aceptar emite el remito (`venta_id` null) para armar/imprimir; el stock y la venta se registran al **confirmar remito** (caja abierta; seña en A cuenta o métodos en contado; no se duplica el remito). Sin remitos: el stock se descuenta al cobrar como hasta ahora.

Kits y bundles no salen en el catálogo.
