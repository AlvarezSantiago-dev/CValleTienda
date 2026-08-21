import type { RemitoDetalle } from '@/lib/remitos/queries'
import { formatARS } from '@/lib/format'
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
  textoEncabezado?: string | null
}

// Cuántas filas mínimas en la tabla para que el talonario tenga altura correcta
const MIN_FILAS = 14

function fmtNum(n: number) {
  return String(n).padStart(5, '0')
}

function splitFecha(iso: string) {
  const d = new Date(iso)
  return {
    dia: String(d.getDate()).padStart(2, '0'),
    mes: String(d.getMonth() + 1).padStart(2, '0'),
    anio: String(d.getFullYear()),
  }
}

const cell: React.CSSProperties = {
  border: '1px solid #222',
  padding: '1.5mm 2mm',
  verticalAlign: 'middle',
}

const cellHeader: React.CSSProperties = {
  ...cell,
  background: '#fff',
  fontWeight: 700,
  fontSize: '8pt',
  textTransform: 'uppercase',
  textAlign: 'center',
  letterSpacing: '0.04em',
}

export function RemitoImprimibleClasico({
  remito,
  tiendaNombre,
  tiendaTelefono,
  tiendaDireccion,
  razonSocial,
  cuit,
  textoPie,
  logoUrl,
  textoEncabezado,
}: Props) {
  const nombreDisplay = razonSocial || tiendaNombre
  const totalItems = remito.items.reduce((a, i) => a + Number(i.total_linea), 0)
  const { dia, mes, anio } = splitFecha(remito.created_at)

  // Filas reales + vacías para completar el mínimo
  const filas = remito.items.length >= MIN_FILAS
    ? remito.items
    : [...remito.items, ...Array(MIN_FILAS - remito.items.length).fill(null)]

  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '8mm 10mm',
        boxSizing: 'border-box',
        fontSize: '10pt',
        lineHeight: 1.4,
        fontFamily: 'Arial, Helvetica, sans-serif',
        background: '#fff',
        color: '#000',
      }}
    >
      {/* ── ENCABEZADO ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3mm' }}>

        {/* ── IZQUIERDA: logo + nombre + teléfono + slogan ── */}
        <div style={{ flex: 1, paddingRight: '6mm' }}>
          {/* Logo + nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={52}
                height={52}
                unoptimized
                loading="eager"
                style={{ objectFit: 'contain', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#cc2222', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontSize: '20pt',
                fontWeight: 900, flexShrink: 0,
              }}>
                {nombreDisplay.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: '20pt', fontWeight: 900, lineHeight: 1.05, color: '#cc2222', letterSpacing: '-0.01em' }}>
                {nombreDisplay}
              </div>
              {razonSocial && razonSocial !== tiendaNombre && (
                <div style={{ fontSize: '9pt', color: '#555', marginTop: '1px' }}>{tiendaNombre}</div>
              )}
            </div>
          </div>

          {/* Teléfono */}
          {tiendaTelefono && (
            <div style={{ fontSize: '11pt', fontWeight: 700, marginTop: '3px' }}>
              ☎ {tiendaTelefono}
            </div>
          )}

          {/* CUIT */}
          {cuit && (
            <div style={{ fontSize: '8pt', color: '#555', marginTop: '1px' }}>CUIT: {cuit}</div>
          )}

          {/* Slogan / texto encabezado */}
          {textoEncabezado && (
            <div style={{
              marginTop: '4px',
              background: '#111',
              color: '#fff',
              fontWeight: 800,
              fontSize: '10pt',
              padding: '2px 6px',
              display: 'inline-block',
              letterSpacing: '0.03em',
            }}>
              {textoEncabezado}
            </div>
          )}
        </div>

        {/* ── DERECHA: fecha + dirección + número remito ── */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>

          {/* Fila: label FECHA + cuadros DÍA / MES / AÑO */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <span style={{ fontSize: '8pt', fontWeight: 700, paddingBottom: '3px', marginRight: '2px' }}>FECHA</span>
            {[
              { label: 'DÍA',  value: dia,  width: '13mm' },
              { label: 'MES',  value: mes,  width: '13mm' },
              { label: 'AÑO',  value: anio, width: '19mm' },
            ].map(({ label, value, width }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{
                  width,
                  height: '10mm',
                  border: '1.5px solid #222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10pt',
                  fontWeight: 700,
                  background: '#fff',
                }}>
                  {value}
                </div>
                <div style={{ fontSize: '7pt', fontWeight: 600, marginTop: '1px', color: '#222' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Dirección empresa */}
          {tiendaDireccion && (
            <div style={{ fontSize: '8.5pt', color: '#333', marginTop: '2px', lineHeight: 1.5, textAlign: 'right' }}>
              {tiendaDireccion.split(',').map((line, i) => (
                <div key={i}>{line.trim()}</div>
              ))}
            </div>
          )}

          {/* Número de remito */}
          <div style={{ marginTop: '3px', fontSize: '9pt', fontWeight: 800, letterSpacing: '0.02em' }}>
            REMITO N° {fmtNum(remito.numero_remito)}
          </div>
        </div>
      </div>

      {/* ── LÍNEA SEPARADORA ── */}
      <div style={{ borderTop: '1.5px solid #222', marginBottom: '3mm' }} />

      {/* ── DATOS DESTINATARIO ── */}
      <div style={{ marginBottom: '4mm' }}>
        <div style={{ display: 'flex', gap: '4mm', alignItems: 'baseline', marginBottom: '2mm' }}>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '10pt' }}>Señor/es:</span>
          <span style={{
            flex: 1,
            borderBottom: '1px dotted #555',
            paddingBottom: '1mm',
            fontSize: '10pt',
            minWidth: '60mm',
          }}>
            {remito.destinatario}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4mm', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '10pt' }}>Domicilio:</span>
          <span style={{
            flex: 1,
            borderBottom: '1px dotted #555',
            paddingBottom: '1mm',
            fontSize: '10pt',
          }}>
            {remito.direccion_entrega ?? ''}
          </span>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '4mm', fontSize: '10pt' }}>Telf:</span>
          <span style={{
            width: '38mm',
            borderBottom: '1px dotted #555',
            paddingBottom: '1mm',
            fontSize: '10pt',
          }}>
            {remito.telefono_entrega ?? ''}
          </span>
        </div>
      </div>

      {/* ── TABLA ARTÍCULOS ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
        <thead>
          <tr>
            <th style={{ ...cellHeader, width: '18mm' }}>Cantidad</th>
            <th style={{ ...cellHeader }}>Descripción</th>
            <th style={{ ...cellHeader, width: '26mm' }}>Unitario</th>
            <th style={{ ...cellHeader, width: '28mm' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((item, i) => (
            <tr key={i} style={{ height: '7.5mm' }}>
              <td style={{ ...cell, textAlign: 'center' }}>
                {item ? item.cantidad : ''}
              </td>
              <td style={{ ...cell }}>
                {item ? (
                  <>
                    {item.nombre_producto}
                    {(item.talla || item.color) && (
                      <span style={{ color: '#666', fontSize: '8pt' }}>
                        {' '}({[item.talla, item.color].filter(Boolean).join(' / ')})
                      </span>
                    )}
                  </>
                ) : ''}
              </td>
              <td style={{ ...cell, textAlign: 'right' }}>
                {item ? formatARS(Number(item.precio_unitario)) : ''}
              </td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: item ? 600 : 400 }}>
                {item ? formatARS(Number(item.total_linea)) : ''}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={3}
              style={{
                ...cell,
                textAlign: 'right',
                fontWeight: 800,
                fontSize: '11pt',
                letterSpacing: '0.04em',
                borderTop: '2px solid #222',
              }}
            >
              TOTAL
            </td>
            <td
              style={{
                ...cell,
                textAlign: 'right',
                fontWeight: 800,
                fontSize: '10pt',
                borderTop: '2px solid #222',
              }}
            >
              {formatARS(totalItems)}
            </td>
          </tr>
          {remito.tipo === 'cuenta_corriente' && (
            <>
              <tr>
                <td colSpan={3} style={{ ...cell, textAlign: 'right' }}>
                  Pagado (seña / cobros)
                </td>
                <td style={{ ...cell, textAlign: 'right' }}>
                  {formatARS(Number(remito.monto_cobrado ?? 0))}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ ...cell, textAlign: 'right', fontWeight: 800 }}>
                  Pendiente
                </td>
                <td style={{ ...cell, textAlign: 'right', fontWeight: 800 }}>
                  {formatARS(
                    Math.max(0, Number(remito.monto_total ?? 0) - Number(remito.monto_cobrado ?? 0))
                  )}
                </td>
              </tr>
            </>
          )}
        </tfoot>
      </table>

      {/* ── OBSERVACIONES (si hay) ── */}
      {remito.observaciones && (
        <div style={{ marginTop: '2mm', fontSize: '8pt', color: '#444', fontStyle: 'italic' }}>
          <strong>Obs:</strong> {remito.observaciones}
        </div>
      )}

      {/* ── LÍNEA SEPARADORA ANTES DE FIRMA ── */}
      <div style={{ borderTop: '1.5px solid #222', marginTop: '4mm' }} />

      {/* ── FIRMA: RECIBÍ CONFORME / ACLARACIÓN ── */}
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, borderRight: '1px solid #222', padding: '3mm 4mm 2mm' }}>
          <div style={{ borderBottom: '1px dotted #888', marginBottom: '2mm', paddingBottom: '9mm' }} />
          <div style={{ fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase', textAlign: 'center' }}>
            Recibí conforme
          </div>
        </div>
        <div style={{ flex: 1, padding: '3mm 4mm 2mm' }}>
          <div style={{ borderBottom: '1px dotted #888', marginBottom: '2mm', paddingBottom: '9mm' }} />
          <div style={{ fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase', textAlign: 'center' }}>
            Aclaración
          </div>
        </div>
      </div>

      {/* ── PIE LEGAL ── */}
      {textoPie && (
        <div style={{
          marginTop: '3mm',
          borderTop: '1px solid #ddd',
          paddingTop: '3mm',
          fontSize: '7.5pt',
          textAlign: 'center',
          color: '#333',
          lineHeight: 1.7,
          fontWeight: 500,
        }}>
          {textoPie.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* ── TELÉFONO AL PIE (igual que foto) ── */}
      {tiendaTelefono && (
        <div style={{
          marginTop: '3mm',
          textAlign: 'center',
          fontSize: '10pt',
          fontWeight: 700,
        }}>
          ☎ {tiendaTelefono}
        </div>
      )}
    </div>
  )
}
