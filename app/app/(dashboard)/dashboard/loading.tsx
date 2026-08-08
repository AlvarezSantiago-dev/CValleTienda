import { KpiCardSkeleton, Skeleton, CardSkeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Cargando inicio">
      <div>
        <Skeleton height={32} className="w-36 mb-2" />
        <Skeleton variant="text" className="w-56" />
      </div>

      <Skeleton height={52} className="w-full rounded-[var(--radius-lg)]" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      <CardSkeleton height={72} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CardSkeleton height={300} />
        </div>
        <CardSkeleton height={300} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardSkeleton height={240} />
        <CardSkeleton height={240} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardSkeleton height={220} />
        <CardSkeleton height={220} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
      </div>
    </div>
  )
}
