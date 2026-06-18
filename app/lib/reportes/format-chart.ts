export const CHART_COLORS = {
  primary: '#84CC16',
  primaryDark: '#4D7C0F',
  negative: '#EF4444',
  neutral: '#9CA3AF',
  grid: '#F3F4F6',
  amber: '#F59E0B',
  slate: '#6B7280',
}

export function formatARSCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  }
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

export function formatARSFull(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function maxWithPadding(values: number[], pct = 0.1): number {
  const max = Math.max(...values, 0)
  if (max === 0) return 1
  return max * (1 + pct)
}

export const CHART_PAD = {
  top: 10,
  bottom: 28,
  left: 48,
  right: 8,
}

export {
  formatARSKpi,
  formatARSAxis,
  formatARSTooltip,
  shouldCompactKpi,
  kpiMonto,
} from './format-kpi'

export { estimateLabelWidth, CHART_VIEW_WIDTH } from './chart-layout'
