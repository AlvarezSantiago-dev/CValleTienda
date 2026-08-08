'use client'

import Link from 'next/link'
import { Menu, Search, Wallet } from 'lucide-react'
import { Breadcrumbs } from './Breadcrumbs'
import { usePageActions, usePageTitle } from './PageContext'
import { formatHoyLegible } from '@/lib/datetime'
import { cn } from '@/components/ui/cn'
import { Badge } from '@/components/ui/Badge'

interface HeaderProps {
  onMenuClick?: () => void
  onSearchClick?: () => void
  cajaAbierta?: boolean
}

export default function Header({
  onMenuClick,
  onSearchClick,
  cajaAbierta = false,
}: HeaderProps) {
  const { title } = usePageTitle()
  const { actions } = usePageActions()

  return (
    <header
      className={cn(
        'bg-surface border-b border-border-subtle px-3 sm:px-4 lg:px-6',
        'h-14 flex items-center gap-2 sm:gap-3 shrink-0',
        'pt-[env(safe-area-inset-top)]'
      )}
    >
      {/* Hamburger — mobile (drawer); en lg el sidebar ya está */}
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center h-control-sm w-control-sm rounded-[var(--radius-md)] text-fg-muted hover:bg-surface-hover hover:text-fg cursor-pointer shrink-0 focus-ring"
        aria-label="Abrir menú"
      >
        <Menu size={18} aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
        {!title && (
          <p className="text-xs text-fg-subtle capitalize truncate lg:hidden">
            {formatHoyLegible()}
          </p>
        )}
      </div>

      {actions && <div className="hidden sm:flex items-center gap-2 shrink-0">{actions}</div>}

      {/* Estado de caja */}
      <Link
        href="/caja"
        className={cn(
          'hidden sm:inline-flex items-center gap-1.5 shrink-0 focus-ring rounded-[var(--radius-full)]'
        )}
        title={cajaAbierta ? 'Caja abierta' : 'Caja cerrada — abrir'}
      >
        <Badge variant={cajaAbierta ? 'success' : 'warning'} className="gap-1.5">
          <Wallet size={12} aria-hidden />
          {cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}
        </Badge>
      </Link>

      {/* Buscar / Cmd+K */}
      <button
        type="button"
        onClick={onSearchClick}
        className={cn(
          'inline-flex items-center gap-2 shrink-0 h-control-sm px-2.5 rounded-[var(--radius-md)]',
          'border border-border-default bg-surface-sunken text-fg-muted',
          'hover:bg-surface-hover hover:text-fg cursor-pointer focus-ring transition-colors'
        )}
        aria-label="Buscar (Ctrl+K)"
      >
        <Search size={16} aria-hidden />
        <span className="hidden md:inline text-xs">Buscar…</span>
        <kbd className="hidden lg:inline text-[10px] font-mono border border-border-default rounded px-1 py-px bg-surface">
          ⌘K
        </kbd>
      </button>
    </header>
  )
}
