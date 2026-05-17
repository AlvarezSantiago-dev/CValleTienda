import Link from 'next/link'
import type { MovimientoStockItem } from '@/lib/stock/queries'
import { formatDateTime, formatSignedDelta } from '@/lib/format'

interface MovimientosTablaProps {
  items: MovimientoStockItem[]
  mostrarVariante?: boolean
}

const tipoBadge: Record<string, string> = {
  entrada: 'bg-lime-50 text-lime-700 border border-lime-200',
  salida: 'bg-red-50 text-red-600 border border-red-200',
  ajuste: 'bg-[#0A0A0A]/5 text-[#0A0A0A]',
  devolucion: 'bg-amber-50 text-amber-700 border border-amber-200',
  inicial: 'bg-gray-100 text-gray-600',
}

const tipoLabel: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
  inicial: 'Inicial',
}

export function MovimientosTabla({
  items,
  mostrarVariante = true,
}: MovimientosTablaProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
        Sin movimientos registrados.
      </div>
    )
  }

  return (
    <>
      {/* Vista móvil — sm:hidden */}
      <div className="sm:hidden space-y-2">
        {items.map((m) => {
          const cls = tipoBadge[m.tipo] ?? 'bg-gray-100 text-gray-700'
          const cantCls =
            m.cantidad > 0 ? 'text-green-700 font-bold' : m.cantidad < 0 ? 'text-red-600 font-bold' : 'text-gray-700'
          return (
            <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
                  {tipoLabel[m.tipo] ?? m.tipo}
                </span>
                <span className={`text-sm tabular-nums ${cantCls}`}>
                  {formatSignedDelta(m.cantidad)}
                </span>
              </div>
              {mostrarVariante && (
                <p className="text-[13px] font-medium text-gray-900 truncate">
                  <Link href={`/stock/${m.variante_id}`} className="text-lime-700 hover:underline">
                    {m.variante_nombre}
                  </Link>
                  {m.variante_label && (
                    <span className="text-gray-500 font-normal"> · {m.variante_label}</span>
                  )}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                <span>{formatDateTime(m.created_at)}</span>
                <span className="tabular-nums">
                  {m.stock_anterior} → <strong className="text-gray-700">{m.stock_posterior}</strong>
                </span>
              </div>
              {m.motivo && (
                <p className="text-[13px] text-gray-500 mt-1 truncate">{m.motivo}</p>
              )}
              {m.venta_id && m.numero_ticket != null && (
                <div className="text-xs mt-1">
                  <Link href={`/ventas/${m.venta_id}`} className="text-lime-700 hover:underline">
                    Ticket #{m.numero_ticket}
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Vista desktop — hidden sm:block */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              {mostrarVariante && (
                <th className="px-3 py-2 text-left">Variante</th>
              )}
              <th className="px-3 py-2 text-right">Cantidad</th>
              <th className="px-3 py-2 text-right">Stock anterior</th>
              <th className="px-3 py-2 text-right">Stock posterior</th>
              <th className="px-3 py-2 text-left">Motivo / Referencia</th>
              <th className="px-3 py-2 text-left">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((m) => {
              const cls = tipoBadge[m.tipo] ?? 'bg-gray-100 text-gray-700'
              const cantCls =
                m.cantidad > 0 ? 'text-green-700' : m.cantidad < 0 ? 'text-red-700' : ''
              return (
                <tr key={m.id} className="hover:bg-gray-50 align-top">
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
                    >
                      {tipoLabel[m.tipo] ?? m.tipo}
                    </span>
                  </td>
                  {mostrarVariante && (
                    <td className="px-3 py-2">
                      <Link
                        href={`/stock/${m.variante_id}`}
                        className="text-lime-700 hover:underline font-medium"
                      >
                        {m.variante_nombre}
                      </Link>
                      {m.variante_label && (
                        <div className="text-xs text-gray-500">{m.variante_label}</div>
                      )}
                      {m.codigo_barras && (
                        <div className="font-mono text-xs text-gray-400">
                          {m.codigo_barras}
                        </div>
                      )}
                    </td>
                  )}
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${cantCls}`}>
                    {formatSignedDelta(m.cantidad)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                    {m.stock_anterior}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900 tabular-nums">
                    {m.stock_posterior}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {m.motivo ?? '—'}
                    {m.venta_id && m.numero_ticket != null && (
                      <div className="text-xs">
                        <Link
                          href={`/ventas/${m.venta_id}`}
                          className="text-lime-700 hover:underline"
                        >
                          Ticket #{m.numero_ticket}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{m.usuario_nombre ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
