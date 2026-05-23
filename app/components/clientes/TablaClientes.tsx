import Link from 'next/link'
import type { ClienteListItem } from '@/lib/clientes/queries'
import { formatARS, formatDate, formatNumber } from '@/lib/format'

interface TablaClientesProps {
  items: ClienteListItem[]
}

export function TablaClientes({ items }: TablaClientesProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
        Sin clientes que coincidan con los filtros aplicados.
      </div>
    )
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {items.map((c) => {
          const nombreCompleto = `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`
          return (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-[#0A0A0A]">{nombreCompleto}</span>
                {c.activo ? (
                  <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700 flex-shrink-0">Activo</span>
                ) : (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 flex-shrink-0">Inactivo</span>
                )}
              </div>
              <div className="text-[13px] text-gray-400 space-y-0.5">
                {c.dni && <p>DNI {c.dni}</p>}
                {c.telefono && <p>{c.telefono}</p>}
                {c.ciudad && <p>{c.ciudad}</p>}
                {c.email && <p>{c.email}</p>}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[13px] text-gray-600">
                  {formatNumber(c.total_compras)} compras · {formatARS(c.monto_total)}
                </span>
                <span className="text-xs text-lime-700 font-medium">
                  {c.tiene_notas ? '📝 ' : ''}Ver →
                </span>
              </div>
              {c.ultima_compra && (
                <p className="text-[13px] text-gray-400 mt-1">
                  Última: {formatDate(c.ultima_compra)}
                </p>
              )}
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
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">DNI</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Ciudad</th>
                <th className="px-3 py-2 text-right">Compras</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2">Última compra</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => {
                const nombreCompleto = `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {nombreCompleto}
                      {c.tiene_notas && (
                        <span className="ml-1 text-[11px] text-gray-400" title="Tiene notas">📝</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{c.dni ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{c.telefono ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{c.ciudad ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {formatNumber(c.total_compras)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">
                      {formatARS(c.monto_total)}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(c.ultima_compra)}</td>
                    <td className="px-3 py-2">
                      {c.activo ? (
                        <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/clientes/${c.id}`}
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
