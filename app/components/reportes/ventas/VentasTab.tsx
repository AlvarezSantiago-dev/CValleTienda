import { mesToAnioMes } from '@/lib/reportes/parse-params'
import {
  obtenerKpisVentasMes,
  obtenerMixPagosMes,
  obtenerTasaDevolucionesMes,
  obtenerTopProductosMes,
  obtenerTopVar1Mes,
} from '@/lib/reportes/queries-ventas'
import { formatNumber } from '@/lib/format'
import { ReportesKpiStrip } from '../ReportesKpiStrip'
import { HorizontalBarChart } from '../charts/HorizontalBarChart'
import { DonutChart } from '../charts/DonutChart'
import { ChartEmpty } from '../charts/ChartEmpty'

interface VentasTabProps {
  mes: string
  labelVar1: string
  usarVar1: boolean
  usarDevoluciones: boolean
}

export async function VentasTab({ mes, labelVar1, usarVar1, usarDevoluciones }: VentasTabProps) {
  const { anio, mes: mesNum } = mesToAnioMes(mes)

  const [kpis, topProductos, topVar1, mixPagos, tasaDev] = await Promise.all([
    obtenerKpisVentasMes(anio, mesNum),
    obtenerTopProductosMes(anio, mesNum),
    usarVar1 ? obtenerTopVar1Mes(anio, mesNum) : Promise.resolve([]),
    obtenerMixPagosMes(anio, mesNum),
    usarDevoluciones ? obtenerTasaDevolucionesMes(anio, mesNum) : Promise.resolve(null),
  ])

  const kpiItems = [
    { label: 'Tickets', valor: formatNumber(kpis.cantidadVentas) },
    { label: 'Ticket promedio', valorNumero: kpis.ticketPromedio },
    { label: 'Unidades vendidas', valor: formatNumber(kpis.unidadesVendidas) },
    { label: 'Ventas netas', valorNumero: kpis.ventasNetas, destacar: true },
    ...(usarDevoluciones && tasaDev
      ? [{
          label: 'Tasa devoluciones',
          valor: tasaDev.tasaPct != null ? `${tasaDev.tasaPct}%` : '—',
        }]
      : []),
  ]

  const sinVentas = kpis.cantidadVentas === 0

  return (
    <div className="space-y-6 min-w-0">
      <ReportesKpiStrip items={kpiItems} />

      {sinVentas ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
          <ChartEmpty message="Sin ventas en el mes seleccionado." />
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">
            Top productos y unidades: montos de venta sin descontar devoluciones. Ventas netas y tasa de devoluciones sí las incluyen.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] p-4 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Top 10 productos</h3>
              <HorizontalBarChart
                data={topProductos.map((p) => ({
                  label: p.nombre,
                  value: p.monto,
                  sub: `${p.cantidad} u.`,
                }))}
                ariaLabel="Top productos del mes"
              />
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] p-4 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Mix de métodos de pago</h3>
              <DonutChart
                data={mixPagos.map((m) => ({ label: m.metodoNombre, value: m.monto }))}
                ariaLabel="Mix de métodos de pago"
              />
            </div>
          </div>

          {usarVar1 && topVar1.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] p-4 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Top {labelVar1}</h3>
              <HorizontalBarChart
                data={topVar1.map((v) => ({
                  label: v.valor,
                  value: v.cantidad,
                  sub: `${formatNumber(v.monto)} ARS`,
                }))}
                ariaLabel={`Top ${labelVar1} del mes`}
                formatValue={(n) => `${formatNumber(n)} u.`}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
