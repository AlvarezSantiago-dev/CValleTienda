import { CHART_COLORS } from '@/lib/reportes/format-chart'
import { formatARSKpi, formatARSTooltip } from '@/lib/reportes/format-kpi'
import { ChartEmpty } from './ChartEmpty'

export interface HorizontalBarDatum {
  label: string
  value: number
  sub?: string
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[]
  ariaLabel?: string
  formatValue?: (n: number) => string
}

function formatDisplayValue(
  n: number,
  formatValue?: (n: number) => string
): string {
  if (formatValue) return formatValue(n)
  return formatARSKpi(n)
}

export function HorizontalBarChart({
  data,
  ariaLabel = 'Gráfico de barras horizontales',
  formatValue,
}: HorizontalBarChartProps) {
  if (data.length === 0) return <ChartEmpty />

  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div role="img" aria-label={ariaLabel} className="min-w-0 space-y-3">
      {/* Mobile: lista con divs */}
      <div className="sm:hidden space-y-4">
        {data.map((d, i) => {
          const pct = max > 0 ? (d.value / max) * 100 : 0
          const display = formatDisplayValue(d.value, formatValue)
          return (
            <div key={`${d.label}-m-${i}`} className="min-w-0" title={`${d.label}: ${formatARSTooltip(d.value)}`}>
              <p className="text-xs font-medium text-fg truncate mb-1.5">{d.label}</p>
              <div className="h-2.5 bg-surface-sunken rounded-[var(--radius-full)] overflow-hidden">
                <div
                  className="h-full rounded-[var(--radius-full)]"
                  style={{ width: `${Math.max(pct, d.value > 0 ? 2 : 0)}%`, backgroundColor: CHART_COLORS.primary }}
                />
              </div>
              <p className="mt-1 text-xs text-fg-muted tabular-nums text-right">
                {display}
                {d.sub ? ` · ${d.sub}` : ''}
              </p>
            </div>
          )
        })}
      </div>

      {/* Desktop: filas con grid */}
      <div className="hidden sm:block space-y-2.5">
        {data.map((d, i) => {
          const pct = max > 0 ? (d.value / max) * 100 : 0
          const display = formatDisplayValue(d.value, formatValue)
          return (
            <div
              key={`${d.label}-d-${i}`}
              className="grid items-center gap-2 min-w-0"
              style={{ gridTemplateColumns: 'minmax(0, 28%) 1fr auto' }}
              title={`${d.label}: ${formatARSTooltip(d.value)}${d.sub ? ` · ${d.sub}` : ''}`}
            >
              <span className="text-xs text-fg truncate text-right">{d.label}</span>
              <div className="h-4 bg-surface-sunken rounded overflow-hidden min-w-0">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.max(pct, d.value > 0 ? 2 : 0)}%`, backgroundColor: CHART_COLORS.primary }}
                />
              </div>
              <span className="text-xs text-fg-muted tabular-nums whitespace-nowrap pl-1">
                {display}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
