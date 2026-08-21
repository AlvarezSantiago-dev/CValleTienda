import { Card } from '@/components/ui/Card'

function Block() {
  return (
    <Card padding="none" className="overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="h-4 w-32 rounded-md bg-surface-sunken animate-pulse" />
      </div>
      <div className="p-5 space-y-3">
        <div className="h-3 w-full rounded-md bg-surface-sunken animate-pulse" />
        <div className="h-3 w-4/5 rounded-md bg-surface-sunken animate-pulse" />
        <div className="h-3 w-3/5 rounded-md bg-surface-sunken animate-pulse" />
      </div>
    </Card>
  )
}

export function DashboardSecundarioSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Block />
        <Block />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Block />
        <Block />
      </div>
    </div>
  )
}
