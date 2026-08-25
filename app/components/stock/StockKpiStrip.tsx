import Link from 'next/link'
import type { StockKpis } from '@/lib/stock/queries'
import { formatNumber } from '@/lib/format'
import { cn } from '@/components/ui/cn'

interface Props {
  kpis: StockKpis
}

export function StockKpiStrip({ kpis }: Props) {
  const items = [
    {
      label: 'Variantes',
      value: formatNumber(kpis.total_variantes),
      href: '/stock',
      tone: 'default' as const,
    },
    {
      label: 'Sin stock',
      value: formatNumber(kpis.sin_stock),
      href: '/stock?bajo=1',
      tone: kpis.sin_stock > 0 ? ('danger' as const) : ('default' as const),
    },
    {
      label: 'Bajo stock',
      value: formatNumber(kpis.bajo_stock),
      href: '/stock?bajo=1',
      tone: kpis.bajo_stock > 0 ? ('warning' as const) : ('default' as const),
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.href}
          className={cn(
            'rounded-[var(--radius-lg)] border px-3 py-3 sm:px-4 transition-colors hover:border-border-default focus-ring',
            it.tone === 'danger' && 'border-danger-border bg-danger-soft',
            it.tone === 'warning' && 'border-warning-border bg-warning-soft',
            it.tone === 'default' && 'border-border-subtle bg-surface shadow-xs'
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
            {it.label}
          </p>
          <p
            className={cn(
              'text-lg sm:text-xl font-bold font-mono tabular-nums mt-0.5',
              it.tone === 'danger' && 'text-danger-soft-fg',
              it.tone === 'warning' && 'text-warning-soft-fg',
              it.tone === 'default' && 'text-fg'
            )}
          >
            {it.value}
          </p>
        </Link>
      ))}
    </div>
  )
}
