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
    pct >= 40 ? 'bg-success-soft text-success-soft-fg' :
    pct >= 20 ? 'bg-warning-soft text-warning-soft-fg' :
    'bg-danger-soft text-danger-soft-fg'
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
          className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-fg">{f.mesLabel}</h3>
            {mostrarCostos && f.tieneCostos && f.margenPct != null && (
              <MargenBadge pct={f.margenPct} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle mb-0.5">Ventas netas</p>
              <p className="font-semibold text-fg">
                <MontoCell value={f.ventasNetas} />
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle mb-0.5">Resultado neto</p>
              <p className={`font-semibold ${f.resultadoNeto < 0 ? 'text-danger-soft-fg' : 'text-success-soft-fg'}`}>
                <MontoCell value={f.resultadoNeto} />
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle mb-0.5">Comisiones</p>
              <p className="text-amber-600">
                {f.comisiones > 0 ? <MontoCell value={-f.comisiones} /> : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle mb-0.5">Tickets</p>
              <p className="font-medium text-fg tabular-nums">{f.cantidadVentas}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
