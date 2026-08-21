import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerCliente } from '@/lib/clientes/queries'
import { listarVentas } from '@/lib/ventas/queries'
import { listarMovimientosCc, listarRemitosPendientesCliente } from '@/lib/cc/queries'
import { listarCuentasFondos } from '@/lib/configuracion/queries'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'
import { SaldoCcCard } from '@/components/clientes/SaldoCcCard'
import { MovimientosCcList } from '@/components/clientes/MovimientosCcList'
import { RegistrarCobroCcForm } from '@/components/clientes/RegistrarCobroCcForm'
import { sincronizarCargosRemitosCliente } from '@/app/actions/cuenta-corriente'
import { ClienteHistorial } from '@/components/clientes/ClienteHistorial'
import { AccionesCliente } from '@/components/clientes/AccionesCliente'
import { LinkButton } from '@/components/ui/Button'
import { formatARS, formatDate, formatDateTime, formatNumber } from '@/lib/format'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'

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

  const config = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)
  let saldoCc = Number(cliente.saldo_cc ?? 0)
  if (config.usarPedidoCc) {
    const sync = await sincronizarCargosRemitosCliente(id)
    if (sync.ok && sync.data && typeof sync.data.saldoCc === 'number') {
      saldoCc = sync.data.saldoCc
    }
  }
  const mostrarCc = config.usarPedidoCc || saldoCc > 0.01

  const [{ ventas, total: totalVentas }, movimientosCc, remitosPendientes, cuentas] =
    await Promise.all([
      listarVentas({
        clienteId: id,
        page: 1,
        pageSize: 50,
      }),
      mostrarCc ? listarMovimientosCc(id) : Promise.resolve([]),
      mostrarCc ? listarRemitosPendientesCliente(id) : Promise.resolve([]),
      mostrarCc ? listarCuentasFondos(true) : Promise.resolve([]),
    ])

  const nombreCompleto =
    `${cliente.nombre}${cliente.apellido ? ' ' + cliente.apellido : ''}`.trim()
  const ticketPromedio =
    cliente.total_compras > 0 ? cliente.monto_total / cliente.total_compras : 0
  const saldoFavor = (cliente as { saldo_favor?: number }).saldo_favor ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={nombreCompleto}
        description={`Cliente desde ${formatDate(cliente.created_at)}`}
        breadcrumb={
          <Link href="/clientes" className="text-sm text-fg-brand hover:underline">
            ← Volver a clientes
          </Link>
        }
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <Badge variant={cliente.activo ? 'success' : 'neutral'}>
              {cliente.activo ? 'Activo' : 'Inactivo'}
            </Badge>
            <LinkButton href={`/clientes/${id}/editar`} variant="secondary" size="sm">
              Editar
            </LinkButton>
            <AccionesCliente id={id} activo={cliente.activo} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Compras" value={formatNumber(cliente.total_compras)} />
        <StatCard label="Monto total" value={formatARS(cliente.monto_total)} />
        <StatCard label="Ticket promedio" value={formatARS(ticketPromedio)} />
        <StatCard label="Última compra" value={formatDate(cliente.ultima_compra)} />
      </div>

      {mostrarCc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SaldoCcCard saldoCc={saldoCc} limiteCc={cliente.limite_cc} />
          <RegistrarCobroCcForm
            clienteId={id}
            saldoCc={saldoCc}
            remitos={remitosPendientes}
            cuentas={cuentas}
          />
        </div>
      )}

      {saldoFavor > 0 && (
        <div className="flex items-center justify-between bg-primary-soft border border-primary-border rounded-[var(--radius-lg)] px-5 py-4 gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-primary-soft-fg">Saldo a favor disponible</p>
            <p className="text-[13px] text-fg-brand mt-0.5">
              Acreditado por devoluciones. Se aplica automáticamente en el próximo cobro desde el POS.
            </p>
          </div>
          <span className="text-2xl font-bold text-fg-brand tabular-nums">
            {formatARS(saldoFavor)}
          </span>
        </div>
      )}

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <h2 className="text-[15px] font-semibold text-fg mb-4">Datos personales</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Field label="CUIT" value={cliente.cuit} />
          <Field label="DNI" value={cliente.dni} />
          <Field label="Teléfono" value={cliente.telefono} />
          <Field label="Email" value={cliente.email} />
          <Field label="Fecha de nacimiento" value={formatDate(cliente.fecha_nacimiento)} />
          <Field label="Ciudad" value={cliente.ciudad} />
          <Field label="Dirección" value={cliente.direccion} />
        </dl>
        {cliente.notas && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <dt className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
              Notas
            </dt>
            <dd className="mt-1 text-sm text-fg whitespace-pre-wrap">
              {cliente.notas}
            </dd>
          </div>
        )}
      </div>

      {mostrarCc && (
        <div>
          <h2 className="text-[15px] font-semibold text-fg mb-3">Movimientos de cuenta</h2>
          <MovimientosCcList movimientos={movimientosCc} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 className="text-[15px] font-semibold text-fg">
            Historial de compras
          </h2>
          {totalVentas > 0 && (
            <span className="text-xs text-fg-muted">
              {totalVentas} {totalVentas === 1 ? 'venta' : 'ventas'}
              {totalVentas > ventas.length && ` (mostrando últimas ${ventas.length})`}
            </span>
          )}
        </div>
        <ClienteHistorial ventas={ventas} />
      </div>

      <p className="text-xs text-fg-subtle">
        Última actualización: {formatDateTime(cliente.updated_at)}
      </p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
        {label}
      </dt>
      <dd className="mt-1 text-fg">{value && value !== '—' ? value : '—'}</dd>
    </div>
  )
}
