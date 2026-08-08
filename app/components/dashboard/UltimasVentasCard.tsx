import Link from 'next/link'
import type { VentaListItem } from '@/lib/ventas/queries'
import { formatARS } from '@/lib/format'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { DashboardSectionCard } from './DashboardSectionCard'

interface UltimasVentasCardProps {
  items: VentaListItem[]
  prefijoTicket?: string
  titulo?: string
}

function tiempoRelativo(iso: string): string {
  const ahora = Date.now()
  const t = new Date(iso).getTime()
  const diffMin = Math.floor((ahora - t) / 60_000)
  if (diffMin < 1) return 'recién'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} d`
}

export function UltimasVentasCard({
  items,
  prefijoTicket = 'T',
  titulo = 'Últimas ventas',
}: UltimasVentasCardProps) {
  return (
    <DashboardSectionCard
      title={titulo}
      action={{ label: 'Ver todas →', href: '/ventas' }}
      empty={items.length === 0}
      emptyMessage="Sin ventas todavía."
    >
      <ul className="divide-y divide-border-subtle">
        {items.map((v) => (
          <li key={v.id}>
            <Link
              href={`/ventas/${v.id}`}
              className="flex items-center gap-3 px-5 py-2.5 group hover:bg-surface-hover transition-colors duration-(--duration-fast) focus-ring"
            >
              <span className="font-mono text-xs text-fg-subtle w-14 shrink-0">
                {formatNumeroTicket(prefijoTicket, v.numero_ticket)}
              </span>
              <span className="flex-1 truncate text-sm text-fg-secondary group-hover:text-fg-brand transition-colors min-w-0">
                {v.cliente_nombre ?? <span className="text-fg-subtle">Sin cliente</span>}
              </span>
              <span className="text-xs text-fg-subtle w-20 text-right shrink-0 hidden sm:inline">
                {tiempoRelativo(v.created_at)}
              </span>
              <span className="text-sm font-semibold text-fg w-28 text-right shrink-0 font-mono tabular-nums">
                {formatARS(v.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardSectionCard>
  )
}
