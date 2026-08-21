'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FilaMesReporte, TotalesReporte } from '@/lib/reportes/queries'
import { formatARSKpi, formatARSTooltip } from '@/lib/reportes/format-kpi'
import { ColorMonto, DesglosePL, MargenBadge } from './DesglosePL'

interface TablaPLMensualMobileProps {
  filas: FilaMesReporte[]
  totales: TotalesReporte
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

function MesCard({
  f,
  mostrarCostos,
}: {
  f: FilaMesReporte
  mostrarCostos: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const id = `pl-mes-${f.anio}-${f.mes}`

  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs overflow-hidden">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((v) => !v)}
        className="w-full text-left p-4 min-h-11 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-fg">{f.mesLabel}</h3>
              {mostrarCostos && f.tieneCostos && f.margenPct != null && (
                <MargenBadge pct={f.margenPct} />
              )}
            </div>
            <p className="text-xs text-fg-muted mt-0.5">{f.cantidadVentas} tickets</p>
          </div>
          <ChevronDown
            className={`size-4 text-fg-muted shrink-0 mt-0.5 transition-transform ${abierto ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <p className="text-xs text-fg-muted mb-0.5">Ventas netas</p>
            <p className="font-semibold text-fg">
              <MontoCell value={f.ventasNetas} />
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted mb-0.5">Resultado neto</p>
            <p className="font-semibold">
              <ColorMonto value={f.resultadoNeto} />
            </p>
          </div>
        </div>
      </button>
      {abierto && (
        <div id={id} className="px-4 pb-4 border-t border-border-subtle pt-3">
          <DesglosePL m={f} mostrarCostos={mostrarCostos} />
        </div>
      )}
    </div>
  )
}

export function TablaPLMensualMobile({ filas, totales, mostrarCostos }: TablaPLMensualMobileProps) {
  const [totalAbierto, setTotalAbierto] = useState(false)

  return (
    <div className="lg:hidden space-y-3">
      {filas.map((f) => (
        <MesCard key={`${f.anio}-${f.mes}`} f={f} mostrarCostos={mostrarCostos} />
      ))}

      <div className="bg-surface-sunken border border-border-default rounded-[var(--radius-lg)] overflow-hidden">
        <button
          type="button"
          aria-expanded={totalAbierto}
          onClick={() => setTotalAbierto((v) => !v)}
          className="w-full text-left p-4 min-h-11"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Total período</p>
            <ChevronDown
              className={`size-4 text-fg-muted shrink-0 transition-transform ${totalAbierto ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-xs text-fg-muted mb-0.5">Ventas netas</p>
              <p className="font-semibold text-fg tabular-nums">{formatARSKpi(totales.ventasNetas)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted mb-0.5">Resultado neto</p>
              <p className="font-semibold">
                <ColorMonto value={totales.resultadoNeto} />
              </p>
            </div>
          </div>
        </button>
        {totalAbierto && (
          <div className="px-4 pb-4 border-t border-border-subtle pt-3">
            <DesglosePL m={totales} mostrarCostos={mostrarCostos} />
          </div>
        )}
      </div>
    </div>
  )
}
