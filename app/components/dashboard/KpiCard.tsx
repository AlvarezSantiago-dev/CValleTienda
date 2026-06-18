import Link from 'next/link'
import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  valor: string
  valorCompleto?: string
  sub?: string
  delta?: number | null
  href?: string
  icono?: ReactNode
  destacar?: boolean
}

function deltaColor(delta: number | null | undefined): string {
  if (delta == null) return 'text-gray-400'
  if (delta > 0) return 'text-emerald-600'
  if (delta < 0) return 'text-red-600'
  return 'text-gray-500'
}

function deltaArrow(delta: number | null | undefined): string {
  if (delta == null) return '—'
  if (delta > 0) return '▲'
  if (delta < 0) return '▼'
  return '•'
}

function deltaText(delta: number | null | undefined): string {
  if (delta == null) return 'sin datos previos'
  const abs = Math.abs(delta)
  return `${abs.toFixed(1)}%`
}

export function KpiCard({
  label,
  valor,
  valorCompleto,
  sub,
  delta,
  href,
  icono,
  destacar,
}: KpiCardProps) {
  const cardClass = destacar
    ? 'bg-lime-50 border border-lime-200 border-t-2 border-t-lime-500'
    : 'bg-white border border-gray-100 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]'

  const inner = (
    <div
      className={`${cardClass} rounded-xl p-5 h-full min-w-0 transition-all duration-150 ${
      href ? 'group-hover:shadow-md group-hover:-translate-y-px' : ''
    }`}
      title={valorCompleto ?? valor}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400 truncate">
          {label}
        </p>
        {icono && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            destacar ? 'bg-lime-100 text-lime-700' : 'bg-gray-50 text-gray-500'
          }`}>
            {icono}
          </div>
        )}
      </div>
      <p
        className={`mt-3 text-[clamp(1rem,4vw,1.5rem)] font-bold tracking-tight leading-tight break-words tabular-nums ${
          destacar ? 'text-lime-800' : 'text-[#0A0A0A]'
        }`}
      >
        {valor}
      </p>
      {(delta !== undefined || sub) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta !== undefined && (
            <span className={`inline-flex items-center gap-1 font-medium ${deltaColor(delta)}`}>
              <span aria-hidden>{deltaArrow(delta)}</span>
              <span>{deltaText(delta)}</span>
            </span>
          )}
          {sub && <span className="text-gray-400">{sub}</span>}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:ring-offset-1"
      >
        {inner}
      </Link>
    )
  }
  return inner
}
