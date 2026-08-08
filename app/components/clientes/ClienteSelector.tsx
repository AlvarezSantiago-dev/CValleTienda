'use client'

import { useEffect, useState, useTransition } from 'react'
import { buscarClientesAction, type ClienteLite } from '@/app/actions/ventas'
import { NuevoClienteModal } from '@/components/clientes/NuevoClienteModal'

interface ClienteSelectorProps {
  value: ClienteLite | null
  onChange: (cliente: ClienteLite | null) => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
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
      <div className="flex items-center justify-between bg-primary-soft border border-primary-border rounded-[var(--radius-md)] px-3 py-2 text-sm">
        <div>
          <p className="font-medium text-fg">{nombre}</p>
          {(value.dni || value.telefono) && (
            <p className="text-xs text-fg-muted">
              {[value.dni, value.telefono].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-[12px] text-fg-subtle hover:text-danger-soft-fg font-medium transition-colors"
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
          className="flex-1 h-9 px-3 border border-border-default rounded-[var(--radius-md)] text-[13px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-9 px-3 rounded-[var(--radius-md)] border border-border-default bg-surface hover:bg-surface-sunken text-[12px] font-semibold text-fg-muted whitespace-nowrap"
          title="Crear cliente nuevo"
        >
          + Nuevo
        </button>
      </div>
      {open && query && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-surface border border-border-default rounded-[var(--radius-md)] shadow-lg divide-y divide-border-subtle">
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
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary-soft transition-colors flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-fg">
                    {c.nombre} {c.apellido ?? ''}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {[c.dni, c.telefono].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                {c.saldo_favor > 0 && (
                  <span className="text-[11px] text-emerald-700 font-semibold shrink-0 tabular-nums">
                    Saldo {formatARS(c.saldo_favor)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && !isPending && results.length === 0 && (
        <p className="absolute z-10 mt-1 w-full bg-surface border border-border-default rounded-[var(--radius-md)] px-3 py-2 text-xs text-fg-muted">
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
