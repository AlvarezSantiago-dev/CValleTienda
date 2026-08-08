'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from './cn'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  /** Atajo mostrado a la derecha (ej. "⌘K") */
  shortcut?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    onClear,
    shortcut,
    placeholder = 'Buscar…',
    className = '',
    disabled,
    ...rest
  },
  ref
) {
  return (
    <div
      className={cn(
        'relative flex items-center w-full h-control-lg md:h-control-md rounded-[var(--radius-md)] border border-border-strong bg-surface',
        'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-[var(--border-focus)]',
        disabled && 'opacity-60',
        className
      )}
    >
      <Search size={16} className="absolute left-3 text-fg-subtle pointer-events-none" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 h-full pl-9 pr-9 bg-transparent text-base md:text-sm text-fg placeholder:text-fg-subtle outline-none [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => {
            onChange('')
            onClear?.()
          }}
          className="absolute right-2 flex items-center justify-center h-6 w-6 rounded-[var(--radius-sm)] text-fg-subtle hover:bg-surface-hover hover:text-fg-muted cursor-pointer"
        >
          <X size={14} aria-hidden />
        </button>
      ) : shortcut ? (
        <kbd className="absolute right-2 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-border-default bg-surface-sunken text-[10px] font-mono text-fg-subtle">
          {shortcut}
        </kbd>
      ) : null}
    </div>
  )
})
