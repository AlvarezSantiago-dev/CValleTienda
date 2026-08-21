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

export function precioConRecargoCc(precioContado: number, recargoPct: number): number {
  return round2(precioContado * (1 + Math.max(0, recargoPct) / 100))
}
