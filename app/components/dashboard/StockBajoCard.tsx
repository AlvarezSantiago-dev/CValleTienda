import Link from 'next/link'

interface StockBajoCardProps {
  cantidad: number
}

export function StockBajoCard({ cantidad }: StockBajoCardProps) {
  if (cantidad === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 h-full flex flex-col justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Stock OK
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-800">✓</p>
          <p className="mt-1 text-xs text-emerald-700">
            Todas las variantes tienen stock suficiente.
          </p>
        </div>
        <Link
          href="/stock"
          className="mt-3 text-xs font-medium text-emerald-700 hover:underline self-start"
        >
          Ver inventario →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 h-full flex flex-col justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
          Alerta de stock
        </p>
        <p className="mt-2 text-3xl font-bold text-amber-800">{cantidad}</p>
        <p className="mt-1 text-xs text-amber-700">
          {cantidad === 1
            ? 'ítem bajo stock mínimo'
            : 'ítems bajo stock mínimo'}
        </p>
      </div>
      <Link
        href="/stock?bajo=1"
        className="mt-3 inline-flex items-center justify-center h-9 px-3 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 self-start"
      >
        Ver detalle →
      </Link>
    </div>
  )
}
