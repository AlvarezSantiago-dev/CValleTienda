import { ReportesSkeleton } from '@/components/reportes/ReportesSkeleton'

export default function GraficosLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="h-8 w-32 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
        </div>
        <ReportesSkeleton />
      </div>
    </div>
  )
}
