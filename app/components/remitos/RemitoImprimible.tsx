import type { RemitoDetalle } from '@/lib/remitos/queries'
import { formatARS, formatDate } from '@/lib/format'
import Image from 'next/image'

interface Props {
  remito: RemitoDetalle
  tiendaNombre: string
  tiendaTelefono: string | null
  tiendaDireccion: string | null
  razonSocial: string | null
  cuit: string | null
  textoPie: string | null
  logoUrl?: string | null
}

function fmt(iso: string) {
  return formatDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtNum(n: number) {
  return String(n).padStart(5, '0')
}

export function RemitoImprimible({
  remito,
  tiendaNombre,
  tiendaTelefono,
  tiendaDireccion,
  razonSocial,
  cuit,
  textoPie,
  logoUrl,
}: Props) {
  const nombreDisplay = razonSocial || tiendaNombre
  const totalItems = remito.items.reduce((a, i) => a + Number(i.total_linea), 0)
  const totalUnidades = remito.items.reduce((a, i) => a + Number(i.cantidad), 0)

  return (
    <div
      className="bg-white font-sans text-gray-900 print:block"
      style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '12mm 14mm', boxSizing: 'border-box', fontSize: '11pt', lineHeight: '1.5' }}
    >
      {/* ── ENCABEZADO ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '8mm', marginBottom: '6mm' }}>
        {/* Logo / nombre empresa */}
        <div style={{ flex: 1 }}>
          {/* Placeholder logo: iniciales en cuadrado de color */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={52}
                height={52}
                unoptimized
                style={{ objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18pt', fontWeight: 700, flexShrink: 0 }}>
                {nombreDisplay.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: '16pt', fontWeight: 700, lineHeight: 1.2 }}>{nombreDisplay}</div>
              {razonSocial && razonSocial !== tiendaNombre && (
                <div style={{ fontSize: '9pt', color: '#64748b' }}>{tiendaNombre}</div>
              )}
            </div>
          </div>
          <div style={{ marginTop: '4px', fontSize: '9pt', color: '#475569' }}>
            {tiendaDireccion && <div>{tiendaDireccion}</div>}
            {tiendaTelefono  && <div>Tel: {tiendaTelefono}</div>}
            {cuit            && <div>CUIT: {cuit}</div>}
          </div>
        </div>

        {/* Bloque REMITO */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '24pt', fontWeight: 800, letterSpacing: '-0.5px', color: '#1e293b', lineHeight: 1 }}>REMITO</div>
          <div style={{ fontSize: '20pt', fontWeight: 700, color: '#334155', marginTop: '2px' }}>N° {fmtNum(remito.numero_remito)}</div>
          <div style={{ marginTop: '6px', fontSize: '9pt', color: '#64748b', textAlign: 'right' }}>
            <div>Fecha: <strong>{fmt(remito.created_at)}</strong></div>
            {remito.fecha_entrega && (
              <div>Entrega: <strong>{fmt(remito.fecha_entrega)}</strong></div>
            )}
            {remito.venta_numero && (
              <div>Venta N°: <strong>{fmtNum(remito.venta_numero)}</strong></div>
            )}
          </div>
        </div>
      </div>

      {/* ── REMITENTE / DESTINATARIO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '6mm' }}>
        {/* Remitente */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4mm 5mm' }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: '3px' }}>Remitente</div>
          <div style={{ fontWeight: 600 }}>{nombreDisplay}</div>
          {tiendaDireccion && <div style={{ fontSize: '10pt', color: '#475569' }}>{tiendaDireccion}</div>}
          {tiendaTelefono  && <div style={{ fontSize: '10pt', color: '#475569' }}>Tel: {tiendaTelefono}</div>}
          {cuit            && <div style={{ fontSize: '10pt', color: '#475569' }}>CUIT: {cuit}</div>}
        </div>

        {/* Destinatario */}
        <div style={{ border: '2px solid #1e293b', borderRadius: '6px', padding: '4mm 5mm' }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: '3px' }}>Destinatario</div>
          <div style={{ fontWeight: 600, fontSize: '12pt' }}>{remito.destinatario}</div>
          {remito.direccion_entrega && <div style={{ fontSize: '10pt', color: '#475569' }}>{remito.direccion_entrega}</div>}
          {remito.telefono_entrega  && <div style={{ fontSize: '10pt', color: '#475569' }}>Tel: {remito.telefono_entrega}</div>}
        </div>
      </div>

      {/* ── TABLA DE ARTÍCULOS ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '10pt' }}>
        <thead>
          <tr style={{ background: '#1e293b', color: '#fff' }}>
            <th style={{ padding: '3mm 4mm', textAlign: 'left', fontWeight: 600 }}>Artículo</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'left', fontWeight: 600, width: '15%' }}>Variante</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'center', fontWeight: 600, width: '10%' }}>Cant.</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'right', fontWeight: 600, width: '15%' }}>Precio unit.</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'right', fontWeight: 600, width: '15%' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {remito.items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '4mm', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
                Sin artículos cargados
              </td>
            </tr>
          ) : (
            remito.items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '2.5mm 4mm', fontWeight: 500 }}>{item.nombre_producto}</td>
                <td style={{ padding: '2.5mm 4mm', color: '#64748b' }}>
                  {[item.talla, item.color].filter(Boolean).join(' / ') || '—'}
                </td>
                <td style={{ padding: '2.5mm 4mm', textAlign: 'center' }}>{item.cantidad}</td>
                <td style={{ padding: '2.5mm 4mm', textAlign: 'right' }}>{formatARS(Number(item.precio_unitario))}</td>
                <td style={{ padding: '2.5mm 4mm', textAlign: 'right', fontWeight: 600 }}>{formatARS(Number(item.total_linea))}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #1e293b' }}>
            <td colSpan={2} style={{ padding: '3mm 4mm', fontSize: '9pt', color: '#64748b' }}>
              {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'} en total
            </td>
            <td colSpan={3} style={{ padding: '3mm 4mm', textAlign: 'right' }}>
              <span style={{ fontSize: '9pt', color: '#64748b', marginRight: '8px' }}>TOTAL</span>
              <span style={{ fontSize: '14pt', fontWeight: 700 }}>{formatARS(totalItems)}</span>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── OBSERVACIONES ── */}
      {remito.observaciones && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3mm 4mm', marginBottom: '6mm', fontSize: '10pt' }}>
          <span style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.08em' }}>Observaciones: </span>
          {remito.observaciones}
        </div>
      )}

      {/* ── FIRMAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8mm', marginTop: '14mm' }}>
        {[
          { label: 'Entregó', nombre: remito.usuario_nombre },
          { label: 'Transportista', nombre: null },
          { label: 'Recibí conforme', nombre: remito.destinatario },
        ].map(({ label, nombre }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            {nombre && (
              <div style={{ fontSize: '9pt', color: '#64748b', marginBottom: '12mm' }}>{nombre}</div>
            )}
            {!nombre && <div style={{ marginBottom: '16mm' }} />}
            <div style={{ borderTop: '1.5px solid #334155', paddingTop: '2mm' }}>
              <div style={{ fontSize: '9pt', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: '8pt', color: '#94a3b8', marginTop: '1mm' }}>Aclaración y firma</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PIE ── */}
      <div style={{ marginTop: '10mm', borderTop: '1px solid #e2e8f0', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#94a3b8' }}>
        <span>{textoPie || nombreDisplay}</span>
        <span>Remito N° {fmtNum(remito.numero_remito)} — {fmt(remito.created_at)}</span>
      </div>
    </div>
  )
}

