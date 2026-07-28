import { round2 } from '../format-cantidad'

/** Total de una línea — misma regla que registrarVenta (round2 por línea). */
export function totalLinea(precio: number, cantidad: number): number {
  return round2(Number(precio) * Number(cantidad))
}

/** Subtotal del carrito = suma de totales de línea ya redondeados. */
export function sumarSubtotalLineas(
  items: Array<{ precio_unitario: number; cantidad: number }>
): number {
  return round2(items.reduce((acc, it) => acc + totalLinea(it.precio_unitario, it.cantidad), 0))
}
