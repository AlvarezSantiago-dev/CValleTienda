'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from './cn'

export interface DropdownItem {
  label: string
  onClick?: () => void
  href?: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

interface DropdownMenuProps {
  items: DropdownItem[]
  label?: string
  trigger?: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function DropdownMenu({
  items,
  label = 'Acciones',
  trigger,
  align = 'right',
  className = '',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onMenuKey(e: KeyboardEvent) {
    const buttons = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []
    )
    const idx = buttons.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      buttons[(idx + 1) % buttons.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      buttons[(idx - 1 + buttons.length) % buttons.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      buttons[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      buttons[buttons.length - 1]?.focus()
    }
  }

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center justify-center h-control-sm w-control-sm rounded-[var(--radius-md)]',
          'text-fg-muted hover:bg-surface-hover hover:text-fg cursor-pointer focus-ring'
        )}
      >
        {trigger ?? <MoreHorizontal size={18} aria-hidden />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            'absolute z-(--z-popover) mt-1 min-w-[10rem] py-1 bg-surface border border-border-default rounded-[var(--radius-md)] shadow-md',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={i} role="separator" className="my-1 h-px bg-border-subtle" />
            }
            const content = (
              <>
                {item.icon}
                {item.label}
              </>
            )
            const itemClass = cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer focus-ring',
              item.danger ? 'text-danger hover:bg-danger-soft' : 'text-fg-secondary hover:bg-surface-hover',
              item.disabled && 'opacity-50 pointer-events-none'
            )
            if (item.href) {
              return (
                <a
                  key={i}
                  href={item.href}
                  role="menuitem"
                  aria-disabled={item.disabled}
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </a>
              )
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                aria-disabled={item.disabled}
                disabled={item.disabled}
                className={itemClass}
                onClick={() => {
                  item.onClick?.()
                  setOpen(false)
                }}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
