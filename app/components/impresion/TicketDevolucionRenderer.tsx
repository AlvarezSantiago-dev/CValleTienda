import type { PayloadTicketDevolucion } from '@/lib/impresion/types'
import { formatPrecio } from './TicketVentaRenderer'

interface Props {
  payload: PayloadTicketDevolucion
}

export function TicketDevolucionRenderer({ payload }: Props) {
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
        {(t.direccion_legal || t.direccion) && (
          <div>{t.direccion_legal || t.direccion}</div>
        )}
      </div>

      <div
        style={{
          border: '1px solid #000',
          textAlign: 'center',
          padding: '3px 4px',
          marginTop: '4px',
          marginBottom: '4px',
          fontSize: '9px',
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '12px' }}>{payload.tipo_documento}</div>
        <div>COMPROBANTE INTERNO — NO VÁLIDO COMO FACTURA</div>
      </div>

      <Hr />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{payload.numero_devolucion}</span>
        <span>{payload.fecha}</span>
      </div>
      <div>Ticket venta {payload.venta_referencia}</div>
      {payload.fecha_venta && <div>Venta del {payload.fecha_venta}</div>}
      <div>Tipo: {payload.tipo === 'total' ? 'Total' : 'Parcial'}</div>
      {payload.vendedor && <div>Atendió: {payload.vendedor}</div>}
      {payload.cliente && (
        <div>
          Cliente: {payload.cliente.nombre}
          {payload.cliente.dni ? ` · DNI ${payload.cliente.dni}` : ''}
        </div>
      )}

      <Hr />

      <div style={{ marginBottom: '2px' }}>
        <strong>Motivo:</strong> {payload.motivo}
      </div>

      <Hr />

      <div style={{ marginBottom: '4px' }}>
        {payload.lineas.map((ln, i) => (
          <div key={i} style={{ marginBottom: '6px' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{ln.cantidad}×</span> {ln.nombre_producto}
            </div>
            {(ln.talla || ln.color) && (
              <div style={{ fontSize: '9px', color: '#444', paddingLeft: '12px' }}>
                {[ln.talla, ln.color].filter(Boolean).join(' / ')}
              </div>
            )}
            {ln.codigo_barras && (
              <div style={{ fontSize: '9px', color: '#444', paddingLeft: '12px' }}>
                Cód. {ln.codigo_barras}
              </div>
            )}
          </div>
        ))}
      </div>

      <Hr />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: '13px',
        }}
      >
        <span>TOTAL DEVUELTO</span>
        <span>{formatPrecio(payload.total_devuelto, sym)}</span>
      </div>

      {payload.pagos.length > 0 && (
        <>
          <Hr />
          <div style={{ fontSize: '10px', marginBottom: '2px' }}>Reintegro:</div>
          {payload.pagos.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {p.nombre_metodo}
                {p.referencia ? ` (${p.referencia})` : ''}
              </span>
              <span>{formatPrecio(p.monto, sym)}</span>
            </div>
          ))}
        </>
      )}

      {t.texto_pie && (
        <>
          <Hr />
          <div style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>{t.texto_pie}</div>
        </>
      )}
    </div>
  )
}

function Hr() {
  return <div style={{ borderTop: '1px dashed #555', margin: '4px 0' }} />
}
