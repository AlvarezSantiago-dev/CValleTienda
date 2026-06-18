export const CHART_VIEW_WIDTH = 700

const CHAR_WIDTH_EST = 6.5

export function estimateLabelWidth(label: string): number {
  return Math.ceil(label.length * CHAR_WIDTH_EST)
}

export function computePadLeft(yLabels: string[], min = 40, max = 80): number {
  const widest = yLabels.reduce((m, l) => Math.max(m, estimateLabelWidth(l)), 0)
  return Math.min(max, Math.max(min, widest + 12))
}

export function computePadRight(valueLabels: string[], min = 8, max = 72): number {
  const widest = valueLabels.reduce((m, l) => Math.max(m, estimateLabelWidth(l)), 0)
  return Math.min(max, Math.max(min, widest + 8))
}

/** Cada cuántos labels X mostrar (1 = todos) */
export function xLabelInterval(count: number, slotWidth: number): number {
  if (count <= 1) return 1
  if (slotWidth >= 48) return 1
  if (slotWidth >= 32) return 2
  if (slotWidth >= 22) return 3
  return Math.max(1, Math.ceil(count / 4))
}

export function shouldShowXLabel(index: number, count: number, interval: number): boolean {
  return index % interval === 0 || index === count - 1
}

export function minChartWidth(barCount: number, minBarSlot = 28, padLeft = 48, padRight = 8): number {
  const slot = barCount > 9 ? 58 : minBarSlot
  return Math.max(CHART_VIEW_WIDTH, padLeft + padRight + barCount * slot)
}
