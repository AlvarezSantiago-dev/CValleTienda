import { ymdFromIso } from '@/lib/datetime'
import type { KpiPeriodo } from './queries'

/** Agrupa ventas en buckets hoy/ayer según calendario Argentina. */
export function bucketVentasPorDia(
  ventas: Array<{ total: number | string; created_at: string }>,
  hoyYmd: string,
  ayerYmd: string
): { hoy: KpiPeriodo; ayer: KpiPeriodo } {
  const hoy: KpiPeriodo = { cantidad: 0, monto: 0 }
  const ayer: KpiPeriodo = { cantidad: 0, monto: 0 }

  for (const v of ventas) {
    const t = Number(v.total)
    const key = ymdFromIso(v.created_at)
    if (key === hoyYmd) {
      hoy.cantidad += 1
      hoy.monto += t
    } else if (key === ayerYmd) {
      ayer.cantidad += 1
      ayer.monto += t
    }
  }

  return { hoy, ayer }
}
