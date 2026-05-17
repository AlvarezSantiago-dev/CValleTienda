import type { TopProductoItem } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface TopProductosCardProps {
  items: TopProductoItem[]
}

export function TopProductosCard({ items }: TopProductosCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">
          Top productos del mes
        </h2>
        <p className="text-xs text-gray-500">Ordenados por unidades vendidas</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          Sin ventas este mes.
        </p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {items.map((p, i) => (
            <li
              key={p.nombre}
              className="flex items-center gap-3 py-2 text-sm min-w-0"
            >
              <span className="w-5 shrink-0 text-xs text-gray-400 font-mono">
                {i + 1}.
              </span>
              <span className="flex-1 truncate text-gray-900 min-w-0" title={p.nombre}>
                {p.nombre}
              </span>
              <span className="shrink-0 text-xs text-gray-500 hidden sm:inline text-right">
                {p.unidades} u.
              </span>
              <span className="shrink-0 text-xs font-medium text-gray-900 text-right tabular-nums">
                {formatARS(p.monto)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
