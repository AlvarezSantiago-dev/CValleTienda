import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerVentaParaDevolucion } from '@/lib/ventas/queries'
import { obtenerDevolucionesPorVenta } from '@/lib/devoluciones/queries'
import { obtenerPayloadVenta } from '@/app/actions/impresion'
import { TicketVentaRenderer } from '@/components/impresion/TicketVentaRenderer'
import { PrintButtonClient } from '@/components/ventas/PrintButtonClient'
import { AnularVentaButton } from '@/components/ventas/AnularVentaButton'
import { TablaDevoluciones } from '@/components/devoluciones/TablaDevoluciones'
import { formatARS } from '@/lib/format'
import { obtenerEstadoFacturacion } from '@/app/actions/facturacion'
import { EmitirFacturaButton } from '@/components/ventas/EmitirFacturaButton'

interface VentaDetallePageProps {
  params: Promise<{ id: string }>
}

export default async function VentaDetallePage({ params }: VentaDetallePageProps) {
  const { id } = await params

  const venta = await obtenerVentaParaDevolucion(id)
  if (!venta) notFound()

  const [payloadTicket, devoluciones, estadoFacturacion] = await Promise.all([
    obtenerPayloadVenta(id),
    obtenerDevolucionesPorVenta(id),
    obtenerEstadoFacturacion(),
  ])

  const totalPagos = venta.pagos.reduce((acc, p) => acc + p.monto, 0)
  const vuelto = Math.max(0, Math.round((totalPagos - venta.total) * 100) / 100)

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
            Venta #{venta.numero_ticket}
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
          {venta.estado === 'completada' && (
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
            <AnularVentaButton ventaId={venta.id} numeroTicket={venta.numero_ticket} />
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

      {/* Ganancia bruta de esta venta */}
      {tieneCotos && (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-4 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold mb-3">
            Ganancia bruta de esta venta
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Costo total</p>
              <p className="text-lg font-semibold text-gray-700">{formatARS(costoTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ganancia</p>
              <p className={`text-lg font-semibold ${gananciaVenta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatARS(gananciaVenta)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Margen</p>
              <p className={`text-lg font-semibold ${
                margenVenta == null ? 'text-gray-400' :
                margenVenta >= 40 ? 'text-green-600' :
                margenVenta >= 20 ? 'text-yellow-600' : 'text-red-500'
              }`}>
                {margenVenta != null ? `${margenVenta}%` : '—'}
              </p>
            </div>
          </div>

          {/* Tabla de margen por línea */}
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-1 font-medium">Producto</th>
                <th className="text-right py-1 font-medium">Costo u.</th>
                <th className="text-right py-1 font-medium">Precio u.</th>
                <th className="text-right py-1 font-medium">Margen u.</th>
              </tr>
            </thead>
            <tbody>
              {venta.detalles.map((d) => {
                const margenLinea = d.costo_unitario > 0
                  ? Math.round(((d.precio_unitario - d.costo_unitario) / d.precio_unitario) * 1000) / 10
                  : null
                return (
                  <tr key={d.id} className="border-b border-gray-50">
                    <td className="py-1 text-gray-700">
                      {d.nombre_producto}
                      {d.talla && <span className="text-gray-400 ml-1">({d.talla})</span>}
                    </td>
                    <td className="py-1 text-right text-gray-500">
                      {d.costo_unitario > 0 ? formatARS(d.costo_unitario) : '—'}
                    </td>
                    <td className="py-1 text-right text-gray-700">{formatARS(d.precio_unitario)}</td>
                    <td className={`py-1 text-right font-medium ${
                      margenLinea == null ? 'text-gray-400' :
                      margenLinea >= 40 ? 'text-green-600' :
                      margenLinea >= 20 ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {margenLinea != null ? `${margenLinea}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
