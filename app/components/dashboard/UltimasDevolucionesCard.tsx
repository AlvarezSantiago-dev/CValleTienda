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
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Últimas devoluciones
        </h2>
        <Link
          href="/devoluciones"
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Ver todas →
        </Link>
      </div>

      <ul className="divide-y divide-gray-100">
        {items.map((d) => (
          <li key={d.id} className="py-2 text-sm">
            <Link
              href={`/devoluciones/${d.id}`}
              className="flex items-center gap-3 group"
            >
              <span className="font-mono text-xs text-gray-500 w-14">
                #{d.numero_devolucion}
              </span>
              <span className="flex-1 truncate text-gray-700 group-hover:text-indigo-600" title={d.motivo}>
                {d.motivo || <span className="text-gray-400">Sin motivo</span>}
              </span>
              <span className="text-xs text-gray-400 w-20 text-right">
                {tiempoRelativo(d.created_at)}
              </span>
              <span className="text-sm font-medium text-amber-700 w-24 text-right">
                {formatARS(d.total_devuelto)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
