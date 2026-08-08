'use client'

import { cn } from './cn'

export interface SegmentOption {
  value: string
  label: string
  disabled?: boolean
}

interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  className?: string
  size?: 'sm' | 'md'
}

export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel = 'Vista',
  className = '',
  size = 'md',
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex p-1 bg-surface-sunken rounded-[var(--radius-md)] gap-0.5 overflow-x-auto max-w-full',
        className
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'whitespace-nowrap rounded-[var(--radius-sm)] font-medium transition-colors duration-(--duration-fast) cursor-pointer focus-ring',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-surface text-fg shadow-xs'
                : 'text-fg-muted hover:text-fg-secondary',
              opt.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
