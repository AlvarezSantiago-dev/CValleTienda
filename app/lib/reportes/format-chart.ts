/** Paleta de charts alineada a tokens v2 (hex estáticos para SVG). */
export const CHART_COLORS = {
  primary: '#84cc16',      // brand-500 / accent
  primaryDark: '#4d7c0f',  // brand-700 / fg-brand
  primaryMid: '#65a30d',   // brand-600 / primary
  primaryLight: '#a3e635', // brand-400
  negative: '#ef4444',     // danger
  neutral: '#a1a1a1',      // fg-subtle approx
  grid: '#f5f5f4',         // surface-sunken / border-subtle
  amber: '#f59e0b',        // warning
  slate: '#737373',        // fg-muted
  axis: '#e7e5e4',         // border-default
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
