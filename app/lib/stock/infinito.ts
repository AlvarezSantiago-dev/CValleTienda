/**
 * Stock ilimitado: sentinel stock_actual = -1.
 * Semántica runtime global; la UI/carga de -1 se limita a despensa/carnicería.
 */

export const STOCK_INFINITO = -1

export function esStockInfinito(stock: number | null | undefined): boolean {
  return Number(stock) === STOCK_INFINITO
}

/** true si se puede vender/entregar `cantidad` */
export function tieneStockSuficiente(stock: number, cantidad: number): boolean {
  if (esStockInfinito(stock)) return true
  return stock >= cantidad
}

/** Variante vendible en POS (stock > 0 o ilimitado) */
export function esStockVendible(stock: number | null | undefined): boolean {
  const n = Number(stock ?? 0)
  return esStockInfinito(n) || n > 0
}

/** Stock válido para persistir: -1 o >= 0 */
export function esStockValido(stock: number): boolean {
  return esStockInfinito(stock) || (Number.isFinite(stock) && stock >= 0)
}

/**
 * Stock efectivo de kit/bundle desde componentes.
 * Componentes infinitos no limitan; si todos son infinitos → -1.
 */
export function stockEfectivoDesdeComponentes(
  comps: Array<{ stock: number; cantidad: number }>
): number {
  if (comps.length === 0) return 0
  const finitos = comps.filter((c) => !esStockInfinito(c.stock))
  if (finitos.length === 0) return STOCK_INFINITO
  return Math.min(...finitos.map((c) => Math.floor(c.stock / c.cantidad)))
}

/** Packs: si la base es infinita, el pack también */
export function stockEfectivoPack(stockActual: number, packCantidad: number): number {
  if (esStockInfinito(stockActual)) return STOCK_INFINITO
  if (packCantidad <= 0) return 0
  return Math.floor(stockActual / packCantidad)
}

export function formatStockDisplay(
  stock: number,
  opts?: { corto?: boolean }
): string {
  if (esStockInfinito(stock)) return opts?.corto ? '∞' : 'Ilimitado'
  return new Intl.NumberFormat('es-AR').format(stock)
}
