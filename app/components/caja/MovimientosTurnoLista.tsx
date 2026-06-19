import type { MovimientoTurno } from '@/lib/caja/types'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatDateTime } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'

interface Props {
  movimientos: MovimientoTurno[]
}

export function MovimientosTurnoLista({ movimientos }: Props) {
  if (movimientos.length === 0) {
    return (
      <section>
        <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
          Movimientos del turno
        </h3>
        <p className="text-[13px] text-gray-400 italic">No hubo movimientos de fondos en este turno.</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
        Movimientos del turno
      </h3>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">Concepto</th>
              <th className="px-4 py-2.5">Cuenta</th>
              <th className="px-4 py-2.5 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {movimientos.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-[12px] text-gray-500">{formatDateTime(m.created_at)}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      m.tipo === 'ingreso'
                        ? 'bg-lime-50 text-lime-700 border border-lime-200'
                        : m.tipo === 'egreso'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'egreso' ? 'Egreso' : 'Ajuste'}
                    {!m.es_manual && ' · venta'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[13px] text-gray-700">{m.concepto}</td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500">
                  {m.nombre_cuenta}
                  <span className="text-gray-400 ml-1">({labelTipoCuenta(m.tipo_cuenta)})</span>
                </td>
                <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                  {m.tipo === 'egreso' ? '−' : '+'}
                  {formatARS(m.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
