import type { TopProductoItem } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface TopProductosCardProps {
  items: TopProductoItem[]
}

export function TopProductosCard({ items }: TopProductosCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-[14px] font-semibold text-gray-900">Top productos del mes</h2>
        <p className="text-xs text-gray-400 mt-0.5">Ordenados por unidades vendidas</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center px-5">
          Sin ventas este mes.
        </p>
      ) : (
        <ol className="divide-y divide-gray-50 px-5">
          {items.map((p, i) => (
            <li
              key={p.nombre}
              className="flex items-center gap-3 py-2.5 text-sm min-w-0"
            >
              <span className="w-5 shrink-0 text-xs text-gray-400 font-mono tabular-nums">
                {i + 1}.
              </span>
              <span className="flex-1 truncate text-[13px] text-gray-800 min-w-0" title={p.nombre}>
                {p.nombre}
              </span>
              <span className="shrink-0 text-xs text-gray-400 hidden sm:inline text-right">
                {p.unidades} u.
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-gray-900 text-right tabular-nums">
                {formatARS(p.monto)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
