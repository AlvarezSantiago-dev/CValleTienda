import Link from 'next/link'
import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  valor: string
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
  sub,
  delta,
  href,
  icono,
  destacar,
}: KpiCardProps) {
  const cardClass = destacar
    ? 'bg-lime-50 border border-lime-200'
    : 'bg-white border border-gray-100'

  const inner = (
    <div className={`${cardClass} rounded-xl p-5 h-full transition`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400">
          {label}
        </p>
        {icono && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            destacar ? 'bg-lime-100 text-lime-700' : 'bg-gray-50 text-gray-500'
          }`}>
            {icono}
          </div>
        )}
      </div>
      <p
        className={`mt-2 text-[18px] sm:text-[22px] font-bold truncate ${
          destacar ? 'text-lime-800' : 'text-[#0A0A0A]'
        }`}
      >
        {valor}
      </p>
      {(delta !== undefined || sub) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span className={`inline-flex items-center gap-1 ${deltaColor(delta)}`}>
              <span aria-hidden>{deltaArrow(delta)}</span>
              <span>{deltaText(delta)}</span>
            </span>
          )}
          {sub && <span className="text-gray-500">{sub}</span>}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {inner}
      </Link>
    )
  }
  return inner
}
