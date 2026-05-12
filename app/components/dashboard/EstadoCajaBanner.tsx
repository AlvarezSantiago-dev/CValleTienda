import Link from 'next/link'
import type { SesionConTotales } from '@/lib/caja/queries'
import { formatARS } from '@/lib/format'

interface EstadoCajaBannerProps {
  sesion: SesionConTotales | null
}

export function EstadoCajaBanner({ sesion }: EstadoCajaBannerProps) {
  if (sesion) {
    const hora = new Date(sesion.fecha_apertura).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-emerald-900">
            Caja abierta desde {hora}
          </span>
        </div>
        <span className="text-xs text-emerald-800">
          {sesion.total_ventas_cantidad}{' '}
          {sesion.total_ventas_cantidad === 1 ? 'venta' : 'ventas'} ·{' '}
          {formatARS(sesion.total_ventas_monto)}
        </span>
        <Link
          href="/caja"
          className="ml-auto text-xs font-medium text-emerald-700 hover:underline"
        >
          Ver caja →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-sm font-medium text-amber-900">
          Caja cerrada
        </span>
      </div>
      <span className="text-xs text-amber-800">
        Abrí la caja para empezar a registrar ventas.
      </span>
      <Link
        href="/caja"
        className="ml-auto inline-flex items-center justify-center h-8 px-3 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
      >
        Abrir caja
      </Link>
    </div>
  )
}
