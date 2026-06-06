'use client'

import { useEffect, useState, useTransition } from 'react'
import { buscarClientesAction, type ClienteLite } from '@/app/actions/ventas'
import { NuevoClienteModal } from '@/components/clientes/NuevoClienteModal'

interface ClienteSelectorProps {
  value: ClienteLite | null
  onChange: (cliente: ClienteLite | null) => void
}

export function ClienteSelector({ value, onChange }: ClienteSelectorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClienteLite[]>([])
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([])
        return
      }
      startTransition(async () => {
        const res = await buscarClientesAction(query)
        if (res.ok) setResults(res.data ?? [])
      })
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  if (value) {
    const nombre = `${value.nombre}${value.apellido ? ' ' + value.apellido : ''}`.trim()
    return (
      <div className="flex items-center justify-between bg-lime-50 border border-lime-200 rounded-lg px-3 py-2 text-sm">
        <div>
          <p className="font-medium text-gray-900">{nombre}</p>
          {(value.dni || value.telefono) && (
            <p className="text-xs text-gray-500">
              {[value.dni, value.telefono].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-[12px] text-gray-400 hover:text-red-600 font-medium transition-colors"
          onClick={() => {
            onChange(null)
            setQuery('')
            setResults([])
          }}
        >
          Quitar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Nombre, DNI o teléfono…"
          className="flex-1 h-9 px-3 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[12px] font-semibold text-gray-600 whitespace-nowrap"
          title="Crear cliente nuevo"
        >
          + Nuevo
        </button>
      </div>
      {open && query && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg divide-y divide-gray-100">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c)
                  setQuery('')
                  setResults([])
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-lime-50 transition-colors"
              >
                <p className="font-medium text-gray-900">
                  {c.nombre} {c.apellido ?? ''}
                </p>
                <p className="text-xs text-gray-500">
                  {[c.dni, c.telefono].filter(Boolean).join(' · ') || '—'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && !isPending && results.length === 0 && (
        <p className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-500">
          Sin resultados.
        </p>
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
          setOpen(false)
          setModalOpen(false)
        }}
      />
    </div>
  )
}
