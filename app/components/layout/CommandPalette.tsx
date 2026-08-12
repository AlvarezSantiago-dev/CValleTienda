'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  CornerDownLeft,
  Package,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { RolUsuario } from '@/types/database'
import { buscarRapido, type BusquedaRapidaResultado } from '@/app/actions/busqueda'
import { useRubro } from '@/components/layout/RubroProvider'
import { cn } from '@/components/ui/cn'
import { Spinner } from '@/components/ui/Spinner'
import { filterNavGroups, flattenNavItems, NAV_GROUPS, type NavItemConfig } from './nav-config'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  rol: RolUsuario
}

type ResultItem =
  | { kind: 'nav'; item: NavItemConfig }
  | { kind: 'producto'; id: string; nombre: string; codigo_base: string | null }
  | { kind: 'cliente'; id: string; nombre: string; apellido: string | null }

export function CommandPalette({ open, onClose, rol }: CommandPaletteProps) {
  const router = useRouter()
  const { usarRemitos, usarDevoluciones } = useRubro()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [remote, setRemote] = useState<BusquedaRapidaResultado>({ productos: [], clientes: [] })
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navItems = useMemo(
    () =>
      flattenNavItems(
        filterNavGroups(NAV_GROUPS, { rol, usarRemitos, usarDevoluciones })
      ),
    [rol, usarRemitos, usarDevoluciones]
  )

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return navItems
    return navItems.filter((item) => {
      const hay = [item.label, item.href, ...(item.keywords ?? [])].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [navItems, query])

  const results: ResultItem[] = useMemo(() => {
    const list: ResultItem[] = filteredNav.map((item) => ({ kind: 'nav', item }))
    for (const p of remote.productos) {
      list.push({ kind: 'producto', ...p })
    }
    for (const c of remote.clientes) {
      list.push({ kind: 'cliente', ...c })
    }
    return list
  }, [filteredNav, remote])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setRemote({ productos: [], clientes: [] })
      setActive(0)
      return
    }
    const t = setTimeout(() => inputRef.current?.focus(), 20)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setRemote({ productos: [], clientes: [] })
      return
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await buscarRapido(q)
        setRemote(data)
      })
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    setActive(0)
  }, [results.length, query])

  const go = useCallback(
    (item: ResultItem) => {
      onClose()
      if (item.kind === 'nav') router.push(item.item.href)
      else if (item.kind === 'producto') router.push(`/productos/${item.id}`)
      else router.push(`/clientes/${item.id}`)
    },
    [onClose, router]
  )

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active])
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-(--z-modal) flex items-start justify-center pt-[12vh] px-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-surface-overlay"
        aria-hidden
        onMouseDown={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda rápida"
        className="relative z-10 w-full max-w-lg bg-surface rounded-[var(--radius-lg)] shadow-overlay border border-border-default overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-border-subtle">
          <Search size={18} className="text-fg-subtle shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ir a… o buscar productos y clientes"
            className="flex-1 h-control-xl bg-transparent text-base text-fg placeholder:text-fg-subtle outline-none"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          />
          {pending && <Spinner size="sm" className="text-fg-subtle" />}
          <kbd className="hidden sm:inline text-xs text-fg-subtle border border-border-default rounded px-1.5 py-0.5 font-mono">
            esc
          </kbd>
        </div>

        <ul id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-sm text-fg-subtle text-center">
              {query.trim().length < 2
                ? 'Escribí para filtrar módulos o buscar (≥2 caracteres)'
                : 'Sin resultados'}
            </li>
          )}
          {results.map((r, i) => {
            const isActive = i === active
            let Icon: LucideIcon = Search
            let label = ''
            let hint = ''
            if (r.kind === 'nav') {
              Icon = r.item.icon
              label = r.item.label
              hint = r.item.href
            } else if (r.kind === 'producto') {
              Icon = Package
              label = r.nombre
              hint = r.codigo_base ?? 'Producto'
            } else {
              Icon = Users
              label = [r.nombre, r.apellido].filter(Boolean).join(' ')
              hint = 'Cliente'
            }
            return (
              <li key={`${r.kind}-${r.kind === 'nav' ? r.item.href : r.id}`} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  id={`${listId}-${i}`}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer',
                    isActive ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg hover:bg-surface-hover'
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  <Icon size={18} className="shrink-0 opacity-70" aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{label}</span>
                    <span className="block text-xs text-fg-muted truncate">{hint}</span>
                  </span>
                  {isActive && <CornerDownLeft size={14} className="shrink-0 opacity-50" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-3 text-xs text-fg-subtle">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Hook global Ctrl/Cmd+K */
export function useCommandPaletteHotkey(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onOpen])
}
