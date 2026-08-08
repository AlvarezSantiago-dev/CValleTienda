import type { TopVar1Item } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { DashboardSectionCard } from './DashboardSectionCard'

interface Props {
  items: TopVar1Item[]
  labelVar1: string
}

export function TopVar1Card({ items, labelVar1 }: Props) {
  if (items.length === 0) {
    return (
      <DashboardSectionCard
        title={`Top ${labelVar1}s vendidos (mes)`}
        empty
        emptyMessage="Sin datos aún este mes."
      />
    )
  }

  const maxUnidades = items[0]?.unidades ?? 1

  return (
    <DashboardSectionCard title={`Top ${labelVar1}s vendidos (mes)`} padding="md">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.valor}>
            <div className="flex items-center justify-between text-sm mb-1 gap-2">
              <span className="font-medium text-fg-secondary truncate">{item.valor}</span>
              <span className="text-fg-subtle shrink-0 text-xs">
                {item.unidades} ud · {formatARS(item.monto)}
              </span>
            </div>
            <div className="h-1.5 bg-surface-sunken rounded-[var(--radius-full)] overflow-hidden">
              <div
                className="h-full bg-accent rounded-[var(--radius-full)]"
                style={{ width: `${Math.round((item.unidades / maxUnidades) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardSectionCard>
  )
}
