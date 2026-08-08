import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerVentaParaDevolucion, obtenerPrefijoTicket } from '@/lib/ventas/queries'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { obtenerDevolucionesPorVenta } from '@/lib/devoluciones/queries'
import { obtenerPayloadVenta } from '@/app/actions/impresion'
import { TicketVentaRenderer } from '@/components/impresion/TicketVentaRenderer'
import { PrintButtonClient } from '@/components/ventas/PrintButtonClient'
import { AnularVentaButton } from '@/components/ventas/AnularVentaButton'
import { TablaDevoluciones } from '@/components/devoluciones/TablaDevoluciones'
import { formatARS } from '@/lib/format'
import { formatDateLong, formatDate } from '@/lib/datetime'
import { obtenerEstadoFacturacion } from '@/app/actions/facturacion'
import { EmitirFacturaButton } from '@/components/ventas/EmitirFacturaButton'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, estadoVentaBadge } from '@/components/ui/Badge'

async function obtenerRolActual() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', auth.user.id)
    .maybeSingle()

  return perfil?.rol as string | null
}

interface VentaDetallePageProps {
  params: Promise<{ id: string }>
}

const btnGhost =
  'inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-full)] border border-border-default bg-surface hover:bg-surface-hover text-sm font-medium text-fg'

export default async function VentaDetallePage({ params }: VentaDetallePageProps) {
  const { id } = await params

  const venta = await obtenerVentaParaDevolucion(id)
  if (!venta) notFound()

  const [payloadTicket, devoluciones, estadoFacturacion, rol, prefijoTicket] = await Promise.all([
    obtenerPayloadVenta(id),
    obtenerDevolucionesPorVenta(id),
    obtenerEstadoFacturacion(),
    obtenerRolActual(),
    obtenerPrefijoTicket(),
  ])

  const ticketLabel = formatNumeroTicket(prefijoTicket, venta.numero_ticket)

  const esRopa = payloadTicket.data?.tienda.rubro === 'ropa'
  const esOwner = rol === 'owner'

  const totalPagos = venta.pagos.reduce((acc, p) => acc + p.monto, 0)
  const vuelto = Math.max(
    0,
    Math.round((totalPagos + venta.saldo_favor_usado - venta.total) * 100) / 100
  )

  const mostrarVuelto = totalPagos > 0 || venta.saldo_favor_usado > 0

  const totalDevuelto = devoluciones
    .filter((d) => d.estado === 'completada' && d.tipo_resolucion !== 'cambio')
    .reduce((acc, d) => acc + d.total_devuelto, 0)
  const netoVenta = Math.round((venta.total - totalDevuelto) * 100) / 100

  const tieneCotos = venta.detalles.some((d) => d.costo_unitario > 0)
  const costoTotal = venta.detalles.reduce((acc, d) => acc + d.costo_unitario * d.cantidad, 0)
  const gananciaVenta = venta.total - costoTotal
  const margenVenta = venta.total > 0 && tieneCotos
    ? Math.round((gananciaVenta / venta.total) * 1000) / 10
    : null

  const facturada = Boolean(venta.numero_comprobante)
  const tieneDevoluciones = devoluciones.length > 0
  const estadoLabel =
    venta.estado === 'completada' ? 'Completada'
      : venta.estado === 'anulada' ? 'Anulada'
        : venta.estado

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden mb-0"
        title={`Venta ${ticketLabel}`}
        description={formatDateLong(venta.created_at)}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link href="/ventas" className={btnGhost}>
              ← Volver
            </Link>
            {venta.estado === 'completada' && venta.total_disponible_devolver > 0 && (
              <Link
                href={`/devoluciones/nueva?venta_id=${venta.id}`}
                className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-full)] border border-warning-border bg-warning-soft hover:bg-warning-soft text-sm font-medium text-warning-soft-fg"
              >
                ↩ Devolver
              </Link>
            )}
            {venta.estado === 'completada' && !esRopa && (
              <Link href={`/remitos/nuevo?venta_id=${venta.id}`} className={btnGhost}>
                Crear remito →
              </Link>
            )}
            {venta.estado === 'completada' && estadoFacturacion.ok && estadoFacturacion.data?.activo && !venta.cae && (
              <EmitirFacturaButton ventaId={venta.id} />
            )}
            {venta.estado === 'completada' && (
              <AnularVentaButton
                ventaId={venta.id}
                numeroTicket={venta.numero_ticket}
                ticketLabel={ticketLabel}
              />
            )}
            <PrintButtonClient
              tipo="venta"
              id={venta.id}
              diasCambio={payloadTicket.data?.tienda.dias_cambio}
              rubro={payloadTicket.data?.tienda.rubro}
            />
          </div>
        }
      />

      {/* Timeline de estado */}
      <div className="print:hidden flex flex-wrap items-center gap-2">
        <Badge variant={estadoVentaBadge(venta.estado)}>{estadoLabel}</Badge>
        <span className="text-fg-subtle text-xs" aria-hidden>→</span>
        <Badge variant={facturada ? (venta.cae ? 'brand' : 'warning') : 'neutral'}>
          {facturada ? (venta.cae ? 'Facturada' : 'Factura sin CAE') : 'Sin factura'}
        </Badge>
        <span className="text-fg-subtle text-xs" aria-hidden>→</span>
        <Badge variant={tieneDevoluciones ? 'warning' : 'neutral'}>
          {tieneDevoluciones
            ? `${devoluciones.length} devolución${devoluciones.length === 1 ? '' : 'es'}`
            : 'Sin devoluciones'}
        </Badge>
      </div>

      {/* Vista previa del ticket — solo en pantalla. La impresión real
          la maneja PrintButtonClient (portal/PrintBridge). */}
      <div className="print:hidden bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold mb-4">
          Vista previa del ticket
        </p>
        <div className="flex justify-center">
          <div className="shadow-md rounded border border-border-default overflow-hidden">
            {payloadTicket.ok && payloadTicket.data
              ? <TicketVentaRenderer payload={payloadTicket.data} />
              : <p className="text-sm text-fg-subtle text-center py-4 px-6">No se pudo cargar el ticket.</p>
            }
          </div>
        </div>
      </div>

      {venta.cliente_id && venta.cliente_nombre && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] px-6 py-4 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold">
            Cliente
          </p>
          <Link
            href={`/clientes/${venta.cliente_id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-fg-brand hover:underline"
          >
            {venta.cliente_nombre}
            <span aria-hidden>→</span>
          </Link>
          {(venta.cliente_dni || venta.cliente_telefono) && (
            <p className="text-xs text-fg-muted mt-0.5">
              {[venta.cliente_dni, venta.cliente_telefono].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      {mostrarVuelto && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] px-6 py-4 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold mb-3">
            Pago y vuelto
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-fg-muted">Total pagado</p>
              <p className="text-lg font-semibold text-fg">{formatARS(totalPagos)}</p>
            </div>
            {venta.saldo_favor_usado > 0 && (
              <div>
                <p className="text-xs text-fg-muted">Saldo a favor aplicado</p>
                <p className="text-lg font-semibold text-success-soft-fg">
                  {formatARS(venta.saldo_favor_usado)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-fg-muted">Vuelto</p>
              <p className="text-lg font-semibold text-info-soft-fg">{formatARS(vuelto)}</p>
            </div>
          </div>
          {venta.saldo_favor_usado > 0 && (
            <p className="mt-2 text-xs text-success-soft-fg">
              Esta venta se cobró (total o parcialmente) con crédito de devoluciones previas.
              La parte cubierta con saldo a favor no genera ingreso de caja.
            </p>
          )}
        </div>
      )}

      {devoluciones.length > 0 && (
        <div className="space-y-2 print:hidden">
          <div className="bg-surface border border-warning-border rounded-[var(--radius-lg)] px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold mb-3">
              Resumen con devoluciones
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-fg-muted">Total venta</p>
                <p className="text-lg font-semibold text-fg">{formatARS(venta.total)}</p>
              </div>
              <div>
                <p className="text-xs text-fg-muted">Devuelto</p>
                <p className="text-lg font-semibold text-warning-soft-fg">{formatARS(totalDevuelto)}</p>
              </div>
              <div>
                <p className="text-xs text-fg-muted">Neto</p>
                <p className="text-lg font-bold text-fg">{formatARS(netoVenta)}</p>
              </div>
            </div>
          </div>
          <h2 className="text-base font-semibold text-fg">
            Devoluciones de esta venta
          </h2>
          <TablaDevoluciones items={devoluciones} contexto="venta" showPrint />
        </div>
      )}

      {venta.numero_comprobante && (
        <div className={`border rounded-[var(--radius-lg)] px-6 py-4 print:hidden space-y-1 ${venta.cae ? 'bg-primary-soft border-primary-border' : 'bg-warning-soft border-warning-border'}`}>
          <p className={`text-[10px] uppercase tracking-[0.10em] font-semibold ${venta.cae ? 'text-fg-brand' : 'text-warning-soft-fg'}`}>
            {venta.cae ? '✓ ' : '⚠️ '}Factura Electrónica AFIP · {venta.tipo_comprobante}
          </p>
          <p className="text-sm font-semibold text-fg">
            N° {venta.numero_comprobante}
          </p>
          {venta.cae ? (
            <p className="text-xs text-fg-muted">
              CAE: {venta.cae}
              {venta.cae_vencimiento && (
                <> · Vence: {formatDate(venta.cae_vencimiento)}</>
              )}
            </p>
          ) : (
            <p className="text-xs text-warning-soft-fg font-medium">
              El comprobante fue emitido ante AFIP pero el CAE no quedó registrado en el sistema
              (posible error de conexión al guardar). Si reemitís, verificá con AFIP si ya existe
              un comprobante para evitar duplicados.
            </p>
          )}
          {venta.cuit_receptor && (
            <p className="text-xs text-fg-muted">Receptor: CUIT {venta.cuit_receptor}</p>
          )}
          <div className="flex items-start gap-6 mt-2 flex-wrap">
            {venta.pdf_url && (
              <a
                href={venta.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-brand hover:underline"
              >
                📄 Descargar PDF de la factura
              </a>
            )}
            {venta.qr_afip && (
              <a
                href={venta.qr_afip}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-brand hover:underline"
                title="Ver QR AFIP"
              >
                🔲 Ver QR AFIP
              </a>
            )}
          </div>
          {venta.qr_afip && (
            <div className="mt-3 pt-3 border-t border-primary-border">
              <p className="text-[10px] text-fg-subtle mb-1.5">Código QR AFIP</p>
              <img
                src={venta.qr_afip}
                alt="QR AFIP"
                className="w-28 h-28 border border-primary-border rounded-[var(--radius-md)] bg-surface"
              />
            </div>
          )}
        </div>
      )}

      {tieneCotos && esOwner && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] px-6 py-4 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold mb-3">
            Margen de ganancia de esta venta
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <p className="text-xs text-fg-muted">Margen</p>
              <p className={`text-lg font-semibold ${
                margenVenta == null ? 'text-fg-subtle' :
                margenVenta >= 40 ? 'text-success-soft-fg' :
                margenVenta >= 20 ? 'text-warning-soft-fg' : 'text-danger-soft-fg'
              }`}>
                {margenVenta != null ? `${margenVenta}%` : '—'}
              </p>
            </div>
            <div className="sm:col-span-2 text-sm text-fg-muted leading-6">
              El margen es la única información de rentabilidad que se muestra aquí. Los vendedores y cajeros no pueden ver detalles de costo ni la ganancia bruta de la venta.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
