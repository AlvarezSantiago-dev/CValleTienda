import Link from 'next/link'
import type { TopClienteItem } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface TopClientesCardProps {
  items: TopClienteItem[]
}

export function TopClientesCard({ items }: TopClientesCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-[14px] font-semibold text-gray-900">Top clientes</h2>
        <p className="text-xs text-gray-400 mt-0.5">Histórico — por monto total comprado</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center px-5">
          Aún no tenés clientes con compras registradas.
        </p>
      ) : (
        <ol className="divide-y divide-gray-50 px-5">
          {items.map((c, i) => (
            <li key={c.id} className="py-2.5 text-sm min-w-0">
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center gap-3 group min-w-0"
              >
                <span className="w-5 shrink-0 text-xs text-gray-400 font-mono tabular-nums">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate text-[13px] text-gray-800 group-hover:text-lime-700 group-hover:underline min-w-0 transition-colors">
                  {c.nombre_completo}
                </span>
                <span className="shrink-0 text-xs text-gray-400 hidden sm:inline text-right">
                  {c.total_compras}{' '}
                  {c.total_compras === 1 ? 'compra' : 'compras'}
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-gray-900 text-right tabular-nums">
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
