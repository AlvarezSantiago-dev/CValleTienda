import Link from 'next/link'
import type { VentaTurnoItem } from '@/lib/caja/types'
import { formatDateTime } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'

interface Props {
  ventas: VentaTurnoItem[]
  titulo?: string
}

export function VentasTurnoLista({ ventas, titulo = 'Ventas del turno' }: Props) {
  if (ventas.length === 0) {
    return (
      <section>
        <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">{titulo}</h3>
        <p className="text-[13px] text-gray-400 italic">No hubo ventas en este turno.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400">{titulo}</h3>
        <Link
          href="/ventas"
          className="text-xs font-medium text-lime-700 hover:text-lime-800 hover:underline"
        >
          Ver todas →
        </Link>
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Ticket</th>
              <th className="px-4 py-2.5">Vendedor</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ventas.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-[13px] text-gray-600">{formatDateTime(v.created_at)}</td>
                <td className="px-4 py-2.5 text-[13px] text-gray-900">
                  {v.numero_ticket != null ? `#${v.numero_ticket}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-[13px] text-gray-500">{v.vendedor ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                  {formatARS(v.total)}
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/ventas/${v.id}`}
                    className="text-xs font-medium text-lime-700 hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
