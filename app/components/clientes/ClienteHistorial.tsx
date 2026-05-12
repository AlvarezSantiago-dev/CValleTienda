import Link from 'next/link'
import type { VentaListItem } from '@/lib/ventas/queries'
import { formatARS, formatDateTime } from '@/lib/format'

interface ClienteHistorialProps {
  ventas: VentaListItem[]
}

export function ClienteHistorial({ ventas }: ClienteHistorialProps) {
  if (ventas.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
        Este cliente todavía no tiene compras registradas.
      </div>
    )
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {ventas.map((v) => {
          const anulada = v.estado === 'anulada'
          return (
            <Link
              key={v.id}
              href={`/ventas/${v.id}`}
              className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-mono text-xs text-gray-600">#{v.numero_ticket}</span>
                {anulada ? (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Anulada</span>
                ) : (
                  <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">Completada</span>
                )}
              </div>
              <p className="text-[13px] text-gray-400 mb-2">{formatDateTime(v.created_at)}</p>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${
                  anulada ? 'text-gray-400 line-through' : 'text-[#0A0A0A]'
                }`}>
                  {formatARS(v.total)}
                </span>
                <span className="text-xs text-lime-700 font-medium">Ver →</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
                <th className="px-3 py-2">Ticket</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventas.map((v) => {
                const anulada = v.estado === 'anulada'
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">
                      #{v.numero_ticket}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {formatDateTime(v.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {v.cantidad_items}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        anulada ? 'text-gray-400 line-through' : 'text-gray-900'
                      }`}
                    >
                      {formatARS(v.total)}
                    </td>
                    <td className="px-3 py-2">
                      {anulada ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Anulada
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">
                          Completada
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/ventas/${v.id}`}
                        className="text-xs text-lime-700 hover:underline font-medium"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
