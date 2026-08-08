import { ReportesSkeleton } from '@/components/reportes/ReportesSkeleton'

export default function GraficosLoading() {
  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <div className="h-8 w-32 bg-surface-sunken rounded-[var(--radius-md)] animate-pulse mb-2" />
        <div className="h-4 w-56 bg-surface-sunken rounded-[var(--radius-md)] animate-pulse" />
      </div>
      <ReportesSkeleton />
    </div>
  )
}
