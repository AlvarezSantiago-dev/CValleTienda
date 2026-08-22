'use client'

import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { fieldBorderOk, fieldControl } from '@/components/ui/fieldStyles'

export function CatalogoBuscador({
  value,
  onChange,
  onQuery,
  placeholder = 'Buscar producto…',
}: {
  value: string
  onChange: (q: string) => void
  onQuery: (q: string) => void
  placeholder?: string
}) {
  const onQueryRef = useRef(onQuery)
  onQueryRef.current = onQuery

  useEffect(() => {
    const t = window.setTimeout(() => onQueryRef.current(value), 150)
    return () => window.clearTimeout(t)
  }, [value])

  return (
    <div className="relative">
      <Search
        size={18}
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className={cn(
          fieldControl,
          fieldBorderOk,
          'pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden'
        )}
        aria-label="Buscar producto"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-fg-muted hover:bg-surface-hover hover:text-fg focus-ring"
          aria-label="Limpiar búsqueda"
        >
          <X size={16} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
