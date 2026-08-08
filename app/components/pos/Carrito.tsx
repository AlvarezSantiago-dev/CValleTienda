'use client'

import { useEffect, useState } from 'react'
import type { CartItem } from './POSContainer'
import { useRubro } from '@/components/layout/RubroProvider'
import { formatStockDisplay, tieneStockSuficiente } from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import {
  formatCantidadDisplay,
  parseCantidadInput,
  sanitizeCantidadTyping,
} from '@/lib/format-cantidad'
import { sumarSubtotalLineas, totalLinea } from '@/lib/pos/totales-carrito'
import { formatARS } from '@/lib/format-moneda'

interface CarritoProps {
  items: CartItem[]
  onUpdate: (id: string, patch: Partial<CartItem>) => void
  onRemove: (id: string) => void
}

/** Unidades que no admiten decimales (se venden en piezas enteras) */
const UNIDADES_ENTERAS = new Set(['unidad', 'pack', 'caja', 'bolsa'])

function esDecimal(unidad: string) {
  return !UNIDADES_ENTERAS.has(unidad)
}

function formatCantidad(cantidad: number, unidad: string) {
  if (esDecimal(unidad)) {
    return `${formatCantidadDisplay(cantidad)} ${unidad}`
  }
  return `${cantidad} ${unidad}`
}

function formatStockItem(stock: number, unidad: string, permiteInfinito: boolean) {
  const label = formatStockDisplay(stock, { corto: true, permiteInfinito })
  if (label === '∞' || label === 'Ilimitado') return label
  return formatCantidad(stock, unidad)
}

function CantidadDecimalInput({
  id,
  cantidad,
  unidad,
  onCommit,
}: {
  id: string
  cantidad: number
  unidad: string
  onCommit: (val: number) => void
}) {
  const [draft, setDraft] = useState(() => formatCantidadDisplay(cantidad))

  useEffect(() => {
    setDraft(formatCantidadDisplay(cantidad))
  }, [cantidad, id])

  function commit() {
    const parsed = parseCantidadInput(draft)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(formatCantidadDisplay(cantidad))
      return
    }
    onCommit(parsed)
    setDraft(formatCantidadDisplay(parsed))
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={(e) => setDraft(sanitizeCantidadTyping(e.target.value))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/40 focus:border-primary tabular-nums"
      />
      <span className="text-[11px] text-gray-400">{unidad}</span>
    </div>
  )
}

export function Carrito({ items, onUpdate, onRemove }: CarritoProps) {
  const { labelVar1, usarVar2, rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)

  const totalBruto = sumarSubtotalLineas(items)
  const hayStockExcedido = items.some(
    (it) => !tieneStockSuficiente(it.stock_actual, it.cantidad, permiteInfinito)
  )

  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-fg">Carrito</h2>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary-soft text-primary-soft-fg text-[11px] font-bold">
              {items.length}
            </span>
          )}
          {hayStockExcedido && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft border border-danger-border px-2 py-0.5 text-[11px] font-semibold text-danger-soft-fg">
              ⚠ Stock insuficiente
            </span>
          )}
        </div>
        {items.length > 0 && (
          <span className="text-sm font-bold text-fg font-mono tabular-nums">
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
          <div className="sm:hidden divide-y divide-gray-50">
            {items.map((it) => {
              const subtotal = totalLinea(it.precio_unitario, it.cantidad)
              const decimal = esDecimal(it.unidad_de_medida)
              const stockExcedido = !tieneStockSuficiente(
                it.stock_actual,
                it.cantidad,
                permiteInfinito
              )
              return (
                <div key={it.id} className={`p-4 ${stockExcedido ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{it.producto_nombre}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {[it.talla, usarVar2 ? it.color : null].filter(Boolean).join(' · ') || '—'}
                        {' · stock: '}
                        {formatStockItem(it.stock_actual, it.unidad_de_medida, permiteInfinito)}
                      </p>
                      {it.es_pack && it.pack_cantidad && (
                        <span className="inline-block text-xs text-fg-brand bg-primary-soft border border-primary-border px-1.5 py-0.5 rounded mt-0.5">
                          Pack ×{it.pack_cantidad}
                        </span>
                      )}
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
                      {decimal ? (
                        <CantidadDecimalInput
                          id={it.id}
                          cantidad={it.cantidad}
                          unidad={it.unidad_de_medida}
                          onCommit={(val) => onUpdate(it.id, { cantidad: val })}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (it.cantidad <= 1) onRemove(it.id)
                              else onUpdate(it.id, { cantidad: it.cantidad - 1 })
                            }}
                            className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors font-bold text-base leading-none"
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center text-[13px] font-bold text-gray-900 tabular-nums">
                            {it.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdate(it.id, { cantidad: it.cantidad + 1 })}
                            className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-primary-soft hover:border-primary-border hover:text-fg-brand transition-colors font-bold text-base leading-none"
                          >
                            +
                          </button>
                        </div>
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
                        className="w-28 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
                  const subtotal = totalLinea(it.precio_unitario, it.cantidad)
                  const decimal = esDecimal(it.unidad_de_medida)
                  const stockExcedido = !tieneStockSuficiente(
                    it.stock_actual,
                    it.cantidad,
                    permiteInfinito
                  )
                  return (
                    <tr
                      key={it.id}
                      className={`group transition-colors ${stockExcedido ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-900">{it.producto_nombre}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {[it.talla, usarVar2 ? it.color : null].filter(Boolean).join(' · ') || labelVar1}
                          {' · '}
                          <span className={stockExcedido ? 'text-red-500 font-medium' : ''}>
                            stock:{' '}
                            {formatStockItem(it.stock_actual, it.unidad_de_medida, permiteInfinito)}
                          </span>
                        </p>
                        {it.es_pack && it.pack_cantidad && (
                          <span className="inline-block text-xs text-fg-brand bg-primary-soft border border-primary-border px-1.5 py-0.5 rounded mt-0.5">
                            Pack ×{it.pack_cantidad}
                          </span>
                        )}
                        {stockExcedido && (
                          <p className="text-[11px] text-red-600 font-medium mt-0.5">
                            ⚠ Excede stock disponible
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {decimal ? (
                          <CantidadDecimalInput
                            id={it.id}
                            cantidad={it.cantidad}
                            unidad={it.unidad_de_medida}
                            onCommit={(val) => onUpdate(it.id, { cantidad: val })}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (it.cantidad <= 1) onRemove(it.id)
                                else onUpdate(it.id, { cantidad: it.cantidad - 1 })
                              }}
                              className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors font-bold text-base leading-none"
                            >
                              −
                            </button>
                            <span className="min-w-[2.5rem] text-center text-[13px] font-bold text-gray-900 tabular-nums">
                              {it.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdate(it.id, { cantidad: it.cantidad + 1 })}
                              className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-primary-soft hover:border-primary-border hover:text-fg-brand transition-colors font-bold text-base leading-none"
                            >
                              +
                            </button>
                          </div>
                        )}
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
                          className="w-28 h-8 px-2 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-primary/40 focus:border-primary tabular-nums"
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
