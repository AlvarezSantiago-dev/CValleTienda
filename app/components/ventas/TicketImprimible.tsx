import type { ConfiguracionTienda } from '@/lib/configuracion/queries'

export interface TicketLinea {
  cantidad: number
  nombre_producto: string
  talla: string | null
  color: string | null
  precio_unitario: number
  total_linea: number
}

export interface TicketPago {
  nombre_metodo: string
  monto: number
  referencia?: string | null
}

export interface TicketDatos {
  numero_ticket: number
  fecha: string
  cliente_nombre?: string | null
  usuario_nombre?: string | null
  lineas: TicketLinea[]
  subtotal: number
  descuento: number
  total: number
  pagos: TicketPago[]
  vuelto?: number
  observaciones?: string | null
  configuracion: ConfiguracionTienda | null
  tienda_nombre?: string | null
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

interface Props {
  ticket: TicketDatos
}

/**
 * Render compatible con tickets de 58/80mm y con `window.print()`.
 * Usa estilos inline + clases para que la modal tenga buen aspecto en pantalla
 * y se imprima limpio.
 */
export function TicketImprimible({ ticket }: Props) {
  const cfg = ticket.configuracion
  const ancho = cfg?.ancho_ticket_mm ?? 80
  const tienda = cfg?.razon_social || ticket.tienda_nombre || 'Mi Tienda'

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
        {cfg?.texto_encabezado && (
          <p className="whitespace-pre-line">{cfg.texto_encabezado}</p>
        )}
      </div>

      <hr className="border-dashed border-gray-400 my-1" />

      <div className="flex justify-between">
        <span>
          Ticket {cfg?.prefijo_ticket ?? ''}#{ticket.numero_ticket}
        </span>
        <span>{formatDateTime(ticket.fecha)}</span>
      </div>
      {ticket.usuario_nombre && <p>Atendió: {ticket.usuario_nombre}</p>}
      {ticket.cliente_nombre && <p>Cliente: {ticket.cliente_nombre}</p>}

      <hr className="border-dashed border-gray-400 my-1" />

      <table className="w-full">
        <tbody>
          {ticket.lineas.map((ln, i) => (
            <tr key={i} className="align-top">
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

      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatARS(ticket.subtotal)}</span>
        </div>
        {ticket.descuento > 0 && (
          <div className="flex justify-between">
            <span>Descuento</span>
            <span>−{formatARS(ticket.descuento)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span>{formatARS(ticket.total)}</span>
        </div>
      </div>

      <hr className="border-dashed border-gray-400 my-1" />

      <div className="space-y-0.5">
        {ticket.pagos.map((p, i) => (
          <div key={i} className="flex justify-between">
            <span>{p.nombre_metodo}</span>
            <span>{formatARS(p.monto)}</span>
          </div>
        ))}
        {ticket.vuelto != null && ticket.vuelto > 0 && (
          <div className="flex justify-between">
            <span>Vuelto</span>
            <span>{formatARS(ticket.vuelto)}</span>
          </div>
        )}
      </div>

      {ticket.observaciones && (
        <>
          <hr className="border-dashed border-gray-400 my-1" />
          <p className="whitespace-pre-line">Obs: {ticket.observaciones}</p>
        </>
      )}

      {cfg?.texto_pie && (
        <>
          <hr className="border-dashed border-gray-400 my-1" />
          <p className="text-center whitespace-pre-line">{cfg.texto_pie}</p>
        </>
      )}

      <p className="text-center text-[10px] mt-2 text-gray-500">
        ¡Gracias por tu compra!
      </p>
    </div>
  )
}
