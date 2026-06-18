import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { obtenerReporteHistorico } from '@/lib/reportes/queries'
import { parseMeses } from '@/lib/reportes/parse-params'
import { TablaPLMensual } from '@/components/reportes/finanzas/TablaPLMensual'

interface PageProps {
  searchParams: Promise<{ meses?: string }>
}

export default async function ReportesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const meses = parseMeses(sp.meses)

  const { filas, totales } = await obtenerReporteHistorico(meses)
  const mostrarCostos = filas.some((f) => f.tieneCostos)
  const exportUrl = `/api/reportes/export?meses=${meses}`

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 min-w-0">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
            <p className="text-sm text-gray-500 mt-1">Historial financiero mensual</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/graficos?meses=${meses}`}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:border-lime-400 hover:text-lime-700 transition-colors"
            >
              Ver gráficos
            </Link>
            <a
              href={exportUrl}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:border-lime-400 hover:text-lime-700 transition-colors"
            >
              Exportar CSV
            </a>
          </div>
        </div>

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

        <TablaPLMensual filas={filas} totales={totales} mostrarCostos={mostrarCostos} />
      </div>
    </div>
  )
}
