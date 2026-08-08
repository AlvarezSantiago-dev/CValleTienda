'use client'

import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from './cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className = '', id, disabled, ...rest },
  ref
) {
  const autoId = useId()
  const checkId = id ?? autoId

  return (
    <label
      htmlFor={checkId}
      className={cn(
        'inline-flex items-start gap-2.5 cursor-pointer',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <span className="relative mt-0.5 shrink-0">
        <input
          ref={ref}
          id={checkId}
          type="checkbox"
          disabled={disabled}
          className="peer sr-only"
          {...rest}
        />
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface text-primary-fg',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--border-focus)]',
            'peer-checked:bg-primary peer-checked:border-primary peer-checked:[&_svg]:opacity-100'
          )}
          aria-hidden
        >
          <Check size={14} className="opacity-0 transition-opacity" strokeWidth={2.5} />
        </span>
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-fg">{label}</span>}
          {description && <span className="block text-xs text-fg-muted mt-0.5">{description}</span>}
        </span>
      )}
    </label>
  )
})
