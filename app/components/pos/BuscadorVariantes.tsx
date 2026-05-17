'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
} from 'react'
import { Input } from '@/components/ui/Input'
import { buscarVariantesAction } from '@/app/actions/ventas'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import { useRubro } from '@/components/layout/RubroProvider'
import type { VarianteResultado } from '@/lib/pos/queries'

interface BuscadorVariantesProps {
  onSelect: (v: VarianteResultado) => void
  onQueryChange?: (query: string) => void
  /** Llamado cuando el query parece un código de barras pero no hay resultados. */
  onCodigoNoEncontrado?: (codigo: string) => void
}

export interface BuscadorVariantesHandle {
  /** Devuelve el foco al input. */
  focus: () => void
  /** Setea el query (útil para cargar el resultado de un escaneo global). */
  setQuery: (q: string) => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

const RE_CODIGO = /^[A-Za-z0-9_-]{8,14}$/

export const BuscadorVariantes = forwardRef<
  BuscadorVariantesHandle,
  BuscadorVariantesProps
>(function BuscadorVariantes({ onSelect, onQueryChange, onCodigoNoEncontrado }, ref) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VarianteResultado[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { labelVar1, labelVar2, usarVar2 } = useRubro()

  useAutoFocus(inputRef)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setQuery: (q: string) => {
      setQuery(q)
      inputRef.current?.focus()
    },
  }))

  // Búsqueda con debounce + auto-add si parece código
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setResults([])
      setError(null)
      return
    }

    const isCodigo = RE_CODIGO.test(q)
    const delay = isCodigo ? 0 : 250

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await buscarVariantesAction(q)
        if (!res.ok) {
          setError(res.error ?? 'Error en la búsqueda')
          setResults([])
          return
        }
        setError(null)
        const data = res.data ?? []

        // Si parece código y hay match único, auto-agregar y limpiar
        if (isCodigo && data.length === 1) {
          onSelect(data[0])
          setQuery('')
          onQueryChange?.('')
          setResults([])
          inputRef.current?.focus()
          return
        }
        // Si parece código y no hay resultados, notificar al padre
        if (isCodigo && data.length === 0) {
          onCodigoNoEncontrado?.(q)
          setQuery('')
          onQueryChange?.('')
        }
        setResults(data)
      })
    }, delay)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handleSelect(v: VarianteResultado) {
    onSelect(v)
    setQuery('')
    onQueryChange?.('')
    setResults([])
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const q = query.trim()
      // Si hay un único resultado visible, seleccionarlo
      if (results.length === 1) {
        handleSelect(results[0])
        return
      }
      // Si parece código y todavía no llegaron resultados, esperar el efecto
      if (RE_CODIGO.test(q)) {
        // El efecto con delay=0 lo va a procesar
        return
      }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Escaneá código o buscá por nombre / código…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onQueryChange?.(e.target.value) }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {query && results.length > 0 && (
        <ul className="mt-3 max-h-72 overflow-auto divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {results.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => handleSelect(v)}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {v.producto_nombre}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {[v.talla ? `${labelVar1}: ${v.talla}` : null, usarVar2 && v.color ? `${labelVar2}: ${v.color}` : null].filter(Boolean).join(' · ')}
                    {v.codigo_barras ? ` · ${v.codigo_barras}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatARS(v.precio_venta)}
                    <span className="text-xs font-normal text-gray-400">/{v.unidad_de_medida}</span>
                  </p>
                  <p className="text-xs text-gray-500">stock: {v.stock_actual} {v.unidad_de_medida}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query && !isPending && results.length === 0 && !error && (
        <p className="mt-3 text-sm text-gray-500 italic">Sin resultados.</p>
      )}
    </div>
  )
})
