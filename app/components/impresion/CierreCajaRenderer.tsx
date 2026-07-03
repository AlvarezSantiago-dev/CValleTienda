import type { PayloadCierreCaja } from '@/lib/impresion/types'
import { formatPrecio } from './TicketVentaRenderer'

interface Props {
  payload: PayloadCierreCaja
}

export function CierreCajaRenderer({ payload }: Props) {
  const sym = payload.tienda.simbolo_moneda || '$'
  const ancho = payload.tienda.ancho_mm || 80

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
          {payload.tienda.razon_social || payload.tienda.nombre}
        </div>
        {payload.tienda.cuit && <div>CUIT: {payload.tienda.cuit}</div>}
      </div>

      <div
        style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '14px',
          marginTop: '4px',
          letterSpacing: '1px',
        }}
      >
        CIERRE DE CAJA
      </div>

      <Hr />

      <Row label="Apertura" value={payload.fecha_apertura} />
      <Row label="Cierre" value={payload.fecha_cierre} />
      {payload.usuario && <Row label="Cajero" value={payload.usuario} />}

      <Hr />

      <Row label="Ventas (cant.)" value={String(payload.total_ventas_cantidad)} />
      <Row label="Ventas (monto)" value={formatPrecio(payload.total_ventas_monto, sym)} />
      <Row label="Devol. (cant.)" value={String(payload.total_devoluciones_cantidad)} />
      <Row label="Devol. (monto)" value={formatPrecio(payload.total_devoluciones_monto, sym)} />
      {(payload.total_devoluciones_credito ?? 0) > 0 && (
        <>
          <Row
            label="  Reintegros"
            value={formatPrecio(payload.total_devoluciones_reintegro ?? 0, sym)}
          />
          <Row
            label="  Saldo a favor"
            value={formatPrecio(payload.total_devoluciones_credito ?? 0, sym)}
          />
        </>
      )}
      <Row label="NETO" value={formatPrecio(payload.total_neto, sym)} bold />

      <Hr />

      <Row
        label="Apertura efectivo"
        value={formatPrecio(payload.monto_apertura_efectivo, sym)}
      />
      <Row
        label="Esperado en caja"
        value={formatPrecio(payload.efectivo_esperado, sym)}
      />
      {payload.efectivo_declarado != null && (
        <Row
          label="Declarado"
          value={formatPrecio(payload.efectivo_declarado, sym)}
        />
      )}
      {payload.diferencia_efectivo != null && (
        <Row
          label="Diferencia"
          value={formatPrecio(payload.diferencia_efectivo, sym)}
          bold
        />
      )}

      {payload.detalle_por_cuenta.length > 0 && (
        <>
          <Hr />
          <div style={{ fontSize: '10px', marginBottom: '2px' }}>Detalle por cuenta:</div>
          {payload.detalle_por_cuenta.map((d, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: 600 }}>{d.nombre_cuenta}</div>
              <Row label="  Ingresos" value={formatPrecio(d.total_ingresos, sym)} />
              <Row label="  Egresos" value={formatPrecio(d.total_egresos, sym)} />
              {d.comision > 0 && (
                <Row label="  Comisión" value={formatPrecio(d.comision, sym)} />
              )}
              <Row label="  Neto" value={formatPrecio(d.total_neto, sym)} />
              <Row label="  Saldo" value={formatPrecio(d.saldo_nuevo, sym)} />
            </div>
          ))}
        </>
      )}

      {payload.observaciones && (
        <>
          <Hr />
          <div style={{ whiteSpace: 'pre-line' }}>Obs: {payload.observaciones}</div>
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '4px', color: '#555' }}>
        Comprobante interno
      </div>
    </div>
  )
}

function Hr() {
  return <div style={{ borderTop: '1px dashed #555', margin: '4px 0' }} />
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
