import Link from 'next/link'
import { mesToAnioMes } from '@/lib/reportes/parse-params'
import {
  obtenerMovimientosStockMes,
  obtenerStockResumen,
  obtenerTopIngresosMes,
} from '@/lib/reportes/queries-stock'
import { formatNumber } from '@/lib/format'
import { ReportesKpiStrip } from '../ReportesKpiStrip'
import { BarChart } from '../charts/BarChart'
import { ChartEmpty } from '../charts/ChartEmpty'

const TIPO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
}

interface StockTabProps {
  mes: string
}

export async function StockTab({ mes }: StockTabProps) {
  const { anio, mes: mesNum } = mesToAnioMes(mes)

  const [resumen, movimientos, topIngresos] = await Promise.all([
    obtenerStockResumen(),
    obtenerMovimientosStockMes(anio, mesNum),
    obtenerTopIngresosMes(anio, mesNum),
  ])

  const sinCostos = resumen.valorInventario === 0 && resumen.totalVariantes > 0

  const kpis = [
    { label: 'Valor inventario', valorNumero: resumen.valorInventario, destacar: true },
    { label: 'Variantes activas', valor: formatNumber(resumen.totalVariantes) },
    { label: 'Bajo stock', valor: formatNumber(resumen.bajoStock) },
    { label: 'Sin stock', valor: formatNumber(resumen.sinStock) },
  ]

  const movChart = movimientos.map((m) => ({
    label: TIPO_LABEL[m.tipo] ?? m.tipo,
    value: m.cantidadTotal,
  }))

  return (
    <div className="space-y-6 min-w-0">
      {sinCostos && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] px-4 py-3">
          <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700">
            El valor de inventario es $0 porque no hay precios de costo cargados.
            {' '}
            <Link href="/productos" className="font-semibold underline">Cargar en Productos →</Link>
          </p>
        </div>
      )}

      <ReportesKpiStrip items={kpis} />

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs p-4 min-w-0">
        <h3 className="text-sm font-semibold text-fg mb-4">Movimientos del mes (unidades)</h3>
        {movChart.length === 0 ? (
          <ChartEmpty message="Sin movimientos de stock en el mes seleccionado." />
        ) : (
          <BarChart
            data={movChart}
            ariaLabel="Movimientos de stock por tipo"
            formatValue={(n) => formatNumber(n)}
            formatTooltip={(d) => `${d.label}: ${formatNumber(d.value)} u.`}
          />
        )}
      </div>

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-fg">Top ingresos de mercadería</h3>
        </div>
        {topIngresos.length === 0 ? (
          <div className="py-12 text-center">
            <ChartEmpty message="Sin ingresos de mercadería en el mes." />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b border-border-subtle">
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-fg-muted uppercase">Producto</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-fg-muted uppercase">Cantidad</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-fg-muted uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {topIngresos.map((row, i) => (
                <tr key={i} className="border-b border-border-subtle">
                  <td className="px-4 py-2.5 text-sm text-fg">{row.productoNombre}</td>
                  <td className="px-4 py-2.5 text-sm text-right tabular-nums">{formatNumber(row.cantidad)}</td>
                  <td className="px-4 py-2.5 text-sm text-right text-fg-muted">{row.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
