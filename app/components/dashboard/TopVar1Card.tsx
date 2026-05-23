import type { TopVar1Item } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface Props {
  items: TopVar1Item[]
  labelVar1: string
}

export function TopVar1Card({ items, labelVar1 }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Top {labelVar1}s vendidos (mes)
        </h3>
        <p className="text-sm text-gray-400">Sin datos aún este mes.</p>
      </div>
    )
  }

  const maxUnidades = items[0]?.unidades ?? 1

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-[14px] font-semibold text-gray-900">Top {labelVar1}s vendidos (mes)</h3>
      </div>
      <div className="p-5 space-y-3">
        {items.map((item) => (
          <div key={item.valor}>
            <div className="flex items-center justify-between text-[13px] mb-1">
              <span className="font-medium text-gray-800">{item.valor}</span>
              <span className="text-gray-400">
                {item.unidades} ud · {formatARS(item.monto)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-lime-500 rounded-full"
                style={{ width: `${Math.round((item.unidades / maxUnidades) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
