import type { PayloadTicketVenta } from '@/lib/impresion/types'
import { TicketEncabezado } from './TicketEncabezado'

function calcularFechaLimite(fechaTicket: string, dias: number): string {
  const [dd, mm, yyyy] = fechaTicket.split(' ')[0].split('/')
  const base = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  base.setDate(base.getDate() + dias)
  return base.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface Props {
  payload: PayloadTicketVenta
  diasCambio: number
}

/**
 * Slip compacto de "vale de cambio" — sin importes, para regalo o cambio.
 * Referencia la venta por numero_ticket (T-0042) para búsqueda en el sistema.
 */
export function ValeCambioRenderer({ payload, diasCambio }: Props) {
  const t = payload.tienda
  const ancho = t.ancho_mm || 80
  const fechaVenta = payload.fecha.split(' ')[0]
  const fechaLimite = calcularFechaLimite(payload.fecha, diasCambio)

  return (
    <div
      data-print-area="ticket"
      className="ticket-print"
      style={{
        width: `${ancho}mm`,
        maxWidth: `${ancho}mm`,
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: 1.3,
        color: '#000',
        background: '#fff',
        padding: '2mm',
        boxSizing: 'border-box',
      }}
    >
      <TicketEncabezado tienda={t} mostrarTelefono={false} mostrarEncabezado={false} />
      <div
        style={{
          textAlign: 'center',
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
          padding: '4px 0',
          marginBottom: '4px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
          VALE DE CAMBIO
        </div>
      </div>

      {/* Ticket de venta — clave de búsqueda en el sistema */}
      <div
        style={{
          border: '1px solid #000',
          textAlign: 'center',
          padding: '6px 4px',
          marginBottom: '4px',
        }}
      >
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Ticket de venta N°
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0' }}>
          {payload.numero_ticket}
        </div>
        <div style={{ fontSize: '10px' }}>Fecha: {fechaVenta}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Artículos — solo nombre y cantidad */}
      <div style={{ marginBottom: '4px' }}>
        {payload.lineas.map((ln, i) => {
          const variante = [ln.talla, ln.color].filter(Boolean).join('/')
          return (
            <div key={i}>
              <span style={{ fontWeight: 600 }}>{ln.cantidad}x</span>{' '}
              {ln.nombre_producto}
              {variante && <span style={{ color: '#444' }}> ({variante})</span>}
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      <div
        style={{
          textAlign: 'center',
          fontSize: '10px',
          lineHeight: 1.4,
          marginBottom: '4px',
        }}
      >
        Para cambios, presentar este vale de cambio en el mostrador.
      </div>

      {/* Sección de validez — destacada */}
      <div
        style={{
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
          textAlign: 'center',
          padding: '5px 0',
          margin: '4px 0',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '12px' }}>
          VÁLIDO HASTA: {fechaLimite}
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>
          ({diasCambio} días con ticket)
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px' }}>
        Conservar este comprobante
      </div>

      <div style={{ marginTop: '8px' }} />
    </div>
  )
}
