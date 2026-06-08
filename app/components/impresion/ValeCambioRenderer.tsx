import type { PayloadTicketVenta } from '@/lib/impresion/types'

function formatARS(n: number, simbolo: string = '$') {
  const fixed = (Math.round(n * 100) / 100).toFixed(2).replace('.', ',')
  const [int, dec] = fixed.split(',')
  const intWithSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${simbolo} ${intWithSep},${dec}`
}

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
 * Slip compacto de "vale de cambio" — se imprime como segundo documento
 * junto al ticket de venta cuando dias_cambio > 0 en la configuración.
 */
export function ValeCambioRenderer({ payload, diasCambio }: Props) {
  const t = payload.tienda
  const ancho = t.ancho_mm || 80
  const sym = t.simbolo_moneda || '$'
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
      {/* Encabezado */}
      <div
        style={{
          textAlign: 'center',
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
          padding: '4px 0',
          marginBottom: '4px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
          {t.razon_social || t.nombre}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', marginTop: '2px' }}>
          VALE DE CAMBIO
        </div>
      </div>

      {/* Referencia — mismo formato que ticket de venta */}
      <div style={{ marginBottom: '4px' }}>
        <div>Ticket {payload.numero_ticket}</div>
        <div>Fecha:  {payload.fecha.split(' ')[0]}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Artículos — solo nombre y cantidad, compacto */}
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

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>Total:</span>
        <span style={{ fontWeight: 700 }}>{formatARS(payload.total, sym)}</span>
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

      {/* Espacio al pie para corte */}
      <div style={{ marginTop: '8px' }} />
    </div>
  )
}
