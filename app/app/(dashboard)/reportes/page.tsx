import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { obtenerReporteHistorico, type FilaMesReporte, type TotalesReporte } from '@/lib/reportes/queries'
import { formatARS } from '@/lib/format'

interface PageProps {
  searchParams: Promise<{ meses?: string }>
}

function claseMes(val: number, actual: number) {
  return val === actual ? 'underline font-semibold' : ''
}

function ColorMonto({ value, positiveClass = 'text-green-600', negativeClass = 'text-red-500', className = '' }: { value: number; positiveClass?: string; negativeClass?: string; className?: string }) {
  return (
    <span className={`${value < 0 ? negativeClass : positiveClass} ${className}`}>
      {value < 0 ? `−${formatARS(Math.abs(value))}` : formatARS(value)}
    </span>
  )
}

function Celda({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-[13px] ${className}`}>{children}</td>
}

function FilaReporte({ f, mostrarCostos }: { f: FilaMesReporte; mostrarCostos: boolean }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <Celda className="font-medium text-gray-800 whitespace-nowrap">{f.mesLabel}</Celda>
      <Celda className="text-right text-gray-500 tabular-nums">{f.cantidadVentas}</Celda>
      <Celda className="text-right text-gray-700 tabular-nums">{formatARS(f.ventasBrutas)}</Celda>
      <Celda className="text-right tabular-nums">
        {f.devoluciones > 0
          ? <span className="text-red-400">−{formatARS(f.devoluciones)}</span>
          : <span className="text-gray-400">—</span>
        }
      </Celda>
      <Celda className="text-right font-semibold text-gray-900 tabular-nums">{formatARS(f.ventasNetas)}</Celda>

      {mostrarCostos ? (
        <>
          <Celda className="text-right text-gray-500 tabular-nums">{formatARS(f.costoTotal)}</Celda>
          <Celda className="text-right tabular-nums">
            {f.tieneCostos
              ? <span className="text-green-600 font-semibold">{formatARS(f.gananciaBruta)}</span>
              : <span className="text-gray-300 text-xs">sin costo</span>
            }
          </Celda>
          <Celda className="text-right tabular-nums">
            {f.tieneCostos && f.margenPct != null
              ? <MargenBadge pct={f.margenPct} />
              : <span className="text-gray-300 text-xs">—</span>
            }
          </Celda>
        </>
      ) : null}

      <Celda className="text-right tabular-nums">
        {f.egresosManuales > 0
          ? <span className="text-red-500">−{formatARS(f.egresosManuales)}</span>
          : <span className="text-gray-300">—</span>
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
    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
      <td className="px-3 py-3 text-[13px] text-gray-700 uppercase tracking-wide text-xs">Total</td>
      <td className="px-3 py-3 text-right text-[13px] text-gray-700 tabular-nums">{t.cantidadVentas}</td>
      <td className="px-3 py-3 text-right text-[13px] text-gray-700 tabular-nums">{formatARS(t.ventasBrutas)}</td>
      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        {t.devoluciones > 0
          ? <span className="text-red-400">−{formatARS(t.devoluciones)}</span>
          : <span className="text-gray-400">—</span>
        }
      </td>
      <td className="px-3 py-3 text-right text-[13px] text-gray-900 tabular-nums">{formatARS(t.ventasNetas)}</td>

      {mostrarCostos ? (
        <>
          <td className="px-3 py-3 text-right text-[13px] text-gray-500 tabular-nums">{formatARS(t.costoTotal)}</td>
          <td className="px-3 py-3 text-right text-[13px] text-green-600 tabular-nums">{formatARS(t.gananciaBruta)}</td>
          <td className="px-3 py-3 text-right text-[13px] tabular-nums">
            {t.margenPct != null ? <MargenBadge pct={t.margenPct} /> : <span className="text-gray-300">—</span>}
          </td>
        </>
      ) : null}

      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        {t.egresosManuales > 0
          ? <span className="text-red-500">−{formatARS(t.egresosManuales)}</span>
          : <span className="text-gray-300">—</span>
        }
      </td>
      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        <ColorMonto value={t.resultadoNeto} className="font-bold" />
      </td>
    </tr>
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

export default async function ReportesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const mesesParam = Number(sp.meses ?? '12')
  const meses = [3, 6, 12].includes(mesesParam) ? mesesParam : 12

  const { filas, totales } = await obtenerReporteHistorico(meses)
  const mostrarCostos = filas.some(f => f.tieneCostos)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Historial financiero mensual</p>
        </div>

        {/* Selector de período */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-gray-500 font-medium mr-1">Período:</span>
          {[3, 6, 12].map((n) => (
            <Link
              key={n}
              href={`/reportes?meses=${n}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                meses === n
                  ? 'bg-lime-600 text-white border-lime-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-lime-400 hover:text-lime-700'
              }`}
            >
              {n} meses
            </Link>
          ))}
        </div>

        {/* Nota costos */}
        {!mostrarCostos && (
          <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-700">
              Las columnas de costo, ganancia bruta y margen no se muestran porque aún no cargaste precios de costo en tus productos.
              {' '}
              <Link href="/productos" className="font-semibold underline">Ir a Productos →</Link>
            </p>
          </div>
        )}

        {/* Tabla */}
        {filas.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
            <p className="text-gray-400 text-sm">Sin ventas en el período seleccionado.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Mes</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tickets</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Ventas brutas</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Devoluc.</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Ventas netas</th>
                    {mostrarCostos && (
                      <>
                        <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Costo</th>
                        <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">G. bruta</th>
                        <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Margen</th>
                      </>
                    )}
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Egresos</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Resultado neto</th>
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
        )}

        {/* Leyenda */}
        <p className="mt-4 text-xs text-gray-400 leading-relaxed">
          <strong>Egresos:</strong> retiros, pagos y gastos registrados manualmente en Caja (sin incluir devoluciones de ventas).
          {mostrarCostos && (
            <> &nbsp;·&nbsp; <strong>Ganancia bruta:</strong> diferencia entre precio de venta y precio de costo de los productos vendidos.</>
          )}
          {' '}&nbsp;·&nbsp; <strong>Resultado neto:</strong> ganancia bruta menos comisiones y egresos manuales del mes.
        </p>

      </div>
    </div>
  )
}
