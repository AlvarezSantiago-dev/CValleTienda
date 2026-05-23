import Link from 'next/link'
import { listarVentas } from '@/lib/ventas/queries'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

interface VentasPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function VentasPage({ searchParams }: VentasPageProps) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const pageSize = 20
  const { ventas, total } = await listarVentas({ page, pageSize })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Ventas</h1>
        <p className="text-[13px] text-gray-400 mt-1">Historial de ventas registradas.</p>
      </div>

      {ventas.length === 0 && page === 1 ? (
        <EmptyState
          icon="🧾"
          title="Todavía no hay ventas"
          description="Cuando registres una venta desde el POS aparecerá acá."
          cta={{ label: 'Ir al POS', href: '/pos' }}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {ventas.map((v) => (
              <Link
                key={v.id}
                href={`/ventas/${v.id}`}
                className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-[#0A0A0A]"># {v.numero_ticket}</span>
                  {v.estado === 'completada' ? (
                    <span className="inline-flex rounded-full bg-lime-50 px-2 py-0.5 text-xs font-semibold text-lime-700 border border-lime-200">
                      Completada
                    </span>
                  ) : v.estado === 'anulada' ? (
                    <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 border border-red-200">
                      Anulada
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      {v.estado}
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-gray-400">{formatDateTime(v.created_at)}</div>
                {v.cliente_nombre && (
                  <div className="text-[13px] text-gray-600 mt-0.5">{v.cliente_nombre}</div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[13px] text-gray-400">{v.cantidad_items} ítems</span>
                  <div className="text-right">
                    <span className="font-bold text-[#0A0A0A]">{formatARS(v.total)}</span>
                    {v.descuento > 0 && (
                      <p className="text-[11px] text-gray-400">
                        Dto. {formatARS(v.descuento)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
                <tr>
                  <th className="px-3 py-2">Ticket</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Vendedor</th>
                  <th className="px-3 py-2 text-right">Items</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Comprobante</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      #{v.numero_ticket}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {formatDateTime(v.created_at)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {v.cliente_nombre ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {v.usuario_nombre ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {v.cantidad_items}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      {formatARS(v.total)}
                      {v.descuento > 0 && (
                        <p className="text-[11px] font-normal text-gray-400 tabular-nums">
                          Dto. {formatARS(v.descuento)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {v.estado === 'completada' ? (
                        <span className="inline-flex rounded-full bg-lime-50 px-2 py-0.5 text-xs font-semibold text-lime-700 border border-lime-200">
                          Completada
                        </span>
                      ) : v.estado === 'anulada' ? (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 border border-red-200">
                          Anulada
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          {v.estado}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {v.numero_comprobante ? (
                        <span
                          className="inline-flex rounded-full bg-lime-50 px-2 py-0.5 text-xs font-semibold text-lime-700 border border-lime-200"
                          title={`N° ${v.numero_comprobante}`}
                        >
                          Fact. {v.tipo_comprobante}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Ticket X
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/ventas/${v.id}`}
                        className="text-lime-700 hover:text-lime-800 text-sm font-medium"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/ventas"
          />
        </>
      )}
    </div>
  )
}
