'use client'

import { useState, useTransition } from 'react'
import { generarCodigoBarrasUnico } from '@/app/actions/productos'
import type { VarianteInput } from '@/app/actions/productos'

interface BulkFillProps {
  variantes: VarianteInput[]
  modoEdicion?: boolean
  onUpdate: (variantes: VarianteInput[]) => void
}

export function BulkFill({ variantes, modoEdicion, onUpdate }: BulkFillProps) {
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [pending, startTransition] = useTransition()

  const activas = variantes.filter((v) => !v.eliminar)
  const sinCodigo = activas.filter((v) => !v.codigo_barras)

  // Solo mostrar si hay 2+ variantes activas
  if (activas.length < 2) return null

  function aplicarPrecio() {
    const p = parseFloat(precio)
    if (isNaN(p) || p < 0) return
    onUpdate(variantes.map((v) => (v.eliminar ? v : { ...v, precio_venta: p })))
    setPrecio('')
  }

  function aplicarStock() {
    const s = parseInt(stock)
    if (isNaN(s) || s < 0) return
    onUpdate(variantes.map((v) => (v.eliminar ? v : { ...v, stock_inicial: s })))
    setStock('')
  }

  function generarCodigos() {
    startTransition(async () => {
      const updated = [...variantes]
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].eliminar || updated[i].codigo_barras) continue
        const res = await generarCodigoBarrasUnico()
        if (res.ok && res.data) {
          updated[i] = { ...updated[i], codigo_barras: res.data.codigo }
        }
      }
      onUpdate(updated)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-600">
      <span className="font-medium shrink-0 text-gray-500">Aplicar a todas:</span>

      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Precio"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarPrecio() } }}
          className="w-24 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
        />
        <button
          type="button"
          onClick={aplicarPrecio}
          disabled={!precio}
          className="text-xs bg-white border border-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          → Precio
        </button>
      </div>

      {!modoEdicion && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarStock() } }}
            className="w-20 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          />
          <button
            type="button"
            onClick={aplicarStock}
            disabled={!stock}
            className="text-xs bg-white border border-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            → Stock
          </button>
        </div>
      )}

      {sinCodigo.length > 0 && (
        <button
          type="button"
          onClick={generarCodigos}
          disabled={pending}
          className="text-xs bg-white border border-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors ml-auto"
        >
          {pending
            ? 'Generando...'
            : `🔢 Generar ${sinCodigo.length} código${sinCodigo.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
