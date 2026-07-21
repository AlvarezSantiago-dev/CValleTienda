/**
 * Stock ilimitado: sentinel stock_actual = -1.
 * Runtime: solo tratar como ∞ si permiteInfinito (despensa/carnicería).
 */

export const STOCK_INFINITO = -1

export function esStockInfinito(stock: number | null | undefined): boolean {
  return Number(stock) === STOCK_INFINITO
}

/**
 * true si se puede vender/entregar `cantidad`.
 * Con permiteInfinito=false, stock -1 NO alcanza (bloquea venta).
 */
export function tieneStockSuficiente(
  stock: number,
  cantidad: number,
  permiteInfinito = false
): boolean {
  if (esStockInfinito(stock)) {
    return permiteInfinito
  }
  return stock >= cantidad
}

/** Variante vendible en POS (stock > 0, o ilimitado si el rubro lo permite) */
export function esStockVendible(
  stock: number | null | undefined,
  permiteInfinito = false
): boolean {
  const n = Number(stock ?? 0)
  if (esStockInfinito(n)) return permiteInfinito
  return n > 0
}

/** Stock válido para persistir: -1 o >= 0 */
export function esStockValido(stock: number): boolean {
  return esStockInfinito(stock) || (Number.isFinite(stock) && stock >= 0)
}

/**
 * Stock efectivo de kit/bundle desde componentes.
 * Componentes infinitos solo cuentan si permiteInfinito.
 */
export function stockEfectivoDesdeComponentes(
  comps: Array<{ stock: number; cantidad: number }>,
  permiteInfinito = false
): number {
  if (comps.length === 0) return 0
  if (!permiteInfinito) {
    return Math.min(
      ...comps.map((c) => {
        if (esStockInfinito(c.stock)) return 0
        return Math.floor(c.stock / c.cantidad)
      })
    )
  }
  const finitos = comps.filter((c) => !esStockInfinito(c.stock))
  if (finitos.length === 0) return STOCK_INFINITO
  return Math.min(...finitos.map((c) => Math.floor(c.stock / c.cantidad)))
}

/** Packs: si la base es infinita y el rubro permite, el pack también */
export function stockEfectivoPack(
  stockActual: number,
  packCantidad: number,
  permiteInfinito = false
): number {
  if (esStockInfinito(stockActual)) {
    return permiteInfinito ? STOCK_INFINITO : 0
  }
  if (packCantidad <= 0) return 0
  return Math.floor(stockActual / packCantidad)
}

export function formatStockDisplay(
  stock: number,
  opts?: { corto?: boolean; permiteInfinito?: boolean }
): string {
  const permite = opts?.permiteInfinito ?? false
  if (esStockInfinito(stock) && permite) return opts?.corto ? '∞' : 'Ilimitado'
  if (esStockInfinito(stock) && !permite) {
    return opts?.corto ? '0' : '0'
  }
  return new Intl.NumberFormat('es-AR').format(stock)
}
