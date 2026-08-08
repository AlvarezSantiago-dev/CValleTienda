import Link from 'next/link'
import { Suspense } from 'react'
import type { ReporteTab } from '@/lib/reportes/parse-params'
import { ultimosMesesISO } from '@/lib/reportes/parse-params'
import { GraficosMesSelector } from './GraficosMesSelector'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'

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

  const btnGhost =
    'inline-flex items-center justify-center h-9 px-3 rounded-[var(--radius-md)] text-xs font-medium border border-border-default text-fg hover:border-primary-border hover:text-fg-brand transition-colors'

  const tabItems = TABS.map((t) => ({
    href: buildHref(t.id, meses, mesSeleccionado),
    label: t.label,
    exact: true as const,
    matchKeys: ['tab'] as string[],
  }))

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        className="mb-0"
        title="Gráficos"
        description="Visualización mensual del negocio"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/reportes?meses=${meses}`} className={btnGhost}>
              Ver reportes
            </Link>
            <a href={exportUrl} className={btnGhost}>
              Exportar CSV
            </a>
          </div>
        }
      />

      <Suspense fallback={<div className="h-10 border-b border-border-default" />}>
        <Tabs items={tabItems} variant="underline" />
      </Suspense>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-fg-muted font-medium">Período:</span>
          {[3, 6, 12].map((n) => (
            <Link
              key={n}
              href={buildHref(tab, n, mesSeleccionado)}
              className={`px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-medium border transition-colors ${
                meses === n
                  ? 'bg-primary text-primary-fg border-primary'
                  : 'bg-surface text-fg-muted border-border-default hover:border-primary-border hover:text-fg-brand'
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
  )
}
