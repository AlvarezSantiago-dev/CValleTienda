import Link from 'next/link'
import type { TopClienteItem } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { DashboardSectionCard } from './DashboardSectionCard'

interface TopClientesCardProps {
  items: TopClienteItem[]
}

export function TopClientesCard({ items }: TopClientesCardProps) {
  return (
    <DashboardSectionCard
      title="Top clientes"
      description="Histórico — por monto total comprado"
      empty={items.length === 0}
      emptyMessage="Aún no tenés clientes con compras registradas."
    >
      <ol className="divide-y divide-border-subtle px-5">
        {items.map((c, i) => (
          <li key={c.id} className="py-2.5 text-sm min-w-0">
            <Link
              href={`/clientes/${c.id}`}
              className="flex items-center gap-3 group min-w-0 focus-ring rounded-[var(--radius-sm)]"
            >
              <span className="w-5 shrink-0 text-xs text-fg-subtle font-mono tabular-nums">
                {i + 1}.
              </span>
              <span className="flex-1 truncate text-sm text-fg-secondary group-hover:text-fg-brand group-hover:underline min-w-0 transition-colors duration-(--duration-fast)">
                {c.nombre_completo}
              </span>
              <span className="shrink-0 text-xs text-fg-subtle hidden sm:inline text-right">
                {c.total_compras} {c.total_compras === 1 ? 'compra' : 'compras'}
              </span>
              <span className="shrink-0 text-sm font-semibold text-fg text-right font-mono tabular-nums">
                {formatARS(c.monto_total)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </DashboardSectionCard>
  )
}
