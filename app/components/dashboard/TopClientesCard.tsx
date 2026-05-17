import Link from 'next/link'
import type { TopClienteItem } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface TopClientesCardProps {
  items: TopClienteItem[]
}

export function TopClientesCard({ items }: TopClientesCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Top clientes</h2>
        <p className="text-xs text-gray-500">Histórico — por monto total comprado</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          Aún no tenés clientes con compras registradas.
        </p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {items.map((c, i) => (
            <li key={c.id} className="py-2 text-sm min-w-0">
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center gap-3 group min-w-0"
              >
                <span className="w-5 shrink-0 text-xs text-gray-400 font-mono">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate text-gray-900 group-hover:text-indigo-600 group-hover:underline min-w-0">
                  {c.nombre_completo}
                </span>
                <span className="shrink-0 text-xs text-gray-500 hidden sm:inline text-right">
                  {c.total_compras}{' '}
                  {c.total_compras === 1 ? 'compra' : 'compras'}
                </span>
                <span className="shrink-0 text-xs font-medium text-gray-900 text-right tabular-nums">
                  {formatARS(c.monto_total)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
