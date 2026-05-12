import Link from 'next/link'
import { listarRemitos } from '@/lib/remitos/queries'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

const ESTADO_BADGE: Record<string, string> = {
  borrador:  'bg-gray-100 text-gray-600',
  emitido:   'bg-[#0A0A0A]/5 text-[#0A0A0A]',
  entregado: 'bg-lime-50 text-lime-700 border border-lime-200',
  anulado:   'bg-red-50 text-red-600 border border-red-200',
}

const ESTADO_LABEL: Record<string, string> = {
  borrador:  'Borrador',
  emitido:   'Emitido',
  entregado: 'Entregado',
  anulado:   'Anulado',
}

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function RemitosPage({ searchParams }: Props) {
  const ctx = await getContextoTienda()
  if (!puedeUsar(ctx?.planEfectivo ?? 'basico', 'remitos')) {
    return <UpgradeBanner feature="remitos" />
  }
  const sp   = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const { remitos, total } = await listarRemitos({ page, pageSize: 20 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Remitos</h1>
          <p className="text-[13px] text-gray-400 mt-1">Gestión de remitos de entrega.</p>
        </div>
        <Link
          href="/remitos/nuevo"
          className="inline-flex items-center h-10 px-4 bg-[#0A0A0A] text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition"
        >
          + Nuevo remito
        </Link>
      </div>

      {remitos.length === 0 && page === 1 ? (
        <EmptyState
          icon="📋"
          title="Todavía no hay remitos"
          description="Creá el primer remito de entrega desde acá o desde el detalle de una venta."
          cta={{ label: 'Crear remito', href: '/remitos/nuevo' }}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {remitos.map((r) => (
              <Link
                key={r.id}
                href={`/remitos/${r.id}`}
                className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-[#0A0A0A]"># {String(r.numero_remito).padStart(4, '0')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[r.estado] ?? ''}`}>
                    {ESTADO_LABEL[r.estado] ?? r.estado}
                  </span>
                </div>
                <div className="text-[13px] text-gray-600 font-medium">{r.destinatario}</div>
                <div className="text-[13px] text-gray-400 mt-0.5">{formatDate(r.created_at)}</div>
                {r.direccion_entrega && (
                  <div className="text-[13px] text-gray-400 mt-0.5 truncate">{r.direccion_entrega}</div>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
                <tr>
                  <th className="px-3 py-2">N°</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Destinatario</th>
                  <th className="px-3 py-2">Dirección</th>
                  <th className="px-3 py-2">Venta</th>
                  <th className="px-3 py-2">Entrega</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remitos.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      #{String(r.numero_remito).padStart(4, '0')}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{formatDate(r.created_at)}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{r.destinatario}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">
                      {r.direccion_entrega ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {r.venta_numero ? (
                        <Link href={`/ventas/${r.venta_numero}`} className="text-lime-700 hover:underline">
                          #{r.venta_numero}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {r.fecha_entrega ? formatDate(r.fecha_entrega) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[r.estado] ?? ''}`}>
                        {ESTADO_LABEL[r.estado] ?? r.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/remitos/${r.id}`}
                        className="text-xs text-lime-700 hover:underline"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <Pagination page={page} pageSize={20} total={total} basePath="/remitos" />
        </>
      )}
    </div>
  )
}
