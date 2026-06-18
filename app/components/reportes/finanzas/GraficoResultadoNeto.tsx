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
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] p-4 min-w-0">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Resultado neto mensual</h3>
      <LineChart data={data} ariaLabel="Resultado neto por mes" allowNegative />
    </div>
  )
}
