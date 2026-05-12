import type { PayloadTicketVenta } from '@/lib/impresion/types'

function formatARS(n: number, simbolo: string = '$') {
  const fixed = (Math.round(n * 100) / 100).toFixed(2).replace('.', ',')
  // separador de miles
  const [int, dec] = fixed.split(',')
  const intWithSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${simbolo} ${intWithSep},${dec}`
}

interface Props {
  payload: PayloadTicketVenta
}

/**
 * Render imprimible del ticket de venta. Usa el payload snapshot completo
 * que produce build_payload_ticket_venta. No depende de queries externas.
 */
export function TicketVentaRenderer({ payload }: Props) {
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
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
          {t.razon_social || t.nombre}
        </div>
        {t.cuit && <div>CUIT: {t.cuit}</div>}
        {t.condicion_iva && <div>{t.condicion_iva}</div>}
        {(t.direccion_legal || t.direccion) && <div>{t.direccion_legal || t.direccion}</div>}
        {t.telefono && <div>Tel: {t.telefono}</div>}
        {t.texto_encabezado && (
          <div style={{ whiteSpace: 'pre-line', marginTop: '2px' }}>{t.texto_encabezado}</div>
        )}
      </div>

      <Hr />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Ticket {payload.numero_ticket}</span>
        <span>{payload.fecha}</span>
      </div>
      {payload.vendedor && <div>Atendió: {payload.vendedor}</div>}
      {payload.cliente && (
        <div>
          Cliente: {payload.cliente.nombre}
          {payload.cliente.dni ? ` · DNI ${payload.cliente.dni}` : ''}
        </div>
      )}

      <Hr />

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {payload.lineas.map((ln, i) => (
            <tr key={i} style={{ verticalAlign: 'top' }}>
              <td style={{ paddingRight: '4px', whiteSpace: 'nowrap' }}>{ln.cantidad}×</td>
              <td style={{ width: '100%' }}>
                <div>{ln.nombre_producto}</div>
                {(ln.talla || ln.color) && (
                  <div style={{ fontSize: '9px', color: '#444' }}>
                    {[ln.talla, ln.color].filter(Boolean).join(' / ')}
                  </div>
                )}
                <div style={{ fontSize: '9px', color: '#444' }}>
                  {formatARS(ln.precio_unitario, sym)} c/u
                </div>
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {formatARS(ln.total_linea, sym)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Hr />

      <Row label="Subtotal" value={formatARS(payload.subtotal, sym)} />
      {payload.descuento > 0 && (
        <Row label="Descuento" value={`−${formatARS(payload.descuento, sym)}`} />
      )}
      <Row
        label="TOTAL"
        value={formatARS(payload.total, sym)}
        bold
        big
      />

      <Hr />

      {payload.pagos.map((p, i) => (
        <Row
          key={i}
          label={p.nombre_metodo + (p.referencia ? ` (${p.referencia})` : '')}
          value={formatARS(p.monto, sym)}
        />
      ))}

      {payload.observaciones && (
        <>
          <Hr />
          <div style={{ whiteSpace: 'pre-line' }}>Obs: {payload.observaciones}</div>
        </>
      )}

      {t.texto_pie && (
        <>
          <Hr />
          <div style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>{t.texto_pie}</div>
        </>
      )}

      {payload.factura && (
        <>
          <Hr />
          <div style={{ textAlign: 'center', marginBottom: '2px' }}>
            <div style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.5px' }}>
              FACTURA ELECTRÓNICA {payload.factura.tipo_comprobante}
            </div>
            <div style={{ fontSize: '9px' }}>N° {payload.factura.numero_comprobante}</div>
          </div>
          <div style={{ fontSize: '8px', color: '#333' }}>
            <div>CAE: {payload.factura.cae}</div>
            <div>Vence: {payload.factura.cae_vencimiento}</div>
          </div>
          {payload.factura.qr_afip && (
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(payload.factura.qr_afip)}`}
                alt="QR ARCA AFIP"
                width={60}
                height={60}
                style={{ display: 'inline-block' }}
              />
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '4px', color: '#555' }}>
        ¡Gracias por tu compra!
      </div>
    </div>
  )
}

function Hr() {
  return (
    <div
      style={{
        borderTop: '1px dashed #555',
        margin: '4px 0',
      }}
    />
  )
}

function Row({ label, value, bold, big }: { label: string; value: string; bold?: boolean; big?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: bold ? 700 : 400,
        fontSize: big ? '13px' : '11px',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export { formatARS as formatPrecio }
