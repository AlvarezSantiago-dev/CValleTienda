import type { DevolucionCompleta } from '@/lib/devoluciones/queries'
import type { ConfiguracionTienda } from '@/lib/configuracion/queries'

interface TicketDevolucionProps {
  devolucion: DevolucionCompleta
  configuracion: ConfiguracionTienda | null
  tienda_nombre: string | null
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function TicketDevolucion({
  devolucion,
  configuracion: cfg,
  tienda_nombre,
}: TicketDevolucionProps) {
  const ancho = cfg?.ancho_ticket_mm ?? 80
  const tienda = cfg?.razon_social || tienda_nombre || 'Mi Tienda'

  return (
    <div
      className="ticket-print mx-auto bg-white text-gray-900 font-mono text-xs leading-snug"
      style={{ maxWidth: `${ancho}mm`, width: '100%' }}
    >
      <div className="text-center space-y-0.5 mb-2">
        <p className="text-sm font-bold uppercase">{tienda}</p>
        {cfg?.cuit && <p>CUIT: {cfg.cuit}</p>}
        {cfg?.condicion_iva && <p>{cfg.condicion_iva}</p>}
        {cfg?.direccion_legal && <p>{cfg.direccion_legal}</p>}
        <p className="text-sm font-bold mt-2 pt-2 border-t border-dashed border-gray-400 uppercase">
          Comprobante de Devolución
        </p>
      </div>

      <div className="flex justify-between">
        <span>Devolución #{devolucion.numero_devolucion}</span>
        <span>{formatDateTime(devolucion.created_at)}</span>
      </div>
      {devolucion.numero_ticket != null && (
        <p>Venta original: #{devolucion.numero_ticket}</p>
      )}
      {devolucion.usuario_nombre && <p>Atendió: {devolucion.usuario_nombre}</p>}
      {devolucion.cliente_nombre && <p>Cliente: {devolucion.cliente_nombre}</p>}
      <p>
        Tipo:{' '}
        <span className="font-bold uppercase">
          {devolucion.tipo === 'total' ? 'Total' : 'Parcial'}
        </span>
        {' · '}
        <span className="font-bold uppercase">
          {devolucion.tipo_resolucion === 'reembolso'
            ? 'Reembolso'
            : devolucion.tipo_resolucion === 'saldo_a_favor'
            ? 'Saldo a favor'
            : 'Cambio de producto'}
        </span>
      </p>

      <hr className="border-dashed border-gray-400 my-1" />

      <table className="w-full">
        <tbody>
          {devolucion.detalles.map((ln) => (
            <tr key={ln.id} className="align-top">
              <td className="pr-1 whitespace-nowrap">{ln.cantidad}×</td>
              <td className="w-full">
                <div>{ln.nombre_producto}</div>
                {(ln.talla || ln.color) && (
                  <div className="text-[10px] text-gray-600">
                    {[ln.talla, ln.color].filter(Boolean).join(' / ')}
                  </div>
                )}
                <div className="text-[10px] text-gray-600">
                  {formatARS(ln.precio_unitario)} c/u
                </div>
              </td>
              <td className="text-right whitespace-nowrap">
                {formatARS(ln.total_linea)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-dashed border-gray-400 my-1" />

      <div className="flex justify-between font-bold text-sm">
        <span>TOTAL DEVUELTO</span>
        <span>{formatARS(devolucion.total_devuelto)}</span>
      </div>

      <hr className="border-dashed border-gray-400 my-1" />

      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {devolucion.tipo_resolucion === 'reembolso'
          ? 'Egresos de caja'
          : devolucion.tipo_resolucion === 'saldo_a_favor'
          ? 'Saldo acreditado al cliente'
          : 'Cambio de producto — sin movimiento de dinero'}
      </p>
      <div className="space-y-0.5">
        {devolucion.pagos.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>
              {p.nombre_metodo}
              {p.referencia ? ` (${p.referencia})` : ''}
            </span>
            <span>{formatARS(p.monto)}</span>
          </div>
        ))}
        {devolucion.pagos.length === 0 && devolucion.tipo_resolucion !== 'reembolso' && (
          <p className="text-[10px] text-gray-500 italic">—</p>
        )}
      </div>

      <hr className="border-dashed border-gray-400 my-1" />

      <p className="whitespace-pre-line">
        <span className="font-bold">Motivo:</span> {devolucion.motivo}
      </p>

      {cfg?.texto_pie && (
        <>
          <hr className="border-dashed border-gray-400 my-1" />
          <p className="text-center whitespace-pre-line">{cfg.texto_pie}</p>
        </>
      )}

      <p className="text-center text-[10px] mt-2 text-gray-500">
        {devolucion.tipo_resolucion === 'reembolso'
          ? 'Este comprobante respalda el egreso de caja.'
          : devolucion.tipo_resolucion === 'saldo_a_favor'
          ? 'El saldo fue acreditado en la cuenta del cliente.'
          : 'Este comprobante respalda el cambio de producto.'}
      </p>
    </div>
  )
}
