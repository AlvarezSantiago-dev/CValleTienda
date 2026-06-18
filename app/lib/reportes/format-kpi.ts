import { formatARS } from '@/lib/format'

const COMPACT_THRESHOLD = 12

function formatCompactCore(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}k`
  }
  return `${sign}$${Math.round(abs)}`
}

function formatShortNoDecimals(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

/** true si conviene compactar en KPI */
export function shouldCompactKpi(n: number): boolean {
  return formatARS(n).length > COMPACT_THRESHOLD
}

/** Display en card — compacto si el monto es largo */
export function formatARSKpi(n: number): string {
  if (shouldCompactKpi(n)) return formatCompactCore(n)
  return formatShortNoDecimals(n)
}

/** Siempre compacto para ejes de gráficos */
export function formatARSAxis(n: number): string {
  return formatCompactCore(n)
}

/** Valor completo para title/tooltip */
export function formatARSTooltip(n: number): string {
  return formatARS(n)
}

/** Formatea monto para KPI con display + tooltip */
export function kpiMonto(n: number): { valor: string; valorCompleto: string } {
  return {
    valor: formatARSKpi(n),
    valorCompleto: formatARSTooltip(n),
  }
}
