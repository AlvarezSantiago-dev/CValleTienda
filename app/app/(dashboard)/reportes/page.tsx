import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { obtenerReporteHistorico } from '@/lib/reportes/queries'
import { parseMeses } from '@/lib/reportes/parse-params'
import { TablaPLMensual } from '@/components/reportes/finanzas/TablaPLMensual'
import { PageHeader } from '@/components/ui/PageHeader'

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

  const btnGhost =
    'inline-flex items-center justify-center h-9 px-3 rounded-[var(--radius-md)] text-xs font-medium border border-border-default text-fg hover:border-primary-border hover:text-fg-brand transition-colors'

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        className="mb-0"
        title="Reportes"
        description="P&L de mercadería mes a mes. El crédito usado no anula la devolución; el disponible de las cuentas está en Inicio y Caja."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/graficos?meses=${meses}`} className={btnGhost}>
              Ver gráficos
            </Link>
            <a href={exportUrl} className={btnGhost}>
              Exportar CSV
            </a>
          </div>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-fg-muted font-medium mr-1">Período:</span>
        {[3, 6, 12].map((n) => (
          <Link
            key={n}
            href={`/reportes?meses=${n}`}
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

      <TablaPLMensual filas={filas} totales={totales} mostrarCostos={mostrarCostos} />
    </div>
  )
}
