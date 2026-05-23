import type { GananciaBrutaMes } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface Props {
  data: GananciaBrutaMes
}

export function GananciaBrutaCard({ data }: Props) {
  const { ganancia, costoTotal, ventasNetas, margenPct, tieneData, totalEgresos, resultadoNeto } = data

  if (!tieneData && totalEgresos === 0) {
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

  const netoColor = resultadoNeto >= 0 ? 'text-green-600' : 'text-red-500'

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <span className="text-base">📊</span>
        <h2 className="text-[14px] font-semibold text-gray-900">Ganancia bruta (mes)</h2>
      </div>

      <div className="p-5">
        {tieneData ? (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
            {/* Ganancia */}
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Ganancia bruta</p>
              <p className="text-base font-bold text-green-600 truncate">{formatARS(ganancia)}</p>
            </div>

            {/* Costo */}
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Costo total</p>
              <p className="text-base font-bold text-gray-700 truncate">{formatARS(costoTotal)}</p>
            </div>

            {/* Margen */}
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Margen</p>
              <p className={`text-base font-bold ${margenColor}`}>
                {margenPct != null ? `${margenPct}%` : '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">
            Cargá el <strong>precio de costo</strong> en tus productos para ver la ganancia bruta.
          </p>
        )}

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

        {/* Egresos manuales + Resultado neto */}
        {totalEgresos > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Egresos manuales</span>
              <span className="text-sm font-semibold text-red-500">−{formatARS(totalEgresos)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Resultado neto</span>
              <span className={`text-sm font-bold ${netoColor}`}>{formatARS(resultadoNeto)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
