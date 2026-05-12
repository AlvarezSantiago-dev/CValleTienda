import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerCliente } from '@/lib/clientes/queries'
import { listarVentas } from '@/lib/ventas/queries'
import { ClienteHistorial } from '@/components/clientes/ClienteHistorial'
import { AccionesCliente } from '@/components/clientes/AccionesCliente'
import { LinkButton } from '@/components/ui/Button'
import { formatARS, formatDate, formatDateTime, formatNumber } from '@/lib/format'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'

interface ClienteDetallePageProps {
  params: Promise<{ id: string }>
}

export default async function ClienteDetallePage({ params }: ClienteDetallePageProps) {
  const ctx = await getContextoTienda()
  if (!puedeUsar(ctx?.planEfectivo ?? 'basico', 'crm_completo')) {
    return <UpgradeBanner feature="crm_completo" />
  }

  const { id } = await params

  const cliente = await obtenerCliente(id)
  if (!cliente) notFound()

  const { ventas, total: totalVentas } = await listarVentas({
    clienteId: id,
    page: 1,
    pageSize: 50,
  })

  const nombreCompleto =
    `${cliente.nombre}${cliente.apellido ? ' ' + cliente.apellido : ''}`.trim()
  const ticketPromedio =
    cliente.total_compras > 0 ? cliente.monto_total / cliente.total_compras : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clientes" className="text-sm text-lime-700 hover:text-lime-800 hover:underline">
          ← Volver a clientes
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">{nombreCompleto}</h1>
              {cliente.activo ? (
                <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">
                  Activo
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  Inactivo
                </span>
              )}
            </div>
            <p className="text-[13px] text-gray-400 mt-1">
              Cliente desde {formatDate(cliente.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/clientes/${id}/editar`} variant="secondary" size="sm">
              Editar
            </LinkButton>
            <AccionesCliente id={id} activo={cliente.activo} />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Compras" value={formatNumber(cliente.total_compras)} />
        <StatCard label="Monto total" value={formatARS(cliente.monto_total)} />
        <StatCard label="Ticket promedio" value={formatARS(ticketPromedio)} />
        <StatCard label="Última compra" value={formatDate(cliente.ultima_compra)} />
      </div>

      {/* Saldo a favor */}
      {((cliente as { saldo_favor?: number }).saldo_favor ?? 0) > 0 && (
        <div className="flex items-center justify-between bg-lime-50 border border-lime-200 rounded-xl px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-lime-800">Saldo a favor disponible</p>
            <p className="text-[13px] text-lime-700 mt-0.5">
              Acreditado por devoluciones. Se aplica automáticamente en el próximo cobro desde el POS.
            </p>
          </div>
          <span className="text-2xl font-bold text-lime-700">
            {formatARS((cliente as { saldo_favor?: number }).saldo_favor ?? 0)}
          </span>
        </div>
      )}

      {/* Datos */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-4">Datos personales</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Field label="DNI" value={cliente.dni} />
          <Field label="Teléfono" value={cliente.telefono} />
          <Field label="Email" value={cliente.email} />
          <Field label="Fecha de nacimiento" value={formatDate(cliente.fecha_nacimiento)} />
          <Field label="Ciudad" value={cliente.ciudad} />
          <Field label="Dirección" value={cliente.direccion} />
        </dl>
        {cliente.notas && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">
              Notas
            </dt>
            <dd className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {cliente.notas}
            </dd>
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">
            Historial de compras
          </h2>
          {totalVentas > 0 && (
            <span className="text-xs text-gray-500">
              {totalVentas} {totalVentas === 1 ? 'venta' : 'ventas'}
              {totalVentas > ventas.length && ` (mostrando últimas ${ventas.length})`}
            </span>
          )}
        </div>
        <ClienteHistorial ventas={ventas} />
      </div>

      <p className="text-xs text-gray-400">
        Última actualización: {formatDateTime(cliente.updated_at)}
      </p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">{label}</p>
      <p className="text-xl font-bold text-[#0A0A0A] mt-1">{value}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-gray-900">{value && value !== '—' ? value : '—'}</dd>
    </div>
  )
}
