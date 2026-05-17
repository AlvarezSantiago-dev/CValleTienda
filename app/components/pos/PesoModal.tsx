'use client'

import { useEffect, useRef, useState } from 'react'
import type { VarianteResultado } from '@/lib/pos/queries'

interface PesoModalProps {
  variante: VarianteResultado
  /** Precio override (cuando viene de balanza con precio embebido) */
  precioOverride?: number
  /** Cantidad ya en el carrito para este producto (informativa) */
  cantidadActualEnCarrito: number
  onConfirm: (cantidad: number) => void
  onCancel: () => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

/** Paso del input según la unidad */
function stepParaUnidad(unidad: string): number {
  if (unidad === 'gramo') return 1
  if (unidad === 'kg') return 0.001
  if (unidad === 'litro') return 0.001
  return 0.01
}

/** Placeholder del input según la unidad */
function placeholderParaUnidad(unidad: string): string {
  if (unidad === 'gramo') return 'ej: 350'
  if (unidad === 'kg') return 'ej: 1.350'
  if (unidad === 'litro') return 'ej: 0.500'
  if (unidad === 'metro') return 'ej: 2.50'
  return 'ej: 1.0'
}

export function PesoModal({
  variante,
  precioOverride,
  cantidadActualEnCarrito,
  onConfirm,
  onCancel,
}: PesoModalProps) {
  const [valor, setValor] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus al montar (con pequeño delay para que el overlay esté visible)
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const precio = precioOverride ?? variante.precio_venta
  const cantidadNum = parseFloat(valor)
  const esValido = !isNaN(cantidadNum) && cantidadNum > 0
  const subtotal = esValido ? cantidadNum * precio : null

  function handleConfirm() {
    if (!esValido) return
    onConfirm(cantidadNum)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {variante.producto_nombre}
            </h3>
            {(variante.talla || variante.color) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[variante.talla, variante.color].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              {formatARS(precio)} / {variante.unidad_de_medida}
              {cantidadActualEnCarrito > 0 && (
                <span className="ml-2 text-indigo-600">
                  · ya en carrito: {cantidadActualEnCarrito} {variante.unidad_de_medida}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0 -mt-1"
            aria-label="Cancelar"
          >
            ×
          </button>
        </div>

        {/* Input de cantidad */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Cantidad ({variante.unidad_de_medida})
          </label>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            min={stepParaUnidad(variante.unidad_de_medida)}
            step={stepParaUnidad(variante.unidad_de_medida)}
            placeholder={placeholderParaUnidad(variante.unidad_de_medida)}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-2xl font-semibold text-center border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
          />
        </div>

        {/* Subtotal en tiempo real */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
          {subtotal !== null ? (
            <>
              <p className="text-xs text-gray-500 mb-0.5">Subtotal</p>
              <p className="text-2xl font-bold text-gray-900">{formatARS(subtotal)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Ingresá la cantidad para ver el total</p>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!esValido}
            className="flex-1 px-4 py-2.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
