import { obtenerReporteHistorico } from '@/lib/reportes/queries'
import {
  deltaPct,
  filaMesAnterior,
  filaPorMesISO,
  filasParaGraficos,
  mesLabelCortoFromFila,
} from '@/lib/reportes/queries-finanzas'
import { CHART_COLORS } from '@/lib/reportes/format-chart'
import { ReportesKpiStrip } from '../ReportesKpiStrip'
import { StackedBarChart } from '../charts/StackedBarChart'
import { GraficoVentasNetas } from './GraficoVentasNetas'
import { GraficoResultadoNeto } from './GraficoResultadoNeto'

interface FinanzasTabProps {
  meses: number
  mes: string
}

export async function FinanzasTab({ meses, mes }: FinanzasTabProps) {
  const { filas } = await obtenerReporteHistorico(meses)
  const mostrarCostos = filas.some((f) => f.tieneCostos)
  const actual = filaPorMesISO(filas, mes)
  const anterior = filaMesAnterior(filas, mes)

  const kpis = actual
    ? [
        {
          label: 'Ventas netas',
          valorNumero: actual.ventasNetas,
          delta: deltaPct(actual.ventasNetas, anterior?.ventasNetas ?? 0),
          sub: 'vs mes anterior',
        },
        {
          label: 'Ganancia bruta',
          ...(mostrarCostos && actual.tieneCostos
            ? {
                valorNumero: actual.gananciaBruta,
                delta: deltaPct(actual.gananciaBruta, anterior?.gananciaBruta ?? 0),
              }
            : { valor: '—' }),
          sub: 'vs mes anterior',
        },
        {
          label: 'Margen',
          valor: actual.margenPct != null ? `${actual.margenPct}%` : '—',
          delta:
            actual.margenPct != null && anterior?.margenPct != null
              ? deltaPct(actual.margenPct, anterior.margenPct)
              : undefined,
          sub: 'vs mes anterior',
        },
        {
          label: 'Comisiones',
          valorNumero: actual.comisiones,
          delta: deltaPct(actual.comisiones, anterior?.comisiones ?? 0),
          sub: 'vs mes anterior',
        },
        {
          label: 'Egresos',
          valorNumero: actual.egresosManuales,
          delta: deltaPct(actual.egresosManuales, anterior?.egresosManuales ?? 0),
          sub: 'vs mes anterior',
        },
        {
          label: 'Resultado neto',
          valorNumero: actual.resultadoNeto,
          delta: deltaPct(actual.resultadoNeto, anterior?.resultadoNeto ?? 0),
          sub: 'vs mes anterior',
          destacar: true,
        },
      ]
    : []

  const composicion = filasParaGraficos(filas).map((f) => ({
    label: mesLabelCortoFromFila(f),
    segments: [
      { name: 'Resultado neto', value: Math.max(0, f.resultadoNeto), color: CHART_COLORS.primary },
      { name: 'Comisiones', value: f.comisiones, color: CHART_COLORS.amber },
      { name: 'Egresos', value: f.egresosManuales, color: CHART_COLORS.negative },
    ],
  }))

  return (
    <div className="space-y-6 min-w-0">
      {kpis.length > 0 && <ReportesKpiStrip items={kpis} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        <div className="min-w-0">
          <GraficoVentasNetas filas={filas} mesSeleccionado={mes} />
        </div>
        <div className="min-w-0">
          <GraficoResultadoNeto filas={filas} />
        </div>
      </div>

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs p-4 min-w-0">
        <h3 className="text-sm font-semibold text-fg mb-4">Composición del resultado</h3>
        <p className="text-xs text-fg-muted mb-3">
          Cómo se distribuye la ganancia bruta entre resultado neto, comisiones y egresos.
        </p>
        <StackedBarChart data={composicion} ariaLabel="Composición del resultado por mes" />
      </div>
    </div>
  )
}
