import { CHART_COLORS, CHART_PAD, formatARSAxis, formatARSTooltip, maxWithPadding } from '@/lib/reportes/format-chart'
import {
  CHART_VIEW_WIDTH,
  computePadLeft,
  minChartWidth,
  shouldShowXLabel,
  xLabelInterval,
} from '@/lib/reportes/chart-layout'
import { ChartContainer } from './ChartContainer'
import { ChartEmpty } from './ChartEmpty'

export interface BarChartDatum {
  label: string
  value: number
  highlight?: boolean
}

interface BarChartProps {
  data: BarChartDatum[]
  height?: number
  ariaLabel?: string
  formatValue?: (n: number) => string
  formatTooltip?: (d: BarChartDatum) => string
}

export function BarChart({
  data,
  height = 220,
  ariaLabel = 'Gráfico de barras',
  formatValue = formatARSAxis,
  formatTooltip,
}: BarChartProps) {
  if (data.length === 0) return <ChartEmpty />

  const values = data.map((d) => d.value)
  const max = maxWithPadding(values)
  if (max <= 0 || values.every((v) => v === 0)) {
    return <ChartEmpty message="Sin valores para mostrar." />
  }

  const width = CHART_VIEW_WIDTH
  const padTop = CHART_PAD.top
  const padBottom = CHART_PAD.bottom
  const padRight = CHART_PAD.right
  const yMarks = [0, max / 2, max]
  const yLabels = yMarks.map(formatValue)
  const padLeft = computePadLeft(yLabels)
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const n = data.length
  const slot = innerW / n
  const interval = xLabelInterval(n, slot)
  const barW = Math.max(slot < 20 ? 4 : 8, slot - 4)
  const scrollMin = minChartWidth(n, 28, padLeft, padRight)

  return (
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
          const h = max > 0 ? (d.value / max) * innerH : 0
          const x = padLeft + i * slot + (slot - barW) / 2
          const y = padTop + innerH - h
          const fill = d.highlight ? CHART_COLORS.primaryDark : CHART_COLORS.primary
          const showLabel = shouldShowXLabel(i, n, interval)
          const tooltip = formatTooltip?.(d) ?? `${d.label}: ${formatARSTooltip(d.value)}`
          return (
            <g key={`${d.label}-${i}`}>
              <rect x={x} y={y} width={barW} height={Math.max(0, h)} fill={fill} rx={2}>
                <title>{tooltip}</title>
              </rect>
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
  )
}
