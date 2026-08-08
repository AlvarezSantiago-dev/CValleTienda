import { Badge } from '@/components/ui/Badge'
import { esStockInfinito } from '@/lib/stock/infinito'
import { cn } from '@/components/ui/cn'

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

  return (
    <Badge variant={sinStock ? 'danger' : 'warning'} className={cn(className)}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          sinStock ? 'bg-danger' : 'bg-warning'
        )}
        aria-hidden
      />
      {sinStock ? 'Sin stock' : 'Bajo stock'}
    </Badge>
  )
}
