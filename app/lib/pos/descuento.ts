/** Monto de descuento en ARS a partir de subtotal y porcentaje (10 = 10%). */
export function descuentoDesdePorcentaje(subtotal: number, porcentaje: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0
  if (!Number.isFinite(porcentaje) || porcentaje <= 0) return 0
  const pct = Math.min(100, porcentaje)
  const monto = Math.round(subtotal * pct) / 100
  return Math.min(subtotal, Math.max(0, monto))
}

/** Limita descuento al subtotal actual. */
export function limitarDescuentoASubtotal(subtotal: number, descuento: number): number {
  if (!Number.isFinite(descuento) || descuento <= 0) return 0
  return Math.min(subtotal, descuento)
}

/** Porcentaje efectivo (para mostrar en UI), null si no aplica. */
export function porcentajeEfectivo(subtotal: number, descuento: number): number | null {
  if (subtotal <= 0 || descuento <= 0) return null
  return Math.round((descuento / subtotal) * 1000) / 10
}
