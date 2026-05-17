import Link from 'next/link'
import type { VentaListItem } from '@/lib/ventas/queries'
import { formatARS } from '@/lib/format'

interface UltimasVentasCardProps {
  items: VentaListItem[]
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

export function UltimasVentasCard({ items }: UltimasVentasCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Últimas ventas</h2>
        <Link
          href="/ventas"
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Ver todas →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Sin ventas todavía.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((v) => (
            <li key={v.id} className="py-2 text-sm">
              <Link
                href={`/ventas/${v.id}`}
                className="flex items-center gap-3 group"
              >
                <span className="font-mono text-xs text-gray-500 w-14">
                  #{v.numero_ticket}
                </span>
                <span className="flex-1 truncate text-gray-700 group-hover:text-indigo-600">
                  {v.cliente_nombre ?? <span className="text-gray-400">Sin cliente</span>}
                </span>
                <span className="text-xs text-gray-400 w-20 text-right">
                  {tiempoRelativo(v.created_at)}
                </span>
                <span className="text-sm font-medium text-gray-900 w-28 text-right shrink-0">
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
