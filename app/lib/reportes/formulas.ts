/**
 * Política de devoluciones en reportes financieros (SQL y UI).
 * - Incluye: reembolso, saldo_a_favor, registros legacy con tipo_resolucion NULL.
 * - Excluye: cambio de variante (rotación de stock sin egreso monetario en reportes).
 */
export const POLITICA_DEVOLUCIONES_SQL =
  "(tipo_resolucion IS NULL OR tipo_resolucion != 'cambio')" as const

/** Filtro PostgREST para fallbacks JS (equivalente a POLITICA_DEVOLUCIONES_SQL). */
export const FILTRO_DEVOLUCIONES_MONETARIAS = 'tipo_resolucion.is.null,tipo_resolucion.neq.cambio'

export function calcularVentasNetas(ventasBrutas: number, devoluciones: number): number {
  return ventasBrutas - devoluciones
}

export function calcularGananciaNeta(gananciaVentas: number, gananciaDevuelta: number): number {
  return gananciaVentas - gananciaDevuelta
}

export function calcularMargenPct(
  gananciaBruta: number,
  ventasNetas: number,
  tieneCostos = true
): number | null {
  if (!tieneCostos || ventasNetas <= 0) return null
  return Math.round((gananciaBruta / ventasNetas) * 1000) / 10
}

export function calcularResultadoNeto(
  gananciaBruta: number,
  egresosManuales: number,
  comisiones: number
): number {
  return gananciaBruta - egresosManuales - comisiones
}

/** Devolución tipo cambio no resta de métricas monetarias del reporte. */
export function esDevolucionMonetaria(tipoResolucion: string | null | undefined): boolean {
  return tipoResolucion == null || tipoResolucion !== 'cambio'
}
