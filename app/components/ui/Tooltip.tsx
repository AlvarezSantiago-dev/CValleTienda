'use client'

import { useState, type ReactNode } from 'react'
import { cn } from './cn'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-(--z-tooltip) left-1/2 -translate-x-1/2 px-2.5 py-1.5',
            'rounded-[var(--radius-sm)] bg-[var(--neutral-900)] text-fg-inverse text-xs font-medium shadow-md pointer-events-none',
            'max-w-[16rem] whitespace-normal text-left leading-snug',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
