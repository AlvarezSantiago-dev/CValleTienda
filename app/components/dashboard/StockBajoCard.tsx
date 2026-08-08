import Link from 'next/link'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface StockBajoCardProps {
  cantidad: number
}

export function StockBajoCard({ cantidad }: StockBajoCardProps) {
  if (cantidad === 0) {
    return (
      <div className="bg-success-soft border border-success-border rounded-[var(--radius-lg)] p-5 h-full flex flex-col justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-success-soft-fg">
            Stock OK
          </p>
          <CheckCircle2 size={28} className="mt-2 text-success" aria-hidden />
          <p className="mt-2 text-xs text-success-soft-fg/90">
            Todas las variantes tienen stock suficiente.
          </p>
        </div>
        <Link
          href="/stock"
          className="mt-3 text-xs font-medium text-success-soft-fg hover:underline self-start focus-ring rounded-[var(--radius-sm)]"
        >
          Ver inventario →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-warning-soft border border-warning-border rounded-[var(--radius-lg)] p-5 h-full flex flex-col justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-warning-soft-fg flex items-center gap-1.5">
          <AlertTriangle size={13} aria-hidden />
          Alerta de stock
        </p>
        <p className="mt-2 text-3xl font-bold text-warning-soft-fg tabular-nums">{cantidad}</p>
        <p className="mt-1 text-xs text-warning-soft-fg/90">
          {cantidad === 1 ? 'ítem bajo stock mínimo' : 'ítems bajo stock mínimo'}
        </p>
      </div>
      <Link
        href="/stock?bajo=1"
        className="mt-3 inline-flex items-center justify-center h-control-sm px-3 rounded-[var(--radius-md)] bg-warning-hover text-fg-inverse text-xs font-medium hover:bg-warning-soft-fg transition-colors duration-(--duration-fast) self-start focus-ring"
      >
        Ver detalle →
      </Link>
    </div>
  )
}
