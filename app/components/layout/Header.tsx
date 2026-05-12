'use client'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0">
      {/* Hamburger — solo mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
        aria-label="Abrir menú"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
          <line x1="2" y1="4.5" x2="14" y2="4.5" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="11.5" x2="14" y2="11.5" />
        </svg>
      </button>

      <p className="text-[13px] text-gray-400 capitalize">
        {new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </header>
  )
}
