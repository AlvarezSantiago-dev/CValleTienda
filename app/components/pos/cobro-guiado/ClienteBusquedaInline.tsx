'use client'

import { useEffect, useState, useTransition } from 'react'
import { buscarClientesAction, type ClienteLite } from '@/app/actions/ventas'
import { NuevoClienteModal } from '@/components/clientes/NuevoClienteModal'
import { formatARS } from '@/lib/format'

interface ClienteBusquedaInlineProps {
  value: ClienteLite | null
  onChange: (cliente: ClienteLite | null) => void
  onNuevoClick?: () => void
}

export function ClienteBusquedaInline({
  value,
  onChange,
  onNuevoClick,
}: ClienteBusquedaInlineProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClienteLite[]>([])
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [buscado, setBuscado] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([])
        setBuscado(false)
        return
      }
      startTransition(async () => {
        const res = await buscarClientesAction(query)
        if (res.ok) {
          setResults(res.data ?? [])
          setBuscado(true)
        }
      })
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  if (value) {
    const nombre = `${value.nombre}${value.apellido ? ` ${value.apellido}` : ''}`.trim()
    return (
      <div className="flex items-center justify-between bg-primary-soft border-2 border-primary-border rounded-xl px-4 py-3">
        <div>
          <p className="text-base font-semibold text-gray-900">{nombre}</p>
          {(value.dni || value.telefono) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {[value.dni, value.telefono].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-red-600 font-semibold transition-colors px-2"
          onClick={() => {
            onChange(null)
            setQuery('')
            setResults([])
            setBuscado(false)
          }}
        >
          Quitar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, DNI o teléfono…"
        className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-primary/40 focus:border-primary"
        autoFocus
      />

      <button
        type="button"
        onClick={() => {
          onNuevoClick?.()
          setModalOpen(true)
        }}
        className="w-full min-h-[44px] rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-primary-border hover:text-primary-soft-fg hover:bg-primary-soft transition-colors"
      >
        + Cliente nuevo
      </button>

      {query.trim() && (
        <ul className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-[min(40vh,320px)] overflow-y-auto">
          {isPending && (
            <li className="px-4 py-4 text-sm text-gray-400 text-center">Buscando…</li>
          )}
          {!isPending && results.length === 0 && buscado && (
            <li className="px-4 py-4 text-sm text-gray-500 text-center">Sin resultados.</li>
          )}
          {!isPending &&
            results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c)
                    setQuery('')
                    setResults([])
                    setBuscado(false)
                  }}
                  className="w-full min-h-[52px] text-left px-4 py-3 hover:bg-primary-soft transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-900">
                      {c.nombre} {c.apellido ?? ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      {[c.dni, c.telefono].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  {c.saldo_favor > 0 && (
                    <span className="text-xs text-emerald-700 font-semibold shrink-0 tabular-nums">
                      Saldo {formatARS(c.saldo_favor)}
                    </span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}

      {!query.trim() && (
        <p className="text-sm text-gray-400 text-center">Escribí para buscar un cliente.</p>
      )}

      <NuevoClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialNombre={query}
        onCreated={(c) => {
          onChange({
            id: c.id,
            nombre: c.nombre,
            apellido: c.apellido,
            dni: c.dni,
            telefono: c.telefono,
            saldo_favor: 0,
          })
          setQuery('')
          setResults([])
          setBuscado(false)
          setModalOpen(false)
        }}
      />
    </div>
  )
}
