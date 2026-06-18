'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { generarCodigosBarrasBatch } from '@/app/actions/productos'
import type { VarianteInput } from '@/app/actions/productos'

interface BulkFillProps {
  variantes: VarianteInput[]
  modoEdicion?: boolean
  precioProducto?: number | null
  onUpdate: (variantes: VarianteInput[]) => void
}

export function BulkFill({ variantes, modoEdicion, precioProducto, onUpdate }: BulkFillProps) {
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [pending, startTransition] = useTransition()

  const activas = variantes.filter((v) => !v.eliminar)
  const sinCodigo = activas.filter((v) => !v.codigo_barras?.trim())
  const sinCodigoIdx = variantes
    .map((v, i) => (!v.eliminar && !v.codigo_barras?.trim() ? i : -1))
    .filter((i) => i >= 0)

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
    if (sinCodigo.length === 0) return
    startTransition(async () => {
      const res = await generarCodigosBarrasBatch(sinCodigo.length)
      if (!res.ok || !res.data) {
        toast.error(res.error ?? 'No se pudieron generar los códigos')
        return
      }
      const updated = [...variantes]
      let codIdx = 0
      for (const i of sinCodigoIdx) {
        updated[i] = { ...updated[i], codigo_barras: res.data.codigos[codIdx++] }
      }
      onUpdate(updated)
      toast.success(`${res.data.codigos.length} código${res.data.codigos.length !== 1 ? 's' : ''} generado${res.data.codigos.length !== 1 ? 's' : ''}`)
    })
  }

  function completarVariantes() {
    startTransition(async () => {
      let updated = [...variantes]
      let codigosGenerados = 0
      let stockAplicado = false

      if (sinCodigo.length > 0) {
        const res = await generarCodigosBarrasBatch(sinCodigo.length)
        if (!res.ok || !res.data) {
          toast.error(res.error ?? 'No se pudieron generar los códigos')
          return
        }
        let codIdx = 0
        for (const i of sinCodigoIdx) {
          updated[i] = { ...updated[i], codigo_barras: res.data.codigos[codIdx++] }
        }
        codigosGenerados = res.data.codigos.length
      }

      const stockVal = parseInt(stock)
      if (!modoEdicion && !isNaN(stockVal) && stockVal >= 0 && stock.trim() !== '') {
        updated = updated.map((v) => (v.eliminar ? v : { ...v, stock_inicial: stockVal }))
        stockAplicado = true
      }

      if (precioProducto != null && precioProducto > 0) {
        updated = updated.map((v) =>
          v.eliminar || v.precio_venta != null ? v : { ...v, precio_venta: precioProducto }
        )
      }

      onUpdate(updated)

      const partes: string[] = []
      if (codigosGenerados > 0) {
        partes.push(`${codigosGenerados} código${codigosGenerados !== 1 ? 's' : ''} generado${codigosGenerados !== 1 ? 's' : ''}`)
      }
      if (stockAplicado) {
        partes.push(`stock ${stockVal} aplicado`)
      }
      if (partes.length === 0) {
        toast.info('No había nada pendiente para completar')
      } else {
        toast.success(partes.join(', '))
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-lime-50/60 rounded-xl border border-lime-200 text-xs text-gray-700">
      <span className="font-medium shrink-0 text-gray-600">Aplicar a todas:</span>

      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Precio"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              aplicarPrecio()
            }
          }}
          className="w-24 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-lime-500 bg-white"
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                aplicarStock()
              }
            }}
            className="w-20 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-lime-500 bg-white"
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
          className="text-xs bg-white border border-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          {pending ? 'Generando...' : `🔢 ${sinCodigo.length} código${sinCodigo.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {!modoEdicion && sinCodigo.length > 0 && (
        <button
          type="button"
          onClick={completarVariantes}
          disabled={pending}
          className="text-xs font-semibold bg-lime-500 text-white px-3 py-1.5 rounded-lg hover:bg-lime-600 disabled:opacity-40 transition-colors ml-auto shadow-sm"
        >
          {pending ? 'Completando...' : 'Completar variantes'}
        </button>
      )}
    </div>
  )
}
