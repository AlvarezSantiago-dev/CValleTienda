function round2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Única fuente de verdad para habilitar el botón Cobrar.
 * NO incluye auto-seed: sin método de pago (y sin saldo favor que cubra) → false.
 */
export function puedeCobrarVenta(opts: {
  hayItems: boolean
  stockOk: boolean
  totalBruto: number
  saldoFavorAplicado: number
  pagos: Array<{ monto: number }>
}): boolean {
  if (!opts.hayItems || !opts.stockOk) return false

  const totalBruto = Math.max(0, round2(opts.totalBruto))
  const saldo = Math.max(0, Number(opts.saldoFavorAplicado) || 0)

  // Saldo a favor cubre el total completo → no hace falta método monetario
  if (saldo + 0.01 >= totalBruto) return true

  if (opts.pagos.length === 0) return false

  const suma = opts.pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0)
  return suma + saldo + 0.01 >= totalBruto
}
