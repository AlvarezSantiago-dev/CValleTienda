'use client'

import { usePageTitle } from './PageContext'
import { formatHoyLegible } from '@/lib/datetime'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { title } = usePageTitle()

  return (
    <header className="bg-white border-b border-gray-100 px-4 lg:px-6 h-12 flex items-center gap-3 shrink-0">
      {/* Hamburger — solo mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/40"
        aria-label="Abrir menú"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <line x1="2" y1="4.5" x2="14" y2="4.5" />
          <line x1="2" y1="8"   x2="14" y2="8"   />
          <line x1="2" y1="11.5" x2="14" y2="11.5" />
        </svg>
      </button>

      {title ? (
        <h1 className="text-[14px] font-semibold text-gray-900 truncate">{title}</h1>
      ) : (
        <p className="text-[13px] text-gray-400 capitalize">
          {formatHoyLegible()}
        </p>
      )}
    </header>
  )
}
