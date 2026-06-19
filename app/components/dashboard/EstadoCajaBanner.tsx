'use client'

import type { SesionAbiertaLite } from '@/lib/caja/types'
import type { KpisDia } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { TIENDA_TZ } from '@/lib/datetime'
import Link from 'next/link'

interface EstadoCajaBannerProps {
  sesion: SesionAbiertaLite | null
  kpisDia: KpisDia
}

function horaApertura(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIENDA_TZ,
  })
}

export function EstadoCajaBanner({ sesion, kpisDia }: EstadoCajaBannerProps) {
  const hoyCant = kpisDia.hoy.cantidad
  const hoyMonto = kpisDia.hoy.monto
  const resumenDia =
    hoyCant > 0
      ? `Hoy en total: ${hoyCant} ${hoyCant === 1 ? 'venta' : 'ventas'} · ${formatARS(hoyMonto)}`
      : null

  if (sesion) {
    const hora = horaApertura(sesion.fecha_apertura)
    const turnoDistintoDelDia =
      sesion.total_ventas_cantidad !== hoyCant || sesion.total_ventas_monto !== hoyMonto

    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-900">
              Turno actual · caja abierta desde {hora}
            </span>
          </div>
          <span className="text-xs text-emerald-800">
            Este turno: {sesion.total_ventas_cantidad}{' '}
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
        {turnoDistintoDelDia && resumenDia && (
          <p className="text-xs text-emerald-700/90 pl-4">
            {resumenDia}
            <span className="text-emerald-600/80"> · calendario, todos los turnos</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm font-medium text-amber-900">Caja cerrada</span>
        </div>
        {hoyCant > 0 ? (
          <span className="text-xs text-amber-800">
            Hoy se registraron {hoyCant} {hoyCant === 1 ? 'venta' : 'ventas'} ({formatARS(hoyMonto)}).
            Abrí la caja para seguir vendiendo.
          </span>
        ) : (
          <span className="text-xs text-amber-800">
            Abrí la caja para empezar a registrar ventas.
          </span>
        )}
        <Link
          href="/caja"
          className="ml-auto inline-flex items-center justify-center h-8 px-3 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
        >
          Abrir caja
        </Link>
      </div>
    </div>
  )
}
