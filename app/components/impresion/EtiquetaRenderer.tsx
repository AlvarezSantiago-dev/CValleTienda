import { CodigoBarrasSVG } from './CodigoBarrasSVG'
import { formatPrecio } from './TicketVentaRenderer'
import type { PayloadEtiquetaItem, PlantillaEtiquetaPayload } from '@/lib/impresion/types'

interface Props {
  item: PayloadEtiquetaItem
  plantilla: PlantillaEtiquetaPayload
  simboloMoneda?: string
  nombreTienda?: string | null
}

/** Reduce el tamaño de fuente para nombres largos evitando overflow. */
function fontSizeAdaptativo(base: number, largo: number): number {
  if (largo > 40) return Math.round(base * 0.75)
  if (largo > 25) return Math.round(base * 0.85)
  return base
}

/**
 * Renderiza UNA etiqueta individual con el tamaño y opciones de la plantilla.
 * Diseño profesional con jerarquía visual: tienda → nombre → talla/color → precio → barcode.
 */
export function EtiquetaRenderer({ item, plantilla: p, simboloMoneda = '$', nombreTienda }: Props) {
  const varianteLine = [
    p.mostrar_talla && item.talla ? item.talla : null,
    p.mostrar_color && item.color ? item.color : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const fzNombre = fontSizeAdaptativo(p.tamano_fuente_nombre, item.nombre_producto.length)
  const mostrarVariante = (p.mostrar_talla || p.mostrar_color) && varianteLine
  const mostrarFooter = (p.mostrar_barcode && item.codigo_barras) || (p.mostrar_codigo && item.codigo_barras)

  return (
    <div
      data-print-area="etiqueta"
      className="etiqueta-print"
      style={{
        width: `${p.ancho_mm}mm`,
        height: `${p.alto_mm}mm`,
        boxSizing: 'border-box',
        padding: '2mm 2.5mm',
        background: '#fff',
        color: '#000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        border: '0.5px solid #ccc',
        borderRadius: '1px',
      }}
    >
      {/* HEADER: nombre de tienda (opcional) */}
      {p.mostrar_nombre_tienda && nombreTienda && (
        <div
          style={{
            fontSize: '6px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            color: '#888',
            paddingBottom: '1mm',
            borderBottom: '0.3px solid #e0e0e0',
            marginBottom: '1mm',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {nombreTienda}
        </div>
      )}

      {/* BODY: nombre + variante */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {p.mostrar_nombre && (
          <div
            style={{
              fontSize: `${fzNombre}px`,
              fontWeight: 600,
              lineHeight: 1.15,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
            }}
          >
            {item.nombre_producto}
          </div>
        )}

        {mostrarVariante && (
          <div
            style={{
              fontSize: `${p.tamano_fuente_talla}px`,
              color: '#555',
              marginTop: '0.5mm',
              letterSpacing: '0.02em',
            }}
          >
            {varianteLine}
          </div>
        )}
      </div>

      {/* PRECIO */}
      {p.mostrar_precio && (
        <div
          style={{
            fontSize: `${p.tamano_fuente_precio}px`,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#000',
            borderTop: '0.3px solid #e0e0e0',
            paddingTop: '1mm',
            marginTop: '1mm',
          }}
        >
          {formatPrecio(item.precio, simboloMoneda)}
        </div>
      )}

      {/* FOOTER: barcode + código texto */}
      {mostrarFooter && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4mm',
            marginTop: '1mm',
          }}
        >
          {p.mostrar_barcode && item.codigo_barras && (
            <CodigoBarrasSVG
              code={item.codigo_barras}
              widthMm={Math.max(20, p.ancho_mm - 5)}
              heightMm={Math.max(5, Math.min(10, p.alto_mm * 0.3))}
              showText={false}
            />
          )}
          {p.mostrar_codigo && item.codigo_barras && (
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '6.5px',
                letterSpacing: '0.04em',
                color: '#333',
              }}
            >
              {item.codigo_barras}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

