'use client'

import { useState, useRef, useTransition, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { buscarPrecios } from '@/app/actions/precios'
import type { PrecioConsulta } from '@/lib/precios/queries'
import { useRubro } from '@/components/layout/RubroProvider'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import { useBarcodeScanner } from '@/lib/hooks/useBarcodeScanner'

const RE_CODIGO = /^[A-Za-z0-9_-]{8,14}$/
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
    <div className="bg-white border border-gray-100 rounded-3xl p-8 animate-pulse">
      <div className="flex gap-4 mb-6">
        <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-gray-100 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="h-16 w-56 bg-gray-100 rounded" />
    </div>
  )
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function stockInfo(stock: number) {
  if (stock === -1) {
    return { label: 'Ilimitado', dot: 'bg-primary', text: 'text-fg-brand', bg: 'bg-primary-soft border-primary-border' }
  }
  if (stock <= 0) {
    return { label: 'Sin stock', dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50 border-red-100' }
  }
  if (stock <= 5) {
    return { label: 'Últimas unidades', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' }
  }
  return { label: 'Disponible', dot: 'bg-primary', text: 'text-fg-brand', bg: 'bg-primary-soft border-primary-border' }
}

function sinPrecioVenta(precio: number) {
  return precio <= 0
}

function SinPrecioAviso({
  productoId,
  puedeEditar,
  compacto = false,
}: {
  productoId: string
  puedeEditar: boolean
  compacto?: boolean
}) {
  if (compacto) {
    return (
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
          Sin precio
        </span>
        {puedeEditar && (
          <Link
            href={`/productos/${productoId}`}
            className="text-[11px] font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2"
          >
            Cargar precio →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
      <p className="text-[22px] sm:text-[28px] font-bold text-amber-900 leading-tight">
        Sin precio de venta
      </p>
      <p className="text-[13px] text-amber-800/90 mt-2">
        {puedeEditar
          ? 'Este producto todavía no tiene precio cargado. Actualizalo para poder venderlo y consultarlo acá.'
          : 'Este producto todavía no tiene precio cargado. Consultá con el encargado para actualizarlo.'}
      </p>
      {puedeEditar && (
        <Link
          href={`/productos/${productoId}`}
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold transition-colors"
        >
          Ir a actualizar precio
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  )
}

interface VariantBadgesProps {
  item: PrecioConsulta
  labelVar1: string
  labelVar2: string
  usarVar2: boolean
}

function VariantBadges({ item, labelVar1, labelVar2, usarVar2 }: VariantBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {item.talla && (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
          {labelVar1} {item.talla}
        </span>
      )}
      {usarVar2 && item.color && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
          {item.color_hex && (
            <span
              className="w-2.5 h-2.5 rounded-full border border-gray-200"
              style={{ backgroundColor: item.color_hex }}
            />
          )}
          {labelVar2} {item.color}
        </span>
      )}
      {item.es_pack && item.pack_cantidad && (
        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          Pack x{item.pack_cantidad}
        </span>
      )}
    </div>
  )
}

function ProductThumbnail({ item }: { item: PrecioConsulta }) {
  if (item.imagen_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imagen_url}
        alt=""
        className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-100 flex items-center justify-center flex-shrink-0">
      <span className="text-[15px] font-bold text-gray-400">{iniciales(item.producto_nombre)}</span>
    </div>
  )
}

function TarjetaPrecioUnico({
  item,
  flash,
  labelVar1,
  labelVar2,
  usarVar2,
  puedeEditar,
}: {
  item: PrecioConsulta
  flash: boolean
  labelVar1: string
  labelVar2: string
  usarVar2: boolean
  puedeEditar: boolean
}) {
  const stock = item.stock_efectivo
  const info = stockInfo(stock)
  const sinPrecio = sinPrecioVenta(item.precio_venta)

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-3xl border p-8 shadow-sm transition-all duration-300 ${
        sinPrecio
          ? 'border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white'
          : flash
            ? 'border-primary-border bg-gradient-to-br from-primary-soft via-white to-white'
            : 'border-primary-border bg-gradient-to-br from-primary-soft/70 via-white to-white'
      }`}
    >
      <div className="flex gap-4 items-start mb-6">
        <ProductThumbnail item={item} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-gray-900 leading-snug">{item.producto_nombre}</p>
          <VariantBadges item={item} labelVar1={labelVar1} labelVar2={labelVar2} usarVar2={usarVar2} />
          {item.codigo_barras && (
            <p className="text-[12px] text-gray-400 font-mono mt-2">Cód. {item.codigo_barras}</p>
          )}
        </div>
      </div>

      {sinPrecio ? (
        <SinPrecioAviso productoId={item.producto_id} puedeEditar={puedeEditar} />
      ) : (
        <>
          <p className="text-[11px] font-bold text-fg-brand uppercase tracking-widest mb-1">Precio</p>
          <p className="text-[56px] sm:text-[72px] font-black tracking-tight tabular-nums text-gray-900 leading-none">
            {formatARS(item.precio_venta)}
          </p>
        </>
      )}

      <div className={`inline-flex items-center gap-2 mt-5 px-3 py-1.5 rounded-full border text-[12px] font-medium ${info.bg} ${info.text}`}>
        <span className={`w-2 h-2 rounded-full ${info.dot}`} />
        Stock: {stock} {item.unidad_de_medida} · {info.label}
      </div>
    </div>
  )
}

function FilaPrecio({
  item,
  labelVar1,
  labelVar2,
  usarVar2,
  puedeEditar,
}: {
  item: PrecioConsulta
  labelVar1: string
  labelVar2: string
  usarVar2: boolean
  puedeEditar: boolean
}) {
  const stock = item.stock_efectivo
  const info = stockInfo(stock)
  const sinPrecio = sinPrecioVenta(item.precio_venta)

  return (
    <div className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-primary-soft/50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-gray-900">{item.producto_nombre}</p>
        <VariantBadges item={item} labelVar1={labelVar1} labelVar2={labelVar2} usarVar2={usarVar2} />
        {item.codigo_barras && (
          <p className="text-[11px] text-gray-400 font-mono mt-1">{item.codigo_barras}</p>
        )}
        <span className={`inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium ${info.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
          {stock} {item.unidad_de_medida}
        </span>
      </div>
      {sinPrecio ? (
        <SinPrecioAviso productoId={item.producto_id} puedeEditar={puedeEditar} compacto />
      ) : (
        <p className="text-lg font-bold text-fg-brand flex-shrink-0 tabular-nums">
          {formatARS(item.precio_venta)}
        </p>
      )}
    </div>
  )
}

interface BuscadorPreciosProps {
  puedeEditarProductos?: boolean
}

export function BuscadorPrecios({ puedeEditarProductos = false }: BuscadorPreciosProps) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<PrecioConsulta[]>([])
  const [buscado, setBuscado] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef('')

  const { labelVar1, labelVar2, usarVar2 } = useRubro()

  useAutoFocus(inputRef)

  const ejecutarBusqueda = useCallback((q: string) => {
    if (!q.trim()) return
    lastQueryRef.current = q.trim()
    setBuscado(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
    if (autoClearRef.current) clearTimeout(autoClearRef.current)

    startTransition(async () => {
      const { data, error } = await buscarPrecios(q)
      if (error) {
        setErrorMsg(error)
        setResultados([])
        return
      }
      setErrorMsg(null)
      setResultados(data ?? [])

      autoClearRef.current = setTimeout(() => {
        setQuery('')
        setResultados([])
        setBuscado(false)
        setErrorMsg(null)
        inputRef.current?.focus()
      }, AUTO_CLEAR_MS)
    })
  }, [])

  useBarcodeScanner({
    onScan: (codigo) => {
      setQuery(codigo)
      ejecutarBusqueda(codigo)
      requestAnimationFrame(() => inputRef.current?.focus())
    },
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setErrorMsg(null)
    if (autoClearRef.current) clearTimeout(autoClearRef.current)

    if (!val.trim()) {
      setResultados([])
      setBuscado(false)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }

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
    setErrorMsg(null)
    if (autoClearRef.current) clearTimeout(autoClearRef.current)
    inputRef.current?.focus()
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (autoClearRef.current) clearTimeout(autoClearRef.current)
    }
  }, [])

  const sinResultados = buscado && !isPending && !errorMsg && resultados.length === 0
  const unSolo = !isPending && !errorMsg && resultados.length === 1
  const varios = !isPending && !errorMsg && resultados.length > 1

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div
        className={`rounded-2xl border-2 p-5 transition-all duration-300 ${
          isPending
            ? 'border-primary-border bg-primary-soft/40'
            : flash
              ? 'border-primary bg-primary-soft/60'
              : buscado
                ? 'border-gray-200 bg-white'
                : 'border-dashed border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isPending ? 'bg-brand-200 text-fg-brand' : 'bg-gray-100 text-gray-500'
            }`}
          >
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
              type="button"
              onClick={limpiar}
              className="ml-auto text-[11px] text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              Limpiar · Esc
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
                     focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                     transition-all duration-150 placeholder:text-gray-300 bg-white"
        />

        {!buscado && !isPending && (
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-[11px] text-gray-400">Listo para escanear</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-[13px] text-red-700">
            No se pudo consultar el precio. {errorMsg}
          </p>
          <button
            type="button"
            onClick={() => ejecutarBusqueda(lastQueryRef.current || query)}
            className="text-[12px] font-medium text-red-700 hover:text-red-900 flex-shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {isPending && <SkeletonCard />}

      {unSolo && (
        <TarjetaPrecioUnico
          item={resultados[0]}
          flash={flash}
          labelVar1={labelVar1}
          labelVar2={labelVar2}
          usarVar2={usarVar2}
          puedeEditar={puedeEditarProductos}
        />
      )}

      {varios && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-[12px] font-semibold text-gray-500">
              {resultados.length} resultados para &ldquo;{query}&rdquo;
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {resultados.map((p) => (
              <FilaPrecio
                key={p.id}
                item={p}
                labelVar1={labelVar1}
                labelVar2={labelVar2}
                usarVar2={usarVar2}
                puedeEditar={puedeEditarProductos}
              />
            ))}
          </div>
        </div>
      )}

      {sinResultados && (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-10 text-center">
          <p className="text-[32px] mb-2">🔍</p>
          <p className="text-[14px] font-semibold text-gray-700">Producto no encontrado</p>
          <p className="text-[13px] text-gray-400 mt-1">
            Verificá el código o probá con otro nombre
          </p>
          <p className="text-[12px] text-gray-500 font-mono mt-2 bg-gray-50 inline-block px-3 py-1 rounded-lg">
            {query}
          </p>
          <button
            type="button"
            onClick={limpiar}
            className="mt-4 px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Buscar otra vez
          </button>
        </div>
      )}
    </div>
  )
}
