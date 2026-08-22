'use client'

import { useRubro } from '@/components/layout/RubroProvider'
import type { ProductoPOS, VarianteResultado } from '@/lib/pos/queries'
import { formatARS } from '@/lib/format'
import { useEffect, useRef } from 'react'
import { esStockInfinito, formatStockDisplay } from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'

interface Props {
  producto: ProductoPOS
  onSelect: (v: VarianteResultado) => void
  onClose: () => void
}

export function VarianteSelector({ producto, onSelect, onClose }: Props) {
  const { labelVar1, labelVar2, usarVar1, usarVar2, rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)
  const panelRef = useRef<HTMLDivElement>(null)

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Cerrar al clickear fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [onClose])

  const tieneVar1 = usarVar1 && producto.variantes.some((v) => v.talla)
  const tieneVar2 = usarVar2 && producto.variantes.some((v) => v.color)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={panelRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">Seleccionar variante</p>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{producto.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5 flex-shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Header de columnas */}
        <div className="px-4 pt-2 pb-1 grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium">
          {(tieneVar1 || tieneVar2) && (
            <span className="col-span-5">
              {tieneVar1 && tieneVar2
                ? `${labelVar1} / ${labelVar2}`
                : tieneVar1
                  ? labelVar1
                  : labelVar2}
            </span>
          )}
          <span className={tieneVar1 || tieneVar2 ? 'col-span-4 text-right' : 'col-span-8 text-right'}>
            Precio
          </span>
          <span className="col-span-3 text-right">Stock</span>
        </div>

        {/* Lista de variantes */}
        <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-1">
          {producto.variantes.map((v) => {
            const partes: string[] = []
            if (tieneVar1 && v.talla) partes.push(v.talla)
            if (tieneVar2 && v.color) partes.push(v.color)
            if (v.es_pack) partes.push(v.pack_label ?? `Pack x${v.pack_cantidad ?? ''}`)
            const label = partes.length > 0 ? partes.join(' / ') : 'Unidad'

            return (
              <button
                key={v.id}
                onClick={() => { onSelect(v); onClose() }}
                className="w-full grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg text-sm hover:bg-primary-soft hover:text-fg-brand transition-colors text-left border border-transparent hover:border-primary-border"
              >
                {(tieneVar1 || tieneVar2) && (
                  <span className="col-span-5 font-medium flex items-center gap-1.5 truncate">
                    {(v.imagen_url || producto.imagen_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.imagen_url || producto.imagen_url || ''}
                        alt=""
                        className="w-8 h-8 rounded object-cover flex-shrink-0 bg-surface-sunken"
                      />
                    ) : tieneVar2 && v.color_hex ? (
                      <span
                        className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: v.color_hex }}
                      />
                    ) : null}
                    {label}
                  </span>
                )}
                <span className={`${tieneVar1 || tieneVar2 ? 'col-span-4' : 'col-span-9'} text-right font-semibold text-gray-900`}>
                  {formatARS(v.precio_venta)}
                </span>
                <span className={`col-span-3 text-right text-xs font-medium ${
                  esStockInfinito(v.stock_actual) && permiteInfinito
                    ? 'text-gray-500'
                    : v.stock_actual <= 3
                      ? 'text-orange-500'
                      : 'text-gray-500'
                }`}>
                  {formatStockDisplay(v.stock_actual, { corto: true, permiteInfinito })}
                  {!(esStockInfinito(v.stock_actual) && permiteInfinito) && (
                    <span className="text-gray-400"> u.</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
