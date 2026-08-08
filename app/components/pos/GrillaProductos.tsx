'use client'

import { useState } from 'react'
import type { ProductoPOS, VarianteResultado } from '@/lib/pos/queries'
import { VarianteSelector } from './VarianteSelector'
import { formatARS } from '@/lib/format'
import { esStockInfinito } from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { useRubro } from '@/components/layout/RubroProvider'

interface Props {
  productos: ProductoPOS[]
  onSelect: (v: VarianteResultado) => void
}

interface CategoriaChip {
  id: string | null
  nombre: string
  count: number
}

export function GrillaProductos({ productos, onSelect }: Props) {
  const { rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [productoModal, setProductoModal] = useState<ProductoPOS | null>(null)

  // Construir chips de categorías
  const categorias: CategoriaChip[] = (() => {
    const map = new Map<string | null, number>()
    for (const p of productos) {
      const key = p.categoria_id
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    const chips: CategoriaChip[] = []
    for (const [id, count] of map.entries()) {
      if (id === null) {
        chips.push({ id: null, nombre: 'Sin categoría', count })
      }
    }
    // Categorías con nombre
    const conNombre: CategoriaChip[] = []
    for (const p of productos) {
      if (p.categoria_id && !conNombre.find((c) => c.id === p.categoria_id)) {
        const count = (map.get(p.categoria_id) ?? 0)
        conNombre.push({ id: p.categoria_id, nombre: p.categoria_nombre ?? p.categoria_id, count })
      }
    }
    // Ordenar por nombre y anteponer
    return [
      ...conNombre.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      ...chips,
    ]
  })()

  const productosFiltrados = categoriaActiva === null
    ? productos
    : productos.filter((p) => p.categoria_id === categoriaActiva)

  function handleClickProducto(p: ProductoPOS) {
    if (p.variantes.length === 1) {
      onSelect(p.variantes[0])
    } else {
      setProductoModal(p)
    }
  }

  if (productos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay productos con stock disponible.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-gray-900">Productos</h2>
        <span className="text-[12px] text-gray-400">{productosFiltrados.length} disponibles</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Chips de categoría */}
        {categorias.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoriaActiva(null)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                categoriaActiva === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              Todos <span className="opacity-70">({productos.length})</span>
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id ?? '__sin_cat__'}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  categoriaActiva === cat.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
              >
                {cat.nombre} <span className="opacity-70">({cat.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Grilla */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
          {productosFiltrados.map((p) => {
            const precioMin = Math.min(...p.variantes.map((v) => v.precio_venta))
            const precioMax = Math.max(...p.variantes.map((v) => v.precio_venta))
            const precioLabel =
              precioMin === precioMax
                ? formatARS(precioMin)
                : `${formatARS(precioMin)} – ${formatARS(precioMax)}`
            const hasInfinite =
              permiteInfinito &&
              p.variantes.some((v) => esStockInfinito(v.stock_efectivo))
            const totalStock = hasInfinite
              ? -1
              : p.variantes.reduce((acc, v) => acc + v.stock_efectivo, 0)
            const stockBajo = !hasInfinite && totalStock > 0 && totalStock <= 5

            return (
              <button
                key={p.id}
                onClick={() => handleClickProducto(p)}
                className="group relative flex flex-col items-start p-2.5 bg-white border border-gray-100 rounded-lg hover:border-primary-border hover:shadow-md transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {/* Ícono / imagen */}
                <div className="w-full h-14 rounded-md bg-gray-50 flex items-center justify-center mb-2 overflow-hidden">
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl" role="img" aria-hidden>
                      🏷️
                    </span>
                  )}
                </div>

                {/* Nombre */}
                <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2 w-full group-hover:text-fg-brand">
                  {p.nombre}
                </p>

                {/* Precio */}
                <p className="text-[11px] text-fg-brand font-bold mt-1 tabular-nums">{precioLabel}</p>

                {/* Footer */}
                <div className="flex items-center justify-between w-full mt-1">
                  {p.variantes.length > 1 && (
                    <span className="text-[10px] text-gray-400">{p.variantes.length} var.</span>
                  )}
                  {stockBajo && (
                    <span className="text-[10px] text-orange-500 font-semibold ml-auto">
                      Stock: {totalStock}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

      {/* Modal variante */}
      {productoModal && (
        <VarianteSelector
          producto={productoModal}
          onSelect={onSelect}
          onClose={() => setProductoModal(null)}
        />
      )}
      </div>{/* end p-3 space-y-3 */}
    </div>
  )
}
