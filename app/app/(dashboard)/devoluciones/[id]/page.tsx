import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerDevolucionCompleta } from '@/lib/devoluciones/queries'
import { obtenerPrefijoTicket } from '@/lib/ventas/queries'
import { obtenerPayloadDevolucion } from '@/app/actions/impresion'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { TicketDevolucionRenderer } from '@/components/impresion/TicketDevolucionRenderer'
import { PrintButtonClient } from '@/components/ventas/PrintButtonClient'
import { formatDateLong } from '@/lib/datetime'
import {
  RESOLUCION_LABEL,
  RESOLUCION_DESCRIPCION,
} from '@/lib/devoluciones/resolucion-labels'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'

const RESOLUCION_VARIANT: Record<string, BadgeVariant> = {
  reembolso: 'danger',
  saldo_a_favor: 'success',
  cambio: 'info',
}

interface DevolucionDetallePageProps {
  params: Promise<{ id: string }>
}

export default async function DevolucionDetallePage({
  params,
}: DevolucionDetallePageProps) {
  const { id } = await params

  const [devolucion, payloadDevolucion, prefijoTicket] = await Promise.all([
    obtenerDevolucionCompleta(id),
    obtenerPayloadDevolucion(id),
    obtenerPrefijoTicket(),
  ])
  if (!devolucion) notFound()

  const ticketVentaLabel =
    devolucion.numero_ticket != null
      ? formatNumeroTicket(prefijoTicket, devolucion.numero_ticket)
      : '—'

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden mb-0"
        title={`Devolución #${devolucion.numero_devolucion}`}
        description={`${formatDateLong(devolucion.created_at)} · ${RESOLUCION_DESCRIPCION[devolucion.tipo_resolucion]}`}
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <Badge variant={RESOLUCION_VARIANT[devolucion.tipo_resolucion] ?? 'neutral'}>
              {RESOLUCION_LABEL[devolucion.tipo_resolucion]}
            </Badge>
            <Link
              href="/devoluciones"
              className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-full)] border border-border-default bg-surface hover:bg-surface-hover text-sm font-medium text-fg"
            >
              ← Volver
            </Link>
            <PrintButtonClient tipo="devolucion" id={devolucion.id} />
          </div>
        }
      />

      <div className="print:hidden bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
        <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold mb-4">
          Vista previa del ticket
        </p>
        <div className="flex justify-center">
          <div className="shadow-md rounded border border-border-default overflow-hidden">
            {payloadDevolucion.ok && payloadDevolucion.data
              ? <TicketDevolucionRenderer payload={payloadDevolucion.data} />
              : <p className="text-sm text-fg-subtle text-center py-4 px-6">No se pudo cargar el ticket.</p>
            }
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold">
            Venta original
          </p>
          <Link
            href={`/ventas/${devolucion.venta_id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-fg-brand hover:underline"
          >
            Venta {ticketVentaLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>

        {devolucion.cliente_id && devolucion.cliente_nombre && (
          <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold">
              Cliente
            </p>
            <Link
              href={`/clientes/${devolucion.cliente_id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-fg-brand hover:underline"
            >
              {devolucion.cliente_nombre}
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </div>

      {devolucion.detalles.length > 0 && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden print:hidden">
          <div className="px-6 py-4 border-b border-border-subtle">
            <p className="text-[10px] uppercase tracking-[0.10em] text-fg-subtle font-semibold">
              Ítems devueltos
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-fg-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Producto</th>
                  <th className="px-4 py-2 text-right font-medium">Cant.</th>
                  <th className="px-4 py-2 text-left font-medium">Entregado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {devolucion.detalles.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-fg">{d.nombre_producto}</div>
                      {(d.talla || d.color) && (
                        <div className="text-xs text-fg-muted">
                          {[d.talla, d.color].filter(Boolean).join(' / ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-fg">{d.cantidad}</td>
                    <td className="px-4 py-2 text-fg">
                      {d.subtipo_cambio === 'otra_variante' && d.nombre_producto_entrega ? (
                        <>
                          <div>{d.nombre_producto_entrega}</div>
                          {(d.talla_entrega || d.color_entrega) && (
                            <div className="text-xs text-fg-muted">
                              {[d.talla_entrega, d.color_entrega].filter(Boolean).join(' / ')}
                            </div>
                          )}
                        </>
                      ) : d.subtipo_cambio === 'misma_variante' ? (
                        <span className="text-xs text-fg-muted">Misma variante</span>
                      ) : (
                        <span className="text-xs text-fg-subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
