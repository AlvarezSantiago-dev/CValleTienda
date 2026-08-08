export default function ReportesLoading() {
  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <div className="h-8 w-32 bg-surface-sunken rounded-[var(--radius-md)] animate-pulse mb-2" />
        <div className="h-4 w-48 bg-surface-sunken rounded-[var(--radius-md)] animate-pulse" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-20 bg-surface-sunken rounded-[var(--radius-full)] animate-pulse" />
        ))}
      </div>
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden">
        <div className="h-12 bg-surface-sunken animate-pulse" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 border-t border-border-subtle bg-surface-sunken/50 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
