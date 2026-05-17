import Link from 'next/link'
import type { DevolucionListItem } from '@/lib/devoluciones/queries'
import { formatARS, formatDateTime } from '@/lib/format'

interface TablaDevolucionesProps {
  items: DevolucionListItem[]
  /** Si true, oculta columnas redundantes cuando se muestra dentro de una venta */
  contexto?: 'global' | 'venta'
}

export function TablaDevoluciones({ items, contexto = 'global' }: TablaDevolucionesProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
        Sin devoluciones que coincidan con los filtros.
      </div>
    )
  }

  return (
    <>
      {/* Vista móvil — sm:hidden */}
      <div className="sm:hidden space-y-3">
        {items.map((d) => (
          <Link
            key={d.id}
            href={`/devoluciones/${d.id}`}
            className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-xs text-gray-500">#{d.numero_devolucion}</span>
              {d.tipo === 'total' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                  Total
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Parcial
                </span>
              )}
            </div>
            <p className="text-[13px] text-gray-400">{formatDateTime(d.created_at)}</p>
            {contexto === 'global' && d.cliente_nombre && (
              <p className="text-[13px] text-gray-700 mt-0.5">{d.cliente_nombre}</p>
            )}
            {contexto === 'global' && (
              <p className="text-[13px] text-gray-500 mt-0.5">
                Venta #{d.numero_ticket ?? '—'}
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">{d.cantidad_items} ítem{d.cantidad_items !== 1 ? 's' : ''}</span>
              <span className="text-sm font-semibold text-amber-700 tabular-nums">{formatARS(d.total_devuelto)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Vista desktop — hidden sm:block */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-400 text-xs uppercase tracking-[0.08em]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Fecha</th>
              {contexto === 'global' && (
                <th className="px-3 py-2 text-left font-medium">Venta</th>
              )}
              {contexto === 'global' && (
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
              )}
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 text-right font-medium">Items</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-right font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs text-gray-700">
                  #{d.numero_devolucion}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {formatDateTime(d.created_at)}
                </td>
                {contexto === 'global' && (
                  <td className="px-3 py-2">
                    <Link
                      href={`/ventas/${d.venta_id}`}
                      className="font-mono text-xs text-lime-700 hover:underline"
                    >
                      Venta #{d.numero_ticket ?? '—'}
                    </Link>
                  </td>
                )}
                {contexto === 'global' && (
                  <td className="px-3 py-2 text-gray-700">{d.cliente_nombre ?? '—'}</td>
                )}
                <td className="px-3 py-2">
                  {d.tipo === 'total' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                      Total
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Parcial
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{d.cantidad_items}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900 tabular-nums">
                  {formatARS(d.total_devuelto)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/devoluciones/${d.id}`}
                    className="text-lime-700 hover:underline text-xs font-medium"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
