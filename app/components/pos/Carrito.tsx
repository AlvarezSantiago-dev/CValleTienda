'use client'

import type { CartItem } from './POSContainer'
import { useRubro } from '@/components/layout/RubroProvider'

interface CarritoProps {
  items: CartItem[]
  onUpdate: (id: string, patch: Partial<CartItem>) => void
  onRemove: (id: string) => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

/** Unidades que no admiten decimales (se venden en piezas enteras) */
const UNIDADES_ENTERAS = new Set(['unidad', 'pack', 'caja', 'bolsa'])

function esDecimal(unidad: string) {
  return !UNIDADES_ENTERAS.has(unidad)
}

function formatCantidad(cantidad: number, unidad: string) {
  if (esDecimal(unidad)) {
    return `${cantidad.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${unidad}`
  }
  return `${cantidad} ${unidad}`
}

export function Carrito({ items, onUpdate, onRemove }: CarritoProps) {
  const { labelVar1, labelVar2, usarVar2 } = useRubro()

  const totalBruto = items.reduce((acc, it) => acc + it.precio_unitario * it.cantidad, 0)
  const hayStockExcedido = items.some((it) => it.cantidad > it.stock_actual)

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-gray-900">Carrito</h2>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-lime-100 text-lime-800 text-[11px] font-bold">
              {items.length}
            </span>
          )}
          {hayStockExcedido && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              ⚠ Stock insuficiente
            </span>
          )}
        </div>
        {items.length > 0 && (
          <span className="text-[14px] font-bold text-gray-900 tabular-nums">
            {formatARS(totalBruto)}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center px-6">
          <div className="h-10 w-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">
            🛒
          </div>
          <p className="text-[13px] font-medium text-gray-500">Carrito vacío</p>
          <p className="text-[12px] text-gray-400">Escaneá o buscá un producto para agregarlo.</p>
        </div>
      ) : (
        <>
          {/* Vista móvil */}
          <div className="sm:hidden divide-y divide-gray-50">
            {items.map((it) => {
              const subtotal = it.precio_unitario * it.cantidad
              const decimal = esDecimal(it.unidad_de_medida)
              const stockExcedido = it.cantidad > it.stock_actual
              return (
                <div key={it.id} className={`p-4 ${stockExcedido ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{it.producto_nombre}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {[it.talla, usarVar2 ? it.color : null].filter(Boolean).join(' · ') || '—'}
                        {' · stock: '}
                        {formatCantidad(it.stock_actual, it.unidad_de_medida)}
                      </p>
                      {stockExcedido && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">⚠ Excede stock disponible</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(it.id)}
                      className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors text-lg leading-none"
                      aria-label="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-gray-400 font-medium">Cant.</label>
                      <input
                        type="number"
                        min={decimal ? 0.001 : 1}
                        step={decimal ? 0.001 : 1}
                        value={it.cantidad}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value)
                          const min = decimal ? 0.001 : 1
                          const val = isNaN(raw) ? min : Math.max(min, raw)
                          onUpdate(it.id, { cantidad: decimal ? val : Math.floor(val) })
                        }}
                        className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400"
                      />
                      {decimal && (
                        <span className="text-[11px] text-gray-400">{it.unidad_de_medida}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-gray-400 font-medium">$</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={it.precio_unitario}
                        onChange={(e) =>
                          onUpdate(it.id, {
                            precio_unitario: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-28 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400"
                      />
                    </div>
                    <span className="ml-auto text-[13px] font-bold text-gray-900 tabular-nums">
                      {formatARS(subtotal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Vista desktop */}
          <div className="hidden sm:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left border-b border-gray-50">
                  <th className="px-4 py-2.5 bg-gray-50/60">Producto</th>
                  <th className="px-4 py-2.5 bg-gray-50/60 w-36">Cantidad</th>
                  <th className="px-4 py-2.5 bg-gray-50/60 w-36">Precio unit.</th>
                  <th className="px-4 py-2.5 bg-gray-50/60 text-right w-32">Subtotal</th>
                  <th className="px-4 py-2.5 bg-gray-50/60 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((it) => {
                  const subtotal = it.precio_unitario * it.cantidad
                  const decimal = esDecimal(it.unidad_de_medida)
                  const stockExcedido = it.cantidad > it.stock_actual
                  return (
                    <tr key={it.id} className={`group transition-colors ${stockExcedido ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-900">{it.producto_nombre}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {[it.talla, usarVar2 ? it.color : null].filter(Boolean).join(' · ') || labelVar1}
                          {' · '}
                          <span className={stockExcedido ? 'text-red-500 font-medium' : ''}>
                            stock: {formatCantidad(it.stock_actual, it.unidad_de_medida)}
                          </span>
                        </p>
                        {stockExcedido && (
                          <p className="text-[11px] text-red-600 font-medium mt-0.5">⚠ Excede stock disponible</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={decimal ? 0.001 : 1}
                            step={decimal ? 0.001 : 1}
                            value={it.cantidad}
                            onChange={(e) => {
                              const raw = parseFloat(e.target.value)
                              const min = decimal ? 0.001 : 1
                              const val = isNaN(raw) ? min : Math.max(min, raw)
                              onUpdate(it.id, { cantidad: decimal ? val : Math.floor(val) })
                            }}
                            className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 tabular-nums"
                          />
                          {decimal && (
                            <span className="text-[11px] text-gray-400">{it.unidad_de_medida}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={it.precio_unitario}
                          onChange={(e) =>
                            onUpdate(it.id, {
                              precio_unitario: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-28 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold text-gray-900 tabular-nums">
                        {formatARS(subtotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => onRemove(it.id)}
                          className="h-6 w-6 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors mx-auto text-lg leading-none"
                          aria-label="Eliminar"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
