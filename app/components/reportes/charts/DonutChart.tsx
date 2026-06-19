import { CHART_COLORS } from '@/lib/reportes/format-chart'
import { formatARSKpi, formatARSTooltip } from '@/lib/reportes/format-kpi'
import { ChartEmpty } from './ChartEmpty'

export interface DonutDatum {
  label: string
  value: number
  color?: string
}

const PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.primaryDark,
  '#A3E635',
  '#65A30D',
  CHART_COLORS.amber,
  CHART_COLORS.slate,
  CHART_COLORS.neutral,
]

interface DonutChartProps {
  data: DonutDatum[]
  ariaLabel?: string
}

function centerFontSize(text: string): number {
  if (text.length > 10) return 8
  if (text.length > 8) return 9
  return 11
}

export function DonutChart({ data, ariaLabel = 'Gráfico de dona' }: DonutChartProps) {
  const filtered = data.filter((d) => d.value > 0)
  if (filtered.length === 0) return <ChartEmpty />

  const total = filtered.reduce((s, d) => s + d.value, 0)
  const centerText = formatARSKpi(total)
  const centerSize = centerFontSize(centerText)
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const r = 72
  const stroke = 28

  const { arcs } = filtered.reduce<{
    angle: number
    arcs: Array<{ path: string; color: string; pct: number; label: string; value: number }>
  }>(
    (acc, d, i) => {
      const startAngle = acc.angle
      const sweep = (d.value / total) * Math.PI * 2
      const endAngle = startAngle + sweep
      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)
      const frac = d.value / total
      const color = d.color ?? PALETTE[i % PALETTE.length]
      const path = `M ${x1} ${y1} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2}`
      return {
        angle: endAngle,
        arcs: [...acc.arcs, { ...d, path, color, pct: Math.round(frac * 1000) / 10 }],
      }
    },
    { angle: -Math.PI / 2, arcs: [] }
  )

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 min-w-0 w-full">
      <div className="w-full max-w-[200px] mx-auto sm:mx-0 flex-shrink-0">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          height="auto"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={ariaLabel}
        >
          {arcs.map((a, i) => (
            <path
              key={`${a.label}-${i}`}
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
            >
              <title>{`${a.label}: ${formatARSTooltip(a.value)} (${a.pct}%)`}</title>
            </path>
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill={CHART_COLORS.slate}>
            Total
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fontSize={centerSize}
            fontWeight="600"
            fill="#111827"
          >
            {centerText}
          </text>
          <title>{formatARSTooltip(total)}</title>
        </svg>
      </div>

      <ul className="flex-1 space-y-2 text-sm min-w-0 w-full">
        {arcs.map((a, i) => (
          <li key={`${a.label}-${i}`} className="flex items-center justify-between gap-2 min-w-0">
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
              <span className="truncate text-gray-700" title={a.label}>{a.label}</span>
            </span>
            <span className="text-gray-500 tabular-nums flex-shrink-0" title={formatARSTooltip(a.value)}>
              {a.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
