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
  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-sm text-gray-500">
        Empezá escaneando o buscando un producto.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Vista móvil — sm:hidden */}
      <div className="sm:hidden divide-y divide-gray-100">
        {items.map((it) => {
          const subtotal = it.precio_unitario * it.cantidad
          const decimal = esDecimal(it.unidad_de_medida)
          const stockExcedido = it.cantidad > it.stock_actual
          return (
            <div key={it.id} className={`p-3 ${stockExcedido ? 'bg-red-50' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{it.producto_nombre}</p>
                  <p className="text-xs text-gray-500">
                    {[it.talla, usarVar2 ? it.color : null].filter(Boolean).join(' · ') || '—'}
                    {' · stock: '}
                    {formatCantidad(it.stock_actual, it.unidad_de_medida)}
                  </p>
                  {stockExcedido && (
                    <p className="text-xs text-red-600 mt-0.5">Excede stock disponible</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  className="shrink-0 text-gray-400 hover:text-red-500 text-xl leading-none mt-0.5"
                  aria-label="Eliminar"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Cant.</span>
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
                    className="w-20 h-8 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-400/60"
                  />
                  {decimal && (
                    <span className="text-xs text-gray-500">{it.unidad_de_medida}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">$</span>
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
                    className="w-28 h-8 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-400/60"
                  />
                </div>
                <span className="ml-auto font-semibold text-gray-900 tabular-nums text-sm">
                  {formatARS(subtotal)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Vista desktop — hidden sm:block */}
      <div className="hidden sm:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2 w-28">Cant.</th>
              <th className="px-3 py-2 w-32">Precio</th>
              <th className="px-3 py-2 text-right w-28">Subtotal</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((it) => {
              const subtotal = it.precio_unitario * it.cantidad
              const decimal = esDecimal(it.unidad_de_medida)
              const stockExcedido = it.cantidad > it.stock_actual
              return (
                <tr key={it.id} className={stockExcedido ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{it.producto_nombre}</p>
                    <p className="text-xs text-gray-500">
                      {[it.talla, usarVar2 ? it.color : null].filter(Boolean).join(' · ') || '—'}
                      {' · stock: '}
                      {formatCantidad(it.stock_actual, it.unidad_de_medida)}
                    </p>
                    {stockExcedido && (
                      <p className="text-xs text-red-600">Cantidad excede stock disponible</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
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
                        className="w-20 h-8 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-400/60"
                      />
                      {decimal && (
                        <span className="text-xs text-gray-500">{it.unidad_de_medida}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
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
                      className="w-28 h-8 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-lime-400/60"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                    {formatARS(subtotal)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(it.id)}
                      className="text-red-600 hover:text-red-800 text-lg leading-none"
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
    </div>
  )
}
