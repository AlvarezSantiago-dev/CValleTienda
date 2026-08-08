import type { TopProductoItem } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { DashboardSectionCard } from './DashboardSectionCard'

interface TopProductosCardProps {
  items: TopProductoItem[]
}

export function TopProductosCard({ items }: TopProductosCardProps) {
  return (
    <DashboardSectionCard
      title="Top productos del mes"
      description="Ordenados por unidades vendidas"
      empty={items.length === 0}
      emptyMessage="Sin ventas este mes."
    >
      <ol className="divide-y divide-border-subtle px-5">
        {items.map((p, i) => (
          <li key={p.nombre} className="flex items-center gap-3 py-2.5 text-sm min-w-0">
            <span className="w-5 shrink-0 text-xs text-fg-subtle font-mono tabular-nums">
              {i + 1}.
            </span>
            <span className="flex-1 truncate text-sm text-fg-secondary min-w-0" title={p.nombre}>
              {p.nombre}
            </span>
            <span className="shrink-0 text-xs text-fg-subtle hidden sm:inline text-right">
              {p.unidades} u.
            </span>
            <span className="shrink-0 text-sm font-semibold text-fg text-right font-mono tabular-nums">
              {formatARS(p.monto)}
            </span>
          </li>
        ))}
      </ol>
    </DashboardSectionCard>
  )
}
