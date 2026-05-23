'use client'

import { useState, useRef, useCallback } from 'react'
import { buscarVariantesParaKit, type VarianteKitResult, type KitComponenteInput } from '@/app/actions/productos'
import { Search, X, Plus, Minus } from 'lucide-react'

export interface KitComponenteState extends KitComponenteInput {
  /** Info del componente para mostrar en la UI (cargado desde la búsqueda) */
  _info?: VarianteKitResult
}

interface Props {
  value: KitComponenteState[]
  onChange: (comps: KitComponenteState[]) => void
  /** ID de la variante del kit — para excluirla de los resultados */
  kitVarianteId?: string
}

export function KitComponentesEditor({ value, onChange, kitVarianteId }: Props) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<VarianteKitResult[]>([])
  const [buscando, setBuscando] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResultados([])
      setShowDropdown(false)
      return
    }
    setBuscando(true)
    const res = await buscarVariantesParaKit(q)
    setBuscando(false)
    if (res.ok && res.data) {
      // Excluir variante del kit actual y ya agregadas
      const yaAgregados = new Set(value.map((c) => c.componente_variante_id))
      const filtrados = res.data.filter(
        (v) => v.id !== kitVarianteId && !yaAgregados.has(v.id)
      )
      setResultados(filtrados)
      setShowDropdown(filtrados.length > 0)
    }
  }, [value, kitVarianteId])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(q), 350)
  }

  const agregarComponente = (variante: VarianteKitResult) => {
    const nuevo: KitComponenteState = {
      componente_variante_id: variante.id,
      cantidad: 1,
      _info: variante,
    }
    onChange([...value, nuevo])
    setQuery('')
    setResultados([])
    setShowDropdown(false)
  }

  const quitarComponente = (varianteId: string) => {
    onChange(value.filter((c) => c.componente_variante_id !== varianteId))
  }

  const cambiarCantidad = (varianteId: string, delta: number) => {
    onChange(
      value.map((c) => {
        if (c.componente_variante_id !== varianteId) return c
        const nueva = Math.max(1, c.cantidad + delta)
        return { ...c, cantidad: nueva }
      })
    )
  }

  const setCantidadDirecta = (varianteId: string, cantidad: number) => {
    const v = Math.max(1, Math.round(cantidad))
    onChange(value.map((c) => c.componente_variante_id === varianteId ? { ...c, cantidad: v } : c))
  }

  return (
    <div className="space-y-3">
      {/* Buscador de componentes */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            placeholder="Buscar producto o variante para agregar..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.length >= 2 && resultados.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          {buscando && (
            <span className="text-xs text-gray-400 animate-pulse">Buscando...</span>
          )}
        </div>
        {showDropdown && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {resultados.map((v) => (
              <button
                key={v.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between gap-2 border-b border-gray-100 last:border-0"
                onMouseDown={() => agregarComponente(v)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.producto_nombre}</p>
                  <p className="text-xs text-gray-500">
                    {[v.talla, v.color].filter(Boolean).join(' / ')}
                    {v.codigo_barras && ` · ${v.codigo_barras}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-gray-700">${v.precio_venta}</p>
                  <p className="text-xs text-gray-400">Stock: {v.stock_actual}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de componentes agregados */}
      {value.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
          Sin componentes. Buscá y agregá los productos que forman este kit.
        </p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-medium text-gray-600">Componente</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-32">Cantidad</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {value.map((comp) => {
                const info = comp._info
                return (
                  <tr key={comp.componente_variante_id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2">
                      {info ? (
                        <div>
                          <p className="font-medium text-gray-800">{info.producto_nombre}</p>
                          <p className="text-xs text-gray-500">
                            {[info.talla, info.color].filter(Boolean).join(' / ')}
                            {info.codigo_barras && ` · ${info.codigo_barras}`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">ID: {comp.componente_variante_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(comp.componente_variante_id, -1)}
                          className="p-0.5 rounded hover:bg-gray-100 text-gray-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={comp.cantidad}
                          onChange={(e) => setCantidadDirecta(comp.componente_variante_id, Number(e.target.value))}
                          className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(comp.componente_variante_id, 1)}
                          className="p-0.5 rounded hover:bg-gray-100 text-gray-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => quitarComponente(comp.componente_variante_id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
