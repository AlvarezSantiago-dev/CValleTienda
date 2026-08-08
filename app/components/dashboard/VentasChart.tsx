import type { PuntoSerie } from '@/lib/dashboard/queries'

interface VentasChartProps {
  serie: PuntoSerie[]
}

function formatARSCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

function formatARSFull(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function fechaCorta(iso: string): string {
  // iso = YYYY-MM-DD
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function VentasChart({ serie }: VentasChartProps) {
  if (serie.length === 0) {
    return (
      <p className="text-sm text-fg-muted py-12 text-center">
        Sin datos para los últimos 14 días.
      </p>
    )
  }

  const max = Math.max(...serie.map((p) => p.monto), 0)
  const total = serie.reduce((acc, p) => acc + p.monto, 0)
  const promedio = total / serie.length
  const totalCantidad = serie.reduce((acc, p) => acc + p.cantidad, 0)

  if (max === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-fg-muted">Sin ventas en los últimos 14 días.</p>
      </div>
    )
  }

  // Layout SVG
  const width = 700
  const height = 220
  const padTop = 10
  const padBottom = 28
  const padLeft = 48
  const padRight = 8
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const n = serie.length
  const slot = innerW / n
  const barW = Math.max(8, slot - 8)

  const hoyIso = serie[serie.length - 1]?.fecha

  // Escalas Y: 3 marcas
  const yMarks = [0, max / 2, max]

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Gráfico de ventas de los últimos 14 días"
        className="block"
      >
        {/* Grilla horizontal */}
        {yMarks.map((m, i) => {
          const y = padTop + innerH - (m / max) * innerH
          return (
            <g key={i}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray="2 3"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--fg-subtle)"
              >
                {formatARSCompact(m)}
              </text>
            </g>
          )
        })}

        {/* Barras */}
        {serie.map((p, i) => {
          const h = max > 0 ? (p.monto / max) * innerH : 0
          const x = padLeft + i * slot + (slot - barW) / 2
          const y = padTop + innerH - h
          const isHoy = p.fecha === hoyIso
          const fill = isHoy ? 'var(--brand-700)' : 'var(--accent)'
          const mostrarLabel = i % 2 === 0 || i === n - 1
          return (
            <g key={p.fecha}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                fill={fill}
                rx={2}
              >
                <title>{`${fechaCorta(p.fecha)} · ${formatARSFull(p.monto)} · ${p.cantidad} ${p.cantidad === 1 ? 'venta' : 'ventas'}`}</title>
              </rect>
              {mostrarLabel && (
                <text
                  x={x + barW / 2}
                  y={height - padBottom + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--fg-muted)"
                >
                  {fechaCorta(p.fecha)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-fg-secondary border-t border-border-subtle pt-3">
        <div>
          <p className="text-fg-subtle">Total 14 días</p>
          <p className="font-semibold text-fg tabular-nums">{formatARSFull(total)}</p>
        </div>
        <div>
          <p className="text-fg-subtle">Promedio diario</p>
          <p className="font-semibold text-fg tabular-nums">{formatARSFull(promedio)}</p>
        </div>
        <div>
          <p className="text-fg-subtle">Ventas en el período</p>
          <p className="font-semibold text-fg tabular-nums">{totalCantidad}</p>
        </div>
      </div>
    </div>
  )
}
