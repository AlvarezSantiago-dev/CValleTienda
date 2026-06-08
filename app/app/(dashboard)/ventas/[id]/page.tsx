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
import { obtenerEstadoFacturacion } from '@/app/actions/facturacion'
import { EmitirFacturaButton } from '@/components/ventas/EmitirFacturaButton'
import { createClient } from '@/lib/supabase/server'

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
  const vuelto = Math.max(0, Math.round((totalPagos - venta.total) * 100) / 100)

  // Informacion rápida de pago para el cajero
  const mostrarVuelto = totalPagos > 0

  // Ganancia bruta de esta venta
  const tieneCotos = venta.detalles.some((d) => d.costo_unitario > 0)
  const costoTotal = venta.detalles.reduce((acc, d) => acc + d.costo_unitario * d.cantidad, 0)
  const gananciaVenta = venta.total - costoTotal
  const margenVenta = venta.total > 0 && tieneCotos
    ? Math.round((gananciaVenta / venta.total) * 1000) / 10
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
            Venta {ticketLabel}
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            {new Date(venta.created_at).toLocaleString('es-AR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ventas"
            className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            ← Volver
          </Link>
          {venta.estado === 'completada' && venta.total_disponible_devolver > 0 && (
            <Link
              href={`/devoluciones/nueva?venta_id=${venta.id}`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-sm font-medium text-amber-900"
            >
              ↩ Devolver
            </Link>
          )}
          {venta.estado === 'completada' && !esRopa && (
            <Link
              href={`/remitos/nuevo?venta_id=${venta.id}`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              Crear remito →
            </Link>
          )}
          {/* Botón emitir factura: solo si está activa la facturación y la venta no tiene CAE */}
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
          <PrintButtonClient tipo="venta" id={venta.id} diasCambio={payloadTicket.data?.tienda.dias_cambio} rubro={payloadTicket.data?.tienda.rubro} />
        </div>
      </div>

      {/* Vista previa del ticket — solo en pantalla, centrada. La impresión real
          la maneja PrintButtonClient arriba (portal/PrintBridge). */}
      <div className="print:hidden bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold mb-4">
          Vista previa del ticket
        </p>
        <div className="flex justify-center">
          <div className="shadow-md rounded border border-gray-200 overflow-hidden">
            {payloadTicket.ok && payloadTicket.data
              ? <TicketVentaRenderer payload={payloadTicket.data} />
              : <p className="text-sm text-gray-400 text-center py-4 px-6">No se pudo cargar el ticket.</p>
            }
          </div>
        </div>
      </div>

      {venta.cliente_id && venta.cliente_nombre && (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-4 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold">
            Cliente
          </p>
          <Link
            href={`/clientes/${venta.cliente_id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-lime-700 hover:underline"
          >
            {venta.cliente_nombre}
            <span aria-hidden>→</span>
          </Link>
          {(venta.cliente_dni || venta.cliente_telefono) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[venta.cliente_dni, venta.cliente_telefono].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      {mostrarVuelto && (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-4 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold mb-3">
            Pago y vuelto
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total pagado</p>
              <p className="text-lg font-semibold text-gray-700">{formatARS(totalPagos)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vuelto</p>
              <p className="text-lg font-semibold text-blue-700">{formatARS(vuelto)}</p>
            </div>
          </div>
        </div>
      )}

      {devoluciones.length > 0 && (
        <div className="space-y-2 print:hidden">
          <h2 className="text-base font-semibold text-gray-900">
            Devoluciones de esta venta
          </h2>
          <TablaDevoluciones items={devoluciones} contexto="venta" showPrint />
        </div>
      )}

      {/* Bloque de Factura Electrónica si ya fue emitida */}
      {venta.numero_comprobante && (
        <div className={`border rounded-xl px-6 py-4 print:hidden space-y-1 ${venta.cae ? 'bg-lime-50 border-lime-100' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-[10px] uppercase tracking-[0.10em] font-semibold ${venta.cae ? 'text-lime-600' : 'text-amber-600'}`}>
            {venta.cae ? '✓ ' : '⚠️ '}Factura Electrónica AFIP · {venta.tipo_comprobante}
          </p>
          <p className="text-sm font-semibold text-[#0A0A0A]">
            N° {venta.numero_comprobante}
          </p>
          {venta.cae ? (
            <p className="text-xs text-gray-600">
              CAE: {venta.cae}
              {venta.cae_vencimiento && (
                <> · Vence: {new Date(venta.cae_vencimiento).toLocaleDateString('es-AR')}</>
              )}
            </p>
          ) : (
            <p className="text-xs text-amber-700 font-medium">
              El comprobante fue emitido ante AFIP pero el CAE no quedó registrado en el sistema
              (posible error de conexión al guardar). Si reemitís, verificá con AFIP si ya existe
              un comprobante para evitar duplicados.
            </p>
          )}
          {venta.cuit_receptor && (
            <p className="text-xs text-gray-500">Receptor: CUIT {venta.cuit_receptor}</p>
          )}
          <div className="flex items-start gap-6 mt-2 flex-wrap">
            {venta.pdf_url && (
              <a
                href={venta.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-lime-700 hover:text-lime-800 underline"
              >
                📄 Descargar PDF de la factura
              </a>
            )}
            {venta.qr_afip && (
              <a
                href={venta.qr_afip}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-lime-700 hover:text-lime-800 underline"
                title="Ver QR AFIP"
              >
                🔲 Ver QR AFIP
              </a>
            )}
          </div>
          {venta.qr_afip && (
            <div className="mt-3 pt-3 border-t border-lime-200">
              <p className="text-[10px] text-gray-400 mb-1.5">Código QR AFIP</p>
              <img
                src={venta.qr_afip}
                alt="QR AFIP"
                className="w-28 h-28 border border-lime-200 rounded-lg bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Margen de ganancia de esta venta */}
      {tieneCotos && esOwner && (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-4 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold mb-3">
            Margen de ganancia de esta venta
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <p className="text-xs text-gray-500">Margen</p>
              <p className={`text-lg font-semibold ${
                margenVenta == null ? 'text-gray-400' :
                margenVenta >= 40 ? 'text-green-600' :
                margenVenta >= 20 ? 'text-yellow-600' : 'text-red-500'
              }`}>
                {margenVenta != null ? `${margenVenta}%` : '—'}
              </p>
            </div>
            <div className="sm:col-span-2 text-sm text-gray-500 leading-6">
              El margen es la única información de rentabilidad que se muestra aquí. Los vendedores y cajeros no pueden ver detalles de costo ni la ganancia bruta de la venta.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
