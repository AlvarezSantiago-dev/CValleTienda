import { esStockInfinito } from '@/lib/stock/infinito'

interface AlertaStockBajoProps {
  stockActual: number
  stockMinimo: number
  className?: string
}

export function AlertaStockBajo({
  stockActual,
  stockMinimo,
  className = '',
}: AlertaStockBajoProps) {
  if (esStockInfinito(stockActual)) return null
  if (stockMinimo <= 0) return null
  if (stockActual > stockMinimo) return null

  const sinStock = stockActual === 0
  const cls = sinStock
    ? 'bg-red-50 text-red-600 border border-red-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200'
  const dot = sinStock ? 'bg-red-500' : 'bg-amber-500'
  const label = sinStock ? 'Sin stock' : 'Bajo stock'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cls} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
