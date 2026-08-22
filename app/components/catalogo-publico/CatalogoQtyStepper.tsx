'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export function CatalogoQtyStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label = 'Cantidad',
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max: number
  disabled?: boolean
  label?: string
}) {
  return (
    <div
      className="inline-flex items-center rounded-[var(--radius-md)] border border-border-default bg-surface"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center text-fg rounded-l-[var(--radius-md)]',
          'hover:bg-surface-hover focus-ring disabled:opacity-40 disabled:cursor-not-allowed'
        )}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Quitar uno"
      >
        <Minus size={16} aria-hidden />
      </button>
      <span className="min-w-8 px-1 text-center text-base font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center text-fg rounded-r-[var(--radius-md)]',
          'hover:bg-surface-hover focus-ring disabled:opacity-40 disabled:cursor-not-allowed'
        )}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Agregar uno"
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  )
}
