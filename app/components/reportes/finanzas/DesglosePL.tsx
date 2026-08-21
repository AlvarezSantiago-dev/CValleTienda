import type { ReactNode } from 'react'
import type { FilaMesReporte, TotalesReporte } from '@/lib/reportes/queries'
import { formatARS } from '@/lib/format'

type MetricasPL = Pick<
  FilaMesReporte,
  | 'cantidadVentas'
  | 'ventasBrutas'
  | 'cobrado'
  | 'devolucionesReembolso'
  | 'devolucionesCredito'
  | 'creditoUsado'
  | 'ventasNetas'
  | 'costoTotal'
  | 'gananciaBruta'
  | 'margenPct'
  | 'tieneCostos'
  | 'egresosManuales'
  | 'comisiones'
  | 'resultadoNeto'
>

export function ColorMonto({
  value,
  className = '',
}: {
  value: number
  className?: string
}) {
  const tone = value < 0 ? 'text-danger-soft-fg' : 'text-success-soft-fg'
  return (
    <span className={`${tone} ${className}`}>
      {value < 0 ? `−${formatARS(Math.abs(value))}` : formatARS(value)}
    </span>
  )
}

export function MargenBadge({ pct }: { pct: number }) {
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

function DashNeg({ value }: { value: number }) {
  if (value <= 0) return <span className="text-fg-subtle">—</span>
  return <span className="text-danger-soft-fg">−{formatARS(value)}</span>
}

function FilaMetrica({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 min-w-0">
      <span className="text-xs text-fg-muted shrink-0">{label}</span>
      <span className="text-sm tabular-nums text-fg text-right min-w-0">{children}</span>
    </div>
  )
}

function Grupo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-sunken border border-border-subtle p-3 min-w-0">
      <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-1.5">{title}</p>
      {children}
    </div>
  )
}

export function DesglosePL({
  m,
  mostrarCostos,
}: {
  m: MetricasPL | TotalesReporte
  mostrarCostos: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <Grupo title="Ventas">
        <FilaMetrica label="Tickets">{m.cantidadVentas}</FilaMetrica>
        <FilaMetrica label="Brutas">{formatARS(m.ventasBrutas)}</FilaMetrica>
        <FilaMetrica label="Cobrado">{formatARS(m.cobrado)}</FilaMetrica>
        <FilaMetrica label="Netas">
          <span className="font-semibold">{formatARS(m.ventasNetas)}</span>
        </FilaMetrica>
      </Grupo>
      <Grupo title="Devoluciones y crédito">
        <FilaMetrica label="Reembolso"><DashNeg value={m.devolucionesReembolso} /></FilaMetrica>
        <FilaMetrica label="Crédito dado"><DashNeg value={m.devolucionesCredito} /></FilaMetrica>
        <FilaMetrica label="Crédito usado">
          {m.creditoUsado > 0 ? formatARS(m.creditoUsado) : <span className="text-fg-subtle">—</span>}
        </FilaMetrica>
      </Grupo>
      <Grupo title="Resultado">
        {mostrarCostos && (
          <>
            <FilaMetrica label="Costo">{formatARS(m.costoTotal)}</FilaMetrica>
            <FilaMetrica label="Ganancia bruta">
              {m.tieneCostos
                ? <span className="text-success-soft-fg font-semibold">{formatARS(m.gananciaBruta)}</span>
                : <span className="text-fg-subtle text-xs">sin costo</span>}
            </FilaMetrica>
            <FilaMetrica label="Margen">
              {m.tieneCostos && m.margenPct != null
                ? <MargenBadge pct={m.margenPct} />
                : <span className="text-fg-subtle">—</span>}
            </FilaMetrica>
          </>
        )}
        <FilaMetrica label="Egresos"><DashNeg value={m.egresosManuales} /></FilaMetrica>
        <FilaMetrica label="Comisiones">
          {m.comisiones > 0
            ? <span className="text-warning-soft-fg">−{formatARS(m.comisiones)}</span>
            : <span className="text-fg-subtle">—</span>}
        </FilaMetrica>
        <FilaMetrica label="Resultado neto">
          <ColorMonto value={m.resultadoNeto} className="font-semibold" />
        </FilaMetrica>
      </Grupo>
    </div>
  )
}
