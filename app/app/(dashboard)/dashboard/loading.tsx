import { KpiCardSkeleton, Skeleton, CardSkeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <Skeleton height={28} className="w-28 mb-2" />
        <Skeleton variant="text" className="w-48" />
      </div>

      {/* Fila KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart + StockBajo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CardSkeleton height={280} />
        </div>
        <CardSkeleton height={280} />
      </div>

      {/* Fila 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardSkeleton height={220} />
        <CardSkeleton height={220} />
        <CardSkeleton height={220} />
      </div>

      {/* Fila 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
      </div>
    </div>
  )
}
