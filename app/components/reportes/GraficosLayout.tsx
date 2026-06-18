import Link from 'next/link'
import { Suspense } from 'react'
import type { ReporteTab } from '@/lib/reportes/parse-params'
import { ultimosMesesISO } from '@/lib/reportes/parse-params'
import { GraficosMesSelector } from './GraficosMesSelector'

const TABS: { id: ReporteTab; label: string }[] = [
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'stock', label: 'Stock' },
  { id: 'operacion', label: 'Operación' },
]

function buildHref(tab: ReporteTab, meses: number, mes: string): string {
  return `/graficos?tab=${tab}&meses=${meses}&mes=${mes}`
}

interface GraficosLayoutProps {
  tab: ReporteTab
  meses: number
  mesSeleccionado: string
  children: React.ReactNode
}

export function GraficosLayout({ tab, meses, mesSeleccionado, children }: GraficosLayoutProps) {
  const opcionesMes = ultimosMesesISO(meses)
  const exportUrl = `/api/graficos/export?tab=${tab}&meses=${meses}&mes=${mesSeleccionado}`

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 min-w-0">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gráficos</h1>
            <p className="text-sm text-gray-500 mt-1">Visualización mensual del negocio</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/reportes?meses=${meses}`}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:border-lime-400 hover:text-lime-700 transition-colors"
            >
              Ver reportes
            </Link>
            <a
              href={exportUrl}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:border-lime-400 hover:text-lime-700 transition-colors"
            >
              Exportar CSV
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-gray-100 pb-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={buildHref(t.id, meses, mesSeleccionado)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-lime-600 text-lime-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Período:</span>
            {[3, 6, 12].map((n) => (
              <Link
                key={n}
                href={buildHref(tab, n, mesSeleccionado)}
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
          <Suspense fallback={null}>
            <GraficosMesSelector
              meses={meses}
              mesSeleccionado={mesSeleccionado}
              opciones={opcionesMes}
            />
          </Suspense>
        </div>

        {children}
      </div>
    </div>
  )
}
