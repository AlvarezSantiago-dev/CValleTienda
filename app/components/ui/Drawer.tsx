'use client'

import { useEffect, useId, useRef, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'

type DrawerSide = 'right' | 'left' | 'bottom'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  side?: DrawerSide
  className?: string
}

const sidePanel: Record<DrawerSide, string> = {
  right:
    'inset-y-0 right-0 w-full max-w-md sm:rounded-l-[var(--radius-lg)] translate-x-0 data-[closing]:translate-x-full',
  left:
    'inset-y-0 left-0 w-full max-w-md sm:rounded-r-[var(--radius-lg)] translate-x-0 data-[closing]:-translate-x-full',
  bottom:
    'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[var(--radius-xl)] translate-y-0 data-[closing]:translate-y-full',
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  className = '',
}: DrawerProps) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) ?? []
    focusables()[0]?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const nodes = Array.from(focusables())
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      previousFocus.current?.focus()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-(--z-modal) flex"
      role="presentation"
      onMouseDown={onBackdrop}
    >
      <div className="absolute inset-0 bg-surface-overlay" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'absolute z-10 bg-surface shadow-lg flex flex-col',
          'transition-transform duration-(--duration-slow) ease-emphasized',
          sidePanel[side],
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-border-subtle shrink-0">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-heading font-semibold text-fg truncate">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="text-sm text-fg-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 flex items-center justify-center h-control-sm w-control-sm rounded-[var(--radius-md)] text-fg-subtle hover:bg-surface-hover cursor-pointer focus-ring"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 px-4 py-4 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
