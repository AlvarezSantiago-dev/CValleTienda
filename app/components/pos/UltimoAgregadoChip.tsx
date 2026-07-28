'use client'

import type { CartItem } from './POSContainer'
import { useRubro } from '@/components/layout/RubroProvider'
import { totalLinea } from '@/lib/pos/totales-carrito'
import { formatARS } from '@/lib/format-moneda'

/** Unidades vendidas en cantidad continua (decimales) — no usan +/− */
const UNIDADES_DECIMALES = new Set(['kg', 'gramo', 'litro', 'metro', 'm2', 'm3', 'tonelada'])

interface UltimoAgregadoChipProps {
  item: CartItem
  onIncrement: () => void
  onDecrement: () => void
  onDismiss: () => void
}

export function UltimoAgregadoChip({ item, onIncrement, onDecrement, onDismiss }: UltimoAgregadoChipProps) {
  const { usarVar2 } = useRubro()
  const decimal = UNIDADES_DECIMALES.has(item.unidad_de_medida)
  const variante = [item.talla, usarVar2 ? item.color : null].filter(Boolean).join(' · ')
  const subtotal = totalLinea(item.precio_unitario, item.cantidad)

  return (
    <div className="flex items-center gap-3 bg-lime-50 border border-lime-200 rounded-xl px-4 py-2.5 shadow-sm">
      <div className="h-2 w-2 rounded-full bg-lime-500 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 truncate">
          {item.producto_nombre}
          {variante && <span className="text-gray-400 font-normal ml-1">· {variante}</span>}
          {item.es_pack && item.pack_cantidad && (
            <span className="ml-1.5 text-[10px] text-lime-700 bg-lime-100 border border-lime-200 px-1.5 py-0.5 rounded font-semibold">
              Pack ×{item.pack_cantidad}
            </span>
          )}
        </p>
        <p className="text-[11px] text-gray-400">
          {formatARS(item.precio_unitario)} c/u · Total: {formatARS(subtotal)}
        </p>
      </div>

      {!decimal ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onDecrement}
            className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors font-bold text-base leading-none"
            aria-label="Reducir cantidad"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-[14px] font-bold text-gray-900 tabular-nums">
            {item.cantidad}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700 transition-colors font-bold text-base leading-none"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>
      ) : (
        <span className="text-[13px] font-bold text-gray-700 tabular-nums shrink-0">
          {item.cantidad} {item.unidad_de_medida}
        </span>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="h-6 w-6 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors text-lg leading-none shrink-0"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}
