import type { FilaMesReporte } from '@/lib/reportes/queries'
import { filasParaGraficos, mesLabelCortoFromFila } from '@/lib/reportes/queries-finanzas'
import { BarChart } from '../charts/BarChart'

interface GraficoVentasNetasProps {
  filas: FilaMesReporte[]
  mesSeleccionado: string
}

export function GraficoVentasNetas({ filas, mesSeleccionado }: GraficoVentasNetasProps) {
  const [selAnio, selMes] = mesSeleccionado.split('-').map(Number)
  const data = filasParaGraficos(filas).map((f) => ({
    label: mesLabelCortoFromFila(f),
    value: f.ventasNetas,
    highlight: f.anio === selAnio && f.mes === selMes,
  }))

  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs p-4 min-w-0">
      <h3 className="text-sm font-semibold text-fg mb-4">Ventas netas mensuales</h3>
      <BarChart data={data} ariaLabel="Ventas netas por mes" />
    </div>
  )
}
