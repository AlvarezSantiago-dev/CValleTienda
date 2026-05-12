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
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
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
                  <td className={`px-3 py-2 text-right font-semibold ${cantCls}`}>
                    {formatSignedDelta(m.cantidad)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {m.stock_anterior}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
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
    </div>
  )
}
