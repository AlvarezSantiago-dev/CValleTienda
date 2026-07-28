/**
 * Redondeo de efectivo a múltiplos de $100 (AR, inflación).
 * El vuelto se entrega solo en billetes de $100+; el resto queda en caja
 * (ajuste interno). No modifica el total de la venta ni se imprime en ticket.
 */

export const REDONDEO_EFECTIVO_MULTIPLO = 100

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function multiploSeguro(multiplo?: number): number {
  const m = Number(multiplo)
  if (!Number.isFinite(m) || m <= 0) return REDONDEO_EFECTIVO_MULTIPLO
  return m
}

/** Monto sugerido a cobrar en efectivo: techo al múltiplo (solo si redondeo activo). */
export function sugerirMontoEfectivo(
  adeudado: number,
  opts?: { activo?: boolean; multiplo?: number }
): number {
  const n = Math.max(0, Number(adeudado) || 0)
  if (n <= 0) return 0
  if (opts?.activo === false) return round2(n)
  const m = multiploSeguro(opts?.multiplo)
  return Math.ceil(n / m) * m
}

/**
 * Del exceso cobrado (cobrado − total), cuánto se entrega como vuelto.
 * Con redondeo activo: solo múltiplos del piso. Sin redondeo: el exceso exacto.
 */
export function vueltoEntregable(
  exceso: number,
  opts?: { activo?: boolean; multiplo?: number }
): number {
  const n = Math.max(0, Number(exceso) || 0)
  if (opts?.activo === false) return round2(n)
  const m = multiploSeguro(opts?.multiplo)
  if (n < m) return 0
  return Math.floor(n / m) * m
}

/** Lo que queda en caja por redondeo (no se entrega en efectivo). */
export function ajusteRedondeoEfectivo(
  exceso: number,
  opts?: { activo?: boolean; multiplo?: number }
): number {
  if (opts?.activo === false) return 0
  return round2(Math.max(0, Number(exceso) || 0) - vueltoEntregable(exceso, opts))
}

export function desgloseVueltoEfectivo(
  cobrado: number,
  total: number,
  opts?: { activo?: boolean; multiplo?: number }
): {
  exceso: number
  vuelto: number
  ajuste: number
} {
  const exceso = round2(Math.max(0, (Number(cobrado) || 0) - (Number(total) || 0)))
  const vuelto = vueltoEntregable(exceso, opts)
  const ajuste = round2(exceso - vuelto)
  return { exceso, vuelto, ajuste }
}
