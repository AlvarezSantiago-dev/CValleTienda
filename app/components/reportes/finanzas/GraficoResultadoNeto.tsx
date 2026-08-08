import type { FilaMesReporte } from '@/lib/reportes/queries'
import { filasParaGraficos, mesLabelCortoFromFila } from '@/lib/reportes/queries-finanzas'
import { LineChart } from '../charts/LineChart'

interface GraficoResultadoNetoProps {
  filas: FilaMesReporte[]
}

export function GraficoResultadoNeto({ filas }: GraficoResultadoNetoProps) {
  const data = filasParaGraficos(filas).map((f) => ({
    label: mesLabelCortoFromFila(f),
    value: f.resultadoNeto,
  }))

  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs p-4 min-w-0">
      <h3 className="text-sm font-semibold text-fg mb-4">Resultado neto mensual</h3>
      <LineChart data={data} ariaLabel="Resultado neto por mes" allowNegative />
    </div>
  )
}
