import Link from 'next/link'
import type { FilaMesReporte, TotalesReporte } from '@/lib/reportes/queries'
import { formatARS } from '@/lib/format'
import { TablaPLMensualMobile } from './TablaPLMensualMobile'

function ColorMonto({
  value,
  positiveClass = 'text-success-soft-fg',
  negativeClass = 'text-danger-soft-fg',
  className = '',
}: {
  value: number
  positiveClass?: string
  negativeClass?: string
  className?: string
}) {
  return (
    <span className={`${value < 0 ? negativeClass : positiveClass} ${className}`}>
      {value < 0 ? `−${formatARS(Math.abs(value))}` : formatARS(value)}
    </span>
  )
}

function Celda({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-[12px] sm:text-[13px] ${className}`}>{children}</td>
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

function FilaReporte({ f, mostrarCostos }: { f: FilaMesReporte; mostrarCostos: boolean }) {
  return (
    <tr className="border-b border-border-subtle hover:bg-surface-sunken transition-colors">
      <Celda className="font-medium text-fg whitespace-nowrap">{f.mesLabel}</Celda>
      <Celda className="text-right text-fg-muted tabular-nums">{f.cantidadVentas}</Celda>
      <Celda className="text-right text-fg tabular-nums">{formatARS(f.ventasBrutas)}</Celda>
      <Celda className="text-right tabular-nums">
        {f.devoluciones > 0
          ? <span className="text-danger-soft-fg">−{formatARS(f.devoluciones)}</span>
          : <span className="text-fg-subtle">—</span>
        }
      </Celda>
      <Celda className="text-right font-semibold text-fg tabular-nums">{formatARS(f.ventasNetas)}</Celda>

      {mostrarCostos ? (
        <>
          <Celda className="text-right text-fg-muted tabular-nums">{formatARS(f.costoTotal)}</Celda>
          <Celda className="text-right tabular-nums">
            {f.tieneCostos
              ? <span className="text-success-soft-fg font-semibold">{formatARS(f.gananciaBruta)}</span>
              : <span className="text-fg-subtle text-xs">sin costo</span>
            }
          </Celda>
          <Celda className="text-right tabular-nums">
            {f.tieneCostos && f.margenPct != null
              ? <MargenBadge pct={f.margenPct} />
              : <span className="text-fg-subtle text-xs">—</span>
            }
          </Celda>
        </>
      ) : null}

      <Celda className="text-right tabular-nums">
        {f.egresosManuales > 0
          ? <span className="text-danger-soft-fg">−{formatARS(f.egresosManuales)}</span>
          : <span className="text-fg-subtle">—</span>
        }
      </Celda>
      <Celda className="text-right tabular-nums">
        {f.comisiones > 0
          ? <span className="text-amber-600">−{formatARS(f.comisiones)}</span>
          : <span className="text-fg-subtle">—</span>
        }
      </Celda>
      <Celda className="text-right tabular-nums">
        <ColorMonto value={f.resultadoNeto} className="font-semibold" />
      </Celda>
    </tr>
  )
}

function FilaTotales({ t, mostrarCostos }: { t: TotalesReporte; mostrarCostos: boolean }) {
  return (
    <tr className="bg-surface-sunken font-semibold border-t-2 border-border-default">
      <td className="px-3 py-3 text-[13px] text-fg uppercase tracking-wide text-xs">Total</td>
      <td className="px-3 py-3 text-right text-[13px] text-fg tabular-nums">{t.cantidadVentas}</td>
      <td className="px-3 py-3 text-right text-[13px] text-fg tabular-nums">{formatARS(t.ventasBrutas)}</td>
      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        {t.devoluciones > 0
          ? <span className="text-danger-soft-fg">−{formatARS(t.devoluciones)}</span>
          : <span className="text-fg-subtle">—</span>
        }
      </td>
      <td className="px-3 py-3 text-right text-[13px] text-fg tabular-nums">{formatARS(t.ventasNetas)}</td>

      {mostrarCostos ? (
        <>
          <td className="px-3 py-3 text-right text-[13px] text-fg-muted tabular-nums">{formatARS(t.costoTotal)}</td>
          <td className="px-3 py-3 text-right text-[13px] text-success-soft-fg tabular-nums">{formatARS(t.gananciaBruta)}</td>
          <td className="px-3 py-3 text-right text-[13px] tabular-nums">
            {t.margenPct != null ? <MargenBadge pct={t.margenPct} /> : <span className="text-fg-subtle">—</span>}
          </td>
        </>
      ) : null}

      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        {t.egresosManuales > 0
          ? <span className="text-danger-soft-fg">−{formatARS(t.egresosManuales)}</span>
          : <span className="text-fg-subtle">—</span>
        }
      </td>
      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        {t.comisiones > 0
          ? <span className="text-amber-600">−{formatARS(t.comisiones)}</span>
          : <span className="text-fg-subtle">—</span>
        }
      </td>
      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        <ColorMonto value={t.resultadoNeto} className="font-bold" />
      </td>
    </tr>
  )
}

interface TablaPLMensualProps {
  filas: FilaMesReporte[]
  totales: TotalesReporte
  mostrarCostos: boolean
}

export function TablaPLMensual({ filas, totales, mostrarCostos }: TablaPLMensualProps) {
  if (filas.length === 0) {
    return (
      <div className="bg-surface border border-dashed border-border-default rounded-[var(--radius-lg)] py-16 text-center">
        <p className="text-fg-subtle text-sm">Sin ventas en el período seleccionado.</p>
      </div>
    )
  }

  return (
    <div>
      {!mostrarCostos && (
        <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] px-4 py-3">
          <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700">
            Las columnas de costo, ganancia bruta y margen no se muestran porque aún no cargaste precios de costo en tus productos.
            {' '}
            <Link href="/productos" className="font-semibold underline">Ir a Productos →</Link>
          </p>
        </div>
      )}

      <TablaPLMensualMobile filas={filas} mostrarCostos={mostrarCostos} />

      <div className="hidden sm:block bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b border-border-subtle">
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap">Mes</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Tickets</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap">Ventas brutas</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Devoluc.</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap">Ventas netas</th>
                {mostrarCostos && (
                  <>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Costo</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap">G. bruta</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Margen</th>
                  </>
                )}
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Egresos</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide">Comisiones</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap">Resultado neto</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <FilaReporte key={`${f.anio}-${f.mes}`} f={f} mostrarCostos={mostrarCostos} />
              ))}
            </tbody>
            <tfoot>
              <FilaTotales t={totales} mostrarCostos={mostrarCostos} />
            </tfoot>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-fg-subtle leading-relaxed">
        <strong>Devoluciones:</strong> reembolsos y saldo a favor del mes en que se registraron; no incluyen cambios de variante.
        {' '}&nbsp;·&nbsp; <strong>Egresos:</strong> retiros, pagos y gastos registrados manualmente en Caja (sin incluir devoluciones de ventas).
        {mostrarCostos && (
          <> &nbsp;·&nbsp; <strong>Ganancia bruta:</strong> margen de ventas menos mercadería devuelta (reembolso / saldo a favor), por línea de producto.</>
        )}
        {' '}&nbsp;·&nbsp; <strong>Resultado neto:</strong> ganancia bruta menos comisiones y egresos manuales del mes.
      </p>
    </div>
  )
}
