import { esStockInfinito, STOCK_INFINITO, tieneStockSuficiente } from './infinito'

/** Unidades físicas que consume una línea (qty × tamaño de pack). */
export function unidadesFisicas(cantidad: number, packUnidades?: number | null): number {
  const pack = Number(packUnidades)
  const size = Number.isFinite(pack) && pack > 1 ? pack : 1
  return cantidad * size
}

/**
 * Máximo de presentaciones (unidades o packs) que entran en `stockFisicoDisponible`.
 * Con stock ilimitado permitido no topea, salvo `techo`.
 */
export function maxPresentaciones(
  stockFisicoDisponible: number,
  packUnidades?: number | null,
  permiteInfinito = false,
  techo?: number,
  enteros = true
): number {
  const cap = techo != null && Number.isFinite(techo) ? Math.max(0, techo) : null
  if (esStockInfinito(stockFisicoDisponible)) {
    if (!permiteInfinito) return 0
    return cap ?? Number.POSITIVE_INFINITY
  }
  const pack = Number(packUnidades)
  const size = Number.isFinite(pack) && pack > 1 ? pack : 1
  const crudo = Math.max(0, stockFisicoDisponible) / size
  const max = enteros || size > 1 ? Math.floor(crudo) : crudo
  return cap == null ? max : Math.min(cap, max)
}

export function consumoFisicoAgrupado(
  lineas: Array<{ varianteId: string; cantidad: number; packUnidades?: number | null }>
): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of lineas) {
    m.set(l.varianteId, (m.get(l.varianteId) ?? 0) + unidadesFisicas(l.cantidad, l.packUnidades))
  }
  return m
}

export function stockAlcanzaAgregado(
  stockFisico: number,
  consumo: number,
  permiteInfinito = false
): boolean {
  return tieneStockSuficiente(stockFisico, consumo, permiteInfinito)
}

export { STOCK_INFINITO }
