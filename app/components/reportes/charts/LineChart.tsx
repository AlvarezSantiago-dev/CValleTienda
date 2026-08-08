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

export interface LineChartDatum {
  label: string
  value: number
}

interface LineChartProps {
  data: LineChartDatum[]
  height?: number
  ariaLabel?: string
  allowNegative?: boolean
}

export function LineChart({
  data,
  height = 220,
  ariaLabel = 'Gráfico de línea',
  allowNegative = true,
}: LineChartProps) {
  if (data.length === 0) return <ChartEmpty />

  const values = data.map((d) => d.value)
  const rawMin = Math.min(...values, 0)
  const rawMax = Math.max(...values, 0)
  if (rawMax === 0 && rawMin === 0) {
    return <ChartEmpty message="Sin valores para mostrar." />
  }

  const min = allowNegative ? rawMin * (rawMin < 0 ? 1.1 : 1) : 0
  const max = maxWithPadding([rawMax])
  const range = max - min || 1

  const width = CHART_VIEW_WIDTH
  const padTop = CHART_PAD.top
  const padBottom = CHART_PAD.bottom
  const padRight = CHART_PAD.right
  const yMarks = [min, min + range / 2, max]
  const yLabels = yMarks.map(formatARSAxis)
  const padLeft = computePadLeft(yLabels)
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const n = data.length
  const slot = n > 1 ? innerW / (n - 1) : innerW
  const interval = xLabelInterval(n, slot)
  const scrollMin = minChartWidth(n, 28, padLeft, padRight)

  const points = data.map((d, i) => {
    const x = padLeft + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
    const y = padTop + innerH - ((d.value - min) / range) * innerH
    return { ...d, x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const zeroY = padTop + innerH - ((0 - min) / range) * innerH

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
          const y = padTop + innerH - ((m - min) / range) * innerH
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

        {allowNegative && min < 0 && max > 0 && (
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={zeroY}
            y2={zeroY}
            stroke={CHART_COLORS.axis}
            strokeWidth={1}
          />
        )}

        <path d={pathD} fill="none" stroke={CHART_COLORS.primaryDark} strokeWidth={2.5} />

        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={p.x} cy={p.y} r={4} fill={CHART_COLORS.primaryDark}>
              <title>{`${p.label}: ${formatARSTooltip(p.value)}`}</title>
            </circle>
            {shouldShowXLabel(i, n, interval) && (
              <text
                x={p.x}
                y={height - padBottom + 14}
                textAnchor="middle"
                fontSize="10"
                fill={CHART_COLORS.slate}
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </ChartContainer>
  )
}
