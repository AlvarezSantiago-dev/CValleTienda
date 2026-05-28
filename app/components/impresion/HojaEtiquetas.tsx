import { EtiquetaRenderer } from './EtiquetaRenderer'
import type { PayloadEtiquetaProducto } from '@/lib/impresion/types'

interface Props {
  payload: PayloadEtiquetaProducto
}

/**
 * Hoja de etiquetas en formato CONTINUO: 1 etiqueta por página.
 * Cada item se expande según `cantidad` y se renderiza con salto de página.
 *
 * Decisión MVP: solo continuo (impresora tipo Brother QL / Zebra).
 * Si en el futuro queremos grilla A4, agregar branch sobre
 * plantilla.etiquetas_por_fila * etiquetas_por_col > 1.
 */
export function HojaEtiquetas({ payload }: Props) {
  const p = payload.plantilla

  // Expandir items según cantidad
  const expanded = payload.items.flatMap((item) =>
    Array.from({ length: item.cantidad }, (_, i) => ({ item, key: `${item.variante_id}-${i}` }))
  )

  return (
    <div className="etiquetas-print" data-etiqueta-ancho={p.ancho_mm} data-etiqueta-alto={p.alto_mm}>
      {expanded.map(({ item, key }, idx) => (
        <div
          key={key}
          style={{
            pageBreakAfter: idx < expanded.length - 1 ? 'always' : 'auto',
            breakAfter: idx < expanded.length - 1 ? 'page' : 'auto',
          }}
        >
          <EtiquetaRenderer
            item={item}
            plantilla={p}
            simboloMoneda={payload.simbolo_moneda}
            nombreTienda={payload.nombre_tienda}
          />
        </div>
      ))}
    </div>
  )
}
