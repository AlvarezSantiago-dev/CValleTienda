import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { obtenerVentaParaDevolucion, obtenerPrefijoTicket } from '@/lib/ventas/queries'
import { listarMetodosPago } from '@/lib/configuracion/queries'
import { DevolucionForm } from '@/components/devoluciones/DevolucionForm'
import { formatARS, formatDateTime } from '@/lib/format'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { PageHeader } from '@/components/ui/PageHeader'

interface NuevaDevolucionPageProps {
  searchParams: Promise<{ venta_id?: string }>
}

export default async function NuevaDevolucionPage({
  searchParams,
}: NuevaDevolucionPageProps) {
  const { venta_id } = await searchParams
  if (!venta_id) {
    redirect('/ventas')
  }

  const [venta, metodos, prefijoTicket] = await Promise.all([
    obtenerVentaParaDevolucion(venta_id),
    listarMetodosPago(true),
    obtenerPrefijoTicket(),
  ])
  if (!venta) notFound()

  const ticketLabel = formatNumeroTicket(prefijoTicket, venta.numero_ticket)

  const sinSaldo = venta.total_disponible_devolver === 0

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={`Nueva devolución — Venta ${ticketLabel}`}
        description={`${formatDateTime(venta.created_at)} · Total venta ${formatARS(venta.total)}${venta.cliente_nombre ? ` · Cliente: ${venta.cliente_nombre}` : ''}`}
        breadcrumb={
          <Link href={`/ventas/${venta.id}`} className="text-sm text-fg-brand hover:underline">
            ← Volver a venta {ticketLabel}
          </Link>
        }
      />

      {sinSaldo ? (
        <div className="bg-surface border border-dashed border-border-default rounded-[var(--radius-lg)] p-8 text-center">
          <p className="text-sm text-fg font-medium">
            Esta venta ya fue devuelta en su totalidad.
          </p>
          <p className="text-xs text-fg-muted mt-1">
            No queda nada por devolver.
          </p>
        </div>
      ) : metodos.length === 0 ? (
        <div className="bg-warning-soft border border-warning-border rounded-[var(--radius-lg)] p-6 text-sm text-warning-soft-fg">
          No tenés métodos de pago activos configurados. Necesitás al menos uno para
          poder registrar el egreso de la devolución.{' '}
          <Link href="/configuracion" className="font-medium underline">
            Ir a configuración →
          </Link>
        </div>
      ) : (
        <DevolucionForm venta={venta} metodos={metodos} />
      )}
    </div>
  )
}
