import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerDevolucionCompleta } from '@/lib/devoluciones/queries'
import { obtenerPrefijoTicket } from '@/lib/ventas/queries'
import { obtenerPayloadDevolucion } from '@/app/actions/impresion'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { TicketDevolucionRenderer } from '@/components/impresion/TicketDevolucionRenderer'
import { PrintButtonClient } from '@/components/ventas/PrintButtonClient'

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
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
            Devolución #{devolucion.numero_devolucion}
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            {new Date(devolucion.created_at).toLocaleString('es-AR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/devoluciones"
            className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            ← Volver
          </Link>
          <PrintButtonClient tipo="devolucion" id={devolucion.id} />
        </div>
      </div>

      <div className="print:hidden bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold mb-4">
          Vista previa del ticket
        </p>
        <div className="flex justify-center">
          <div className="shadow-md rounded border border-gray-200 overflow-hidden">
            {payloadDevolucion.ok && payloadDevolucion.data
              ? <TicketDevolucionRenderer payload={payloadDevolucion.data} />
              : <p className="text-sm text-gray-400 text-center py-4 px-6">No se pudo cargar el ticket.</p>
            }
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold">
            Venta original
          </p>
          <Link
            href={`/ventas/${devolucion.venta_id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-lime-700 hover:underline"
          >
            Venta {ticketVentaLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>

        {devolucion.cliente_id && devolucion.cliente_nombre && (
          <div className="bg-white border border-gray-100 rounded-xl px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold">
              Cliente
            </p>
            <Link
              href={`/clientes/${devolucion.cliente_id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-lime-700 hover:underline"
            >
              {devolucion.cliente_nombre}
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
