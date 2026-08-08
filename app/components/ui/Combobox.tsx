'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from './cn'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  label?: string
  error?: string
  disabled?: boolean
  emptyMessage?: string
  className?: string
  /** Permite limpiar la selección */
  clearable?: boolean
}

export function Combobox({
  options,
  value = null,
  onChange,
  placeholder = 'Seleccionar…',
  searchPlaceholder = 'Buscar…',
  label,
  error,
  disabled,
  emptyMessage = 'Sin resultados',
  className = '',
  clearable = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q)
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {label && <label className="block text-xs font-medium text-fg-muted mb-1.5">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full h-control-lg md:h-control-md flex items-center justify-between gap-2 px-3 rounded-[var(--radius-md)] border bg-surface text-left text-base md:text-sm',
          'transition-colors duration-(--duration-fast) focus-ring cursor-pointer',
          error ? 'border-danger' : 'border-border-strong',
          disabled && 'opacity-60 cursor-not-allowed bg-surface-sunken'
        )}
      >
        <span className={cn('truncate', selected ? 'text-fg' : 'text-fg-subtle')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-fg-subtle" aria-hidden />
      </button>

      {open && (
        <div
          className="absolute z-(--z-popover) mt-1 w-full bg-surface border border-border-default rounded-[var(--radius-md)] shadow-md overflow-hidden"
          role="presentation"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
            <Search size={16} className="text-fg-subtle shrink-0" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
              aria-autocomplete="list"
              aria-controls={listId}
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {clearable && value && (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-fg-muted hover:bg-surface-hover cursor-pointer"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  Limpiar selección
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-fg-subtle">{emptyMessage}</li>
            )}
            {filtered.map((opt) => {
              const isSel = opt.value === value
              return (
                <li key={opt.value} role="option" aria-selected={isSel}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer',
                      isSel ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg hover:bg-surface-hover',
                      opt.disabled && 'opacity-50 pointer-events-none'
                    )}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="block truncate text-xs text-fg-muted">{opt.description}</span>
                      )}
                    </span>
                    {isSel && <Check size={16} className="shrink-0" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-danger-soft-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
