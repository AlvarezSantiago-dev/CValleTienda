'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Zap } from 'lucide-react'
import { buscarProductosParaKit, type ProductoParaKitResult } from '@/app/actions/productos'
import type { KitComponenteState } from './KitComponentesEditor'

interface KitVarianteRef {
  varKey: string
  talla_id: string | null
  color_id: string | null
}

interface ProductoSeleccionado {
  producto: ProductoParaKitResult
  cantidad: number
}

interface KitAutoAsignarProps {
  kitVariantes: KitVarianteRef[]
  onAplicar: (resultado: Record<string, KitComponenteState[]>) => void
}

export function KitAutoAsignar({ kitVariantes, onAplicar }: KitAutoAsignarProps) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<ProductoParaKitResult[]>([])
  const [seleccionados, setSeleccionados] = useState<ProductoSeleccionado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [aplicado, setAplicado] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const res = await buscarProductosParaKit(query.trim())
      if (res.ok) {
        setResultados((res.data ?? []).filter((p) => !seleccionados.some((s) => s.producto.id === p.id)))
        setShowDropdown(true)
      }
      setBuscando(false)
    }, 350)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function agregarProducto(producto: ProductoParaKitResult) {
    setSeleccionados((prev) => [...prev, { producto, cantidad: 1 }])
    setAplicado(false)
    setQuery('')
    setResultados([])
    setShowDropdown(false)
  }

  function quitarProducto(productoId: string) {
    setSeleccionados((prev) => prev.filter((s) => s.producto.id !== productoId))
    setAplicado(false)
  }

  function setCantidad(productoId: string, cantidad: number) {
    setSeleccionados((prev) =>
      prev.map((s) => (s.producto.id === productoId ? { ...s, cantidad: Math.max(1, cantidad) } : s))
    )
    setAplicado(false)
  }

  // Cuántas variantes del kit van a tener todos los componentes emparejados
  const matchCount = kitVariantes.filter((kv) =>
    seleccionados.length > 0 &&
    seleccionados.every((s) =>
      s.producto.variantes.some(
        (v) => v.talla_id === kv.talla_id && v.color_id === kv.color_id
      )
    )
  ).length

  function aplicar() {
    if (seleccionados.length === 0 || kitVariantes.length === 0) return
    const resultado: Record<string, KitComponenteState[]> = {}

    for (const kv of kitVariantes) {
      const comps: KitComponenteState[] = []
      for (const { producto, cantidad } of seleccionados) {
        const match = producto.variantes.find(
          (v) => v.talla_id === kv.talla_id && v.color_id === kv.color_id
        )
        if (match) {
          comps.push({
            componente_variante_id: match.id,
            cantidad,
            _info: {
              id: match.id,
              producto_id: producto.id,
              producto_nombre: producto.nombre,
              talla: match.talla_nombre,
              color: match.color_nombre,
              color_hex: match.color_hex,
              codigo_barras: match.codigo_barras,
              stock_actual: match.stock_actual,
              precio_venta: match.precio_venta ?? 0,
            },
          })
        }
      }
      if (comps.length > 0) resultado[kv.varKey] = comps
    }

    onAplicar(resultado)
    setAplicado(true)
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-purple-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-purple-800">Auto-asignar componentes por talla y color</p>
      </div>
      <p className="text-xs text-purple-600">
        Seleccioná los productos que componen el kit. El sistema empareja automáticamente cada variante por talla y color.
      </p>

      {/* Buscador */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white border border-purple-200 rounded-lg px-3 py-2 focus-within:border-purple-400 transition-colors">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto componente..."
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
          {buscando && <span className="text-[11px] text-gray-400">buscando...</span>}
        </div>
        {showDropdown && resultados.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
            {resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregarProducto(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-purple-50 text-sm border-b border-gray-50 last:border-0 transition-colors"
              >
                <span className="font-medium text-gray-900">{p.nombre}</span>
                <span className="text-gray-400 ml-2 text-xs">{p.variantes.length} var.</span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && resultados.length === 0 && !buscando && query.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 px-3 py-2.5 text-sm text-gray-400">
            Sin resultados para &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Productos seleccionados */}
      {seleccionados.length > 0 && (
        <div className="space-y-2">
          {seleccionados.map(({ producto, cantidad }) => (
            <div
              key={producto.id}
              className="flex items-center gap-2 bg-white border border-purple-100 rounded-lg px-3 py-2"
            >
              <span className="flex-1 text-sm font-medium text-gray-800 truncate">{producto.nombre}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCantidad(producto.id, cantidad - 1)}
                  className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold hover:bg-purple-200 flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad(producto.id, cantidad + 1)}
                  className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold hover:bg-purple-200 flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => quitarProducto(producto.id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón aplicar */}
      {seleccionados.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={aplicar}
            disabled={matchCount === 0}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            ⚡ Aplicar a {matchCount} de {kitVariantes.length} variantes
          </button>
          {aplicado && (
            <span className="text-xs text-purple-600 font-medium">✓ Aplicado</span>
          )}
        </div>
      )}

      {seleccionados.length > 0 && matchCount < kitVariantes.length && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          ⚠ {kitVariantes.length - matchCount} variante{kitVariantes.length - matchCount !== 1 ? 's' : ''} sin coincidencia de talla/color — configuralas manualmente abajo.
        </p>
      )}
    </div>
  )
}
