'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode } from 'react'
import { cn } from './cn'

export interface TabItem {
  href: string
  label: string
  /** Si true, match exacto de pathname; si false, startsWith */
  exact?: boolean
  /** Keys de query que definen el tab activo (el resto del href se usa solo al navegar) */
  matchKeys?: string[]
}

interface TabsProps {
  items: TabItem[]
  variant?: 'underline' | 'pill'
  className?: string
  /** Contenido opcional a la derecha (acciones) */
  trailing?: ReactNode
}

function isActive(pathname: string, search: string, item: TabItem) {
  const [path, qs] = item.href.split('?')
  const pathOk = item.exact
    ? pathname === path
    : pathname === path || pathname.startsWith(path + '/')
  if (!pathOk) return false
  if (!qs) return true
  const wanted = new URLSearchParams(qs)
  const current = new URLSearchParams(search)
  const keys = item.matchKeys ?? [...wanted.keys()]
  for (const k of keys) {
    const want = wanted.get(k)
    const have = current.get(k)
    if (have === want) continue
    // Sin param en URL: tratar `tab=finanzas` como default activo
    if (have == null && k === 'tab' && want === 'finanzas') continue
    return false
  }
  return true
}

export function Tabs({ items, variant = 'underline', className = '', trailing }: TabsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ?? ''

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <nav
        className={cn(
          'flex-1 min-w-0 overflow-x-auto scrollbar-none',
          variant === 'underline' && 'border-b border-border-default',
          variant === 'pill' && 'bg-surface-sunken p-1 rounded-[var(--radius-md)] inline-flex w-auto'
        )}
        aria-label="Secciones"
      >
        <ul
          className={cn(
            'flex gap-1',
            variant === 'underline' && 'min-w-max',
            variant === 'pill' && 'w-full'
          )}
          role="tablist"
        >
          {items.map((item) => {
            const active = isActive(pathname, search, item)
            return (
              <li key={item.href} role="presentation">
                <Link
                  href={item.href}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-(--duration-fast) focus-ring cursor-pointer',
                    variant === 'underline' &&
                      cn(
                        'px-3 py-2.5 border-b-2 -mb-px',
                        active
                          ? 'border-primary text-fg-brand'
                          : 'border-transparent text-fg-muted hover:text-fg-secondary'
                      ),
                    variant === 'pill' &&
                      cn(
                        'px-3 py-1.5 rounded-[var(--radius-sm)] flex-1',
                        active
                          ? 'bg-surface text-fg shadow-xs'
                          : 'text-fg-muted hover:text-fg-secondary'
                      )
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  )
}

/** Tabs controlados (sin routing) — para filtros/vistas locales */
interface ControlledTabsProps {
  value: string
  onChange: (value: string) => void
  items: { value: string; label: string }[]
  variant?: 'underline' | 'pill'
  className?: string
}

export function ControlledTabs({
  value,
  onChange,
  items,
  variant = 'pill',
  className = '',
}: ControlledTabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 overflow-x-auto',
        variant === 'pill' && 'bg-surface-sunken p-1 rounded-[var(--radius-md)]',
        variant === 'underline' && 'border-b border-border-default',
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-(--duration-fast) cursor-pointer focus-ring',
              variant === 'pill' &&
                cn(
                  'px-3 py-1.5 rounded-[var(--radius-sm)]',
                  active ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg-secondary'
                ),
              variant === 'underline' &&
                cn(
                  'px-3 py-2.5 border-b-2 -mb-px',
                  active
                    ? 'border-primary text-fg-brand'
                    : 'border-transparent text-fg-muted hover:text-fg-secondary'
                )
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
