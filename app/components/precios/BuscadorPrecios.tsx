'use client'

import { useState, useRef, useTransition, useEffect, useCallback } from 'react'
import { buscarPrecios, type PrecioProducto } from '@/app/actions/precios'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import { useBarcodeScanner } from '@/lib/hooks/useBarcodeScanner'

const RE_CODIGO = /^\d{8,14}$/
const AUTO_CLEAR_MS = 12_000

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function IconBarcode() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 5v14M7 5v14M11 5v14M17 5v14M21 5v14M13 5v14" strokeWidth={1.4} />
      <rect x="0.5" y="2.5" width="23" height="19" rx="2" strokeWidth={1.2} />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 animate-pulse">
      <div className="h-3 w-16 bg-gray-100 rounded mb-4" />
      <div className="h-5 w-48 bg-gray-100 rounded mb-5" />
      <div className="h-14 w-44 bg-gray-100 rounded" />
    </div>
  )
}

export function BuscadorPrecios() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<PrecioProducto[]>([])
  const [buscado, setBuscado] = useState(false)
  const [flash, setFlash] = useState(false)          // brief highlight on scan
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useAutoFocus(inputRef)

  // ── Core search ──────────────────────────────────────────────────
  const ejecutarBusqueda = useCallback((q: string) => {
    if (!q.trim()) return
    setBuscado(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
    if (autoClearRef.current) clearTimeout(autoClearRef.current)

    startTransition(async () => {
      const { data } = await buscarPrecios(q)
      setResultados(data ?? [])

      // Auto-clear + refocus after inactivity
      autoClearRef.current = setTimeout(() => {
        setQuery('')
        setResultados([])
        setBuscado(false)
        inputRef.current?.focus()
      }, AUTO_CLEAR_MS)
    })
  }, [])

  // ── Global scanner capture (focus NOT on input) ───────────────────
  useBarcodeScanner({
    onScan: (codigo) => {
      setQuery(codigo)
      ejecutarBusqueda(codigo)
      requestAnimationFrame(() => inputRef.current?.focus())
    },
  })

  // ── Input handlers ────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (autoClearRef.current) clearTimeout(autoClearRef.current)

    if (!val.trim()) {
      setResultados([])
      setBuscado(false)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }

    // Instant search for barcodes typed manually; debounce for text
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (RE_CODIGO.test(val.trim())) {
      ejecutarBusqueda(val)
    } else {
      debounceRef.current = setTimeout(() => ejecutarBusqueda(val), 380)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      ejecutarBusqueda(query)
    }
    if (e.key === 'Escape') {
      limpiar()
    }
  }

  function limpiar() {
    setQuery('')
    setResultados([])
    setBuscado(false)
    if (autoClearRef.current) clearTimeout(autoClearRef.current)
    inputRef.current?.focus()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (autoClearRef.current) clearTimeout(autoClearRef.current)
    }
  }, [])

  const sinResultados = buscado && !isPending && resultados.length === 0
  const unSolo        = !isPending && resultados.length === 1
  const varios        = !isPending && resultados.length > 1

  return (
    <div className="space-y-5">

      {/* ── Input / Scanner area ──────────────────────────────────── */}
      <div className={`rounded-2xl border-2 p-5 transition-all duration-300 ${
        isPending
          ? 'border-lime-300 bg-lime-50/40'
          : flash
            ? 'border-lime-400 bg-lime-50/60'
            : buscado
              ? 'border-gray-200 bg-white'
              : 'border-dashed border-gray-200 bg-white'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            isPending ? 'bg-lime-200 text-lime-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <IconBarcode />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Consultá el precio</p>
            <p className="text-[11px] text-gray-400">
              Escaneá un código o escribí el nombre del producto
            </p>
          </div>
          {buscado && (
            <button
              onClick={limpiar}
              className="ml-auto text-[11px] text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              Limpiar esc
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escanear código o buscar por nombre…"
          autoComplete="off"
          inputMode="search"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px]
                     focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400
                     transition-all duration-150 placeholder:text-gray-300 bg-white"
        />

        {!buscado && !isPending && (
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-[11px] text-gray-400">Listo para escanear</span>
          </div>
        )}
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {isPending && <SkeletonCard />}

      {/* ── Resultado único — tarjeta grande tipo kiosco ─────────── */}
      {unSolo && (
        <div className={`rounded-2xl border p-6 transition-all duration-300 ${
          flash
            ? 'border-lime-300 bg-gradient-to-br from-lime-50 to-white'
            : 'border-lime-200 bg-gradient-to-br from-lime-50/70 to-white'
        }`}>
          <p className="text-[11px] font-bold text-lime-700 uppercase tracking-widest mb-2">
            Precio
          </p>
          <p className="text-[15px] font-semibold text-gray-700 mb-1 leading-snug">
            {resultados[0].nombre}
          </p>

          <p className="text-[54px] sm:text-[64px] font-black tracking-tight text-gray-900 leading-none mt-2">
            {formatARS(resultados[0].precio_venta)}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4">
            {resultados[0].codigo_barras && (
              <span className="text-[12px] text-gray-400 font-mono">
                {resultados[0].codigo_barras}
              </span>
            )}
            {resultados[0].stock_actual != null && (
              <span className={`text-[12px] font-medium ${
                resultados[0].stock_actual > 0 ? 'text-gray-400' : 'text-red-500'
              }`}>
                Stock: {resultados[0].stock_actual} {resultados[0].unidad ?? ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Múltiples resultados — lista compacta ────────────────── */}
      {varios && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-gray-500">
              {resultados.length} resultados para &ldquo;{query}&rdquo;
            </p>
          </div>

          {/* Desktop */}
          <table className="w-full text-[13px] hidden sm:table">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-400 text-[11px] uppercase tracking-wide">Producto</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-400 text-[11px] uppercase tracking-wide">Precio</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-400 text-[11px] uppercase tracking-wide">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resultados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.nombre}</p>
                    {p.codigo_barras && (
                      <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{p.codigo_barras}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lime-700 text-[16px]">
                    {formatARS(p.precio_venta)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-[12px]">
                    {p.stock_actual != null
                      ? `${p.stock_actual} ${p.unidad ?? ''}`.trim()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-gray-50">
            {resultados.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-gray-900 truncate">{p.nombre}</p>
                  {p.codigo_barras && (
                    <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{p.codigo_barras}</p>
                  )}
                  {p.stock_actual != null && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Stock: {p.stock_actual} {p.unidad ?? ''}
                    </p>
                  )}
                </div>
                <p className="text-[18px] font-bold text-lime-700 flex-shrink-0">
                  {formatARS(p.precio_venta)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sin resultados ──────────────────────────────────────── */}
      {sinResultados && (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-10 text-center">
          <p className="text-[32px] mb-2">🔍</p>
          <p className="text-[14px] font-semibold text-gray-700">
            Sin resultados
          </p>
          <p className="text-[13px] text-gray-400 mt-1">
            No se encontró &ldquo;{query}&rdquo; en el catálogo.
          </p>
          <button
            onClick={limpiar}
            className="mt-4 px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600
                       hover:bg-gray-50 transition-colors"
          >
            Buscar otra vez
          </button>
        </div>
      )}
    </div>
  )
}
