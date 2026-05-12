import { CodigoBarrasSVG } from './CodigoBarrasSVG'
import { formatPrecio } from './TicketVentaRenderer'
import type { PayloadEtiquetaItem, PlantillaEtiquetaPayload } from '@/lib/impresion/types'

interface Props {
  item: PayloadEtiquetaItem
  plantilla: PlantillaEtiquetaPayload
  simboloMoneda?: string
}

/**
 * Renderiza UNA etiqueta individual con el tamaño y opciones de la plantilla.
 * Usado tanto en el preview como dentro de HojaEtiquetas para impresión.
 */
export function EtiquetaRenderer({ item, plantilla: p, simboloMoneda = '$' }: Props) {
  return (
    <div
      data-print-area="etiqueta"
      className="etiqueta-print"
      style={{
        width: `${p.ancho_mm}mm`,
        height: `${p.alto_mm}mm`,
        boxSizing: 'border-box',
        padding: '1mm 1.5mm',
        background: '#fff',
        color: '#000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        border: '0',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {p.mostrar_nombre && (
          <div
            style={{
              fontSize: `${p.tamano_fuente_nombre}px`,
              fontWeight: 600,
              lineHeight: 1.1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.nombre_producto}
          </div>
        )}

        {(p.mostrar_talla || p.mostrar_color) && (item.talla || item.color) && (
          <div
            style={{
              fontSize: `${p.tamano_fuente_talla}px`,
              color: '#333',
              marginTop: '0.5mm',
            }}
          >
            {[
              p.mostrar_talla && item.talla ? `T ${item.talla}` : null,
              p.mostrar_color && item.color ? item.color : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}

        {p.mostrar_precio && (
          <div
            style={{
              fontSize: `${p.tamano_fuente_precio}px`,
              fontWeight: 700,
              marginTop: '0.5mm',
            }}
          >
            {formatPrecio(item.precio, simboloMoneda)}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5mm',
        }}
      >
        {p.mostrar_barcode && item.codigo_barras && (
          <CodigoBarrasSVG
            code={item.codigo_barras}
            widthMm={Math.max(20, p.ancho_mm - 4)}
            heightMm={Math.max(6, Math.min(12, p.alto_mm * 0.35))}
            showText={false}
          />
        )}
        {p.mostrar_codigo && item.codigo_barras && (
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '7px',
              letterSpacing: '0.5px',
            }}
          >
            {item.codigo_barras}
          </div>
        )}
      </div>
    </div>
  )
}
