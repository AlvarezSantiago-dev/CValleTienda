import { round2 } from '@/lib/format-cantidad'

export function recargoEfectivo(
  recargoProducto: number | null | undefined,
  recargoDefault: number
): number {
  if (recargoProducto != null && Number.isFinite(recargoProducto)) {
    return Math.max(0, recargoProducto)
  }
  return Math.max(0, recargoDefault)
}

/** Pack override → producto → default de tienda. */
export function recargoCascada(
  recargoPack: number | null | undefined,
  recargoProducto: number | null | undefined,
  recargoDefault: number
): number {
  if (recargoPack != null && Number.isFinite(recargoPack)) {
    return Math.max(0, recargoPack)
  }
  return recargoEfectivo(recargoProducto, recargoDefault)
}

export function precioConRecargoCc(precioContado: number, recargoPct: number): number {
  return round2(precioContado * (1 + Math.max(0, recargoPct) / 100))
}
