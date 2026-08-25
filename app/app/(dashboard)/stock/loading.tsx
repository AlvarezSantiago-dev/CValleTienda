export default function StockLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-surface-sunken rounded-[var(--radius-md)]" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-sunken rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <div className="h-24 bg-surface-sunken rounded-[var(--radius-lg)]" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface-sunken rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  )
}
