import type { GananciaBrutaMes } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface Props {
  data: GananciaBrutaMes
}

export function GananciaBrutaCard({ data }: Props) {
  const { ganancia, costoTotal, ventasNetas, margenPct, tieneData } = data

  if (!tieneData) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📊</span>
          <h2 className="text-base font-semibold text-gray-700">Ganancia bruta</h2>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Cargá el <strong>precio de costo</strong> en tus productos para ver la ganancia bruta del mes.
        </p>
      </div>
    )
  }

  const margenColor =
    margenPct == null
      ? 'text-gray-500'
      : margenPct >= 40
      ? 'text-green-600'
      : margenPct >= 20
      ? 'text-yellow-600'
      : 'text-red-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📊</span>
        <h2 className="text-base font-semibold text-gray-900">Ganancia bruta (mes)</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Ganancia */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Ganancia</p>
          <p className="text-xl font-bold text-green-600">{formatARS(ganancia)}</p>
        </div>

        {/* Costo */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Costo total</p>
          <p className="text-xl font-bold text-gray-700">{formatARS(costoTotal)}</p>
        </div>

        {/* Margen */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Margen</p>
          <p className={`text-xl font-bold ${margenColor}`}>
            {margenPct != null ? `${margenPct}%` : '—'}
          </p>
        </div>
      </div>

      {/* Barra de margen visual */}
      {margenPct != null && ventasNetas > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Costo</span>
            <span>Ganancia</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${Math.min(100, margenPct)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Sobre {formatARS(ventasNetas)} en ventas netas
          </p>
        </div>
      )}
    </div>
  )
}
