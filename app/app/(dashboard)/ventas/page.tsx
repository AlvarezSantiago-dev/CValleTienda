import Link from 'next/link'
import { listarVentas } from '@/lib/ventas/queries'
import { formatDateTime, formatYmdLong } from '@/lib/datetime'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase/server'
import { AnularVentaInlineButton } from '@/components/ventas/AnularVentaInlineButton'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

interface VentasPageProps {
  searchParams: Promise<{ page?: string; fecha?: string; q?: string }>
}

function isYmd(fecha?: string): fecha is string {
  return Boolean(fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha))
}

export default async function VentasPage({ searchParams }: VentasPageProps) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const pageSize = 20
  const fecha = sp.fecha?.trim() || ''
  const q = sp.q?.trim() || ''
  const fechaValida = isYmd(fecha) ? fecha : null

  // Detectar si es cajero para mostrar vista adaptada
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
    : { data: null }
  const esCajero = perfil?.rol === 'vendedor'

  const { ventas, total, prefijo_ticket } = await listarVentas({
    page,
    pageSize,
    soloHoy: true,
    fecha: fecha || undefined,
    query: q || undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
          {fechaValida
            ? `Ventas del ${formatYmdLong(fechaValida)}`
            : esCajero
            ? 'Ventas de hoy'
            : 'Ventas'}
        </h1>
        <p className="text-[13px] text-gray-400 mt-1">
          {fechaValida
            ? `Ventas registradas el ${formatYmdLong(fechaValida)}.`
            : esCajero
            ? 'Ventas registradas hoy en tu tienda.'
            : 'Historial de ventas registradas.'}
        </p>
      </div>

      <form method="get" action="/ventas" className="grid gap-3 sm:grid-cols-[1fr_240px_140px] items-end">
        <div>
          <label htmlFor="q" className="block text-sm font-medium text-gray-700 mb-1">
            Buscar por ticket o comprobante
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Ej. 12, 1002, ticket, factura"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-lime-400 focus:ring-2 focus:ring-lime-400/40"
          />
        </div>
        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={fecha}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-lime-400 focus:ring-2 focus:ring-lime-400/40"
          />
        </div>
        <div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#0A0A0A] px-3 py-2 text-sm font-semibold text-white hover:bg-gray-900"
          >
            Aplicar
          </button>
        </div>
      </form>

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
                  <span className="font-semibold text-[#0A0A0A]">{formatNumeroTicket(prefijo_ticket, v.numero_ticket)}</span>
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
                      {formatNumeroTicket(prefijo_ticket, v.numero_ticket)}
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
                      <div className="flex items-center justify-end gap-3">
                        {v.estado === 'completada' && (
                          <AnularVentaInlineButton
                            ventaId={v.id}
                            numeroTicket={v.numero_ticket}
                            ticketLabel={formatNumeroTicket(prefijo_ticket, v.numero_ticket)}
                          />
                        )}
                        <Link
                          href={`/ventas/${v.id}`}
                          className="text-lime-700 hover:text-lime-800 text-sm font-medium"
                        >
                          Ver
                        </Link>
                      </div>
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
