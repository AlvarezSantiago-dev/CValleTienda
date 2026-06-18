import { KpiCardSkeleton, Skeleton, CardSkeleton } from '@/components/ui/Skeleton'

export function ReportesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={36} className="w-24" />
        ))}
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={32} className="w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardSkeleton height={280} />
        <CardSkeleton height={280} />
      </div>
      <CardSkeleton height={320} />
      <CardSkeleton height={400} />
    </div>
  )
}
