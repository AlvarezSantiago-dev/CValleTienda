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
  const [highlightIndex, setHighlightIndex] = useState(-1)
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

  useEffect(() => {
    setHighlightIndex(-1)
  }, [results])

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

        if (isCodigo && data.length === 1) {
          onSelect(data[0])
          setQuery('')
          onQueryChange?.('')
          setResults([])
          inputRef.current?.focus()
          return
        }
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
    setHighlightIndex(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      if (results.length === 0) return
      e.preventDefault()
      setHighlightIndex((i) => (i < results.length - 1 ? i + 1 : 0))
      return
    }

    if (e.key === 'ArrowUp') {
      if (results.length === 0) return
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : results.length - 1))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && results[highlightIndex]) {
        handleSelect(results[highlightIndex])
        return
      }
      const q = query.trim()
      if (results.length === 1) {
        handleSelect(results[0])
        return
      }
      if (RE_CODIGO.test(q)) {
        return
      }
    }
  }

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="search"
        placeholder="Escaneá código o buscá por nombre / código…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onQueryChange?.(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {query && results.length > 0 && (
        <ul className="max-h-72 overflow-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {results.map((v, index) => {
            const activo = index === highlightIndex
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(v)}
                  className={[
                    'w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors',
                    activo
                      ? 'bg-lime-50 ring-2 ring-inset ring-lime-400'
                      : 'hover:bg-lime-50',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {v.producto_nombre}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {[v.talla ? `${labelVar1}: ${v.talla}` : null, usarVar2 && v.color ? `${labelVar2}: ${v.color}` : null]
                        .filter(Boolean)
                        .join(' · ')}
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
            )
          })}
        </ul>
      )}

      {query && !isPending && results.length === 0 && !error && (
        <p className="text-sm text-gray-500 italic">Sin resultados.</p>
      )}
    </div>
  )
})
