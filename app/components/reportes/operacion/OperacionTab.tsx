import { mesToAnioMes } from '@/lib/reportes/parse-params'
import {
  obtenerComparacionMes,
  obtenerRemitosPendientesResumen,
  obtenerVentasPorVendedorMes,
} from '@/lib/reportes/queries-operacion'
import { filaPorMesISO } from '@/lib/reportes/queries-finanzas'
import { obtenerReporteHistorico } from '@/lib/reportes/queries'
import { formatARSKpi, formatARSTooltip } from '@/lib/reportes/format-kpi'
import { formatNumber } from '@/lib/format'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { HorizontalBarChart } from '../charts/HorizontalBarChart'
import { ChartEmpty } from '../charts/ChartEmpty'

interface OperacionTabProps {
  mes: string
  usarRemitos: boolean
}

function deltaLabel(delta: number | null): string | undefined {
  if (delta == null) return 'sin mes anterior'
  return 'vs mes anterior'
}

function kpiMontoCard(label: string, n: number, extra?: { delta?: number | null; sub?: string; destacar?: boolean }) {
  return (
    <KpiCard
      label={label}
      valor={formatARSKpi(n)}
      valorCompleto={formatARSTooltip(n)}
      delta={extra?.delta}
      sub={extra?.sub}
      destacar={extra?.destacar}
    />
  )
}

export async function OperacionTab({ mes, usarRemitos }: OperacionTabProps) {
  const { anio, mes: mesNum } = mesToAnioMes(mes)

  const [vendedores, comparacion, remitos, { filas }] = await Promise.all([
    obtenerVentasPorVendedorMes(anio, mesNum),
    obtenerComparacionMes(mes),
    usarRemitos ? obtenerRemitosPendientesResumen() : Promise.resolve(null),
    obtenerReporteHistorico(12),
  ])

  const filaActual = filaPorMesISO(filas, mes)

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
        {kpiMontoCard('Ventas netas', comparacion.ventasNetas.actual, {
          delta: comparacion.ventasNetas.deltaPct,
          sub: deltaLabel(comparacion.ventasNetas.deltaPct),
        })}
        <KpiCard
          label="Tickets"
          valor={formatNumber(comparacion.tickets.actual)}
          delta={comparacion.tickets.deltaPct}
          sub={deltaLabel(comparacion.tickets.deltaPct)}
        />
        {kpiMontoCard('Resultado neto', comparacion.resultadoNeto.actual, {
          delta: comparacion.resultadoNeto.deltaPct,
          sub: deltaLabel(comparacion.resultadoNeto.deltaPct),
          destacar: true,
        })}
      </div>

      {filaActual && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
          {kpiMontoCard('Comisiones del mes', filaActual.comisiones)}
          {usarRemitos && remitos && kpiMontoCard('Remitos pendientes de cobro', remitos.totalDeuda, {
            sub: `${remitos.cantidad} remito${remitos.cantidad === 1 ? '' : 's'}`,
          })}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] p-4 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Ventas por vendedor</h3>
        {vendedores.length === 0 ? (
          <ChartEmpty message="Sin ventas con vendedor asignado en el mes." />
        ) : (
          <HorizontalBarChart
            data={vendedores.map((v) => ({
              label: v.vendedorNombre,
              value: v.monto,
              sub: `${v.cantidad} tickets`,
            }))}
            ariaLabel="Ventas por vendedor"
          />
        )}
      </div>
    </div>
  )
}
