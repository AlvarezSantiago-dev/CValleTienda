import Link from 'next/link'
import type { DevolucionListItem } from '@/lib/devoluciones/queries'
import { formatARS } from '@/lib/format'

interface UltimasDevolucionesCardProps {
  items: DevolucionListItem[]
}

function tiempoRelativo(iso: string): string {
  const ahora = Date.now()
  const t = new Date(iso).getTime()
  const diffMin = Math.floor((ahora - t) / 60_000)
  if (diffMin < 1) return 'recién'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} d`
}

export function UltimasDevolucionesCard({ items }: UltimasDevolucionesCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-gray-900">Últimas devoluciones</h2>
        <Link
          href="/devoluciones"
          className="text-xs font-medium text-lime-700 hover:text-lime-800 hover:underline transition-colors"
        >
          Ver todas →
        </Link>
      </div>

      <ul className="divide-y divide-gray-50">
        {items.map((d) => (
          <li key={d.id}>
            <Link
              href={`/devoluciones/${d.id}`}
              className="flex items-center gap-3 px-5 py-2.5 group hover:bg-gray-50 transition-colors"
            >
              <span className="font-mono text-xs text-gray-400 w-14 shrink-0">
                #{d.numero_devolucion}
              </span>
              <span className="flex-1 truncate text-[13px] text-gray-600 group-hover:text-lime-700 transition-colors" title={d.motivo}>
                {d.motivo || <span className="text-gray-400">Sin motivo</span>}
              </span>
              <span className="text-xs text-gray-400 w-20 text-right shrink-0">
                {tiempoRelativo(d.created_at)}
              </span>
              <span className="text-[13px] font-semibold text-amber-700 w-28 text-right shrink-0 tabular-nums">
                {formatARS(d.total_devuelto)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
