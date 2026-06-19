'use client'

import type { CambioLineaState } from '@/lib/devoluciones/cambio-variante'
import { CambioVarianteFila } from './CambioVarianteFila'

export interface LineaCambioPanel {
  detalle_venta_id: string
  cantidad: number
  nombre_producto: string
  talla: string | null
  color: string | null
  precio_unitario: number
  producto_id: string | null
  es_kit_o_bundle: boolean
}

interface CambioVariantePanelProps {
  lineas: LineaCambioPanel[]
  cambioPorLinea: Record<string, CambioLineaState>
  onChange: (detalleVentaId: string, next: CambioLineaState) => void
}

export function CambioVariantePanel({
  lineas,
  cambioPorLinea,
  onChange,
}: CambioVariantePanelProps) {
  if (lineas.length === 0) return null

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-base font-semibold text-[#0A0A0A]">Detalle del cambio</h2>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Indicá qué variante entregás al cliente por cada ítem devuelto.
        </p>
      </div>
      <div className="p-4 space-y-3">
        {lineas.map((l) => (
          <CambioVarianteFila
            key={l.detalle_venta_id}
            detalleVentaId={l.detalle_venta_id}
            nombreProducto={l.nombre_producto}
            talla={l.talla}
            color={l.color}
            cantidad={l.cantidad}
            precioUnitario={l.precio_unitario}
            productoId={l.producto_id}
            esKitOBundle={l.es_kit_o_bundle}
            value={
              cambioPorLinea[l.detalle_venta_id] ?? { subtipo: 'misma_variante' }
            }
            onChange={(next) => onChange(l.detalle_venta_id, next)}
          />
        ))}
      </div>
    </div>
  )
}
