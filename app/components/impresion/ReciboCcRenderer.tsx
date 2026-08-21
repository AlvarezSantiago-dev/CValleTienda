import { TicketEncabezado } from './TicketEncabezado'
import type { PayloadReciboCc } from '@/lib/impresion/recibo-cc'

function formatARS(n: number, simbolo = '$') {
  const fixed = (Math.round(n * 100) / 100).toFixed(2).replace('.', ',')
  const [int, dec] = fixed.split(',')
  const intWithSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${simbolo} ${intWithSep},${dec}`
}

function Hr() {
  return <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
}

export function ReciboCcRenderer({ payload }: { payload: PayloadReciboCc }) {
  const t = payload.tienda
  const ancho = t.ancho_mm || 80
  const sym = t.simbolo_moneda || '$'

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
      <TicketEncabezado tienda={t} />
      <Hr />
      <div
        style={{
          border: '1px solid #000',
          textAlign: 'center',
          padding: '3px 4px',
          marginBottom: '4px',
          fontSize: '9px',
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 700 }}>RECIBO DE COBRO</div>
        <div>NO VÁLIDO COMO FACTURA</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Cuenta corriente</span>
        <span>{payload.fecha}</span>
      </div>
      <div>Cliente: {payload.clienteNombre}</div>
      {payload.concepto && <div>{payload.concepto}</div>}
      {payload.remitoNumero != null && <div>Remito #{String(payload.remitoNumero).padStart(5, '0')}</div>}
      <Hr />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Pagó</span>
        <span style={{ fontWeight: 700 }}>{formatARS(payload.monto, sym)}</span>
      </div>
      {payload.medioPago && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Medio</span>
          <span>{payload.medioPago}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Saldo anterior</span>
        <span>{formatARS(payload.saldoAnterior, sym)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>Saldo pendiente</span>
        <span>{formatARS(payload.saldoPosterior, sym)}</span>
      </div>
      <Hr />
      <div style={{ textAlign: 'center', fontSize: '9px' }}>Gracias</div>
    </div>
  )
}
