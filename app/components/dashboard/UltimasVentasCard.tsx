import Link from 'next/link'
import type { VentaListItem } from '@/lib/ventas/queries'
import { formatARS } from '@/lib/format'
import { formatNumeroTicket } from '@/lib/tickets/format'

interface UltimasVentasCardProps {
  items: VentaListItem[]
  prefijoTicket?: string
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

export function UltimasVentasCard({ items, prefijoTicket = 'T' }: UltimasVentasCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-gray-900">Últimas ventas</h2>
        <Link
          href="/ventas"
          className="text-xs font-medium text-lime-700 hover:text-lime-800 hover:underline transition-colors"
        >
          Ver todas →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center px-5">Sin ventas todavía.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((v) => (
            <li key={v.id}>
              <Link
                href={`/ventas/${v.id}`}
                className="flex items-center gap-3 px-5 py-2.5 group hover:bg-gray-50 transition-colors"
              >
                <span className="font-mono text-xs text-gray-400 w-14 shrink-0">
                  {formatNumeroTicket(prefijoTicket, v.numero_ticket)}
                </span>
                <span className="flex-1 truncate text-[13px] text-gray-600 group-hover:text-lime-700 transition-colors">
                  {v.cliente_nombre ?? <span className="text-gray-400">Sin cliente</span>}
                </span>
                <span className="text-xs text-gray-400 w-20 text-right shrink-0">
                  {tiempoRelativo(v.created_at)}
                </span>
                <span className="text-[13px] font-semibold text-gray-900 w-28 text-right shrink-0 tabular-nums">
                  {formatARS(v.total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
