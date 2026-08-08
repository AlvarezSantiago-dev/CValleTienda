import Link from 'next/link'
import type { DevolucionListItem } from '@/lib/devoluciones/queries'
import { formatARS } from '@/lib/format'
import { DashboardSectionCard } from './DashboardSectionCard'

interface UltimasDevolucionesCardProps {
  items: DevolucionListItem[]
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

export function UltimasDevolucionesCard({ items }: UltimasDevolucionesCardProps) {
  return (
    <DashboardSectionCard
      title="Últimas devoluciones"
      action={items.length > 0 ? { label: 'Ver todas →', href: '/devoluciones' } : undefined}
      empty={items.length === 0}
      emptyMessage="Sin devoluciones recientes."
    >
      <ul className="divide-y divide-border-subtle">
        {items.map((d) => (
          <li key={d.id}>
            <Link
              href={`/devoluciones/${d.id}`}
              className="flex items-center gap-3 px-5 py-2.5 group hover:bg-surface-hover transition-colors duration-(--duration-fast) focus-ring"
            >
              <span className="font-mono text-xs text-fg-subtle w-14 shrink-0">
                #{d.numero_devolucion}
              </span>
              <span
                className="flex-1 truncate text-sm text-fg-secondary group-hover:text-fg-brand transition-colors min-w-0"
                title={d.motivo}
              >
                {d.motivo || <span className="text-fg-subtle">Sin motivo</span>}
              </span>
              <span className="text-xs text-fg-subtle w-20 text-right shrink-0 hidden sm:inline">
                {tiempoRelativo(d.created_at)}
              </span>
              <span className="text-sm font-semibold text-warning-soft-fg w-28 text-right shrink-0 font-mono tabular-nums">
                {formatARS(d.total_devuelto)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardSectionCard>
  )
}
