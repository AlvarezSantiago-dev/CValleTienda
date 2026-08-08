import Link from 'next/link'
import type { ReactNode } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/components/ui/cn'

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

function deltaTone(delta: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (delta == null || delta === 0) return 'neutral'
  return delta > 0 ? 'up' : 'down'
}

function deltaText(delta: number | null | undefined): string {
  if (delta == null) return 'sin datos previos'
  return `${Math.abs(delta).toFixed(1)}%`
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
  const tone = delta !== undefined ? deltaTone(delta) : null

  const inner = (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] p-5 h-full min-w-0 transition-all duration-(--duration-fast)',
        destacar
          ? 'bg-primary-soft border border-primary-border border-t-2 border-t-accent'
          : 'bg-surface border border-border-subtle shadow-xs',
        href && 'group-hover:shadow-md group-hover:-translate-y-px'
      )}
      title={valorCompleto ?? valor}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted truncate">
          {label}
        </p>
        {icono && (
          <div
            className={cn(
              'w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0',
              destacar ? 'bg-brand-100 text-fg-brand' : 'bg-surface-sunken text-fg-muted'
            )}
          >
            {icono}
          </div>
        )}
      </div>
      <p
        className={cn(
          'mt-3 text-title font-bold tracking-tight leading-tight break-words font-mono tabular-nums',
          destacar ? 'text-primary-soft-fg' : 'text-fg'
        )}
      >
        {valor}
      </p>
      {(delta !== undefined || sub) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                tone === 'up' && 'text-success-soft-fg',
                tone === 'down' && 'text-danger-soft-fg',
                tone === 'neutral' && 'text-fg-muted'
              )}
            >
              {tone === 'up' && <TrendingUp size={13} aria-hidden />}
              {tone === 'down' && <TrendingDown size={13} aria-hidden />}
              {tone === 'neutral' && <Minus size={13} aria-hidden />}
              <span>{deltaText(delta)}</span>
            </span>
          )}
          {sub && <span className="text-fg-subtle">{sub}</span>}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="group block h-full rounded-[var(--radius-lg)] focus-ring">
        {inner}
      </Link>
    )
  }
  return inner
}
