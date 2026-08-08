import { CHART_COLORS, CHART_PAD, formatARSAxis, formatARSTooltip } from '@/lib/reportes/format-chart'
import {
  CHART_VIEW_WIDTH,
  computePadLeft,
  minChartWidth,
  shouldShowXLabel,
  xLabelInterval,
} from '@/lib/reportes/chart-layout'
import { ChartContainer } from './ChartContainer'
import { ChartEmpty } from './ChartEmpty'

export interface StackedSegment {
  name: string
  value: number
  color: string
}

export interface StackedBarDatum {
  label: string
  segments: StackedSegment[]
}

interface StackedBarChartProps {
  data: StackedBarDatum[]
  height?: number
  ariaLabel?: string
}

export function StackedBarChart({
  data,
  height = 220,
  ariaLabel = 'Gráfico de barras apiladas',
}: StackedBarChartProps) {
  if (data.length === 0) return <ChartEmpty />

  const totals = data.map((d) => d.segments.reduce((s, seg) => s + seg.value, 0))
  const max = Math.max(...totals, 1)
  if (max <= 0) return <ChartEmpty message="Sin valores para mostrar." />

  const width = CHART_VIEW_WIDTH
  const padTop = CHART_PAD.top
  const padBottom = CHART_PAD.bottom
  const padRight = CHART_PAD.right
  const yMarks = [0, max / 2, max]
  const yLabels = yMarks.map(formatARSAxis)
  const padLeft = computePadLeft(yLabels)
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const n = data.length
  const slot = innerW / n
  const interval = xLabelInterval(n, slot)
  const barW = Math.max(slot < 20 ? 4 : 12, slot - 8)
  const scrollMin = minChartWidth(n, 28, padLeft, padRight)

  return (
    <div>
      <ChartContainer minWidth={scrollMin}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-label={ariaLabel}
          className="block"
        >
          {yMarks.map((m, i) => {
            const y = padTop + innerH - (m / max) * innerH
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke={CHART_COLORS.grid}
                  strokeDasharray="2 3"
                />
                <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="10" fill={CHART_COLORS.neutral}>
                  {yLabels[i]}
                </text>
              </g>
            )
          })}

          {data.map((d, i) => {
            const x = padLeft + i * slot + (slot - barW) / 2
            let yCursor = padTop + innerH
            const showLabel = shouldShowXLabel(i, n, interval)
            return (
              <g key={`${d.label}-${i}`}>
                {d.segments.map((seg, j) => {
                  const h = (seg.value / max) * innerH
                  yCursor -= h
                  return (
                    <rect
                      key={`${seg.name}-${j}`}
                      x={x}
                      y={yCursor}
                      width={barW}
                      height={Math.max(0, h)}
                      fill={seg.color}
                    >
                      <title>{`${d.label} · ${seg.name}: ${formatARSTooltip(seg.value)}`}</title>
                    </rect>
                  )
                })}
                {showLabel && (
                  <text
                    x={x + barW / 2}
                    y={height - padBottom + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill={CHART_COLORS.slate}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </ChartContainer>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-fg-muted">
        {data[0]?.segments.map((seg) => (
          <span key={seg.name} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            {seg.name}
          </span>
        ))}
      </div>
    </div>
  )
}
