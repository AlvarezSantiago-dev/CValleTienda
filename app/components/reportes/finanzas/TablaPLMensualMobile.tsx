import type { FilaMesReporte } from '@/lib/reportes/queries'
import { formatARSKpi, formatARSTooltip } from '@/lib/reportes/format-kpi'

interface TablaPLMensualMobileProps {
  filas: FilaMesReporte[]
  mostrarCostos: boolean
}

function MontoCell({ value, className = '' }: { value: number; className?: string }) {
  const display = formatARSKpi(value)
  const full = formatARSTooltip(value)
  return (
    <span className={`tabular-nums ${className}`} title={full}>
      {value < 0 ? `−${display.replace('−', '')}` : display}
    </span>
  )
}

function MargenBadge({ pct }: { pct: number }) {
  const color =
    pct >= 40 ? 'bg-green-50 text-green-700' :
    pct >= 20 ? 'bg-yellow-50 text-yellow-700' :
    'bg-red-50 text-red-600'
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  )
}

export function TablaPLMensualMobile({ filas, mostrarCostos }: TablaPLMensualMobileProps) {
  return (
    <div className="sm:hidden space-y-3">
      {filas.map((f) => (
        <div
          key={`${f.anio}-${f.mes}`}
          className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">{f.mesLabel}</h3>
            {mostrarCostos && f.tieneCostos && f.margenPct != null && (
              <MargenBadge pct={f.margenPct} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Ventas netas</p>
              <p className="font-semibold text-gray-900">
                <MontoCell value={f.ventasNetas} />
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Resultado neto</p>
              <p className={`font-semibold ${f.resultadoNeto < 0 ? 'text-red-500' : 'text-green-600'}`}>
                <MontoCell value={f.resultadoNeto} />
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Comisiones</p>
              <p className="text-amber-600">
                {f.comisiones > 0 ? <MontoCell value={-f.comisiones} /> : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Tickets</p>
              <p className="font-medium text-gray-700 tabular-nums">{f.cantidadVentas}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
